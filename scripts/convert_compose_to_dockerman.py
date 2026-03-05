#!/usr/bin/env python3
"""Convert compose-managed containers to dockerman-managed.

Reads Unraid XML templates, builds docker run commands, stops compose stacks,
and starts containers as dockerman-managed.
"""
import xml.etree.ElementTree as ET
import subprocess, sys, os, time, json

XML_DIR = "/boot/config/plugins/dockerMan/templates-user"

# Map compose files to their services (ordered for dependency)
COMPOSE_STACKS = [
    # Standalone services first (no dependencies)
    ("/mnt/appdata/portal/build/deploy/docker-compose.portals.yml", [
        "home-portal", "media-portal", "lab-portal",
    ]),
    ("/mnt/user/compose/docker-compose.davis.yml", ["davis"]),
    ("/mnt/user/compose/docker-compose.donetick.yml", ["donetick"]),
    ("/mnt/user/compose/docker-compose.mailrise.yml", ["mailrise"]),
    # Services with databases - start DB first
    ("/mnt/user/compose/docker-compose.romm.yml", ["romm-db", "romm"]),
    # App groups
    ("/mnt/appdata/portal/build/deploy/docker-compose.home-apps.yml", [
        "homechart", "mealie", "actual-budget", "paperless-ngx",
        "homebox", "grocy", "vikunja",
    ]),
    ("/mnt/appdata/portal/build/deploy/docker-compose.media-apps.yml", [
        "audiobookshelf", "kavita", "calibre", "calibre-web",
        "it-tools", "n8n", "mylar3",
    ]),
    ("/mnt/appdata/portal/build/deploy/docker-compose.lab-apps.yml", [
        "dozzle", "loki", "promtail",
    ]),
    # Immich last (complex, has internal network)
    ("/mnt/appdata/portal/build/deploy/docker-compose.immich.yml", [
        "immich-postgres", "immich-redis", "immich-server", "immich-ml",
    ]),
]

# Network driver type for Unraid's port handling logic
# macvlan/ipvlan: ports become env vars; bridge: ports become -p flags
MACVLAN_NETWORKS = {"br0"}

# Containers that need secondary network connections after start
SECONDARY_NETWORKS = {
    "immich-server": "immich-internal",
    "immich-ml": "immich-internal",
    "immich-redis": "immich-internal",
    "immich-postgres": "immich-internal",
    "romm": "romm-internal",
    "romm-db": "romm-internal",
    "loki": "logging-internal",
    "promtail": "logging-internal",
}

# All custom bridge networks to ensure exist
CUSTOM_NETWORKS = ["immich-internal", "romm-internal", "logging-internal"]


def run(cmd, check=False):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if check and r.returncode != 0:
        print(f"  ERROR: {cmd}\n    {r.stderr.strip()[:200]}")
    return r


def parse_xml_template(name):
    """Parse an Unraid XML template and build a docker run command."""
    xml_path = os.path.join(XML_DIR, f"my-{name}.xml")
    if not os.path.exists(xml_path):
        return None

    tree = ET.parse(xml_path)
    root = tree.getroot()

    def get(tag, default=""):
        el = root.find(tag)
        return el.text if el is not None and el.text else default

    cname = get("Name")
    repository = get("Repository")
    network = get("Network", "bridge")
    my_ip = get("MyIP")
    privileged = get("Privileged", "false").lower() == "true"
    extra_params = get("ExtraParams")
    post_args = get("PostArgs")
    cpuset = get("CPUset")
    webui = get("WebUI")
    icon = get("Icon")

    # Build command parts
    parts = ["docker", "run", "-d"]

    # Name
    parts.extend(["--name", cname])

    # Network (unless overridden in ExtraParams)
    if "--net=" not in extra_params and "--network=" not in extra_params:
        parts.extend(["--net", network])

    # IP
    if my_ip:
        for ip in my_ip.replace(",", " ").split():
            if ip:
                flag = "--ip6" if ":" in ip else "--ip"
                parts.extend([flag, ip])

    # CPUset
    if cpuset:
        parts.extend(["--cpuset-cpus", cpuset])

    # Pids limit (Unraid default)
    if "--pids-limit" not in extra_params:
        parts.extend(["--pids-limit", "2048"])

    # Privileged
    if privileged:
        parts.append("--privileged=true")

    # Timezone + Unraid host vars
    tz = "America/Chicago"  # Unraid default, adjust if needed
    try:
        with open("/etc/timezone", "r") as f:
            tz = f.read().strip()
    except:
        pass
    hostname = "Tower"
    try:
        r = run("hostname", check=False)
        if r.returncode == 0:
            hostname = r.stdout.strip()
    except:
        pass

    parts.extend(["-e", f"TZ={tz}"])
    parts.extend(["-e", f"HOST_OS=Unraid"])
    parts.extend(["-e", f"HOST_HOSTNAME={hostname}"])
    parts.extend(["-e", f"HOST_CONTAINERNAME={cname}"])

    # Labels
    parts.extend(["-l", "net.unraid.docker.managed=dockerman"])
    if webui:
        parts.extend(["-l", f"net.unraid.docker.webui={webui}"])
    if icon:
        parts.extend(["-l", f"net.unraid.docker.icon={icon}"])

    # Config elements (env vars, volumes, ports, devices)
    is_macvlan = network.lower() in MACVLAN_NETWORKS
    for config in root.findall("Config"):
        conf_type = (config.get("Type", "") or "").lower()
        target = config.get("Target", "") or ""
        mode = config.get("Mode", "") or ""
        value = config.text or config.get("Default", "") or ""

        if not target and conf_type != "device":
            continue

        if conf_type == "variable":
            parts.extend(["-e", f"{target}={value}"])
        elif conf_type == "path":
            if not value.strip() or not target.strip():
                continue
            parts.extend(["-v", f"{value}:{target}:{mode}"])
        elif conf_type == "port":
            if is_macvlan:
                # macvlan: export as env var
                parts.extend(["-e", f"{mode.upper()}_PORT_{target}={value}"])
            else:
                # bridge: export as port mapping
                parts.extend(["-p", f"{value}:{target}/{mode}"])
        elif conf_type == "device":
            parts.extend([f"--device={value}"])

    # ExtraParams (health checks, resource limits, restart policy, etc.)
    if extra_params:
        parts.extend(extra_params.split())

    # Repository (image)
    parts.append(repository)

    # PostArgs
    if post_args:
        parts.extend(post_args.split())

    return parts


def container_exists(name):
    r = run(f"docker inspect {name}", check=False)
    return r.returncode == 0


def wait_healthy(name, timeout=60):
    """Wait for container to be running (not necessarily healthy)."""
    start = time.time()
    while time.time() - start < timeout:
        r = run(f"docker inspect --format '{{{{.State.Running}}}}' {name}", check=False)
        if r.returncode == 0 and "true" in r.stdout:
            return True
        time.sleep(2)
    return False


def main():
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        print("=== DRY RUN MODE ===\n")

    # Pre-flight: verify all templates exist and parse
    print("=== Pre-flight check ===")
    all_services = []
    commands = {}
    errors = []

    for compose_file, services in COMPOSE_STACKS:
        for svc in services:
            all_services.append(svc)
            cmd = parse_xml_template(svc)
            if cmd is None:
                errors.append(svc)
                print(f"  MISSING template: {svc}")
            else:
                commands[svc] = cmd
                print(f"  OK {svc}")

    if errors:
        print(f"\nERROR: Missing templates: {', '.join(errors)}")
        sys.exit(1)

    print(f"\nAll {len(all_services)} templates parsed.\n")

    # Ensure custom bridge networks exist
    print("=== Ensuring networks ===")
    for net_name in CUSTOM_NETWORKS:
        r = run(f"docker network inspect {net_name}", check=False)
        if r.returncode != 0:
            if not dry_run:
                run(f"docker network create {net_name} --driver bridge", check=True)
                print(f"  Created {net_name} bridge network")
            else:
                print(f"  Would create {net_name} bridge network")
    else:
        print("  compose_immich-internal exists")

    # Process each stack
    total_started = 0
    for compose_file, services in COMPOSE_STACKS:
        stack_name = os.path.basename(compose_file).replace("docker-compose.", "").replace(".yml", "")
        print(f"\n{'='*60}")
        print(f"Stack: {stack_name}")
        print(f"{'='*60}")

        # Stop compose stack
        if os.path.exists(compose_file):
            print(f"  Stopping compose stack...")
            if not dry_run:
                r = run(f"docker compose -f {compose_file} down --timeout 30")
                if r.returncode != 0:
                    # Fallback: stop individually
                    for svc in services:
                        if container_exists(svc):
                            run(f"docker stop {svc}")
                            run(f"docker rm {svc}")
                time.sleep(2)
            else:
                print(f"  Would run: docker compose -f {compose_file} down")
        else:
            # No compose file, stop containers individually
            if not dry_run:
                for svc in services:
                    if container_exists(svc):
                        print(f"  Stopping {svc}...")
                        run(f"docker stop {svc}")
                        run(f"docker rm {svc}")

        # Verify containers are gone
        if not dry_run:
            for svc in services:
                if container_exists(svc):
                    print(f"  Force removing {svc}...")
                    run(f"docker rm -f {svc}")

        # Disable compose file
        if os.path.exists(compose_file):
            disabled = compose_file + ".disabled"
            if not dry_run:
                os.rename(compose_file, disabled)
                print(f"  Disabled: {os.path.basename(compose_file)}")
            else:
                print(f"  Would disable: {os.path.basename(compose_file)}")

        # Also disable alternate location copy
        if "/mnt/appdata/" in compose_file:
            alt = compose_file.replace("/mnt/appdata/portal/build/deploy/", "/mnt/user/compose/")
        else:
            alt = compose_file.replace("/mnt/user/compose/", "/mnt/appdata/portal/build/deploy/")
        if os.path.exists(alt):
            if not dry_run:
                os.rename(alt, alt + ".disabled")
                print(f"  Disabled alt: {os.path.basename(alt)}")
            else:
                print(f"  Would disable alt: {os.path.basename(alt)}")

        # Start containers from XML templates
        for svc in services:
            cmd = commands[svc]
            cmd_str = " ".join(f"'{c}'" if " " in c or "=" in c else c for c in cmd)

            if dry_run:
                print(f"\n  Would start {svc}:")
                print(f"    {cmd_str[:200]}...")
                continue

            print(f"\n  Starting {svc}...")
            r = subprocess.run(cmd, capture_output=True, text=True)
            if r.returncode != 0:
                print(f"    FAILED: {r.stderr.strip()[:200]}")
                # Try to diagnose
                if "already in use" in r.stderr:
                    print(f"    Container name already in use, removing...")
                    run(f"docker rm -f {svc}")
                    r = subprocess.run(cmd, capture_output=True, text=True)
                    if r.returncode != 0:
                        print(f"    STILL FAILED: {r.stderr.strip()[:200]}")
                        continue
                elif "address already in use" in r.stderr:
                    print(f"    Port conflict, waiting 5s...")
                    time.sleep(5)
                    r = subprocess.run(cmd, capture_output=True, text=True)
                    if r.returncode != 0:
                        print(f"    STILL FAILED: {r.stderr.strip()[:200]}")
                        continue
                else:
                    continue

            # Wait for container to start
            if wait_healthy(svc, timeout=15):
                print(f"    OK - running")
                total_started += 1
            else:
                print(f"    WARN - may not be running yet")
                total_started += 1

            # Connect to secondary network if needed
            if svc in SECONDARY_NETWORKS:
                sec_net = SECONDARY_NETWORKS[svc]
                r2 = run(f"docker network connect {sec_net} {svc}", check=False)
                if r2.returncode == 0:
                    print(f"    Connected to {sec_net}")
                elif "already exists" in r2.stderr:
                    print(f"    Already on {sec_net}")
                else:
                    print(f"    WARN: failed to connect to {sec_net}: {r2.stderr.strip()[:100]}")

    # Summary
    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Total services: {len(all_services)}")
    if not dry_run:
        print(f"Started: {total_started}")
        # Verify final state
        print(f"\nFinal container status:")
        for svc in all_services:
            r = run(f"docker inspect --format '{{{{.State.Status}}}} {{{{index .Config.Labels \"net.unraid.docker.managed\"}}}}' {svc}", check=False)
            if r.returncode == 0:
                status = r.stdout.strip()
                print(f"  {svc}: {status}")
            else:
                print(f"  {svc}: NOT FOUND")
    else:
        print(f"\nRe-run without --dry-run to execute")

    print(f"\nDisabled compose files can be found with: find /mnt -name '*.disabled' 2>/dev/null")


if __name__ == "__main__":
    main()

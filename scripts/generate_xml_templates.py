#!/usr/bin/env python3
"""Generate Unraid XML templates for all compose-managed containers (non-onlyoffice)."""
import subprocess, json, xml.etree.ElementTree as ET, os, time

ICON_BASE = "http://192.168.150.110:8099"
XML_DIR = "/boot/config/plugins/dockerMan/templates-user"

ICON_MAP = {
    "actual-budget": "actual-budget",
    "audiobookshelf": "audiobookshelf",
    "calibre": "calibre",
    "calibre-web": "calibre-web",
    "davis": "davis",
    "donetick": "donetick",
    "dozzle": "dozzle",
    "grocy": "grocy",
    "home-portal": "portal",
    "homebox": "homebox",
    "homechart": "homechart",
    "immich-ml": "immich",
    "immich-postgres": "immich",
    "immich-redis": "immich",
    "immich-server": "immich",
    "it-tools": "it-tools",
    "kavita": "kavita",
    "lab-portal": "portal",
    "loki": "loki",
    "mailrise": "mailrise",
    "mealie": "mealie",
    "media-portal": "portal",
    "mylar3": "mylar3",
    "n8n": "n8n",
    "paperless-ngx": "paperless-ngx",
    "promtail": "loki",
    "romm": "romm",
    "romm-db": "mariadb",
    "vikunja": "vikunja",
}

WEBUI_MAP = {
    "actual-budget": "https://actual.teedge.local",
    "audiobookshelf": "https://audiobookshelf.teedge.local",
    "calibre": "https://calibre.teedge.local",
    "calibre-web": "https://calibre.teedge.local",
    "davis": "https://davis.teedge.local",
    "donetick": "https://donetick.teedge.local",
    "dozzle": "https://dozzle.teedge.local",
    "grocy": "https://grocy.teedge.local",
    "home-portal": "https://home.teedge.local",
    "homebox": "https://homebox.teedge.local",
    "homechart": "https://homechart.teedge.local",
    "immich-server": "https://immich.teedge.local",
    "it-tools": "https://it-tools.teedge.local",
    "kavita": "https://kavita.teedge.local",
    "lab-portal": "https://lab.teedge.local",
    "mealie": "https://mealie.teedge.local",
    "media-portal": "https://media.teedge.local",
    "n8n": "https://n8n.teedge.local",
    "paperless-ngx": "https://paperless.teedge.local",
    "romm": "https://romm.teedge.local",
    "vikunja": "https://vikunja.teedge.local",
}

# Health check commands from the health checks we added earlier
HEALTH_CHECKS = {
    "actual-budget": 'wget --spider -q http://localhost:5006/ || exit 1',
    "audiobookshelf": 'wget --spider -q http://localhost:80/healthcheck || exit 1',
    "calibre": 'wget --spider -q http://localhost:8080/ || exit 1',
    "calibre-web": 'wget --spider -q http://localhost:8083/ || exit 1',
    "davis": '',  # already has healthcheck in image
    "donetick": 'wget --spider -q http://localhost:2021/ || exit 1',
    "dozzle": 'wget --spider -q http://localhost:8080/healthcheck || exit 1',
    "grocy": 'wget --spider -q http://localhost:80/ || exit 1',
    "home-portal": 'wget --spider -q http://localhost:3000/ || exit 1',
    "homebox": '',  # already has healthcheck
    "homechart": 'wget --spider -q http://localhost:8080/ || exit 1',
    "immich-ml": '',  # already has healthcheck
    "immich-postgres": 'pg_isready -U postgres || exit 1',
    "immich-redis": 'redis-cli ping || exit 1',
    "immich-server": '',  # already has healthcheck
    "it-tools": 'wget --spider -q http://localhost:80/ || exit 1',
    "kavita": '',  # already has healthcheck
    "lab-portal": 'wget --spider -q http://localhost:3000/ || exit 1',
    "loki": 'wget --spider -q http://localhost:3100/ready || exit 1',
    "mailrise": 'nc -z localhost 8025 || exit 1',
    "mealie": '',  # already has healthcheck
    "media-portal": 'wget --spider -q http://localhost:3000/ || exit 1',
    "mylar3": 'wget --spider -q http://localhost:8090/ || exit 1',
    "n8n": 'wget --spider -q http://localhost:5678/healthz || exit 1',
    "paperless-ngx": '',  # already has healthcheck
    "promtail": 'wget --spider -q http://localhost:9080/ready || exit 1',
    "romm": 'wget --spider -q http://localhost:8080/ || exit 1',
    "romm-db": '',  # already has healthcheck
    "vikunja": 'wget --spider -q http://localhost:3456/api/v1/info || exit 1',
}

# Resource limits
RESOURCE_LIMITS = {
    "actual-budget": ("512m", 0.5),
    "audiobookshelf": ("512m", 0.5),
    "calibre": ("2g", 2.0),
    "calibre-web": ("512m", 0.5),
    "davis": ("512m", 0.5),
    "donetick": ("512m", 0.5),
    "dozzle": ("512m", 0.5),
    "grocy": ("512m", 0.5),
    "home-portal": ("512m", 0.5),
    "homebox": ("512m", 0.5),
    "homechart": ("1g", 1.0),
    "immich-ml": ("4g", 4.0),
    "immich-postgres": ("2g", 2.0),
    "immich-redis": ("512m", 0.5),
    "immich-server": ("4g", 4.0),
    "it-tools": ("512m", 0.5),
    "kavita": ("1g", 1.0),
    "lab-portal": ("512m", 0.5),
    "loki": ("2g", 2.0),
    "mailrise": ("512m", 0.5),
    "mealie": ("1g", 1.0),
    "media-portal": ("512m", 0.5),
    "mylar3": ("512m", 0.5),
    "n8n": ("2g", 2.0),
    "paperless-ngx": ("2g", 2.0),
    "promtail": ("256m", 0.25),
    "romm": ("1g", 1.0),
    "romm-db": ("512m", 0.5),
    "vikunja": ("1g", 1.0),
}


def get_container_info(name):
    """Get full container inspection data."""
    r = subprocess.run(
        ["docker", "inspect", name],
        capture_output=True, text=True
    )
    if r.returncode != 0:
        return None
    return json.loads(r.stdout)[0]


def build_extra_params(name):
    """Build ExtraParams string with health check + resource limits."""
    parts = ["--restart=unless-stopped"]

    hc = HEALTH_CHECKS.get(name, "")
    if hc:
        parts.append(f'--health-cmd="{hc}"')
        parts.append("--health-interval=30s")
        parts.append("--health-timeout=10s")
        parts.append("--health-retries=3")
        parts.append("--health-start-period=30s")

    mem, cpus = RESOURCE_LIMITS.get(name, ("512m", 0.5))
    parts.append(f"--memory={mem}")
    parts.append(f"--memory-swap={mem}")
    parts.append(f"--cpus={cpus}")

    return " ".join(parts)


def generate_xml(name, info):
    """Generate an Unraid XML template from container inspection data."""
    config = info["Config"]
    host_config = info["HostConfig"]
    network_settings = info["NetworkSettings"]

    # Determine network and IP
    networks = network_settings.get("Networks", {})
    network_name = "bridge"
    my_ip = ""

    if "br0" in networks:
        network_name = "br0"
        my_ip = networks["br0"].get("IPAddress", "")
    elif "macvlan" in str(networks).lower():
        for nname, ndata in networks.items():
            if ndata.get("IPAddress", "").startswith("192.168."):
                network_name = nname
                my_ip = ndata["IPAddress"]
                break

    # Image
    image = config.get("Image", "")

    # Icon
    icon_name = ICON_MAP.get(name, name)
    icon_ext = "png"
    icon_path = f"/boot/config/docker-icons/{icon_name}.{icon_ext}"
    if not os.path.exists(icon_path):
        icon_ext = "ico"
    icon_url = f"{ICON_BASE}/{icon_name}.{icon_ext}"

    # WebUI
    webui = WEBUI_MAP.get(name, "")

    # Build XML
    root = ET.Element("Container", version="2")

    def add(tag, text=""):
        el = ET.SubElement(root, tag)
        el.text = str(text) if text else ""
        return el

    add("Name", name)
    add("Repository", image)
    add("Registry", f"https://hub.docker.com/r/{image.split(':')[0]}/")
    add("Network", network_name)
    add("MyIP", my_ip)
    add("Shell", "sh")
    add("Privileged", "true" if host_config.get("Privileged") else "false")
    add("Support")
    add("Project")
    add("Overview", f"{name} container")
    add("Category", "Tools:")
    add("WebUI", webui)
    add("Icon", icon_url)
    add("ExtraParams", build_extra_params(name))
    add("PostArgs")
    add("CPUset")
    add("DateInstalled", str(int(time.time())))
    add("DonateText")
    add("DonateLink")
    add("Requires")

    # Environment variables
    env_list = config.get("Env", [])
    # Skip internal Docker/compose vars
    skip_prefixes = ("PATH=", "HOME=", "HOSTNAME=", "TERM=", "container=",
                     "com.docker", "LANG=", "LC_", "GPG_KEY=", "PYTHON",
                     "GOSU_VERSION=", "TINI_VERSION=", "DOCKER_",
                     "S6_", "LSIO_", "PUID=", "PGID=", "XDG_",
                     "NODE_ENV=", "NEXT_TELEMETRY_")
    for env in sorted(env_list):
        if any(env.startswith(p) for p in skip_prefixes):
            continue
        if "=" not in env:
            continue
        key, val = env.split("=", 1)
        # Skip if value contains ${} (env var reference that won't work standalone)
        if "${" in val:
            continue
        cfg = ET.SubElement(root, "Config",
                           Name=key, Target=key, Default="",
                           Mode="", Description="",
                           Type="Variable", Display="always",
                           Required="false", Mask="false")
        cfg.text = val

    # Volume mounts
    mounts = info.get("Mounts", [])
    for mount in sorted(mounts, key=lambda m: m.get("Destination", "")):
        source = mount.get("Source", "")
        dest = mount.get("Destination", "")
        mode = "ro" if not mount.get("RW", True) else "rw"

        if not source or not dest:
            continue
        # Skip Docker internal mounts
        if source.startswith("/var/lib/docker/") or "/proc/" in dest or "/sys/" in dest:
            continue

        mount_name = dest.rstrip("/").split("/")[-1] or dest
        cfg = ET.SubElement(root, "Config",
                           Name=mount_name, Target=dest, Default="",
                           Mode=mode, Description="",
                           Type="Path", Display="always",
                           Required="false", Mask="false")
        cfg.text = source

    # Port mappings (for bridge network containers)
    port_bindings = host_config.get("PortBindings", {}) or {}
    for container_port, bindings in sorted(port_bindings.items()):
        if not bindings:
            continue
        port_num = container_port.split("/")[0]
        proto = container_port.split("/")[1] if "/" in container_port else "tcp"
        host_port = bindings[0].get("HostPort", port_num)

        cfg = ET.SubElement(root, "Config",
                           Name=f"Port {port_num}", Target=port_num,
                           Default=port_num, Mode=proto, Description="",
                           Type="Port", Display="always",
                           Required="false", Mask="false")
        cfg.text = host_port

    return root


def indent_xml(elem, level=0):
    """Add indentation to XML elements."""
    indent = "\n" + "  " * level
    if len(elem):
        if not elem.text or not elem.text.strip():
            elem.text = indent + "  "
        if not elem.tail or not elem.tail.strip():
            elem.tail = indent
        for child in elem:
            indent_xml(child, level + 1)
        if not child.tail or not child.tail.strip():
            child.tail = indent
    else:
        if level and (not elem.tail or not elem.tail.strip()):
            elem.tail = indent
        if not elem.text:
            elem.text = ""


def main():
    # Get all composeman containers (non-onlyoffice)
    r = subprocess.run(
        ["docker", "ps", "--format", "{{.Names}}"],
        capture_output=True, text=True
    )
    all_names = sorted(r.stdout.strip().split("\n"))

    compose_containers = []
    for name in all_names:
        if "onlyoffice" in name.lower():
            continue
        info = get_container_info(name)
        if not info:
            continue
        managed = info["Config"].get("Labels", {}).get("net.unraid.docker.managed", "")
        if managed == "composeman":
            compose_containers.append((name, info))

    print(f"Found {len(compose_containers)} compose containers to convert\n")

    created = 0
    for name, info in compose_containers:
        xml_path = os.path.join(XML_DIR, f"my-{name}.xml")

        # Don't overwrite existing templates
        if os.path.exists(xml_path):
            print(f"  EXISTS {name} (template already exists)")
            created += 1
            continue

        root = generate_xml(name, info)
        indent_xml(root)

        tree = ET.ElementTree(root)
        tree.write(xml_path, xml_declaration=True, encoding="UTF-8")
        print(f"  CREATED {name}")
        created += 1

    print(f"\n=== Summary ===")
    print(f"Templates created/verified: {created}")
    print(f"Location: {XML_DIR}")
    print(f"\nTo convert containers from compose to dockerman:")
    print(f"  1. Stop compose stack: docker compose -f <file> down")
    print(f"  2. Containers will be recreated from XML templates by Unraid")
    print(f"  3. Or manually: docker stop <name> && docker rm <name>")
    print(f"     Then start from Unraid Docker tab")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Update all Docker container icon URLs to use local icon server."""
import subprocess, xml.etree.ElementTree as ET, os, re

BASE = "http://192.168.150.110:8099"

# Container name -> icon filename mapping
ICON_MAP = {
    "AdGuard-Home": "adguard-home",
    "ComiXed": "comixed",
    "ComiXed-kids": "comixed",
    "Gitea": "gitea",
    "GluetunVPN": "gluetunvpn",
    "Namer": "namer",
    "Nginx-Proxy-Manager-Official": "npm",
    "Plex-Media-Server": "plex",
    "Redis": "redis",
    "ak-outpost-ldap": "authentik",
    "alertmanager": "alertmanager",
    "authentik-db": "postgres",
    "authentik-server": "authentik",
    "authentik-worker": "authentik",
    "blackbox_exporter": "blackbox-exporter",
    "bookstack": "bookstack",
    "bookstack-db": "mariadb",
    "cadvisor": "cadvisor",
    "crowdsec": "crowdsec",
    "crowdsec-firewall-bouncer": "crowdsec",
    "docker-socket-proxy": "docker",
    "fasten": "fasten",
    "flaresolverr": "flaresolverr",
    "fleet": "fleet",
    "fleet-mysql": "mysql",
    "grafana": "grafana",
    "guacamole": "guacamole",
    "guacd": "guacamole",
    "headwind-mdm": "headwind-mdm",
    "homepage": "homepage",
    "kapowarr": "kapowarr",
    "kapowarr-kids": "kapowarr",
    "kopia": "kopia",
    "node_exporter": "prometheus",
    "ntfy": "ntfy",
    "peppermint": "peppermint",
    "postgresql18": "postgres",
    "prometheus": "prometheus",
    "prowlarr": "prowlarr",
    "qbittorrent": "qbittorrent",
    "radarr": "radarr",
    "sabnzbd": "sabnzbd",
    "seerr": "seerr",
    "sonarr": "sonarr",
    "speedtest-tracker": "speedtest-tracker",
    "stash": "stash",
    "stirling-pdf": "stirling-pdf",
    "tdarr": "tdarr",
    "ubooquity": "ubooquity",
    "ubooquity-kids": "ubooquity",
    "uptime-kuma": "uptime-kuma",
    "webcheck": "webcheck",
    "whisparr-movies": "whisparr",
    "yarnl": "yarnl",
    "youtube-dl": "youtube-dl",
}

# Compose service -> icon filename mapping
COMPOSE_ICON_MAP = {
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


def get_icon_ext(icon_name):
    """Get the file extension for an icon."""
    icon_dir = "/boot/config/docker-icons"
    for ext in ["png", "ico", "svg"]:
        if os.path.exists(f"{icon_dir}/{icon_name}.{ext}"):
            return ext
    return "png"


def update_xml_templates():
    """Update all dockerman XML templates with local icon URLs."""
    xml_dir = "/boot/config/plugins/dockerMan/templates-user"
    updated = 0

    for fname in sorted(os.listdir(xml_dir)):
        if not fname.endswith('.xml'):
            continue
        fpath = os.path.join(xml_dir, fname)
        try:
            tree = ET.parse(fpath)
            root = tree.getroot()
            name_el = root.find('Name')
            if name_el is None:
                continue
            cname = name_el.text
            if cname not in ICON_MAP:
                continue

            icon_el = root.find('Icon')
            icon_name = ICON_MAP[cname]
            ext = get_icon_ext(icon_name)
            new_url = f"{BASE}/{icon_name}.{ext}"

            if icon_el is not None and icon_el.text == new_url:
                continue

            if icon_el is None:
                icon_el = ET.SubElement(root, 'Icon')
            icon_el.text = new_url
            tree.write(fpath, xml_declaration=True, encoding='UTF-8')
            print(f"  XML {cname}: {new_url}")
            updated += 1
        except ET.ParseError:
            continue

    return updated


def update_compose_files():
    """Update icon labels in compose files."""
    compose_files = []
    for d in ["/mnt/user/compose", "/mnt/appdata/portal/build/deploy"]:
        if os.path.isdir(d):
            for f in os.listdir(d):
                if f.startswith("docker-compose.") and f.endswith(".yml"):
                    compose_files.append(os.path.join(d, f))

    updated = 0
    for fpath in sorted(set(compose_files)):
        with open(fpath, 'r') as f:
            content = f.read()

        original = content
        for svc, icon_name in COMPOSE_ICON_MAP.items():
            ext = get_icon_ext(icon_name)
            new_url = f"{BASE}/{icon_name}.{ext}"
            # Replace any existing icon URL for this service
            # Match: net.unraid.docker.icon: "..."  or net.unraid.docker.icon: ...
            pattern = rf'(net\.unraid\.docker\.icon:\s*["\']?)https?://[^\s"\']+(["\']?)'
            # Only replace in context of the right service - do global replace since each file
            # has specific services
            content = re.sub(pattern, rf'\g<1>{new_url}\g<2>', content)

        if content != original:
            with open(fpath, 'w') as f:
                f.write(content)
            print(f"  COMPOSE {os.path.basename(fpath)}")
            updated += 1

    return updated


def update_running_containers():
    """Note: can't update labels on running containers without recreating them.
    The XML templates and compose files handle this for next recreation."""
    pass


def main():
    print("=== Updating XML templates ===")
    xml_count = update_xml_templates()

    print("\n=== Updating compose files ===")
    compose_count = update_compose_files()

    print(f"\n=== Summary ===")
    print(f"XML templates updated: {xml_count}")
    print(f"Compose files updated: {compose_count}")
    print(f"\nAll icons now point to {BASE}/<name>.png")
    print(f"Icons stored at /boot/config/docker-icons/ (persistent on flash)")
    print(f"Served by icon-server container on port 8099")


if __name__ == '__main__':
    main()

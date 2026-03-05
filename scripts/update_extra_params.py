#!/usr/bin/env python3
"""Update ExtraParams in existing compose XML templates with health checks + resource limits."""
import xml.etree.ElementTree as ET, os

XML_DIR = "/boot/config/plugins/dockerMan/templates-user"

HEALTH_CHECKS = {
    "actual-budget": 'wget --spider -q http://localhost:5006/ || exit 1',
    "audiobookshelf": 'wget --spider -q http://localhost:80/healthcheck || exit 1',
    "calibre": 'wget --spider -q http://localhost:8080/ || exit 1',
    "calibre-web": 'wget --spider -q http://localhost:8083/ || exit 1',
    "davis": '',
    "donetick": 'wget --spider -q http://localhost:2021/ || exit 1',
    "dozzle": 'wget --spider -q http://localhost:8080/healthcheck || exit 1',
    "grocy": 'wget --spider -q http://localhost:80/ || exit 1',
    "home-portal": 'wget --spider -q http://localhost:3000/ || exit 1',
    "homebox": '',
    "homechart": 'wget --spider -q http://localhost:8080/ || exit 1',
    "immich-ml": '',
    "immich-postgres": 'pg_isready -U postgres || exit 1',
    "immich-redis": 'redis-cli ping || exit 1',
    "immich-server": '',
    "it-tools": 'wget --spider -q http://localhost:80/ || exit 1',
    "kavita": '',
    "lab-portal": 'wget --spider -q http://localhost:3000/ || exit 1',
    "loki": 'wget --spider -q http://localhost:3100/ready || exit 1',
    "mailrise": 'nc -z localhost 8025 || exit 1',
    "mealie": '',
    "media-portal": 'wget --spider -q http://localhost:3000/ || exit 1',
    "mylar3": 'wget --spider -q http://localhost:8090/ || exit 1',
    "n8n": 'wget --spider -q http://localhost:5678/healthz || exit 1',
    "paperless-ngx": '',
    "promtail": 'wget --spider -q http://localhost:9080/ready || exit 1',
    "romm": 'wget --spider -q http://localhost:8080/ || exit 1',
    "romm-db": '',
    "vikunja": 'wget --spider -q http://localhost:3456/api/v1/info || exit 1',
}

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

def build_extra_params(name, existing=""):
    """Build ExtraParams, preserving any existing flags like --network."""
    parts = []

    # Preserve existing non-standard flags (e.g. --network=compose_immich-internal)
    if existing:
        for part in existing.split():
            if part.startswith("--network="):
                parts.append(part)

    parts.append("--restart=unless-stopped")

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


def indent_xml(elem, level=0):
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
    updated = 0
    for fname in sorted(os.listdir(XML_DIR)):
        if not fname.startswith("my-") or not fname.endswith(".xml"):
            continue
        fpath = os.path.join(XML_DIR, fname)
        try:
            tree = ET.parse(fpath)
            root = tree.getroot()
        except ET.ParseError:
            continue

        name_el = root.find("Name")
        if name_el is None:
            continue
        name = name_el.text

        if name not in HEALTH_CHECKS:
            continue

        ep_el = root.find("ExtraParams")
        existing = ep_el.text if ep_el is not None and ep_el.text else ""

        new_params = build_extra_params(name, existing)

        # Skip if already correct
        if existing == new_params:
            print(f"  OK {name}")
            continue

        if ep_el is None:
            ep_el = ET.SubElement(root, "ExtraParams")
        ep_el.text = new_params

        indent_xml(root)
        tree.write(fpath, xml_declaration=True, encoding="UTF-8")
        print(f"  UPDATED {name}: {new_params[:80]}...")
        updated += 1

    print(f"\nUpdated {updated} templates")


if __name__ == "__main__":
    main()

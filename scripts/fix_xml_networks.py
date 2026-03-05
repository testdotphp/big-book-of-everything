#!/usr/bin/env python3
"""Fix XML templates that reference compose-created networks."""
import xml.etree.ElementTree as ET, os

XML_DIR = "/boot/config/plugins/dockerMan/templates-user"

# Containers that need network fixes
# Maps container name -> (correct network, correct IP or "", fix ExtraParams)
NETWORK_FIXES = {
    "calibre": ("bridge", "", False),
    "dozzle": ("bridge", "", False),
    "loki": ("bridge", "", False),
    "promtail": ("bridge", "", False),
    # immich containers on internal network stay as-is, but rename deploy_ to compose_
    "immich-postgres": ("bridge", "", True),  # connect to immich-internal after start
    "immich-redis": ("bridge", "", True),     # connect to immich-internal after start
    "immich-ml": ("bridge", "", True),        # connect to immich-internal after start
    # immich-server: primary on br0, secondary on immich-internal via ExtraParams
    "immich-server": ("br0", "192.168.150.136", True),
}

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

for name, (net, ip, fix_extra) in NETWORK_FIXES.items():
    xml_path = os.path.join(XML_DIR, f"my-{name}.xml")
    if not os.path.exists(xml_path):
        print(f"  SKIP {name}: no template")
        continue

    tree = ET.parse(xml_path)
    root = tree.getroot()

    changed = False

    # Fix Network element
    net_el = root.find("Network")
    if net_el is not None:
        old_net = net_el.text or ""
        if old_net != net:
            net_el.text = net
            print(f"  {name}: Network {old_net} -> {net}")
            changed = True

    # Fix MyIP
    ip_el = root.find("MyIP")
    if ip_el is not None:
        old_ip = ip_el.text or ""
        if old_ip != ip:
            ip_el.text = ip
            print(f"  {name}: MyIP {old_ip} -> {ip}")
            changed = True

    # Fix ExtraParams - rename deploy_immich-internal to immich-internal
    if fix_extra:
        ep_el = root.find("ExtraParams")
        if ep_el is not None and ep_el.text:
            old_ep = ep_el.text
            new_ep = old_ep.replace("compose_immich-internal", "immich-internal")
            new_ep = new_ep.replace("deploy_immich-internal", "immich-internal")
            if new_ep != old_ep:
                ep_el.text = new_ep
                print(f"  {name}: ExtraParams network name fixed")
                changed = True

    if changed:
        indent_xml(root)
        tree.write(xml_path, xml_declaration=True, encoding="UTF-8")
    else:
        print(f"  {name}: no changes needed")

print("\nDone. Now need to ensure immich-internal network is created as a standalone bridge.")

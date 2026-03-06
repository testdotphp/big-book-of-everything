#!/usr/bin/env python3
"""Populate Homarr board with sections and items matching Homepage layout."""
import sqlite3
import uuid

DB = "/mnt/appdata/containers/homarr/appdata/db/db.sqlite"
BOARD = "p2i2vnb7a7ugpt8vza5ieq4x"
LAYOUT = "s1vdqmrtkjnbt4lkfsm4ar9h"

def gid():
    return uuid.uuid4().hex[:24]

# Section definitions: category name -> list of app names (in display order)
SECTIONS = [
    ("Network & Infrastructure", [
        "pfSense", "Unraid", "Unraid AI", "UniFi Network", "AdGuard Home",
        "Nginx Proxy Manager", "Authentik", "Gitea", "BookStack", "Uptime Kuma",
        "Grafana", "Prometheus", "NetBox", "cAdvisor", "Blackbox Exporter",
        "CrowdSec", "Fleet", "Speedtest Tracker", "Ntfy", "IPMI Unraid", "IPMI AI",
    ]),
    ("Media", [
        "Plex", "Immich", "Seerr", "Tdarr Zion", "Tdarr Skynet",
        "Stash", "YouTube-DL", "Calibre", "OnlyOffice DocSpace", "Romm",
    ]),
    ("Reading", [
        "Audiobookshelf", "Kavita", "Calibre-Web", "Ubooquity", "Ubooquity Kids",
        "ComiXed", "ComiXed Kids", "Kapowarr", "Kapowarr Kids", "Mylar3",
    ]),
    ("Downloads", [
        "Sabnzbd", "qBittorrent", "Sonarr", "Radarr", "Prowlarr",
        "Whisparr", "GluetunVPN", "FlareSolverr",
    ]),
    ("Productivity", [
        "Paperless-ngx", "Vikunja", "Mealie", "Homechart", "Actual Budget",
        "Grocy", "DoneTick", "Peppermint",
    ]),
    ("Tools", [
        "IT-Tools", "Stirling PDF", "Web Check", "Guacamole", "Kopia", "Dozzle",
    ]),
    ("Home & Health", [
        "Homebox", "Fasten Health", "Headwind MDM", "Davis",
    ]),
    ("Portals", [
        "Home Portal", "Media Portal", "Lab Portal",
    ]),
    ("Hobby", [
        "Yarnl",
    ]),
]

def main():
    conn = sqlite3.connect(DB)
    c = conn.cursor()

    # Get app name -> id mapping
    c.execute("SELECT id, name FROM app")
    app_map = {name: aid for aid, name in c.fetchall()}

    # Clear existing sections and items (keep apps)
    c.execute("DELETE FROM item_layout")
    c.execute("DELETE FROM item")
    c.execute("DELETE FROM section_layout")
    c.execute("DELETE FROM section")

    y = 0
    for cat_name, app_names in SECTIONS:
        # Category section
        cat_id = gid()
        c.execute(
            "INSERT INTO section (id, board_id, kind, x_offset, y_offset, name, options) VALUES (?, ?, 'category', 0, ?, ?, '{\"json\": {}}')",
            (cat_id, BOARD, y, cat_name)
        )
        y += 1

        # Empty section for items below category
        empty_id = gid()
        c.execute(
            "INSERT INTO section (id, board_id, kind, x_offset, y_offset, name, options) VALUES (?, ?, 'empty', 0, ?, NULL, '{\"json\": {}}')",
            (empty_id, BOARD, y)
        )
        y += 1

        # Add items to the empty section
        cols = 5  # 5 items per row in a 10-column layout (each item width=2)
        for idx, app_name in enumerate(app_names):
            if app_name not in app_map:
                print(f"WARNING: App '{app_name}' not found, skipping")
                continue

            item_id = gid()
            app_id = app_map[app_name]
            options = '{"json":{"appId":"' + app_id + '"}}'
            adv = '{"json":{"title":null,"customCssClasses":[],"borderColor":""}}'

            c.execute(
                "INSERT INTO item (id, board_id, kind, options, advanced_options) VALUES (?, ?, 'app', ?, ?)",
                (item_id, BOARD, options, adv)
            )

            col = idx % cols
            row = idx // cols
            c.execute(
                "INSERT INTO item_layout (item_id, section_id, layout_id, x_offset, y_offset, width, height) VALUES (?, ?, ?, ?, ?, 2, 1)",
                (item_id, empty_id, LAYOUT, col * 2, row)
            )

    conn.commit()
    conn.close()

    total_apps = sum(len(apps) for _, apps in SECTIONS)
    print(f"Created {len(SECTIONS)} categories with {total_apps} apps on board")

if __name__ == "__main__":
    main()

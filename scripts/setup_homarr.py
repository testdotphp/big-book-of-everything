#!/usr/bin/env python3
"""Bulk-insert Homepage services into Homarr SQLite database."""
import sqlite3
import uuid
import json

DB_PATH = "/mnt/appdata/containers/homarr/appdata/db/db.sqlite"
BOARD_ID = "pw41jvtx8em93n92wry68raq"
LAYOUT_ID = "wzmhe5iio5e3mqzhllw4n0pq"

def gen_id():
    return uuid.uuid4().hex[:24]

# Homepage sections -> Homarr sections
SECTIONS = [
    "Network & Infrastructure",
    "Media",
    "Reading",
    "Downloads",
    "Productivity",
    "Tools",
    "Home & Health",
    "Portals",
    "Hobby",
]

# All apps from Homepage services.yaml
APPS = {
    "Network & Infrastructure": [
        ("pfSense", "Firewall & Router", "https://192.168.150.1/", "si-pfsense"),
        ("Unraid", "Main server", "http://192.168.150.110:8808/Dashboard", "si-unraid"),
        ("Unraid AI", "AI server", "http://192.168.151.65:8808/Dashboard", "si-unraid"),
        ("UniFi Network", "UniFi Controller", "https://192.168.151.135", "si-ubiquiti"),
        ("AdGuard Home", "DNS ad blocker", "http://192.168.150.10:3000", "si-adguard"),
        ("Nginx Proxy Manager", "Reverse proxy", "http://192.168.150.115:81", "si-nginx"),
        ("Authentik", "Identity provider (SSO)", "http://192.168.150.122:9000", "si-webauthn"),
        ("Gitea", "Git hosting", "http://192.168.150.118:3000", "si-gitea"),
        ("BookStack", "Documentation wiki", "https://bookstack.teedge.local", "si-bookstack"),
        ("Uptime Kuma", "Service monitoring", "http://192.168.150.119:3001", "si-uptimekuma"),
        ("Grafana", "Dashboards & alerting", "http://192.168.150.110:3001", "si-grafana"),
        ("Prometheus", "Metrics collection", "http://192.168.150.110:9090", "si-prometheus"),
        ("NetBox", "Network inventory & IPAM", "http://192.168.150.110:8000", "si-netbox"),
        ("cAdvisor", "Container metrics", "http://192.168.150.110:8080", "si-docker"),
        ("Blackbox Exporter", "HTTP/ICMP probes", "http://192.168.150.110:9115", "si-prometheus"),
        ("CrowdSec", "Security engine", "https://app.crowdsec.net", "si-crowdsource"),
        ("Fleet", "Device management", "http://192.168.150.155:8080", "si-fleet"),
        ("Speedtest Tracker", "Internet speed tests", "http://192.168.150.150:80", "si-speedtest"),
        ("Ntfy", "Push notifications", "http://192.168.150.147:80", "si-gotify"),
        ("IPMI (Unraid)", "Unraid IPMI", "http://192.168.151.230/", "si-supermicro"),
        ("IPMI (AI)", "AI server IPMI", "https://192.168.151.251/", "si-supermicro"),
    ],
    "Media": [
        ("Plex", "Media server", "https://192.168.150.114:32400/web/index.html", "si-plex"),
        ("Immich", "Photo & video library", "http://192.168.150.136:2283", "si-immich"),
        ("Seerr", "Media requests", "http://192.168.150.117:5055", "si-overseerr"),
        ("Tdarr (Zion)", "Media transcoding (Zion)", "http://192.168.150.110:8265", "si-tdarr"),
        ("Tdarr (Skynet)", "Media transcoding (Skynet)", "http://192.168.150.111:8265", "si-tdarr"),
        ("Stash", "Media organizer", "http://192.168.150.112:9999", "si-startpage"),
        ("YouTube-DL", "Video downloader", "http://192.168.150.110:8084", "si-youtube"),
        ("Calibre", "Ebook management", "http://192.168.150.110:8181", "si-calibreweb"),
        ("OnlyOffice DocSpace", "Document collaboration", "http://192.168.150.110:8880", "si-onlyoffice"),
        ("Romm", "ROM library", "http://192.168.150.125:8080", "si-retropie"),
    ],
    "Reading": [
        ("Audiobookshelf", "Audiobook & podcast server", "http://192.168.150.127:80", "si-audiobookshelf"),
        ("Kavita", "Reading server", "http://192.168.150.144:5000", "si-kavita"),
        ("Calibre-Web", "Ebook web reader", "http://192.168.150.129:8083", "si-calibreweb"),
        ("Ubooquity", "Comic & ebook server", "http://192.168.150.121:2202/ubooquity", "si-ubooquity"),
        ("Ubooquity Kids", "Kids comic server", "http://192.168.150.110:2202/ubooquity", "si-ubooquity"),
        ("ComiXed", "Comic library", "http://192.168.150.110:7172", "mdi-book-open-page-variant"),
        ("ComiXed Kids", "Kids comic library", "http://192.168.150.110:7171", "mdi-book-open-page-variant"),
        ("Kapowarr", "Comic downloader", "http://192.168.150.112:5656", "si-kapowarr"),
        ("Kapowarr Kids", "Kids comic downloader", "http://192.168.150.112:5657", "si-kapowarr"),
        ("Mylar3", "Comic book manager", "http://192.168.150.112:8090", "si-mylar"),
    ],
    "Downloads": [
        ("Sabnzbd", "NZB downloader", "http://192.168.150.116:8080", "si-sabnzbd"),
        ("qBittorrent", "Torrent client", "http://192.168.150.112:8081", "si-qbittorrent"),
        ("Sonarr", "TV show management", "http://192.168.150.112:8989", "si-sonarr"),
        ("Radarr", "Movie management", "http://192.168.150.112:7878", "si-radarr"),
        ("Prowlarr", "Indexer manager", "http://192.168.150.112:9696", "si-prowlarr"),
        ("Whisparr", "Adult content manager", "http://192.168.150.112:6969", "si-whisparr"),
        ("GluetunVPN", "VPN gateway", "http://192.168.150.112:8000", "si-wireguard"),
        ("FlareSolverr", "Captcha solver proxy", "http://192.168.150.112:8191", "mdi-shield-search"),
    ],
    "Productivity": [
        ("Paperless-ngx", "Document management", "http://192.168.150.142:8000", "si-paperlessngx"),
        ("Vikunja", "Task management", "http://192.168.150.137:3456", "si-vikunja"),
        ("Mealie", "Recipe manager", "http://192.168.150.141:9000", "si-mealie"),
        ("Homechart", "Household management", "http://192.168.150.124:3000", "si-homeassistant"),
        ("Actual Budget", "Personal finance", "http://192.168.150.126:5006", "si-actualbudget"),
        ("Grocy", "Household inventory", "http://192.168.150.143:80", "si-grocy"),
        ("DoneTick", "Chore tracking", "http://192.168.150.110:2021", "mdi-check-circle"),
        ("Peppermint", "IT helpdesk", "http://192.168.150.153:3000", "mdi-candy"),
    ],
    "Tools": [
        ("IT-Tools", "Developer utilities", "http://192.168.150.140:80", "si-ittool"),
        ("Stirling PDF", "PDF toolkit", "http://192.168.150.145:8080", "si-files"),
        ("Web Check", "Website analysis", "http://192.168.150.152:3000", "mdi-web"),
        ("Guacamole", "Remote desktop gateway", "http://192.168.150.154:8080", "si-apacheguacamole"),
        ("Kopia", "Backup management", "http://192.168.150.149:51515", "si-kopia"),
    ],
    "Home & Health": [
        ("Homebox", "Home inventory", "http://192.168.150.134:7745", "si-homeassistant"),
        ("Fasten Health", "Health records", "http://192.168.150.156:8080", "mdi-heart-pulse"),
        ("Headwind MDM", "Mobile device management", "http://192.168.150.146:8080", "mdi-cellphone-cog"),
        ("Davis", "CalDAV/CardDAV", "http://192.168.150.157:9000", "mdi-calendar"),
    ],
    "Portals": [
        ("Home Portal", "Home dashboard", "http://192.168.150.130:3000", "mdi-home"),
        ("Media Portal", "Media dashboard", "http://192.168.150.131:3000", "mdi-play-circle"),
        ("Lab Portal", "Lab dashboard", "http://192.168.150.132:3000", "mdi-flask"),
    ],
    "Hobby": [
        ("Yarnl", "Crochet pattern manager", "https://yarnl.teedge.local", "mdi-knitting"),
    ],
}

def main():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Create apps and sections
    section_ids = {}
    app_ids = {}

    # Create sections with layout positions
    for idx, section_name in enumerate(SECTIONS):
        sid = gen_id()
        section_ids[section_name] = sid
        c.execute(
            "INSERT INTO section (id, board_id, kind, name) VALUES (?, ?, 'category', ?)",
            (sid, BOARD_ID, section_name)
        )
        # Section layout: stack vertically, full width
        c.execute(
            "INSERT INTO section_layout (section_id, layout_id, parent_section_id, x_offset, y_offset, width, height) VALUES (?, ?, NULL, 0, ?, 10, 1)",
            (sid, LAYOUT_ID, idx)
        )

    # Create apps and items
    for section_name, apps in APPS.items():
        sid = section_ids[section_name]
        for app_idx, (name, desc, href, icon) in enumerate(apps):
            # Create the app
            app_id = gen_id()
            # Use Homarr icon format
            icon_url = f"https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/{name.lower().replace(' ', '-').replace('(', '').replace(')', '')}.svg"

            c.execute(
                "INSERT INTO app (id, name, description, icon_url, href) VALUES (?, ?, ?, ?, ?)",
                (app_id, name, desc, icon_url, href)
            )

            # Create item linking app to board
            item_id = gen_id()
            options = json.dumps({"json": {"appId": app_id}})
            c.execute(
                "INSERT INTO item (id, board_id, kind, options, advanced_options) VALUES (?, ?, 'app', ?, '{\"json\": {}}')",
                (item_id, BOARD_ID, options)
            )

            # Item layout within section - 2 columns, flowing
            col = app_idx % 5
            row = app_idx // 5
            c.execute(
                "INSERT INTO item_layout (item_id, section_id, layout_id, x_offset, y_offset, width, height) VALUES (?, ?, ?, ?, ?, 2, 1)",
                (item_id, sid, LAYOUT_ID, col * 2, row)
            )

    conn.commit()
    conn.close()
    print(f"Inserted {len(SECTIONS)} sections and {sum(len(v) for v in APPS.values())} apps")


if __name__ == "__main__":
    main()

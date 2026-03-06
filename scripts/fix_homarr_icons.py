#!/usr/bin/env python3
"""Fix Homarr app icon URLs to use dashboard-icons CDN."""
import sqlite3

DB = "/mnt/appdata/containers/homarr/appdata/db/db.sqlite"
CDN = "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg"

# Map app name -> dashboard-icons slug
ICON_MAP = {
    "pfSense": "pfsense",
    "Unraid": "unraid",
    "Unraid AI": "unraid",
    "UniFi Network": "unifi",
    "AdGuard Home": "adguard-home",
    "Nginx Proxy Manager": "nginx-proxy-manager",
    "Authentik": "authentik",
    "Gitea": "gitea",
    "BookStack": "bookstack",
    "Uptime Kuma": "uptime-kuma",
    "Grafana": "grafana",
    "Prometheus": "prometheus",
    "NetBox": "netbox",
    "cAdvisor": "cadvisor",
    "Blackbox Exporter": "prometheus",
    "CrowdSec": "crowdsec",
    "Fleet": "fleet",
    "Speedtest Tracker": "speedtest-tracker",
    "Ntfy": "ntfy",
    "IPMI Unraid": "supermicro",
    "IPMI AI": "supermicro",
    "Plex": "plex",
    "Immich": "immich",
    "Seerr": "overseerr",
    "Tdarr Zion": "tdarr",
    "Tdarr Skynet": "tdarr",
    "Stash": "stash",
    "YouTube-DL": "youtube",
    "Calibre": "calibre",
    "OnlyOffice DocSpace": "onlyoffice",
    "Romm": "romm",
    "Audiobookshelf": "audiobookshelf",
    "Kavita": "kavita",
    "Calibre-Web": "calibre-web",
    "Ubooquity": "ubooquity",
    "Ubooquity Kids": "ubooquity",
    "ComiXed": "comixed",
    "ComiXed Kids": "comixed",
    "Kapowarr": "kapowarr",
    "Kapowarr Kids": "kapowarr",
    "Mylar3": "mylar",
    "Sabnzbd": "sabnzbd",
    "qBittorrent": "qbittorrent",
    "Sonarr": "sonarr",
    "Radarr": "radarr",
    "Prowlarr": "prowlarr",
    "Whisparr": "whisparr",
    "GluetunVPN": "gluetun",
    "FlareSolverr": "flaresolverr",
    "Paperless-ngx": "paperless-ngx",
    "Vikunja": "vikunja",
    "Mealie": "mealie",
    "Homechart": "homechart",
    "Actual Budget": "actual",
    "Grocy": "grocy",
    "DoneTick": "donetick",
    "Peppermint": "peppermint",
    "IT-Tools": "it-tools",
    "Stirling PDF": "stirling-pdf",
    "Web Check": "web-check",
    "Guacamole": "guacamole",
    "Kopia": "kopia",
    "Dozzle": "dozzle",
    "Homebox": "homebox",
    "Fasten Health": "fasten-health",
    "Headwind MDM": "headwind-mdm",
    "Davis": "davis",
    "Home Portal": "homepage",
    "Media Portal": "homepage",
    "Lab Portal": "homepage",
    "Yarnl": "yarn",
}

conn = sqlite3.connect(DB)
c = conn.cursor()

updated = 0
for name, slug in ICON_MAP.items():
    url = f"{CDN}/{slug}.svg"
    c.execute("UPDATE app SET icon_url = ? WHERE name = ?", (url, name))
    if c.rowcount > 0:
        updated += c.rowcount

conn.commit()
conn.close()
print(f"Updated {updated} app icons")

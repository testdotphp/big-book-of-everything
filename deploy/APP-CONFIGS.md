# Homelab Application Configurations

Full application-level configuration documentation for all 39 running containers.
Captured: 2026-02-27

---

## Table of Contents

1. [Media Stack (GluetunVPN)](#media-stack)
   - Radarr, Sonarr, Prowlarr, Whisparr, qBittorrent, FlareSolverr
2. [Media Frontend](#media-frontend)
   - Plex, Overseerr, Tdarr
3. [Download Clients](#download-clients)
   - SABnzbd, qBittorrent
4. [Reading & Comics](#reading--comics)
   - Kapowarr (x2), ComiXed (x2), Ubooquity (x2)
5. [Infrastructure](#infrastructure)
   - AdGuard Home, Nginx Proxy Manager, Authentik, Grafana, Prometheus
6. [Applications](#applications)
   - Gitea, BookStack, NetBox, Uptime Kuma, Homepage, YouTube-DL

---

## Media Stack

All *arr apps share the GluetunVPN network at **192.168.150.112** (macvlan br0).

### Radarr (v6.0.4.10291)

| Setting | Value |
|---------|-------|
| Port | 7878 |
| Branch | master |
| Auth | Forms (disabled for local) |
| Database | SQLite |
| Runtime | .NET 8.0.12 (Alpine) |
| Package | linuxserver.io |

**Quality Profile: "Any"**
- Upgrade allowed, cutoff: WEB 1080p group
- All qualities enabled except Unknown, WORKPRINT, CAM, TELESYNC, TELECINE, DVDSCR, REGIONAL
- Custom format scoring: HEVC +5, x265 +5, HDR10 +6, HDR10+ Boost +7, DV HDR10 +5, 3D -10, HFR -10, Telesync -20, DV (WEBDL) -10, Bad Dual Groups -10
- Cutoff format score: 10, min upgrade format score: 1

**Root Folders:**
| Path | Notes |
|------|-------|
| /media/MEDIA/Movies | Main library |
| /media/MEDIA/Kids-Movies | Kids content |
| /media/MEDIA/Documentary-Movies | Documentaries |
| /media/MEDIA/Special | Adult content |
| /media/MEDIA/Other-Movies | Overflow (968 unmapped) |

**Download Clients:**
- qBittorrent: localhost:8081 (category: movies, initial state: stopped)
- SABnzbd: 192.168.150.116:8080 (category: movies, priority: high)

**Naming:**
- Movie format: `{Movie_Title}_({Release Year})_{ImdbId}_{MediaInfo AudioLanguagesAll}`
- Folder format: `{Movie_Title}_({Release Year})`

**Media Management:**
- Hardlinks: enabled
- Import extras: .srt, .srr
- Skip free space check: yes
- Propers/repacks: prefer and upgrade

**Custom Formats (10):**
x265, Bad Dual Groups (23 group regexes), DV (WEBDL), HDR10+ Boost, HFR, 3D, DV HDR10, HDR10, HEVC, Telesync

**Import Lists:** 22 TMDb Person lists (auto-add cast movies, search on add, monitor: movieOnly, root: /media/MEDIA/Movies)

**Notifications:** None configured

**Indexers:** 44 (3 usenet, 41 torrent) - all synced from Prowlarr

---

### Sonarr (v4.0.16.2944)

| Setting | Value |
|---------|-------|
| Port | 8989 |
| Branch | main |
| Auth | Basic (disabled for local) |
| Database | SQLite |
| Runtime | .NET 6.0.13 (Alpine) |

**Quality Profile: "Ultra-HD"**
- Upgrade allowed, cutoff: Bluray-2160p Remux
- All qualities enabled (SDTV through 2160p Remux)
- Custom format scoring: DV -10, H265 +10

**Root Folders:**
| Path | Notes |
|------|-------|
| /media/MEDIA/TV | Main library |
| /media/MEDIA/Kids-TV | Kids content |
| /media/MEDIA/Documentary-Shows | Documentaries |
| /media/MEDIA/Special-TV | Adult content |

**Download Clients:**
- qBittorrent: localhost:8081 (category: tv)
- SABnzbd: 192.168.150.116:8080 (category: tv, recent priority: high)

**Naming:**
- Standard: `{Series TitleYear} - {season:0}x{episode:00} - {Episode CleanTitle} {Quality Full} [EN]`
- Daily: `{Series Title} - {Air-Date} - {Episode Title} {Quality Full} [EN]`
- Anime: `{Series Title} - S{season:00}E{episode:00} - {Quality Full} [EN]`
- Series folder: `{Series Title}`, Season folder: `Season {season}`

**Media Management:**
- Hardlinks: disabled (copyUsingHardlinks: false)
- Import extras: .srt, .srr
- Skip free space check: yes

**Notifications:**
- Plex Media Server: 192.168.150.114:32400 (SSL, update library on download/upgrade/rename/series events)

**Custom Formats:** H265 (+10), DV (-10)

**Indexers:** 35 (3 usenet, 32 torrent) - all synced from Prowlarr

---

### Prowlarr (v2.3.0.5236)

| Setting | Value |
|---------|-------|
| Port | 9696 |
| Branch | master |
| Auth | Forms (disabled for local) |
| Package | binhex (Arch-based) |

**Indexers: 58 total**
- 3 usenet (NZBgeek, NZBFinder, Spotweb/Tabula Rasa)
- 55 torrent (public + TorrentLeech private + 2 semi-private)

**Priority tiers:**
- Priority 1: NZBgeek, Spotweb, TorrentLeech
- Priority 2: NZBFinder
- Priority 10: 1337x
- Priority 25: all others

**Connected Applications:**
| App | URL | Sync Level |
|-----|-----|------------|
| Radarr | localhost:7878 | Full Sync |
| Sonarr | localhost:8989 | Full Sync |
| Whisparr-v3 | localhost:6969 | Disabled |

**Indexer Proxy:** FlareSolverr at localhost:8191 (60s timeout, tag: flaresolverr)

---

### Whisparr (v3.2.4.378)

| Setting | Value |
|---------|-------|
| Port | 6969 |
| Branch | eros |
| Auth | Forms (disabled for local) |

**Root Folders:**
- /data/MEDIA/Special
- /data/MEDIA/Special/library_import

**Quality Profiles:** 7 (Any, SD, HD-720p, HD-1080p, Ultra-HD, HD-720p/1080p, VR)

**Download Clients:**
- qBittorrent: localhost:8081 (category: whisparr, initial state: pause)
- SABnzbd: 192.168.150.116:8080 (category: whisparr, priority: paused/low)

**Naming:**
- Movie: `{Movie Title} ({Release Year}) {Quality Full}`
- Movie folder: `movies/{Movie Title} ({Release Year})`
- Scene: `{Scene Title} - {Release Date} {Quality Full}`
- Scene folder: `scenes/{Studio Title}/{Scene Title} - {Release Date}`

**Notifications:** Stash integration at localhost:9989 (generate covers/previews/phashes, metadata identify via StashDB, auto-tag, include male performers)

**Indexers:** 53 (3 usenet, 50 torrent) - synced from Prowlarr

---

### qBittorrent

| Setting | Value |
|---------|-------|
| Port | 8081 (WebUI) |
| Listen port | 6881 |
| User | teedge |
| UI | VueTorrent |

**Key Settings:**
- Max ratio: 0.01, max seeding: 1 min, max inactive seeding: 1 min
- Share limit action: Stop
- Max active downloads: 1000, torrents: 100, uploads: 100
- Max connections: 3000 (250 per torrent)
- Auto-run on complete: `chmod -Rf 777 /downloads/complete/`
- Save path: /downloads/complete, temp: /downloads/incomplete/torrents-incomplete
- Excluded files: `*.nzb, *.torrent, screens, sample, rargb.txt, *.scr, SAMPLE`
- Additional trackers: auto-updated from ngosang/trackerslist (40+ trackers)
- Reverse proxy support enabled (trusted: 192.168.150.115)
- Subnet whitelist: 192.168.150.0/23
- CSRF protection: off, clickjacking protection: on

---

### FlareSolverr

Bridge network, accessed internally by Prowlarr at localhost:8191. No additional config needed.

---

## Media Frontend

### Plex Media Server (v1.43.0.10492)

| Setting | Value |
|---------|-------|
| IP | 192.168.150.114:32400 |
| Name | Zion |
| Owner | teedge77@gmail.com |
| Plex Pass | Yes |
| Platform | Linux 6.12.54-Unraid |

**Libraries (13):**
| Type | Library | Path(s) |
|------|---------|---------|
| movie | Documentary Movies | /media/MEDIA/Documentary-Movies |
| movie | Kids Movies | Kennadi-Movies, Kids-Movies, Aidan-Movies |
| movie | Movies | Movies, Movies-to-Check |
| movie | Special Movies | Other-Movies, Special/movies (hidden) |
| movie | Special Scenes | Special-Scenes |
| movie | Special Studios | Special/scenes (hidden) |
| show | Documentary - TV Shows | Documentary-Shows |
| show | Kids TV Shows | Aidan-TV, Kennadi-TV, Kids-TV |
| show | TV Shows | TV |
| artist | Music | Music (hidden) |
| photo | Photos | Pictures/1-Plex-ready-photos |
| movie | Studying | Studying |
| movie | YouTube | YouTube-Videos (hidden) |

**Transcoding:**
- GPU: NVIDIA RTX A4000 (10de:24b0)
- Max simultaneous GPU transcodes: 1
- H264 background preset: ultrafast
- Tone mapping: hable
- Transcode temp: /transcode
- Throttle buffer: 300s

**Network:**
- Secure connections: Required
- Custom domain: teedge.pw
- Custom connections: https://plex.teedge.pw
- LAN networks: 192.168.150.0/23
- Relay: disabled
- IPv6: disabled
- WAN per-user stream count: 1
- WAN total upload: 900 Mbps

**Butler:** 11pm-7am, all tasks enabled (backup DB, optimize DB, clean bundles/cache, refresh libraries/metadata, deep media analysis, intro/credits markers)

**Accounts:** 19 users (teedge77 + 18 shared/managed users)

---

### Overseerr (v1.35.0)

| Setting | Value |
|---------|-------|
| IP | 192.168.150.117:5055 |
| Title | Overseerr |
| Region | US |
| Language | en |

**Plex Integration:**
- Server: Zion at 192.168.150.114:32400 (SSL)
- Enabled libraries: Documentary Movies, Kids Movies, Movies, Documentary TV, Kids TV, TV Shows
- Disabled: Special Movies, Special Scenes, Special Studios, Studying

**Radarr Integration:**
- Server: 192.168.150.112:7878
- Profile: Any, Root: /media/MEDIA/Movies
- Sync enabled, tag requests, prevent search: off

**Sonarr Integration:**
- Server: 192.168.150.112:8989
- Profile: Ultra-HD, Root: /media/MEDIA/TV
- Season folders enabled, sync enabled, tag requests

**Notifications:**
- Email: enabled (Gmail SMTP, from teedge77@gmail.com)
- All others: disabled

**Jobs:**
- Plex recently added scan: hourly
- Plex full scan: every 72h
- Radarr/Sonarr scan: every 72h

---

### Tdarr (v2.58.02)

| Setting | Value |
|---------|-------|
| IP | 192.168.150.110:8265 |
| GPU | NVENC |
| Theme | dark |

**Node: "Node (Internal)"**
- GPU: nvenc, allow GPU to do CPU: yes
- Max GPU workers: 100
- Workers (active): 2 healthcheck CPU, 2 transcode GPU
- Schedule: disabled (workers set manually)

**Libraries (9):**
| Library | Path | Priority | Transcoded | Size Saved |
|---------|------|----------|------------|------------|
| TV | /mnt/media/TV | 0 | 15,633 | 10.3 TB |
| Documentaries | /mnt/media/Documentary-Movies | 1 | 738 | 1.6 TB |
| Kids TV | /mnt/media/Kids-TV | 2 | 8,809 | 2.1 TB |
| Documentary TV | /mnt/media/Documentary-Shows | 3 | 12,993 | 3.9 TB |
| Special Movies | /mnt/media/Special | 4 | 19,736 | 17.8 TB |
| Special TV | /mnt/media/Special-TV | 5 | 1,912 | 0.7 TB |
| Special Scenes | /mnt/media/Special-Scenes | 6 | 25,591 | 19.4 TB |
| Movies | /mnt/media/Movies/ | 7 | 3,847 | 19.2 TB |
| Kids Movies | /mnt/media/Kids-Movies | 8 | 1,502 | 7.1 TB |

**Plugin Stack (all libraries):**
1. Remove Image Formats (MJPEG, PNG, GIF)
2. Reorder Streams (video first)
3. Transcode via NVENC (H265)
4. File Size Check (10-90% bounds)
5. Add to Radarr post-processing (192.168.150.112:7878)

**Total transcoded:** ~90,761 files, ~82.1 TB saved

---

## Download Clients

### SABnzbd

| Setting | Value |
|---------|-------|
| IP | 192.168.150.116:8080 |
| HTTPS | 8090 |
| UI | Glitter Night |

**Usenet Servers:**
| Server | Port | Connections | SSL | Status |
|--------|------|-------------|-----|--------|
| news-us.newshosting.com | 563 | 95 | Yes | Disabled |
| news-eu.newshosting.com | 563 | 95 | Yes | Active |

**Stats:** ~319.8 TB total, ~15 TB this month, ~2.6 TB this week

**Categories:**
| Category | Directory | Priority |
|----------|-----------|----------|
| tv | tv | Normal |
| movies | movies | Normal |
| music | music | High |
| books | books | High |
| comics | comics | High |
| whisparr | whisparr | Low |
| special | special | Low |

**Key Settings:**
- Bandwidth limit: 100M (90% perc)
- Cache: 1G
- Incomplete dir: /downloads/incomplete/sabnzbd-incomplete
- Complete dir: /downloads/complete
- Permissions: 777
- Cleanup: nfo, sfv
- Schedule: pause 6am, resume 11pm, pause post-processing 7am, resume post-processing 11pm
- Start paused: yes
- Direct unpack: yes (3 threads)
- Deobfuscate filenames: yes
- Duplicate handling: no_dupes=2, no_smart_dupes=2

---

## Reading & Comics

### Kapowarr (main, port 5656)

| Setting | Value |
|---------|-------|
| Network | GluetunVPN (.112:5656) |
| Root folder | /content/Pubs/comics/ |
| ComicVine API | configured |

- Download client: qBittorrent (192.168.150.112:8081)
- FlareSolverr: 192.168.150.112:8191
- Pixeldrain: configured
- Naming: `{series_name} ({year}) Volume {volume_number} Issue {issue_number}`
- Update interval: 1h, search interval: 24h
- Seeding handling: copy, delete completed torrents

### Kapowarr Kids (port 5657)

Same config as main but:
- Root folder: /content/ (Kids-Comics)
- Download dir: /app/temp_downloads (comics-kids)

### ComiXed (port 7172) / ComiXed Kids (port 7171)

Java-based (JDK 21), H2 database (binary, not text-readable).
- Main library: /library -> /mnt/user/MEDIA/Pubs/comics/
- Kids library: /library -> /mnt/user/MEDIA/Pubs/Kids-Comics/
- Import dirs: /incoming -> /mnt/user/MEDIA/1-IMPORT/0_SORT/

### Ubooquity (192.168.150.121:2202) / Ubooquity Kids (bridge:2202)

| Setting | Value |
|---------|-------|
| Library port | 2202 |
| Admin port | 2203 |
| Reverse proxy prefix | ubooquity |

**Main instance paths:** /comics, /books, /files (full MEDIA share)
**Kids instance paths:** /comics (Kids-Comics), /books (Kids-Books), /files

Both: no user management, auto-scan at launch, no OPDS, default theme

---

## Infrastructure

### AdGuard Home (192.168.150.10)

| Setting | Value |
|---------|-------|
| Web UI | 192.168.150.10:3000 |
| DNS | 192.168.150.10:53 |
| Schema | v33 |

**DNS:**
- Upstream: 1.1.1.1, 8.8.8.8, 192.168.150.1
- Mode: fastest_addr
- DNSSEC: enabled
- Cache: 4 MB
- Rate limit: 20/s per /24

**Filters:** AdGuard DNS filter (enabled), AdAway (disabled)
**Parental control:** enabled

**DNS Rewrites (27, all -> 192.168.150.115/NPM):**
sonarr, radarr, prowlarr, whisparr, sabnzbd, qbit, kuma, prometheus, tdarr, ytdl, ubooquity, comixed, overseerr, adguard, grafana, gitea, bookstack, netbox, homepage, plex, cadvisor, comixed-kids, kapowarr, kapowarr-kids, npm, flaresolverr, authentik

**Persistent Clients:** 7 (Samsung S8 Ultra, Shield, Steam Desktop, desktop, garuda-desktop, home assistant, phone-tj)

---

### Nginx Proxy Manager (192.168.150.115)

**27 proxy hosts, all with:**
- Custom SSL cert (wildcard *.teedge.local)
- HTTP/2 enabled
- Force SSL enabled
- WebSocket upgrade headers

| Domain | Backend | Authentik SSO |
|--------|---------|---------------|
| sonarr.teedge.local | .112:8989 | Yes |
| radarr.teedge.local | .112:7878 | Yes |
| prowlarr.teedge.local | .112:9696 | Yes |
| whisparr.teedge.local | .112:6969 | Yes |
| sabnzbd.teedge.local | .116:8080 | Yes |
| qbit.teedge.local | .112:8081 | Yes |
| kuma.teedge.local | .119:3001 | Yes |
| prometheus.teedge.local | .110:9090 | Yes |
| tdarr.teedge.local | .110:8265 | Yes |
| ytdl.teedge.local | .110:8084 | Yes |
| ubooquity.teedge.local | .121:2202 | Yes |
| comixed.teedge.local | .110:7172 | Yes |
| overseerr.teedge.local | .117:5055 | Yes |
| adguard.teedge.local | .10:3000 | Yes |
| grafana.teedge.local | .110:3001 | No (native OIDC) |
| gitea.teedge.local | .118:3000 | No (native OIDC) |
| bookstack.teedge.local | .120:80 | No (native OIDC) |
| netbox.teedge.local | .110:8000 | No (native OIDC) |
| authentik.teedge.local | .122:9000 | No (is the auth server) |
| homepage.teedge.local | .12:3000 | Yes |
| plex.teedge.local | .114:32400 | No (Plex auth) |
| cadvisor.teedge.local | .110:8080 | Yes |
| comixed-kids.teedge.local | .110:7171 | Yes |
| kapowarr.teedge.local | .112:5656 | Yes |
| kapowarr-kids.teedge.local | .112:5657 | Yes |
| npm.teedge.local | .115:81 | No (admin UI) |
| flaresolverr.teedge.local | .112:8191 | Yes |

Authentik forward-auth: `auth_request /outpost.goauthentik.io/auth/nginx` -> 192.168.150.122:9000

---

### Authentik (192.168.150.122)

| Setting | Value |
|---------|-------|
| Version | 2025.2 |
| Database | PostgreSQL 16 at .110:5433 |
| Redis | .110:6379 (DB 1) |

**Outposts:**
- LDAP: 192.168.150.123 + 192.168.150.2

**Connected apps with native OIDC:**
- Grafana (Generic OAuth, role mapping: Admins -> Admin, else Viewer)
- BookStack (OIDC provider)
- NetBox (social_core OpenIdConnectAuth)

**All other apps:** forward-auth via NPM proxy (see NPM table above)

---

### Grafana (192.168.150.110:3001)

| Setting | Value |
|---------|-------|
| Root URL | https://grafana.teedge.local |
| Database | SQLite |
| Theme | dark |

**Auth:** Generic OAuth via Authentik
- Auth URL: https://authentik.teedge.local/application/o/authorize/
- Role mapping: `contains(groups, 'authentik Admins') && 'Admin' || 'Viewer'`

**Datasources:** Prometheus (http://192.168.150.110:9090, default)

**Dashboards:**
- Cadvisor exporter (ID: 14282) - Docker container metrics
- Node Exporter Full (ID: 1860) - Host system metrics

---

### Prometheus (192.168.150.110:9090)

| Setting | Value |
|---------|-------|
| Retention | 90 days |
| Scrape interval | 30s |
| GOGC | 75 |

**Scrape Targets:**
| Job | Target(s) | Status |
|-----|-----------|--------|
| prometheus | localhost:9090 | Up |
| node | .110:9100 (unraid) | Up |
| node | .151.65:9100 (unraid-ai) | **DOWN** |
| cadvisor | .110:8080 (unraid) | Up |
| blackbox-http | 8 endpoints | All up |
| blackbox-icmp | 12 hosts | All up |

**Blackbox HTTP targets:** NetBox, Plex, NPM, Overseerr, Gitea, Homepage, AdGuard, pfSense, HA (.225:5000)
**Blackbox ICMP targets:** pfSense, Unraid, Unraid-AI, Synology, Meraki, misc (.2-.6, .172, .215)

**Issues:** No Alertmanager configured, no alerting rules, unraid-ai node_exporter is down

---

## Applications

### Gitea (192.168.150.118:3000)

| Setting | Value |
|---------|-------|
| Root URL | https://gitea.teedge.local/ |
| Database | SQLite |
| SSH | enabled (port 22) |
| LFS | enabled |

- Offline mode: yes (no external requests)
- Registration: open
- Sign-in required to view: no
- OpenID: sign-in and sign-up enabled
- No reply address: teedge77@gmail.com
- CA cert mounted for OIDC trust

---

### BookStack (192.168.150.120)

| Setting | Value |
|---------|-------|
| URL | https://bookstack.teedge.local |
| Database | MariaDB 10 at .110:3307 |
| Auth | OIDC (Authentik) |

- OIDC issuer: https://authentik.teedge.local/application/o/bookstack/
- Auto-initiate: false

---

### NetBox (192.168.150.110:8000)

| Setting | Value |
|---------|-------|
| Version | v4.5-4.0.1 |
| Database | PostgreSQL 18 at .110:5432 |
| Redis | .110:6379 |
| Auth | OIDC (Authentik) |

- OIDC endpoint: https://authentik.teedge.local/application/o/netbox/
- GraphQL: enabled
- Webhooks: enabled
- Auto-create users: yes
- CA cert mounted

---

### Uptime Kuma (192.168.150.119:3001)

| Setting | Value |
|---------|-------|
| Data retention | 180 days |
| API keys | enabled |

**34 monitors** (all active, 60s interval):

| # | Name | Type | Target |
|---|------|------|--------|
| 1 | AdGuard Home | http | .10:6053 |
| 2 | Nginx Proxy Manager | http | .115:81 |
| 3 | Gitea | http | .118:3000 |
| 4 | Grafana | http | .110:3001 |
| 5 | Prometheus | http | .110:9090 |
| 6 | NetBox | http | .110:8000 |
| 7 | Overseerr | http | .117:5055 |
| 8 | Tdarr | http | .110:8265 |
| 9 | YouTube-DL | http | .110:8084 |
| 10-11 | Ubooquity / Kids | http | .121:2202, .110:2202 |
| 12-13 | ComiXed / Kids | http | .110:7172, .110:7171 |
| 14-15 | Kapowarr / Kids | http | .112:5656, .112:5657 |
| 16 | Sabnzbd | http | .116:8080 |
| 17 | qBittorrent | http | .112:8081 |
| 18-21 | Sonarr/Radarr/Prowlarr/Whisparr | http | .112:various |
| 22 | GluetunVPN | http | .112:8000 |
| 23 | Synology NAS | ping | .225 |
| 24 | Meraki Switch | ping | .151.10 |
| 25 | Homepage | ping | .12 |
| 26-28 | pfSense/Unraid/Unraid-AI | http | .1/.110:8808/.151.65:8808 |
| 29 | UniFi Controller | http | .151.135 |
| 30-31 | IPMI Unraid/AI | http | .151.230/.151.251 |
| 32 | Plex | http | .114:32400 |
| 33 | BookStack | http | .120 |
| 34 | Authentik | http | .122:9000 |

---

### Homepage (192.168.150.12)

| Setting | Value |
|---------|-------|
| Title | "So much... shit" |
| Theme | dark/cyan |
| Docker host | .110:2375 |

**4 service groups, 37 services** (Network & Infrastructure: 18, Media: 4, Reading: 6, Downloads: 7)

Widgets with API integration: Uptime Kuma, Overseerr, SABnzbd, qBittorrent, Sonarr, Radarr

---

### YouTube-DL (192.168.150.110:8084)

| Setting | Value |
|---------|-------|
| Quality | 1080p |
| Interval | 3h |
| Output | /downloads -> /mnt/user/MEDIA/YouTube-Videos/ |

- yt-dlp v2026.02.04
- Output: `%(playlist)s/%(channel)s/%(title)s.%(upload_date)s.%(ext)s`
- Merge format: mkv/mp4
- Embed: subs, thumbnail, metadata
- SponsorBlock: mark all
- Concurrent fragments: 5
- Sleep between requests: 5s
- Geo-bypass: enabled

Also has YoutubeDL-Material web UI component (port 17442 internal, download-only mode, max 5 concurrent downloads).

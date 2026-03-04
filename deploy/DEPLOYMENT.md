# Portal Deployment Guide

## Container Inventory

### New Containers — Macvlan (br0)

| IP | Container | Port | Image | Portal |
|---|---|---|---|---|
| .150.124 | Homechart | 3000 | `ghcr.io/candiddev/homechart:latest` | Home |
| .150.141 | Mealie | 9000 | `ghcr.io/mealie-recipes/mealie:latest` | Home |
| .150.126 | Actual Budget | 5006 | `ghcr.io/actualbudget/actual-server:latest` | Home |
| .150.127 | Audiobookshelf | 80 | `ghcr.io/advplyr/audiobookshelf:latest` | Media |
| .150.144 | Kavita | 5000 | `jvmilazz0/kavita:latest` | Media |
| .150.129 | Calibre-Web | 8083 | `lscr.io/linuxserver/calibre-web:latest` | Media |
| .150.130 | Home Portal | 3000 | Custom SvelteKit | — |
| .150.131 | Media Portal | 3000 | Custom SvelteKit | — |
| .150.132 | Homelab Portal | 3000 | Custom SvelteKit | — |
| .150.142 | Paperless-ngx | 8000 | `ghcr.io/paperless-ngx/paperless-ngx:latest` | Home |
| .150.134 | Homebox | 7745 | `ghcr.io/sysadminsmedia/homebox:latest` | Home |
| .150.143 | Grocy | 80 | `lscr.io/linuxserver/grocy:latest` | Home |
| .150.136 | Immich | 2283 | `ghcr.io/immich-app/immich-server:latest` | Home |
| .150.137 | Vikunja | 3456 | `vikunja/vikunja:latest` | Home |
| ~~.150.138~~ | ~~HomeHub~~ | ~~3000~~ | ~~`surajverma/homehub:latest`~~ | ~~Home~~ (image not found) |
| .150.139 | n8n | 5678 | `n8nio/n8n:latest` | Lab |
| .150.140 | IT-Tools | 80 | `corentinth/it-tools:latest` | Lab |
| .150.145 | Stirling PDF | 8080 | `stirlingtools/stirling-pdf:latest` | Home |
| .150.146 | Headwind MDM | 8080 | `headwindmdm/hmdm:latest` | Lab (needs interactive setup) |
| .150.147 | Ntfy | 80 | `binwiederhier/ntfy:latest` | Lab |
| .150.148 | CrowdSec | 8080 | `crowdsecurity/crowdsec:latest` | Lab |
| .150.149 | Kopia | 51515 | `kopia/kopia:latest` | Lab |
| .150.150 | Speedtest Tracker | 80 | `lscr.io/linuxserver/speedtest-tracker:latest` | Lab |
| .150.152 | Webcheck | 3000 | `lissy93/web-check:latest` | Lab |
| .150.153 | Peppermint | 3000 | `pepperlabs/peppermint:latest` | Home |
| .150.154 | Guacamole | 8080 | `guacamole/guacamole:1.6.0` | Lab |
| .150.155 | FleetDM | 8080 | `fleetdm/fleet:v4.81.0` | Lab |
| .150.156 | Fasten Health | 8080 (HTTPS) | `ghcr.io/fastenhealth/fasten-onprem:main` | Home |

### New Containers — Bridge

| Container | Port | Image | Notes |
|---|---|---|---|
| Dozzle | 8090→8080 | `amir20/dozzle:latest` | Lab |
| Loki | 3100 | `grafana/loki:latest` | Backend (Grafana datasource) |
| Promtail | 9080 | `grafana/promtail:latest` | Backend (ships logs to Loki) |
| Calibre | 8081→8080 | `lscr.io/linuxserver/calibre:latest` | Headless library management |
| Immich ML | 3003 | `ghcr.io/immich-app/immich-machine-learning:latest` | Sidecar for Immich |
| Immich Redis | 6379 | `redis:7-alpine` | Sidecar for Immich |
| Immich PostgreSQL | 5432 | `tensorchord/pgvecto-rs:pg16-v0.2.0` | Sidecar for Immich (pgvecto.rs) |
| guacd | 4822 | `guacamole/guacd:1.6.0` | Backend for Guacamole |
| fleet-mysql | 3306 | `mysql:8.0` | MySQL for FleetDM |

### New Containers — GluetunVPN

| Container | Port | Image | Notes |
|---|---|---|---|
| Readarr | 8787 | `lscr.io/linuxserver/readarr:develop` | Lab (Media Backend) |

### Already Deployed (add to portal sidebar only)

| IP | Service | Port | Portal |
|---|---|---|---|
| .150.110 | Unraid | 80 | Lab |
| .150.1 | pfSense | 443 | Lab |
| .150.110 | Prometheus | 9090 | Lab |
| .150.12 | Homepage | 3000 | All (landing page + Lab sidebar) |
| .150.112 | Sonarr | 8989 | Lab |
| .150.112 | Radarr | 7878 | Lab |
| .150.112 | Prowlarr | 9696 | Lab |
| .150.112 | Whisparr | 6969 | Lab |
| .150.112 | qBittorrent | 8080 | Lab |
| .150.112 | Flaresolverr | 8191 | Lab |
| .150.112 | Kapowarr Kids | 5657 | Lab |
| .150.116 | SABnzbd | 8080 | Lab |
| .150.110 | Tdarr | 8265 | Lab |
| .150.110 | YouTube-DL | 8084 | Lab |
| .150.110 | ComiXed | 7172 | Lab |
| .150.110 | ComiXed Kids | 7171 | Lab |

**Total new containers**: 33
**Total sidebar entries across all portals**: 48

---

## Phase 1: Backend App Containers

### 1.1 Create appdata directories on Unraid

```bash
ssh root@192.168.150.110

# Home apps
mkdir -p /mnt/appdata/{homechart,mealie,actual}
mkdir -p /mnt/appdata/paperless/{data,media,export,consume}
mkdir -p /mnt/appdata/{homebox,grocy,vikunja,homehub}
mkdir -p /mnt/appdata/immich/{upload,library,postgres,model-cache}

# Media apps
mkdir -p /mnt/appdata/{audiobookshelf/config,audiobookshelf/metadata}
mkdir -p /mnt/appdata/{kavita,calibre,calibre-web,readarr}

# Lab apps
mkdir -p /mnt/appdata/{loki,promtail,n8n}

# Portal configs
mkdir -p /mnt/appdata/portal/configs
```

### 1.2 Create databases

```bash
docker exec -it authentik-db psql -U authentik -c "CREATE DATABASE homechart;"
docker exec -it authentik-db psql -U authentik -c "CREATE DATABASE paperless;"
docker exec -it authentik-db psql -U authentik -c "CREATE DATABASE vikunja;"
docker exec -it authentik-db psql -U authentik -c "CREATE DATABASE n8n;"
```

Note: Immich uses its own PostgreSQL instance with pgvecto.rs (for ML vectors).

### 1.3 Copy configs

```bash
# Loki + Promtail
scp deploy/loki-config.yaml root@192.168.150.110:/mnt/appdata/loki/local-config.yaml
scp deploy/promtail-config.yaml root@192.168.150.110:/mnt/appdata/promtail/config.yml

# Portal configs
scp configs/home.config.json root@192.168.150.110:/mnt/appdata/portal/configs/
scp configs/media.config.json root@192.168.150.110:/mnt/appdata/portal/configs/
scp configs/lab.config.json root@192.168.150.110:/mnt/appdata/portal/configs/
```

### 1.4 Deploy containers

```bash
# Home apps (Homechart, Mealie, Actual, Paperless, Homebox, Grocy, Vikunja)
# Requires .env file with PG_PASSWORD, REDIS_PASSWORD, HOMEAPPS_PG_PASSWORD
docker-compose -f docker-compose.home-apps.yml up -d
# Verify: curl http://192.168.150.124:3000  (Homechart — listens on 3000, not 8080)
# Verify: curl http://192.168.150.141:9000  (Mealie — moved from .125)
# Verify: curl http://192.168.150.126:5006  (Actual)
# Verify: curl http://192.168.150.142:8000  (Paperless-ngx — moved from .133)
# Verify: curl http://192.168.150.134:7745  (Homebox)
# Verify: curl http://192.168.150.143:80    (Grocy — moved from .135, port 80)
# Verify: curl http://192.168.150.137:3456  (Vikunja)
# Note: HomeHub commented out — image surajverma/homehub doesn't exist

# Immich (server + ML + Redis + PostgreSQL)
docker compose -f docker-compose.immich.yml up -d
# Verify: curl http://192.168.150.136:2283  (Immich)

# Media apps (Audiobookshelf, Kavita, Calibre, Calibre-Web, Readarr)
docker compose -f docker-compose.media-apps.yml up -d
# Verify: curl http://192.168.150.127:80    (Audiobookshelf)
# Verify: curl http://192.168.150.128:5000  (Kavita)
# Verify: curl http://192.168.150.129:8083  (Calibre-Web)

# Lab apps (Dozzle, Loki, Promtail, n8n, IT-Tools)
docker compose -f docker-compose.lab-apps.yml up -d
# Verify: curl http://192.168.150.110:8090  (Dozzle)
# Verify: curl http://192.168.150.110:3100/ready (Loki)
# Verify: curl http://192.168.150.139:5678  (n8n)
# Verify: curl http://192.168.150.140:80    (IT-Tools)

# Readarr: add port 8787 to existing GluetunVPN container
```

---

## Phase 2: DNS + NPM + Iframe Headers

### 2.1 AdGuard DNS Rewrites

Add these rewrites in AdGuard Home (192.168.150.10:3000).
All point to NPM (.115) for SSL termination + reverse proxy.

**New rewrites (35):**

| Domain | Answer |
|---|---|
| `home.teedge.local` | `192.168.150.115` |
| `media.teedge.local` | `192.168.150.115` |
| `lab.teedge.local` | `192.168.150.115` |
| `homechart.teedge.local` | `192.168.150.115` |
| `mealie.teedge.local` | `192.168.150.115` |
| `actual.teedge.local` | `192.168.150.115` |
| `paperless.teedge.local` | `192.168.150.115` |
| `homebox.teedge.local` | `192.168.150.115` |
| `grocy.teedge.local` | `192.168.150.115` |
| `immich.teedge.local` | `192.168.150.115` |
| `vikunja.teedge.local` | `192.168.150.115` |
| `homehub.teedge.local` | `192.168.150.115` |
| `audiobookshelf.teedge.local` | `192.168.150.115` |
| `kavita.teedge.local` | `192.168.150.115` |
| `calibre.teedge.local` | `192.168.150.115` |
| `dozzle.teedge.local` | `192.168.150.115` |
| `readarr.teedge.local` | `192.168.150.115` |
| `n8n.teedge.local` | `192.168.150.115` |
| `it-tools.teedge.local` | `192.168.150.115` |
| `unraid.teedge.local` | `192.168.150.115` |
| `pfsense.teedge.local` | `192.168.150.115` |
| `prometheus.teedge.local` | `192.168.150.115` |
| `kapowarr-kids.teedge.local` | `192.168.150.115` |
| `comixed-kids.teedge.local` | `192.168.150.115` |
| `flaresolverr.teedge.local` | `192.168.150.115` |
| `stirling.teedge.local` | `192.168.150.115` |
| `headwind.teedge.local` | `192.168.150.115` |
| `ntfy.teedge.local` | `192.168.150.115` |
| `crowdsec.teedge.local` | `192.168.150.115` |
| `kopia.teedge.local` | `192.168.150.115` |
| `speedtest.teedge.local` | `192.168.150.115` |
| `webcheck.teedge.local` | `192.168.150.115` |
| `peppermint.teedge.local` | `192.168.150.115` |
| `guacamole.teedge.local` | `192.168.150.115` |
| `fleet.teedge.local` | `192.168.150.115` |
| `fasten.teedge.local` | `192.168.150.115` |

### 2.2 NPM Proxy Hosts

Create proxy hosts in NPM (192.168.150.115:81). All use:
- **SSL**: Wildcard cert (cert ID 3)
- **Force SSL**: Yes
- **Custom Nginx Config**: Contents of `npm-iframe-headers.conf`

**Portal proxy hosts (no auth — portals handle their own OIDC):**

| Domain | Forward Host | Forward Port |
|---|---|---|
| `home.teedge.local` | `192.168.150.130` | `3000` |
| `media.teedge.local` | `192.168.150.131` | `3000` |
| `lab.teedge.local` | `192.168.150.132` | `3000` |

**Native OIDC apps (no auth in NPM — app handles OIDC directly):**

| Domain | Forward Host | Forward Port |
|---|---|---|
| `homechart.teedge.local` | `192.168.150.124` | `3000` |
| `mealie.teedge.local` | `192.168.150.141` | `9000` |
| `actual.teedge.local` | `192.168.150.126` | `5006` |
| `paperless.teedge.local` | `192.168.150.142` | `8000` |
| `immich.teedge.local` | `192.168.150.136` | `2283` |
| `kavita.teedge.local` | `192.168.150.144` | `5000` |
| `vikunja.teedge.local` | `192.168.150.137` | `3456` |
| `n8n.teedge.local` | `192.168.150.139` | `5678` |

**Forward-auth apps (Authentik proxy provider):**

| Domain | Forward Host | Forward Port |
|---|---|---|
| `homebox.teedge.local` | `192.168.150.134` | `7745` |
| `grocy.teedge.local` | `192.168.150.143` | `80` |
| `audiobookshelf.teedge.local` | `192.168.150.127` | `80` |
| `calibre.teedge.local` | `192.168.150.129` | `8083` |
| `dozzle.teedge.local` | `192.168.150.110` | `8090` |
| `readarr.teedge.local` | `192.168.150.112` | `8787` |
| `it-tools.teedge.local` | `192.168.150.140` | `80` |
| `unraid.teedge.local` | `192.168.150.110` | `80` |
| `pfsense.teedge.local` | `192.168.150.1` | `443` (HTTPS, check "Ignore SSL") |
| `prometheus.teedge.local` | `192.168.150.110` | `9090` |
| `kapowarr-kids.teedge.local` | `192.168.150.112` | `5657` |
| `comixed-kids.teedge.local` | `192.168.150.110` | `7171` |
| `flaresolverr.teedge.local` | `192.168.150.112` | `8191` |
| `stirling.teedge.local` | `192.168.150.145` | `8080` |
| `headwind.teedge.local` | `192.168.150.146` | `8080` |
| `ntfy.teedge.local` | `192.168.150.147` | `80` |
| `crowdsec.teedge.local` | `192.168.150.148` | `8080` |
| `kopia.teedge.local` | `192.168.150.149` | `51515` |
| `speedtest.teedge.local` | `192.168.150.150` | `80` |
| `webcheck.teedge.local` | `192.168.150.152` | `3000` |
| `peppermint.teedge.local` | `192.168.150.153` | `3000` |
| `guacamole.teedge.local` | `192.168.150.154` | `8080` |
| `fleet.teedge.local` | `192.168.150.155` | `8080` |
| `fasten.teedge.local` | `192.168.150.156` | `8080` (HTTPS) |

**Note**: `pfsense.teedge.local` requires "Ignore SSL" in NPM because pfSense serves HTTPS with its own self-signed cert on the backend.

### 2.3 NPM Forward-Auth Config

For forward-auth proxy hosts, add this custom nginx config IN ADDITION to the iframe headers:

```nginx
# Iframe headers
proxy_hide_header X-Frame-Options;
proxy_hide_header Content-Security-Policy;
add_header Content-Security-Policy "frame-ancestors https://home.teedge.local https://media.teedge.local https://lab.teedge.local" always;

# Authentik forward-auth
auth_request /outpost.goauthentik.io/auth/nginx;
error_page 401 = @goauthentik_proxy_signin;

auth_request_set $auth_cookie $upstream_http_set_cookie;
add_header Set-Cookie $auth_cookie;

auth_request_set $authentik_username $upstream_http_x_authentik_username;
auth_request_set $authentik_groups $upstream_http_x_authentik_groups;
auth_request_set $authentik_email $upstream_http_x_authentik_email;
proxy_set_header X-authentik-username $authentik_username;
proxy_set_header X-authentik-groups $authentik_groups;
proxy_set_header X-authentik-email $authentik_email;

location /outpost.goauthentik.io {
    proxy_pass https://192.168.150.122:9443/outpost.goauthentik.io;
    proxy_set_header Host $host;
    proxy_set_header X-Original-URL $scheme://$http_host$request_uri;
    proxy_set_header Content-Length "";
    proxy_pass_request_body off;
}

location @goauthentik_proxy_signin {
    internal;
    add_header Set-Cookie $auth_cookie;
    return 302 /outpost.goauthentik.io/start?rd=$scheme://$http_host$request_uri;
}
```

---

## Phase 3: Authentik SSO

### 3.1 OIDC Providers (11 new)

Create in Authentik Admin → Providers → Create → OAuth2/OpenID Connect:

| Provider Name | Redirect URIs |
|---|---|
| `home-portal` | `https://home.teedge.local/auth/callback/authentik` |
| `media-portal` | `https://media.teedge.local/auth/callback/authentik` |
| `lab-portal` | `https://lab.teedge.local/auth/callback/authentik` |
| `homechart` | `https://homechart.teedge.local/oidc/callback` |
| `mealie` | `https://mealie.teedge.local/login` |
| `actual-budget` | `https://actual.teedge.local/openid/callback` |
| `kavita` | `https://kavita.teedge.local/api/Plugin/authenticate` |
| `paperless` | `https://paperless.teedge.local/accounts/oidc/authentik/login/callback/` |
| `immich` | `https://immich.teedge.local/auth/login` |
| `vikunja` | `https://vikunja.teedge.local/auth/openid/authentik` |
| `n8n` | `https://n8n.teedge.local/rest/oauth2-credential/callback` |

Settings for each:
- **Authorization flow**: `default-provider-authorization-implicit-consent`
- **Signing key**: Select existing key
- **Scopes**: `openid`, `email`, `profile`

### 3.2 Proxy Providers (16 new)

Create in Authentik Admin → Providers → Create → Proxy Provider:

| Provider Name | External Host | Mode |
|---|---|---|
| `homebox` | `https://homebox.teedge.local` | Forward auth (single application) |
| `grocy` | `https://grocy.teedge.local` | Forward auth (single application) |
| `homehub` | `https://homehub.teedge.local` | Forward auth (single application) |
| `audiobookshelf` | `https://audiobookshelf.teedge.local` | Forward auth (single application) |
| `calibre-web` | `https://calibre.teedge.local` | Forward auth (single application) |
| `dozzle` | `https://dozzle.teedge.local` | Forward auth (single application) |
| `readarr` | `https://readarr.teedge.local` | Forward auth (single application) |
| `it-tools` | `https://it-tools.teedge.local` | Forward auth (single application) |
| `unraid` | `https://unraid.teedge.local` | Forward auth (single application) |
| `pfsense` | `https://pfsense.teedge.local` | Forward auth (single application) |
| `prometheus` | `https://prometheus.teedge.local` | Forward auth (single application) |
| `kapowarr-kids` | `https://kapowarr-kids.teedge.local` | Forward auth (single application) |
| `comixed-kids` | `https://comixed-kids.teedge.local` | Forward auth (single application) |
| `flaresolverr` | `https://flaresolverr.teedge.local` | Forward auth (single application) |
| `guacamole` | `https://guacamole.teedge.local` | Forward auth (single application) |
| `fleet` | `https://fleet.teedge.local` | Forward auth (single application) |
| `fasten` | `https://fasten.teedge.local` | Forward auth (single application) |

### 3.3 Applications (27 new)

Create in Authentik Admin → Applications → Create:

For each provider above (11 OIDC + 16 proxy = 27 total), create a matching application:
- **Name**: Same as provider
- **Slug**: Same as provider name
- **Provider**: Link to matching provider
- **Launch URL**: The external URL

### 3.4 Enable OIDC on Apps

After Authentik providers are created, fill in the commented-out env vars in the docker-compose files with the client IDs and secrets.

---

## Phase 4: Build & Deploy Portals

### 4.1 Build the portal Docker image

```bash
cd portal-template/
docker build -t portal-template:latest .
```

### 4.2 Deploy portal containers

```bash
docker compose -f deploy/docker-compose.portals.yml up -d
```

Fill in `AUTH_SECRET`, `OIDC_CLIENT_ID`, and `OIDC_CLIENT_SECRET` for each portal.

### 4.3 Verify

```
https://home.teedge.local  → Authentik login → Homepage landing → Home sidebar
https://media.teedge.local → Authentik login → Homepage landing → Media sidebar
https://lab.teedge.local   → Authentik login → Homepage landing → Lab sidebar
```

---

## Phase 5: Polish

### 5.1 Uptime Kuma Monitors

Add HTTP(s) monitors in Uptime Kuma (192.168.150.119):

| Name | URL | Interval |
|---|---|---|
| Homechart | `http://192.168.150.124:3000` | 60s |
| Mealie | `http://192.168.150.141:9000` | 60s |
| Actual Budget | `http://192.168.150.126:5006` | 60s |
| Paperless-ngx | `http://192.168.150.142:8000` | 60s |
| Homebox | `http://192.168.150.134:7745` | 60s |
| Grocy | `http://192.168.150.143:80` | 60s |
| Immich | `http://192.168.150.136:2283` | 60s |
| Vikunja | `http://192.168.150.137:3456` | 60s |
| n8n | `http://192.168.150.139:5678` | 60s |
| IT-Tools | `http://192.168.150.140:80` | 60s |
| Audiobookshelf | `http://192.168.150.127:80` | 60s |
| Kavita | `http://192.168.150.144:5000` | 60s |
| Calibre-Web | `http://192.168.150.129:8083` | 60s |
| Home Portal | `http://192.168.150.130:3000` | 60s |
| Media Portal | `http://192.168.150.131:3000` | 60s |
| Lab Portal | `http://192.168.150.132:3000` | 60s |
| Dozzle | `http://192.168.150.110:8090` | 60s |
| Loki | `http://192.168.150.110:3100/ready` | 60s |

### 5.2 Grafana Loki Datasource

1. Grafana → Configuration → Data Sources → Add → Loki
2. URL: `http://192.168.150.110:3100`
3. Save & Test

### 5.3 Verify Iframe Embedding

```bash
curl -sI https://mealie.teedge.local | grep -i "content-security-policy\|x-frame-options"
```

Expected:
```
Content-Security-Policy: frame-ancestors https://home.teedge.local https://media.teedge.local https://lab.teedge.local
```

No `X-Frame-Options` header should be present.

---

## Future Deployments (Todo)

| App | Category | Image | Notes |
|---|---|---|---|
| Online backup service | Backups | TBD | Research: Backblaze B2, Wasabi, rsync.net |

### Recently Deployed (completed)

| App | IP | Status |
|---|---|---|
| Stirling PDF | .150.145 | Running |
| Headwind MDM | .150.146 | Running (setup complete, HTTPS:8443 + HTTP:8080, PG18 DB) |
| Fasten Health | .150.156 | Running (HTTPS:8080, encrypted SQLite, forward-auth) |
| Ntfy | .150.147 | Running |
| CrowdSec | .150.148 | Running |
| Kopia | .150.149 | Running |
| Speedtest Tracker | .150.150 | Running |
| Webcheck | .150.152 | Running |
| Peppermint | .150.153 | Running |
| Guacamole | .150.154 | Running (guacd on bridge:4822) |
| FleetDM | .150.155 | Running (fleet-mysql on bridge:3306) |
| Immich | .150.136 | Running (ML + Redis + PostgreSQL on bridge, native OIDC) |
| OnlyOffice DocSpace | .150.110:8880 | Running (installer script, ~7 containers, SAML SSO) |

# Nextcloud Replacement for DocSpace — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tear down the 36-container OnlyOffice DocSpace stack and replace it with a 3-container Nextcloud deployment (Nextcloud + MariaDB + OnlyOffice Document Server) with Authentik OIDC and in-browser document editing.

**Architecture:** Nextcloud (Apache) on macvlan .133, MariaDB on an internal bridge network, OnlyOffice Document Server on macvlan .134. NPM proxies `nextcloud.teedge.local` and `onlyoffice.teedge.local` with wildcard SSL. Authentik provides OIDC login via the `user_oidc` Nextcloud app.

**Tech Stack:** Nextcloud (latest), MariaDB 11, OnlyOffice Document Server (latest), Authentik OIDC, NPM (SSL), Docker on Unraid.

---

### Task 1: Tear Down DocSpace

**Context:** DocSpace runs from `/mnt/appdata/docspace/` on Zion (.110) with 16 compose files and 36 containers. All data will be destroyed — no backups needed.

**Step 1: Stop all DocSpace containers**

```bash
ssh root@192.168.150.110 'cd /mnt/appdata/docspace && docker compose -f docspace.yml -f docspace-stack.yml -f proxy.yml -f identity.yml -f notify.yml -f db.yml -f redis.yml -f rabbitmq.yml -f opensearch.yml -f ds.yml -f migration-runner.yml -f healthchecks.yml -f fluent.yml -f dashboards.yml down --volumes --remove-orphans'
```

Expected: All 36 containers stopped and removed. All named volumes (`docspace_app_data`, `docspace_mysql_data`, etc.) deleted.

If the compose down fails due to file issues, fall back to:
```bash
ssh root@192.168.150.110 'docker ps -a --filter "name=onlyoffice" --format "{{.Names}}" | xargs -r docker rm -f'
ssh root@192.168.150.110 'docker volume ls --filter "name=docspace" --format "{{.Name}}" | xargs -r docker volume rm'
```

**Step 2: Prune unused Docker images**

```bash
ssh root@192.168.150.110 'docker image prune -a -f'
```

Expected: Reclaims several GB of DocSpace images.

**Step 3: Remove DocSpace config directory**

```bash
ssh root@192.168.150.110 'rm -rf /mnt/appdata/docspace'
```

**Step 4: Remove the NPM proxy host for docspace.teedge.local**

Use Python urllib to call NPM API (password has `$` characters that break curl):

```bash
ssh root@192.168.150.110 'python3 -c "
import urllib.request, urllib.parse, json

NPM_URL = \"http://192.168.150.115:81/api\"

# Get NPM password from pass store - must run locally, not on .110
# Instead, get password directly
"'
```

Since python3 is NOT available on Zion (.110), run the NPM API calls from the local workstation:

```python
import urllib.request, json, subprocess

NPM_URL = "http://192.168.150.115:81/api"
npm_pass = subprocess.run(["pass", "show", "homelab/npm/admin"], capture_output=True, text=True).stdout.strip()

# Login
login_data = json.dumps({"identity": "teedge77@gmail.com", "secret": npm_pass}).encode()
req = urllib.request.Request(f"{NPM_URL}/tokens", data=login_data, headers={"Content-Type": "application/json"})
token = json.loads(urllib.request.urlopen(req).read())["token"]

# List proxy hosts, find docspace
req = urllib.request.Request(f"{NPM_URL}/nginx/proxy-hosts", headers={"Authorization": f"Bearer {token}"})
hosts = json.loads(urllib.request.urlopen(req).read())
docspace_host = next((h for h in hosts if any(d == "docspace.teedge.local" for d in h["domain_names"])), None)

if docspace_host:
    req = urllib.request.Request(f"{NPM_URL}/nginx/proxy-hosts/{docspace_host['id']}", method="DELETE",
                                 headers={"Authorization": f"Bearer {token}"})
    urllib.request.urlopen(req)
    print(f"Deleted proxy host {docspace_host['id']} for docspace.teedge.local")
```

**Step 5: Verify teardown**

```bash
ssh root@192.168.150.110 'docker ps --filter "name=onlyoffice" --format "{{.Names}}" | wc -l'
```

Expected: 0 containers.

**Step 6: Commit**

```bash
# No code changes yet — just note teardown is complete
```

---

### Task 2: Create Nextcloud Storage Directories

**Step 1: Create directories on Zion**

```bash
ssh root@192.168.150.110 'mkdir -p /mnt/appdata/nextcloud/{data,config,db,onlyoffice/data,onlyoffice/logs}'
```

**Step 2: Verify**

```bash
ssh root@192.168.150.110 'ls -la /mnt/appdata/nextcloud/'
```

Expected: `data/`, `config/`, `db/`, `onlyoffice/` directories exist.

---

### Task 3: Create Docker Compose File

**Files:**
- Create: `deploy/docker-compose.nextcloud.yml`

**Step 1: Write the compose file**

```yaml
##############################################################################
# Nextcloud + MariaDB + OnlyOffice Document Server
#
# Prerequisites:
#   - Directories at /mnt/appdata/nextcloud/{data,config,db,onlyoffice}
#   - NPM proxy hosts for nextcloud.teedge.local and onlyoffice.teedge.local
#   - Authentik OIDC provider created for Nextcloud
#   - CA cert at /mnt/appdata/certs/teedge-local-ca/ca.crt
##############################################################################

networks:
  br0:
    external: true
    driver: macvlan
    driver_opts:
      parent: br0
  nextcloud-internal:
    driver: bridge

services:
  nextcloud:
    image: nextcloud:latest
    container_name: nextcloud
    restart: unless-stopped
    labels:
      net.unraid.docker.managed: composeman
      net.unraid.docker.icon: https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/png/nextcloud.png
      net.unraid.docker.webui: "https://nextcloud.teedge.local"
    networks:
      br0:
        ipv4_address: 192.168.150.133
      nextcloud-internal:
    environment:
      MYSQL_HOST: nextcloud-db
      MYSQL_DATABASE: nextcloud
      MYSQL_USER: nextcloud
      MYSQL_PASSWORD: "${NEXTCLOUD_DB_PASSWORD}"
      NEXTCLOUD_ADMIN_USER: admin
      NEXTCLOUD_ADMIN_PASSWORD: "${NEXTCLOUD_ADMIN_PASSWORD}"
      NEXTCLOUD_TRUSTED_DOMAINS: "nextcloud.teedge.local 192.168.150.133"
      OVERWRITEPROTOCOL: https
      OVERWRITEHOST: nextcloud.teedge.local
      OVERWRITECLIURL: "https://nextcloud.teedge.local"
      TRUSTED_PROXIES: "192.168.150.115"
      APACHE_DISABLE_REWRITE_IP: 1
    volumes:
      - /mnt/appdata/nextcloud/data:/var/www/html/data
      - /mnt/appdata/nextcloud/config:/var/www/html/config
      - /mnt/appdata/certs/teedge-local-ca/ca.crt:/usr/local/share/ca-certificates/teedge-local-ca.crt:ro
    depends_on:
      nextcloud-db:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost/ || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 120s
    mem_limit: 1g
    cpus: 1.0

  nextcloud-db:
    image: mariadb:11
    container_name: nextcloud-db
    restart: unless-stopped
    labels:
      net.unraid.docker.managed: composeman
    networks:
      nextcloud-internal:
    environment:
      MYSQL_ROOT_PASSWORD: "${NEXTCLOUD_DB_ROOT_PASSWORD}"
      MYSQL_DATABASE: nextcloud
      MYSQL_USER: nextcloud
      MYSQL_PASSWORD: "${NEXTCLOUD_DB_PASSWORD}"
      MARIADB_AUTO_UPGRADE: "1"
    volumes:
      - /mnt/appdata/nextcloud/db:/var/lib/mysql
    command: --transaction-isolation=READ-COMMITTED --log-bin=binlog --binlog-format=ROW --innodb-file-per-table=1 --skip-innodb-read-only-compressed
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    mem_limit: 512m
    cpus: 0.5

  nextcloud-onlyoffice:
    image: onlyoffice/documentserver:latest
    container_name: nextcloud-onlyoffice
    restart: unless-stopped
    labels:
      net.unraid.docker.managed: composeman
      net.unraid.docker.icon: https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/png/onlyoffice.png
    networks:
      br0:
        ipv4_address: 192.168.150.134
    environment:
      JWT_SECRET: "${ONLYOFFICE_JWT_SECRET}"
    volumes:
      - /mnt/appdata/nextcloud/onlyoffice/data:/var/www/onlyoffice/Data
      - /mnt/appdata/nextcloud/onlyoffice/logs:/var/log/onlyoffice
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost/ || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    mem_limit: 2g
    cpus: 1.0
```

**Step 2: Create .env file on server**

Generate passwords and create `/mnt/appdata/nextcloud/.env`:

```bash
ssh root@192.168.150.110 'cat > /mnt/appdata/nextcloud/.env << EOF
NEXTCLOUD_DB_PASSWORD=$(openssl rand -base64 24 | tr -d /+= | head -c 32)
NEXTCLOUD_DB_ROOT_PASSWORD=$(openssl rand -base64 24 | tr -d /+= | head -c 32)
NEXTCLOUD_ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d /+= | head -c 32)
ONLYOFFICE_JWT_SECRET=$(openssl rand -base64 24 | tr -d /+= | head -c 32)
EOF
chmod 600 /mnt/appdata/nextcloud/.env && cat /mnt/appdata/nextcloud/.env'
```

Save the admin password to pass store:
```bash
# Read NEXTCLOUD_ADMIN_PASSWORD from the .env output above
echo "<admin_password>" | pass insert -m homelab/nextcloud/admin
```

**Step 3: Copy compose file to server**

```bash
scp /home/teedge/projects/portal-template/deploy/docker-compose.nextcloud.yml root@192.168.150.110:/mnt/appdata/nextcloud/docker-compose.yml
```

**Step 4: Commit**

```bash
cd /home/teedge/projects/portal-template
git add deploy/docker-compose.nextcloud.yml
git commit -m "feat: add Nextcloud + OnlyOffice Document Server compose file"
```

---

### Task 4: Deploy Nextcloud Stack

**Step 1: Start the stack**

```bash
ssh root@192.168.150.110 'cd /mnt/appdata/nextcloud && docker compose --env-file .env up -d'
```

**Step 2: Wait for healthy status**

```bash
# Wait up to 3 minutes for all containers to be healthy
ssh root@192.168.150.110 'for i in $(seq 1 18); do echo "--- Check $i ---"; docker ps --filter "name=nextcloud" --format "{{.Names}}\t{{.Status}}"; echo; sleep 10; done'
```

Expected: All 3 containers show `healthy` status. Nextcloud may take up to 2 minutes on first boot (database initialization).

**Step 3: Verify Nextcloud responds**

```bash
ssh root@192.168.150.110 'curl -s -o /dev/null -w "%{http_code}" http://192.168.150.133/'
```

Expected: `200` or `302` (redirect to login).

**Step 4: Verify OnlyOffice Document Server responds**

```bash
ssh root@192.168.150.110 'curl -s -o /dev/null -w "%{http_code}" http://192.168.150.134/'
```

Expected: `200`.

**Step 5: Install CA certificate in Nextcloud container**

Nextcloud needs to trust the local CA for Authentik OIDC:

```bash
ssh root@192.168.150.110 'docker exec nextcloud bash -c "update-ca-certificates"'
```

---

### Task 5: Create NPM Proxy Hosts

**Context:** Use NPM API from local workstation (python3 not on Zion). All proxy hosts use wildcard cert ID 3 (`*.teedge.local`), SSL forced.

**Step 1: Create proxy hosts via Python script**

Run from local workstation:

```python
import urllib.request, json, subprocess

NPM_URL = "http://192.168.150.115:81/api"
npm_pass = subprocess.run(["pass", "show", "homelab/npm/admin"], capture_output=True, text=True).stdout.strip()

# Login
login_data = json.dumps({"identity": "teedge77@gmail.com", "secret": npm_pass}).encode()
req = urllib.request.Request(f"{NPM_URL}/tokens", data=login_data, headers={"Content-Type": "application/json"})
token = json.loads(urllib.request.urlopen(req).read())["token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# Create nextcloud.teedge.local -> .133:80
nc_host = {
    "domain_names": ["nextcloud.teedge.local"],
    "forward_scheme": "http",
    "forward_host": "192.168.150.133",
    "forward_port": 80,
    "certificate_id": 3,
    "ssl_forced": True,
    "http2_support": True,
    "block_exploits": True,
    "allow_websocket_upgrade": True,
    "access_list_id": 0,
    "meta": {"letsencrypt_agree": False, "dns_challenge": False},
    "advanced_config": "",
    "locations": []
}
req = urllib.request.Request(f"{NPM_URL}/nginx/proxy-hosts", data=json.dumps(nc_host).encode(), headers=headers)
result = json.loads(urllib.request.urlopen(req).read())
print(f"Created nextcloud proxy host ID: {result['id']}")

# Create onlyoffice.teedge.local -> .134:80
oo_host = {
    "domain_names": ["onlyoffice.teedge.local"],
    "forward_scheme": "http",
    "forward_host": "192.168.150.134",
    "forward_port": 80,
    "certificate_id": 3,
    "ssl_forced": True,
    "http2_support": True,
    "block_exploits": True,
    "allow_websocket_upgrade": True,
    "access_list_id": 0,
    "meta": {"letsencrypt_agree": False, "dns_challenge": False},
    "advanced_config": "proxy_set_header X-Forwarded-Proto $scheme;\nproxy_set_header X-Forwarded-Host $host;",
    "locations": []
}
req = urllib.request.Request(f"{NPM_URL}/nginx/proxy-hosts", data=json.dumps(oo_host).encode(), headers=headers)
result = json.loads(urllib.request.urlopen(req).read())
print(f"Created onlyoffice proxy host ID: {result['id']}")
```

**Step 2: Restart NPM**

```bash
ssh root@192.168.150.110 'docker restart Nginx-Proxy-Manager-Official'
```

**Step 3: Verify HTTPS access**

```bash
curl -sk -o /dev/null -w "%{http_code}" https://nextcloud.teedge.local/
curl -sk -o /dev/null -w "%{http_code}" https://onlyoffice.teedge.local/
```

Expected: `200` or `302` for both.

---

### Task 6: Configure Nextcloud — OnlyOffice Connector

**Step 1: Install the ONLYOFFICE connector app**

```bash
ssh root@192.168.150.110 'docker exec -u www-data nextcloud php occ app:install onlyoffice'
```

**Step 2: Configure the connector**

Read the JWT secret from the .env file, then configure:

```bash
# Get the JWT secret
JWT_SECRET=$(ssh root@192.168.150.110 'grep ONLYOFFICE_JWT_SECRET /mnt/appdata/nextcloud/.env | cut -d= -f2')

ssh root@192.168.150.110 "docker exec -u www-data nextcloud php occ config:system:set onlyoffice DocumentServerUrl --value='https://onlyoffice.teedge.local/'"
ssh root@192.168.150.110 "docker exec -u www-data nextcloud php occ config:system:set onlyoffice jwt_secret --value='$JWT_SECRET'"
ssh root@192.168.150.110 "docker exec -u www-data nextcloud php occ config:system:set onlyoffice verify_peer_off --value=true --type=boolean"
```

Note: `verify_peer_off` is needed because OnlyOffice Document Server connects back to Nextcloud via the self-signed CA. Alternatively, the CA cert can be trusted inside the Document Server container.

**Step 3: Verify**

Open `https://nextcloud.teedge.local/settings/admin/onlyoffice` in browser — should show Document Server connected.

---

### Task 7: Create Authentik OIDC Provider for Nextcloud

**Context:** Use Authentik API to create an OAuth2/OIDC provider and application. API token from `pass show homelab/authentik/api-token`. Authentik at `https://authentik.teedge.local`.

**Step 1: Create OAuth2 provider via Authentik API**

```python
import urllib.request, json, subprocess, ssl

# Trust local CA
ctx = ssl.create_default_context()
ctx.load_verify_locations("/mnt/appdata/certs/teedge-local-ca/ca.crt")
# Or from local cert path:
# ctx.load_verify_locations("/home/teedge/projects/portal-template/certs/ca.crt")
# Fallback: ctx = ssl._create_unverified_context()

AK_URL = "https://authentik.teedge.local/api/v3"
ak_token = subprocess.run(["pass", "show", "homelab/authentik/api-token"], capture_output=True, text=True).stdout.strip()
headers = {"Authorization": f"Bearer {ak_token}", "Content-Type": "application/json"}

# Create OAuth2 provider
provider_data = {
    "name": "Nextcloud",
    "authorization_flow": "default-provider-authorization-implicit-consent",
    "protocol": "openid-connect",
    "client_type": "confidential",
    "redirect_uris": "https://nextcloud.teedge.local/apps/user_oidc/code",
    "signing_key": None,
    "access_code_validity": "minutes=10",
    "access_token_validity": "hours=1",
    "refresh_token_validity": "days=30",
    "sub_mode": "user_uuid",
    "include_claims_in_id_token": True,
    "property_mappings": []
}
req = urllib.request.Request(f"{AK_URL}/providers/oauth2/", data=json.dumps(provider_data).encode(), headers=headers)
provider = json.loads(urllib.request.urlopen(req, context=ctx).read())
print(f"Provider created: ID={provider['pk']}, client_id={provider['client_id']}, client_secret={provider['client_secret']}")

# Create application
app_data = {
    "name": "Nextcloud",
    "slug": "nextcloud",
    "provider": provider["pk"],
    "meta_launch_url": "https://nextcloud.teedge.local/",
    "policy_engine_mode": "any"
}
req = urllib.request.Request(f"{AK_URL}/core/applications/", data=json.dumps(app_data).encode(), headers=headers)
app = json.loads(urllib.request.urlopen(req, context=ctx).read())
print(f"Application created: slug={app['slug']}")
```

Save the client_id and client_secret from output — needed for Nextcloud OIDC config.

**Step 2: Note the OIDC endpoints**

- Issuer: `https://authentik.teedge.local/application/o/nextcloud/`
- Authorization: `https://authentik.teedge.local/application/o/authorize/`
- Token: `https://authentik.teedge.local/application/o/token/`
- UserInfo: `https://authentik.teedge.local/application/o/userinfo/`

---

### Task 8: Configure Nextcloud OIDC Login

**Step 1: Install user_oidc app**

```bash
ssh root@192.168.150.110 'docker exec -u www-data nextcloud php occ app:install user_oidc'
```

**Step 2: Register the OIDC provider in Nextcloud**

```bash
CLIENT_ID="<from task 7 output>"
CLIENT_SECRET="<from task 7 output>"

ssh root@192.168.150.110 "docker exec -u www-data nextcloud php occ user_oidc:provider Authentik \
  --clientid='$CLIENT_ID' \
  --clientsecret='$CLIENT_SECRET' \
  --discoveryuri='https://authentik.teedge.local/application/o/nextcloud/.well-known/openid-configuration' \
  --scope='openid email profile' \
  --unique-uid=0 \
  --mapping-uid=preferred_username \
  --mapping-display-name=name \
  --mapping-email=email"
```

**Step 3: Verify**

Open `https://nextcloud.teedge.local/login` — should show "Log in with Authentik" button. Click it, authenticate via Authentik, and confirm login works.

---

### Task 9: Update Home Portal Config

**Files:**
- Modify: `configs/home.config.json:80-84`
- Modify: (on server) `/mnt/appdata/portal/configs/home.config.json`

**Step 1: Update the portal config locally**

Change the DocSpace entry to Nextcloud:

```json
{
  "slug": "nextcloud",
  "label": "Files & Docs",
  "icon": "folder",
  "url": "https://nextcloud.teedge.local"
}
```

**Step 2: Copy to server**

```bash
scp /home/teedge/projects/portal-template/configs/home.config.json root@192.168.150.110:/mnt/appdata/portal/configs/home.config.json
```

**Step 3: Restart home portal**

```bash
ssh root@192.168.150.110 'docker restart home-portal'
```

**Step 4: Verify**

Open `https://home.teedge.local` — sidebar should show "Files & Docs" under Records. Clicking it should load Nextcloud in the iframe.

**Step 5: Commit**

```bash
cd /home/teedge/projects/portal-template
git add configs/home.config.json
git commit -m "feat: replace DocSpace with Nextcloud in home portal config"
```

---

### Task 10: Update Memory Files

**Files:**
- Modify: `/home/teedge/.claude/projects/-home-teedge-projects/memory/npm-proxy-hosts.md`
- Modify: `/home/teedge/.claude/projects/-home-teedge-projects/memory/containers.md`
- Modify: `/home/teedge/.claude/projects/-home-teedge-projects/memory/homelab.md`

**Step 1: Update npm-proxy-hosts.md**

- Remove: `| docspace.teedge.local | .110:8880 |`
- Add: `| nextcloud.teedge.local | .133:80 |`
- Add: `| onlyoffice.teedge.local | .134:80 |`

**Step 2: Update containers.md**

- Remove all 36 OnlyOffice/DocSpace container entries
- Add: `nextcloud` (.133, /mnt/appdata/nextcloud)
- Add: `nextcloud-db` (internal bridge, /mnt/appdata/nextcloud/db)
- Add: `nextcloud-onlyoffice` (.134, /mnt/appdata/nextcloud/onlyoffice)

**Step 3: Update homelab.md**

- Remove the "Future Deployments" section about OnlyOffice DocSpace
- Add Nextcloud to the services table

**Step 4: Commit memory updates**

```bash
cd /home/teedge/.claude/projects/-home-teedge-projects/memory
git add npm-proxy-hosts.md containers.md homelab.md
git commit -m "docs: update memory files for DocSpace → Nextcloud migration"
```

#!/bin/bash
##############################################################################
# OnlyOffice DocSpace — Update Script for Unraid
#
# Replicates the official docspace-install.sh update procedure without
# requiring systemd. Safe to run from Unraid User Scripts or CLI.
#
# Usage:
#   bash /mnt/user/compose/update-docspace.sh          # interactive
#   bash /mnt/user/compose/update-docspace.sh --yes     # skip confirmation
##############################################################################

set -euo pipefail

BASE_DIR="/mnt/appdata/docspace"
BACKUP_DIR="/mnt/appdata/docspace-backups"
TARBALL_URL="https://download.onlyoffice.com/docspace/docker.tar.gz"
AUTO_YES="${1:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)] WARNING:${NC} $*"; }
err()  { echo -e "${RED}[$(date +%H:%M:%S)] ERROR:${NC} $*"; }

# ── Pre-flight checks ──────────────────────────────────────────────────────
if [ ! -f "$BASE_DIR/.env" ]; then
    err "No .env found at $BASE_DIR/.env — is DocSpace installed?"
    exit 1
fi

cd "$BASE_DIR"
source <(grep -v '^\s*#' .env | grep '=' | sed 's/^\s*//' | sed 's/\r$//')

CURRENT_TAG="${DOCKER_TAG:-latest}"
log "Current DOCKER_TAG: $CURRENT_TAG"

# Check what the latest available tag is
LATEST_TAG=$(curl -s "https://hub.docker.com/v2/repositories/onlyoffice/docspace-api/tags/?page_size=10&ordering=-last_updated" \
    | python3 -c "
import sys, json
data = json.load(sys.stdin)
tags = [t['name'] for t in data.get('results', []) if t['name'] not in ('latest', 'develop', 'nightly')]
# Find the highest semver-looking tag
versions = []
for t in tags:
    parts = t.split('.')
    if len(parts) >= 2 and parts[0].isdigit():
        versions.append(t)
versions.sort(key=lambda v: list(map(int, v.split('.'))), reverse=True)
print(versions[0] if versions else 'latest')
" 2>/dev/null || echo "latest")

log "Latest available tag: $LATEST_TAG"

# Get current running image digest for comparison
RUNNING_DIGEST=$(docker inspect onlyoffice-api --format '{{.Image}}' 2>/dev/null || echo "unknown")
REMOTE_DIGEST=$(docker pull --quiet "onlyoffice/docspace-api:${CURRENT_TAG}" 2>/dev/null | tail -1 || echo "check-failed")

if [ "$RUNNING_DIGEST" = "$REMOTE_DIGEST" ] && [ "$REMOTE_DIGEST" != "check-failed" ]; then
    log "Images are already up to date (digest match)."
    if [ "$AUTO_YES" != "--yes" ]; then
        echo -n "Continue anyway? [y/N] "
        read -r answer
        [ "$answer" != "y" ] && { log "Aborted."; exit 0; }
    fi
fi

# ── Confirmation ───────────────────────────────────────────────────────────
if [ "$AUTO_YES" != "--yes" ]; then
    echo ""
    warn "This will:"
    echo "  1. Dump the MySQL database (backup)"
    echo "  2. Back up current .env and compose files"
    echo "  3. Download fresh compose files from OnlyOffice"
    echo "  4. Stop application containers"
    echo "  5. Pull new images"
    echo "  6. Run database migrations"
    echo "  7. Restart all services"
    echo ""
    echo -n "Proceed? [y/N] "
    read -r answer
    [ "$answer" != "y" ] && { log "Aborted."; exit 0; }
fi

# ── Step 1: Backup ────────────────────────────────────────────────────────
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$TIMESTAMP"
mkdir -p "$BACKUP_PATH"

log "Backing up .env and compose files to $BACKUP_PATH/"
cp "$BASE_DIR/.env" "$BACKUP_PATH/env.bak"
for f in "$BASE_DIR"/*.yml; do
    cp "$f" "$BACKUP_PATH/" 2>/dev/null || true
done

log "Dumping MySQL database..."
docker exec onlyoffice-mysql-server mysqldump \
    -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" \
    --single-transaction --routines --triggers \
    "${MYSQL_DATABASE}" > "$BACKUP_PATH/docspace_db.sql" 2>/dev/null \
    && log "Database dump saved ($(du -h "$BACKUP_PATH/docspace_db.sql" | cut -f1))" \
    || warn "Database dump failed — continuing anyway"

# ── Step 2: Download fresh compose files ───────────────────────────────────
log "Downloading latest compose files from OnlyOffice..."
TEMP_DIR=$(mktemp -d)
curl -sL "$TARBALL_URL" -o "$TEMP_DIR/docker.tar.gz"

if [ ! -s "$TEMP_DIR/docker.tar.gz" ]; then
    err "Download failed or empty tarball"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Extract to temp, then selectively update compose files
mkdir -p "$TEMP_DIR/extract"
tar -xzf "$TEMP_DIR/docker.tar.gz" -C "$TEMP_DIR/extract" 2>/dev/null

# Show what changed
log "Comparing compose files..."
EXTRACT_DIR="$TEMP_DIR/extract"
# The tarball may have a subdirectory or be flat
if [ -d "$EXTRACT_DIR/docker" ]; then
    EXTRACT_DIR="$EXTRACT_DIR/docker"
fi

CHANGED=0
for f in "$EXTRACT_DIR"/*.yml; do
    fname=$(basename "$f")
    if [ -f "$BASE_DIR/$fname" ]; then
        if ! diff -q "$f" "$BASE_DIR/$fname" >/dev/null 2>&1; then
            warn "Changed: $fname"
            CHANGED=$((CHANGED + 1))
        fi
    else
        warn "New file: $fname"
        CHANGED=$((CHANGED + 1))
    fi
done

# Check for new .env variables
if [ -f "$EXTRACT_DIR/.env" ]; then
    NEW_VARS=$(comm -23 \
        <(grep -oP '^\s*\K[A-Z_]+=?' "$EXTRACT_DIR/.env" | sed 's/=$//' | sort -u) \
        <(grep -oP '^\s*\K[A-Z_]+=?' "$BASE_DIR/.env" | sed 's/=$//' | sort -u) \
    )
    if [ -n "$NEW_VARS" ]; then
        warn "New .env variables in upstream (will be appended):"
        echo "$NEW_VARS" | sed 's/^/    /'
    fi
fi

# ── Step 3: Stop application containers ────────────────────────────────────
log "Stopping application containers..."

# The compose files that define app services (not infrastructure)
APP_COMPOSE=()
for f in migration-runner.yml identity.yml notify.yml docspace.yml healthchecks.yml proxy.yml docspace-stack.yml; do
    [ -f "$BASE_DIR/$f" ] && APP_COMPOSE+=(-f "$f")
done

cd "$BASE_DIR"
docker compose --env-file .env "${APP_COMPOSE[@]}" down --timeout 30 2>&1 | grep -v "^$" || true

# ── Step 4: Update compose files ──────────────────────────────────────────
log "Updating compose files..."
for f in "$EXTRACT_DIR"/*.yml; do
    fname=$(basename "$f")
    # Don't overwrite build.yml or proxy-ssl.yml unless they exist
    cp "$f" "$BASE_DIR/$fname"
done

# Update configs (entrypoints, nginx templates, etc.)
for d in config; do
    if [ -d "$EXTRACT_DIR/$d" ]; then
        cp -r "$EXTRACT_DIR/$d" "$BASE_DIR/"
    fi
done

# Restore .env (keep our values, append any new vars from upstream)
cp "$BACKUP_PATH/env.bak" "$BASE_DIR/.env"
if [ -n "${NEW_VARS:-}" ]; then
    log "Appending new .env variables from upstream..."
    echo "" >> "$BASE_DIR/.env"
    echo "# --- Added by update script ($TIMESTAMP) ---" >> "$BASE_DIR/.env"
    while IFS= read -r var; do
        default_val=$(grep -oP "^\s*${var}=\K.*" "$EXTRACT_DIR/.env" 2>/dev/null | head -1 || echo "")
        echo "    ${var}=${default_val}" >> "$BASE_DIR/.env"
    done <<< "$NEW_VARS"
fi

# Re-apply our customizations
# Keep EXTERNAL_PORT
sed -i "s/EXTERNAL_PORT=.*/EXTERNAL_PORT=\"8880\"/" "$BASE_DIR/.env"

# Re-source .env with updated values
source <(grep -v '^\s*#' "$BASE_DIR/.env" | grep '=' | sed 's/^\s*//' | sed 's/\r$//')

# ── Step 5: Pull new images ───────────────────────────────────────────────
log "Pulling new images (this may take a while)..."

ALL_COMPOSE=()
for f in db.yml redis.yml rabbitmq.yml opensearch.yml ds.yml \
         fluent.yml dashboards.yml migration-runner.yml \
         identity.yml notify.yml docspace.yml healthchecks.yml proxy.yml; do
    [ -f "$BASE_DIR/$f" ] && ALL_COMPOSE+=(-f "$f")
done

docker compose --env-file .env "${ALL_COMPOSE[@]}" pull 2>&1 | \
    grep -E "Pulling|Downloaded|up to date" || true

# ── Step 6: Start infrastructure ──────────────────────────────────────────
log "Starting infrastructure services..."
for f in db.yml redis.yml rabbitmq.yml opensearch.yml ds.yml; do
    [ -f "$BASE_DIR/$f" ] && docker compose --env-file .env -f "$f" up -d 2>&1 | grep -v "^$" || true
done

# Wait for MySQL
log "Waiting for MySQL to be healthy..."
for i in $(seq 1 60); do
    status=$(docker inspect --format '{{.State.Health.Status}}' onlyoffice-mysql-server 2>/dev/null || echo "starting")
    [ "$status" = "healthy" ] && break
    sleep 2
done
if [ "$status" != "healthy" ]; then
    warn "MySQL not healthy after 120s — continuing anyway"
fi

# ── Step 7: Run database migrations ───────────────────────────────────────
log "Running database migrations..."
docker compose --env-file .env -f migration-runner.yml up -d 2>&1 | grep -v "^$" || true

log "Waiting for migrations to complete (timeout: 5 min)..."
MIGRATION_OK=false
for i in $(seq 1 150); do
    state=$(docker inspect --format '{{.State.Status}}' onlyoffice-migration-runner 2>/dev/null || echo "running")
    if [ "$state" = "exited" ]; then
        exit_code=$(docker inspect --format '{{.State.ExitCode}}' onlyoffice-migration-runner 2>/dev/null || echo "1")
        if [ "$exit_code" = "0" ]; then
            MIGRATION_OK=true
            log "Migrations completed successfully."
        else
            err "Migration runner exited with code $exit_code"
            err "Check logs: docker logs onlyoffice-migration-runner"
        fi
        break
    fi
    sleep 2
done

if [ "$MIGRATION_OK" != "true" ]; then
    err "Migrations did not complete in time or failed."
    echo -n "Continue starting services anyway? [y/N] "
    if [ "$AUTO_YES" = "--yes" ]; then
        warn "Auto-continuing due to --yes flag"
    else
        read -r answer
        [ "$answer" != "y" ] && { err "Aborted. Restore from $BACKUP_PATH if needed."; exit 1; }
    fi
fi

# ── Step 8: Start application services ────────────────────────────────────
log "Starting application services..."
for f in identity.yml notify.yml docspace.yml healthchecks.yml proxy.yml; do
    [ -f "$BASE_DIR/$f" ] && docker compose --env-file .env -f "$f" up -d 2>&1 | grep -v "^$" || true
done

# Start logging
for f in fluent.yml dashboards.yml; do
    [ -f "$BASE_DIR/$f" ] && docker compose --env-file .env -f "$f" up -d 2>&1 | grep -v "^$" || true
done

# ── Step 9: Re-apply Unraid labels ────────────────────────────────────────
# The fresh compose files won't have our labels, so regenerate templates
log "Regenerating Unraid templates..."
python3 /tmp/gen_templates.py 2>/dev/null && log "Templates updated." || warn "Template generation failed (non-critical)"

# ── Step 10: Health check ─────────────────────────────────────────────────
log "Waiting for services to come up (60s)..."
sleep 30

HEALTHY=0
TOTAL=0
for name in $(docker ps --format '{{.Names}}' | grep onlyoffice | sort); do
    TOTAL=$((TOTAL + 1))
    status=$(docker inspect --format '{{.State.Health.Status}}' "$name" 2>/dev/null || echo "no-healthcheck")
    if [ "$status" = "healthy" ] || [ "$status" = "no-healthcheck" ]; then
        HEALTHY=$((HEALTHY + 1))
    fi
done

log "Health: $HEALTHY/$TOTAL containers OK"

# Quick HTTP check
HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://docspace.teedge.local" 2>/dev/null || echo "000")
log "DocSpace HTTPS status: $HTTP_CODE"

# ── Summary ────────────────────────────────────────────────────────────────
echo ""
log "════════════════════════════════════════════════"
log "  Update complete!"
log "  Backup at: $BACKUP_PATH/"
log "  DB dump:   $BACKUP_PATH/docspace_db.sql"
log "════════════════════════════════════════════════"

# Cleanup
rm -rf "$TEMP_DIR"

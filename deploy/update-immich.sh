#!/bin/bash
##############################################################################
# Immich — Update Script for Unraid
#
# Pulls latest release images and recreates containers.
# Immich uses the :release tag which always points to the latest stable.
#
# Usage:
#   bash /mnt/user/compose/update-immich.sh          # interactive
#   bash /mnt/user/compose/update-immich.sh --yes     # skip confirmation
##############################################################################

set -euo pipefail

COMPOSE_DIR="/mnt/user/compose"
COMPOSE_FILE="docker-compose.immich.yml"
BACKUP_DIR="/mnt/appdata/immich/backups"
AUTO_YES="${1:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)] WARNING:${NC} $*"; }
err()  { echo -e "${RED}[$(date +%H:%M:%S)] ERROR:${NC} $*"; }

# ── Pre-flight ─────────────────────────────────────────────────────────────
if [ ! -f "$COMPOSE_DIR/$COMPOSE_FILE" ]; then
    err "Compose file not found: $COMPOSE_DIR/$COMPOSE_FILE"
    exit 1
fi

cd "$COMPOSE_DIR"

# Show current versions
log "Current images:"
for name in immich-server immich-ml; do
    img=$(docker inspect "$name" --format '{{.Config.Image}}' 2>/dev/null || echo "not running")
    digest=$(docker inspect "$name" --format '{{.Image}}' 2>/dev/null | cut -c8-19 || echo "n/a")
    echo "  $name: $img ($digest)"
done

# ── Check for updates ──────────────────────────────────────────────────────
log "Checking for new images..."
UPDATES_AVAILABLE=false

for img in ghcr.io/immich-app/immich-server:release ghcr.io/immich-app/immich-machine-learning:release; do
    LOCAL=$(docker image inspect "$img" --format '{{.Id}}' 2>/dev/null || echo "none")
    docker pull --quiet "$img" > /dev/null 2>&1 || { warn "Failed to pull $img"; continue; }
    REMOTE=$(docker image inspect "$img" --format '{{.Id}}' 2>/dev/null || echo "pulled")
    if [ "$LOCAL" != "$REMOTE" ]; then
        log "Update available: $img"
        UPDATES_AVAILABLE=true
    fi
done

if [ "$UPDATES_AVAILABLE" = "false" ]; then
    log "All images are up to date."
    if [ "$AUTO_YES" != "--yes" ]; then
        echo -n "Recreate containers anyway? [y/N] "
        read -r answer
        [ "$answer" != "y" ] && { log "Done."; exit 0; }
    else
        log "No updates, exiting."
        exit 0
    fi
fi

# ── Confirmation ───────────────────────────────────────────────────────────
if [ "$AUTO_YES" != "--yes" ]; then
    echo ""
    echo "This will:"
    echo "  1. Dump the Immich PostgreSQL database (backup)"
    echo "  2. Pull latest :release images"
    echo "  3. Recreate all Immich containers"
    echo ""
    echo -n "Proceed? [y/N] "
    read -r answer
    [ "$answer" != "y" ] && { log "Aborted."; exit 0; }
fi

# ── Backup database ───────────────────────────────────────────────────────
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

log "Dumping Immich PostgreSQL database..."
docker exec immich-postgres pg_dumpall -U immich > "$BACKUP_DIR/immich_db_$TIMESTAMP.sql" 2>/dev/null \
    && log "Database dump saved ($(du -h "$BACKUP_DIR/immich_db_$TIMESTAMP.sql" | cut -f1))" \
    || warn "Database dump failed — continuing anyway"

# Keep only last 5 backups
ls -t "$BACKUP_DIR"/immich_db_*.sql 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true

# ── Update ─────────────────────────────────────────────────────────────────
log "Recreating containers with new images..."
docker compose -f "$COMPOSE_FILE" up -d 2>&1 | grep -v "^$" || true

# ── Verify ─────────────────────────────────────────────────────────────────
log "Waiting for containers to be healthy (90s max)..."
for i in $(seq 1 45); do
    server_status=$(docker inspect --format '{{.State.Health.Status}}' immich-server 2>/dev/null || echo "starting")
    ml_status=$(docker inspect --format '{{.State.Health.Status}}' immich-ml 2>/dev/null || echo "starting")
    if [ "$server_status" = "healthy" ] && [ "$ml_status" = "healthy" ]; then
        break
    fi
    sleep 2
done

log "Container status:"
for name in immich-server immich-ml immich-redis immich-postgres; do
    status=$(docker inspect --format '{{.State.Status}}' "$name" 2>/dev/null || echo "missing")
    health=$(docker inspect --format '{{.State.Health.Status}}' "$name" 2>/dev/null || echo "n/a")
    img=$(docker inspect "$name" --format '{{.Config.Image}}' 2>/dev/null || echo "?")
    echo "  $name: $status ($health) — $img"
done

HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://immich.teedge.local" 2>/dev/null || echo "000")
log "Immich HTTPS status: $HTTP_CODE"

echo ""
log "════════════════════════════════════════════════"
log "  Immich update complete!"
log "  DB backup: $BACKUP_DIR/immich_db_$TIMESTAMP.sql"
log "════════════════════════════════════════════════"

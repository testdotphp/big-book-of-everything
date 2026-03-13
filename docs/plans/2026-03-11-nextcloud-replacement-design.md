# Nextcloud Replacement for OnlyOffice DocSpace

## Summary

Replace the 36-container OnlyOffice DocSpace stack with a 3-container Nextcloud deployment: Nextcloud (Apache), MariaDB 11, and OnlyOffice Document Server (standalone editor only). Domain: `nextcloud.teedge.local`. Authentik OIDC for authentication.

## Motivation

DocSpace is unreliable on self-hosted Unraid. The `onlyoffice-dotnet-services` container runs 15+ ASP.NET processes via supervisord — any MySQL connectivity hiccup at startup causes cascading FATAL states that require manual intervention. 36 containers for a file/document platform used by 2 people is excessive.

## Architecture

### Containers

| Container | Image | Network | IP | Port |
|-----------|-------|---------|-----|------|
| `nextcloud` | `nextcloud:latest` | br0 macvlan | 192.168.150.133 | 80 |
| `nextcloud-db` | `mariadb:11` | nextcloud (bridge) | internal | 3306 |
| `nextcloud-onlyoffice` | `onlyoffice/documentserver:latest` | br0 macvlan | 192.168.150.134 | 80 |

### Storage

| Volume | Host Path |
|--------|-----------|
| Nextcloud data | `/mnt/appdata/nextcloud/data` |
| Nextcloud config | `/mnt/appdata/nextcloud/config` |
| MariaDB data | `/mnt/appdata/nextcloud/db` |
| OnlyOffice data | `/mnt/appdata/nextcloud/onlyoffice` |

### Networking

- NPM proxy: `nextcloud.teedge.local` -> 192.168.150.133:80 (SSL, wildcard cert ID 3)
- NPM proxy: `onlyoffice.teedge.local` -> 192.168.150.134:80 (SSL, wildcard cert ID 3)
- Remove NPM proxy: `docspace.teedge.local`

### Authentication

- Authentik OIDC provider for Nextcloud
- Nextcloud `user_oidc` app configured with Authentik endpoints

### Portal Integration

Update `home.config.json` — replace DocSpace entry:
```json
{
  "slug": "nextcloud",
  "label": "Files & Docs",
  "icon": "folder",
  "url": "https://nextcloud.teedge.local"
}
```

## Teardown Plan

1. Stop and remove all 36 DocSpace containers with `docker compose down --volumes`
2. Prune Docker volumes and images immediately
3. Remove `/mnt/appdata/docspace/` config directory
4. Remove `docspace.teedge.local` NPM proxy host

## Decisions

- No collaborative editing needed (single-user editing sufficient)
- Dedicated MariaDB (not shared with DocSpace)
- New domain `nextcloud.teedge.local` (not reusing `docspace.teedge.local`)
- No Docker volume backup from DocSpace — prune immediately

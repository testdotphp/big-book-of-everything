# Portal Template

A self-hosted web portal built with SvelteKit. Configurable sidebar navigation for your services, optional OIDC authentication, and a built-in **Big Book of Everything** — a structured family information organizer based on [Erik Dewey's Big Book of Everything](https://www.erikdewey.com/bigbook.htm).

## Features

- **Service Dashboard** — Configurable sidebar with grouped links to your services, embedded in iframes
- **Big Book of Everything** — 7 categories, 54 sections, 469 fields for organizing family information (medical, insurance, assets, etc.)
- **Person Grouping** — Sections with a "Who" field automatically group records by family member
- **Inline Editing** — Add/remove categories, sections, and fields directly from the UI
- **Optional OIDC Auth** — Works with any OIDC provider (Authentik, Keycloak, Auth0, Google) or runs without auth
- **Dark Theme** — Clean, modern dark UI with customizable accent color
- **Docker Ready** — Multi-stage Dockerfile included

## Quick Start

### With Docker

```bash
git clone <repo-url> portal-template
cd portal-template
docker compose up -d
```

Open http://localhost:3000. No auth required by default.

### Without Docker

```bash
git clone <repo-url> portal-template
cd portal-template
npm install --legacy-peer-deps
npm run build
BOOK_DB_PATH=./data/book.db node build
```

Open http://localhost:3000.

### Development

```bash
npm install --legacy-peer-deps
npm run dev
```

## Configuration

### Portal Config (`portal.config.json`)

Controls the portal name, theme color, icon, and sidebar navigation. See `configs/example.config.json` for the format.

Set the path via `PORTAL_CONFIG_PATH` env var. If not set, a default empty portal is used.

```json
{
  "name": "My Portal",
  "icon": "home",
  "theme": "#4CAF50",
  "items": [
    {
      "slug": "services",
      "label": "Services",
      "icon": "layout-grid",
      "children": [
        { "slug": "grafana", "label": "Grafana", "icon": "bar-chart", "url": "https://grafana.local" }
      ]
    }
  ]
}
```

Icons use [Lucide](https://lucide.dev/icons/) names.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORTAL_CONFIG_PATH` | No | Path to portal config JSON. Defaults to `portal.config.json` |
| `ORIGIN` | For HTTPS | Origin URL (e.g., `https://portal.example.com`) |
| `BOOK_DB_PATH` | No | Path to SQLite DB for Big Book. Omit to disable |
| `OIDC_ISSUER` | No | OIDC provider issuer URL |
| `OIDC_CLIENT_ID` | No | OIDC client ID |
| `OIDC_CLIENT_SECRET` | No | OIDC client secret |
| `AUTH_SECRET` | With OIDC | Session encryption key (`openssl rand -base64 32`) |
| `CA_CERT_PATH` | No | Custom CA cert for the help page download |
| `NODE_EXTRA_CA_CERTS` | No | CA cert for Node.js to trust (for self-signed OIDC providers) |

**Auth is optional.** If OIDC variables are not set, the portal runs without authentication. Set all four OIDC variables to enable SSO.

### Big Book of Everything

Set `BOOK_DB_PATH` to enable. On first run, the database is seeded with the full book structure from `configs/book-structure.json` (7 categories, 54 sections, 469 fields).

The book structure is based on "The Big Book of Everything" Version IV by Erik Dewey — a comprehensive family information organizer covering personal info, assets, liabilities, insurance, medical records, and final arrangements.

You can customize the structure through the UI:
- Add/remove categories from the main book page
- Add/remove sections from category pages
- Add/remove fields via the gear icon on section pages

## Docker Deployment

### Simple

```bash
docker compose up -d
```

### With OIDC Auth

```yaml
services:
  portal:
    build: .
    ports:
      - "3000:3000"
    environment:
      ORIGIN: "https://portal.example.com"
      PORTAL_CONFIG_PATH: "/app/portal.config.json"
      BOOK_DB_PATH: "/data/book.db"
      OIDC_ISSUER: "https://auth.example.com/realms/main"
      OIDC_CLIENT_ID: "portal"
      OIDC_CLIENT_SECRET: "your-secret"
      AUTH_SECRET: "your-session-secret"
    volumes:
      - ./my-config.json:/app/portal.config.json:ro
      - portal-data:/data
```

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) with Svelte 5
- [Drizzle ORM](https://orm.drizzle.team/) + SQLite (better-sqlite3)
- [@auth/sveltekit](https://authjs.dev/getting-started/integrations/sveltekit) for OIDC
- [Lucide](https://lucide.dev/) icons
- Node.js adapter for production builds

## License

MIT

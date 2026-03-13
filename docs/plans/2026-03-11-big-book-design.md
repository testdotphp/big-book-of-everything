# Big Book of Everything — Design Document

## Overview

Convert a 57-sheet personal/family life documentation spreadsheet into an embedded feature within the home portal. Two users (TJ and Ashley) access the same shared dataset via Authentik OIDC login. No per-user customization — all family info is shared.

## Data Model

### Schema (SQLite via Drizzle ORM)

**`categories`** — top-level groups (Personal, Finances, Insurance, Medical, Estate, etc.)
- `id` INTEGER PRIMARY KEY
- `name` TEXT NOT NULL
- `slug` TEXT NOT NULL UNIQUE
- `icon` TEXT (lucide icon name)
- `sort_order` INTEGER NOT NULL DEFAULT 0

**`sections`** — individual topics within a category (maps to spreadsheet sheets)
- `id` INTEGER PRIMARY KEY
- `category_id` INTEGER NOT NULL → categories.id
- `name` TEXT NOT NULL
- `slug` TEXT NOT NULL
- `type` TEXT NOT NULL (`key_value` | `table`) — determines rendering mode
- `sort_order` INTEGER NOT NULL DEFAULT 0
- UNIQUE(category_id, slug)

**`fields`** — defines what data each section collects
- `id` INTEGER PRIMARY KEY
- `section_id` INTEGER NOT NULL → sections.id
- `name` TEXT NOT NULL (display label)
- `slug` TEXT NOT NULL
- `field_type` TEXT NOT NULL (text | number | date | phone | email | currency | url | textarea | boolean)
- `sort_order` INTEGER NOT NULL DEFAULT 0
- UNIQUE(section_id, slug)

**`records`** — for table-type sections, each row is a record
- `id` INTEGER PRIMARY KEY
- `section_id` INTEGER NOT NULL → sections.id
- `sort_order` INTEGER NOT NULL DEFAULT 0

**`values`** — the actual data
- `id` INTEGER PRIMARY KEY
- `field_id` INTEGER NOT NULL → fields.id
- `record_id` INTEGER (NULL for key-value sections, set for table sections)
- `value` TEXT
- UNIQUE(field_id, record_id)

### Key Design Decisions

- **Flexible schema**: Categories, sections, and fields are defined in data, not hardcoded tables. New sections and fields can be added through the UI.
- **Two section types**: Key-value (simple labeled fields) and table (repeating rows). Covers both patterns found in the spreadsheet.
- **All values stored as TEXT**: Field type metadata drives input rendering and display formatting. Keeps the schema simple.
- **No encryption beyond Authentik**: Data is on a private LAN behind firewall + OIDC. Authentik login is sufficient.

## UI & Navigation

### Route Structure

```
/book                           → Category grid (cards)
/book/[category]                → Section list within category
/book/[category]/[section]      → View/edit section data
```

### Category Overview (`/book`)

Grid of cards, one per category. Each card shows icon, name, section count. Dark theme matching existing portal aesthetic.

### Section List (`/book/[category]`)

List of sections with name and data preview (e.g., "3 accounts" or "5 fields filled"). Breadcrumb navigation back to category grid.

### Section Detail (`/book/[category]/[section]`)

- **Key-value mode**: Form with labeled fields. Click to edit, auto-save on blur.
- **Table mode**: Styled table with rows. Add/edit/delete rows. Click row to expand for editing.

### Admin Features

Gear icon accessible from section/category views:
- Add/rename/reorder/delete categories
- Add/rename/reorder/delete sections (set type: key-value or table)
- Add/edit/remove field definitions (set name, type, order)

### Sidebar Integration

"Big Book" appears as a top-level sidebar item in the home portal (not inside a group). Icon: `book-open`. Routes to `/book` instead of loading an iframe.

## Technical Implementation

### Database

- **Engine**: SQLite via `better-sqlite3`
- **ORM**: Drizzle ORM with `drizzle-kit` for migrations
- **Storage**: File at path from `BOOK_DB_PATH` env var (e.g., `/data/book.db`)
- **Conditional**: Feature only active when `BOOK_DB_PATH` is set. Media and lab portals unaffected.

### Dependencies Added

- `drizzle-orm` — query builder and ORM
- `better-sqlite3` — SQLite driver
- `drizzle-kit` (dev) — migration tooling
- `@types/better-sqlite3` (dev) — TypeScript types

### SvelteKit Integration

- **Routes**: All under `src/routes/book/`
- **Form actions**: Server-side mutations via SvelteKit form actions
- **Progressive enhancement**: `use:enhance` for no-reload form submissions
- **Server hook**: Middleware checks `BOOK_DB_PATH`; returns 404 for `/book/*` if not set
- **Config injection**: Sidebar item for Big Book added at runtime in `+layout.server.ts` when feature is enabled

### File Structure

```
src/
├── lib/
│   ├── server/
│   │   ├── db.ts                    # SQLite connection + Drizzle instance
│   │   └── schema.ts                # Drizzle table definitions
│   └── components/
│       ├── BookCategoryCard.svelte   # Category grid card
│       ├── BookSectionList.svelte    # Section listing
│       ├── KeyValueEditor.svelte     # Key-value section editor
│       ├── TableEditor.svelte        # Table section editor
│       └── FieldEditor.svelte        # Admin field definition editor
├── routes/
│   └── book/
│       ├── +page.server.ts           # Load categories
│       ├── +page.svelte              # Category grid
│       ├── [category]/
│       │   ├── +page.server.ts       # Load sections for category
│       │   ├── +page.svelte          # Section list
│       │   └── [section]/
│       │       ├── +page.server.ts   # Load fields, records, values
│       │       ├── +page.svelte      # Section detail view
│       │       └── +server.ts        # API endpoint for auto-save
│       └── admin/
│           ├── +page.server.ts       # Category/section management
│           └── +page.svelte          # Admin UI
```

### Deployment Changes

**Home portal only** (`docker-compose.portals.yml`):
- Add env var: `BOOK_DB_PATH=/data/book.db`
- Add volume: `/mnt/appdata/portal/data:/data`
- Media and lab portal configs unchanged

**Backup**: `/mnt/appdata/portal/data/` covered by existing Kopia backup schedule.

## Data Import

One-time Python script (`scripts/import_spreadsheet.py`):
1. Reads `/home/teedge/Downloads/bigbookmkIV.xlsx` with openpyxl
2. Maps sheets → categories + sections based on a mapping config
3. Detects key-value vs table sheets (heuristic: sheets with <10 rows and no repeating structure → key-value)
4. Creates field definitions from column headers (table) or row labels (key-value)
5. Inserts all values
6. Outputs the SQLite DB file

Run once during initial setup. All future changes through the UI.

## Spreadsheet Category Mapping

Consolidate 57 sheets into ~10 categories:

| Category | Sheets |
|----------|--------|
| Personal Info | Personal Information, Family Members, Emergency Contacts |
| Finances | Bank Accounts, Credit Cards, Investments, Retirement, Debts, Budget |
| Insurance | Health, Auto, Home, Life, Umbrella, Other Insurance |
| Medical | Medical Providers, Medications, Allergies, Medical History, Immunizations |
| Home & Property | Home Details, Maintenance, Warranties, Appliances, Vehicles |
| Legal & Estate | Will, Power of Attorney, Trusts, Beneficiaries, Important Documents |
| Digital | Online Accounts, Subscriptions, Software Licenses |
| Education | Schools, Transcripts, Certifications |
| Employment | Employment History, Benefits, Contacts |
| Misc | Memberships, Loyalty Programs, Miscellaneous |

Exact mapping refined during import script development based on actual sheet contents.

## Success Criteria

- All spreadsheet data accessible through the portal UI
- Both TJ and Ashley can view and edit all data via Authentik login
- New categories, sections, and fields can be added without code changes
- Data backed up automatically via Kopia
- Media and lab portals unaffected

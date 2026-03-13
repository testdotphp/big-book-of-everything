# Downloadable Icon Packs — Design Document

**Date:** 2026-03-12

## Goal

Allow users to download and switch between icon packs for category/section icons. Lucide is the built-in default; additional packs can be downloaded from a registry and removed when no longer wanted.

## Decisions

- **Built-in pack:** Lucide (cannot be removed)
- **Downloadable packs:** Phosphor, Tabler, Heroicons, Font Awesome, Remix Icon, Feather, Bootstrap Icons, Material Symbols, Ionicons, Boxicons, Fluent UI (12 optional packs)
- **Storage:** Downloaded packs stored as JSON blobs in the `settings` table
- **Registry:** JSON file listing available packs, hosted alongside the app (or fetched from Gitea)
- **Loading:** Dynamic — only the active pack is loaded into the Icon component
- **Scope:** Global setting — one active pack for the entire app
- **UI:** Settings page under Appearance section, alongside theme picker

## Architecture

### Icon Pack Format

Each pack is a JSON file mapping the 54 icon names used in the app to SVG markup:

```json
{
  "name": "Phosphor",
  "slug": "phosphor",
  "author": "Phosphor Icons",
  "license": "MIT",
  "version": "1.0",
  "icons": {
    "users": "<svg viewBox=\"0 0 24 24\" ...>...</svg>",
    "shield": "<svg viewBox=\"0 0 24 24\" ...>...</svg>",
    ...
  }
}
```

SVG strings are complete `<svg>` elements with consistent 24x24 viewBox. The Icon component renders them via `{@html}` when a non-Lucide pack is active.

### Registry

A `configs/icon-registry.json` file lists all available packs:

```json
{
  "packs": [
    {
      "slug": "phosphor",
      "name": "Phosphor",
      "description": "Clean, flexible icon family",
      "preview": ["users", "shield", "heart-pulse"],
      "size": "12KB"
    }
  ]
}
```

Pack data files are stored at `configs/icon-packs/{slug}.json`.

### Storage

- **Active pack:** `settings` table, key `icon_pack`, value is the slug (default: `lucide`)
- **Downloaded packs:** `settings` table, key `icon_pack_data:{slug}`, value is the JSON string of the pack
- **Lucide:** Rendered natively via Lucide Svelte components (no JSON needed)

### Icon Component Changes

`Icon.svelte` currently imports Lucide components and uses a static `iconMap`. Updated logic:

1. If active pack is `lucide` → use existing Lucide component rendering (no change)
2. If active pack is anything else → look up SVG string from the downloaded pack data, render via `{@html}`
3. Fallback: if an icon name is missing from the active pack → fall back to Lucide

### Settings Page UI

Under "Appearance" section on `/book/settings`:

- **Theme picker** (existing)
- **Icon Pack** section:
  - Current active pack shown with name
  - Grid of available packs (from registry)
  - Each pack card shows: name, preview (3 sample icons), status (Downloaded / Not downloaded)
  - Actions: Download, Activate, Remove
  - Lucide shown as "Built-in" with no remove option

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/components/Icon.svelte` | Add dynamic SVG rendering for non-Lucide packs |
| `src/routes/+layout.server.ts` | Load active icon pack name + data from settings |
| `src/routes/+layout.svelte` | Pass icon pack data to context/stores |
| `src/routes/book/settings/+page.svelte` | Add icon pack management UI |
| `src/routes/book/settings/+page.server.ts` | Add actions for download/activate/remove |

## Files to Create

| File | Purpose |
|------|---------|
| `configs/icon-registry.json` | List of available icon packs with metadata |
| `configs/icon-packs/*.json` | SVG mapping files for each icon pack |
| `src/lib/stores/icon-pack.ts` | Store for active icon pack data |

## Flow

### Downloading a Pack

1. User clicks "Download" on a pack card in settings
2. Server reads the pack JSON from `configs/icon-packs/{slug}.json`
3. Server stores it in `settings` table as `icon_pack_data:{slug}`
4. UI updates to show "Downloaded" status

### Activating a Pack

1. User clicks "Activate" on a downloaded pack
2. Server updates `settings` key `icon_pack` to the new slug
3. Layout reloads, Icon component switches rendering mode
4. All icons throughout the app update immediately

### Removing a Pack

1. User clicks "Remove" on a downloaded pack (not available for Lucide)
2. If the pack is currently active, revert to Lucide first
3. Server deletes `icon_pack_data:{slug}` from settings
4. UI updates to show "Not downloaded" status

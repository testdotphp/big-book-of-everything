# Multiple Themes — Design Document

**Date:** 2026-03-12

## Goal

Replace the current dark/light toggle with a dropdown of 5 curated preset themes. Theme preference is stored in the database so it persists across devices.

## Themes

| Name | Slug | Base | Description |
|------|------|------|-------------|
| Dark | `dark` | Dark | Current default — deep navy/charcoal |
| Light | `light` | Light | Current light mode — clean white/gray |
| Nord | `nord` | Dark | Arctic blue-gray palette |
| Dracula | `dracula` | Dark | Purple/pink accents on dark background |
| Solarized Light | `solarized-light` | Light | Warm cream/tan with blue accents |

## Architecture

### Storage

- **Database:** `settings` table, key `theme`, value is the theme slug (e.g. `nord`)
- **Default:** `dark` when no setting exists
- **Loaded in:** `+layout.server.ts` — passed to client as `data.theme`
- **Applied as:** `data-theme` attribute on `<html>` element (existing mechanism)

### CSS Variables (per theme)

Each theme defines the same 15 color/shadow variables already used:

```
--bg-base, --bg-primary, --bg-secondary, --bg-elevated
--bg-hover, --bg-active
--text-primary, --text-secondary, --text-muted
--border-color, --border-subtle
--shadow-sm, --shadow-md, --shadow-lg
```

The `--theme-color` accent remains configurable via portal config (independent of theme).

### Flash Prevention

The inline script in `app.html` currently only handles `light`. It needs to be updated to read the stored theme slug and apply it before paint:

```html
<script>
  var t = localStorage.getItem('theme');
  if (t) document.documentElement.setAttribute('data-theme', t);
</script>
```

When the server-side theme loads, it overwrites localStorage to stay in sync with the DB value.

## UI

### Theme Picker (Settings Page)

A labeled dropdown or radio group on `/book/settings` with:
- Theme name
- Small color swatch preview (3-4 circles showing the palette's key colors)
- Current selection highlighted

Selecting a theme:
1. Calls `POST /api/book/settings` with `{ key: 'theme', value: slug }`
2. Sets `data-theme` attribute on `<html>` immediately
3. Updates `localStorage` for flash prevention on next load

### Sidebar Changes

The existing dark/light toggle button in the sidebar footer is removed. The sidebar gets simpler.

## Files to Modify

| File | Change |
|------|--------|
| `src/app.css` | Add `:root[data-theme='nord']`, `[data-theme='dracula']`, `[data-theme='solarized-light']` variable blocks |
| `src/app.html` | Update inline script to apply any stored theme slug |
| `src/routes/+layout.server.ts` | Load `theme` from settings table, return in data |
| `src/routes/+layout.svelte` | Apply `data-theme` from server data, sync to localStorage |
| `src/lib/components/Sidebar.svelte` | Remove dark/light toggle button and related state/logic |
| `src/routes/book/settings/+page.svelte` | Add theme picker UI |
| `src/routes/book/settings/+page.server.ts` | Add save action for theme setting |

## Files to Create

None — no new files needed.

## Color Palettes

### Nord
```css
--bg-base: #2e3440;
--bg-primary: #3b4252;
--bg-secondary: #434c5e;
--bg-elevated: #4c566a;
--bg-hover: rgba(216, 222, 233, 0.06);
--bg-active: rgba(216, 222, 233, 0.1);
--text-primary: #eceff4;
--text-secondary: #d8dee9;
--text-muted: #7b88a1;
--border-color: rgba(216, 222, 233, 0.08);
--border-subtle: rgba(216, 222, 233, 0.04);
```

### Dracula
```css
--bg-base: #1e1f29;
--bg-primary: #282a36;
--bg-secondary: #2d2f3f;
--bg-elevated: #343746;
--bg-hover: rgba(248, 248, 242, 0.05);
--bg-active: rgba(248, 248, 242, 0.09);
--text-primary: #f8f8f2;
--text-secondary: #c0bfbc;
--text-muted: #6272a4;
--border-color: rgba(248, 248, 242, 0.07);
--border-subtle: rgba(248, 248, 242, 0.03);
```

### Solarized Light
```css
--bg-base: #fdf6e3;
--bg-primary: #eee8d5;
--bg-secondary: #e8e1cc;
--bg-elevated: #ddd6c1;
--bg-hover: rgba(0, 0, 0, 0.04);
--bg-active: rgba(0, 0, 0, 0.07);
--text-primary: #073642;
--text-secondary: #586e75;
--text-muted: #93a1a1;
--border-color: rgba(0, 0, 0, 0.08);
--border-subtle: rgba(0, 0, 0, 0.04);
```

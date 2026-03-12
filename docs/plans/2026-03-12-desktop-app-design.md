# Desktop App Design — Big Book of Everything

## Summary

Package the portal-template's Big Book feature as a standalone desktop app using Electron, producing `.dmg` (macOS) and `.AppImage` (Linux) installers. Non-technical users download one file, open it, and start using the Big Book — no terminal, Docker, or configuration needed.

## Architecture

The desktop app wraps the existing SvelteKit server inside Electron:

```
Electron Main Process
├── Starts SvelteKit server (build/index.js) on random localhost port
├── Opens BrowserWindow pointing at http://localhost:{port}
├── Manages app lifecycle (quit, tray, etc.)
└── Sets env vars: BOOK_DB_PATH → user data dir, PORTAL_MODE=book

Electron Renderer (BrowserWindow)
└── Loads the same SvelteKit UI — no changes needed
```

**Data storage**: SQLite database in OS-standard user data directory (`~/Library/Application Support/BigBook` on macOS, `~/.config/BigBook` on Linux). The `configs/book-structure.json` seed file is bundled inside the app.

**Auth**: Defaults to no-auth (local user). OIDC can still be configured via a settings file in the user data directory.

## Electron Main Process

New `electron/` directory in the portal repo:

```
electron/
├── main.js          # App entry — starts SvelteKit server, opens window
├── preload.js       # Security bridge (minimal boilerplate)
```

**main.js** on launch:
1. Sets environment variables (`BOOK_DB_PATH` → user data dir, `PORT` → random free port, `ORIGIN` → `http://localhost:{port}`, `PORTAL_MODE` → `book`)
2. Forks `build/index.js` as a child process (the SvelteKit server)
3. Once the server is listening, opens a BrowserWindow to that URL

On quit, kills the child process and exits cleanly.

## Dashboard Stripping

No separate codebase. A single environment variable controls behavior:

**`PORTAL_MODE=book`** — When set:
- Root layout returns empty sidebar service items
- Root page (`/`) redirects to `/book`
- Sidebar only shows Big Book category navigation
- Service dashboard routes still exist but are unreachable

No `portal.config.json` needed — config loader already falls back to empty defaults.

## Packaging & Distribution

| Platform | Format | Architecture | Output |
|---|---|---|---|
| macOS | `.dmg` | Universal (x64 + arm64) | `Big Book of Everything.dmg` |
| Linux | `.AppImage` | x64 | `Big-Book-of-Everything.AppImage` |

**App metadata**:
- Name: "Big Book of Everything"
- Bundle ID: `com.testdotphp.big-book-of-everything`

**Build tools**: `electron-builder` for packaging, `electron-rebuild` for native better-sqlite3 compilation per platform.

**CI**: GitHub Actions builds both platforms on release tag push. Artifacts attached to GitHub Releases.

## New Files

| File | Purpose |
|---|---|
| `electron/main.js` | Electron entry point — server lifecycle + window |
| `electron/preload.js` | Standard Electron preload security bridge |
| `.github/workflows/desktop-build.yml` | CI workflow for building .dmg and .AppImage |

## Modified Files

| File | Change |
|---|---|
| `package.json` | Add electron, electron-builder, electron-rebuild devDependencies; add desktop build scripts |
| `src/routes/+layout.server.ts` | Check `PORTAL_MODE` to strip sidebar items |
| `src/routes/+page.svelte` | Redirect to `/book` when `PORTAL_MODE=book` |

## User Experience

1. Download `.dmg` or `.AppImage` from GitHub Releases
2. Open the installer / run the AppImage
3. App launches with the Big Book pre-seeded (7 categories, 54 sections, 469 fields)
4. Data stored locally, no account or internet required

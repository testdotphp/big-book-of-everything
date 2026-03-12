# Desktop App (Electron) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Package the portal's Big Book feature as `.dmg` (macOS) and `.AppImage` (Linux) desktop installers using Electron.

**Architecture:** Electron main process spawns the SvelteKit server (`build/index.js`) as a child process with `ELECTRON_RUN_AS_NODE=1`, then opens a BrowserWindow to `http://localhost:{port}`. A `PORTAL_MODE=book` env var strips the service dashboard, leaving only the Big Book UI. `electron-builder` packages everything with platform-specific native `better-sqlite3` binaries.

**Tech Stack:** Electron 33, electron-builder, SvelteKit adapter-node, better-sqlite3 (native), GitHub Actions CI

---

### Task 1: Install Electron Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install electron, electron-builder, and electron-rebuild**

```bash
cd /home/teedge/projects/portal-template
npm install --save-dev electron@^33.0.0 electron-builder@^25.0.0 @electron/rebuild@^3.0.0 --legacy-peer-deps
```

**Step 2: Add desktop build scripts to package.json**

Add these scripts to the `"scripts"` section of `package.json`:

```json
"electron:dev": "npm run build && electron electron/main.js",
"electron:build": "npm run build && electron-builder",
"electron:rebuild": "electron-rebuild -f -w better-sqlite3",
"postinstall": "electron-builder install-app-deps"
```

The `postinstall` hook ensures `better-sqlite3` is recompiled against Electron's Node headers every time `npm install` runs.

**Step 3: Verify electron installed correctly**

```bash
npx electron --version
```

Expected: `v33.x.x`

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add electron and electron-builder dependencies"
```

---

### Task 2: Add PORTAL_MODE Support to SvelteKit

**Files:**
- Modify: `src/routes/+layout.server.ts`
- Modify: `src/routes/+page.server.ts` (create if doesn't exist)
- Modify: `src/lib/components/Sidebar.svelte`

This task adds a `PORTAL_MODE=book` environment variable that strips the service dashboard and makes the app Big Book-only.

**Step 1: Modify the root layout server to detect book mode**

Edit `src/routes/+layout.server.ts` to read `PORTAL_MODE` and pass `bookMode` to the client:

```typescript
import type { LayoutServerLoad } from './$types';
import { getPortalConfig } from '$lib/server/config';
import { isBookEnabled } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const load: LayoutServerLoad = async (event) => {
  const session = await event.locals.auth?.();
  const bookMode = env.PORTAL_MODE === 'book';

  // In book mode, use a simplified config
  const config = bookMode
    ? { name: 'Big Book of Everything', icon: 'book-open', theme: '#4CAF50', items: [] }
    : getPortalConfig();

  // Protect all routes except auth callbacks (skip in book mode — no auth needed)
  if (!bookMode && !session?.user && !event.url.pathname.startsWith('/auth') && event.url.pathname !== '/login') {
    throw redirect(302, '/login');
  }

  return {
    session,
    config,
    bookEnabled: isBookEnabled(),
    bookMode
  };
};
```

**Step 2: Add root page redirect for book mode**

Create `src/routes/+page.server.ts`:

```typescript
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async () => {
  if (env.PORTAL_MODE === 'book') {
    throw redirect(302, '/book');
  }
};
```

**Step 3: Update Sidebar to handle book mode**

Edit `src/lib/components/Sidebar.svelte`. Add `bookMode` prop and render Big Book link directly when in book mode (instead of nested inside a nav group).

In the `<script>` block, add the prop:

```typescript
interface Props {
  config: PortalConfig;
  user: { name?: string | null; email?: string | null; image?: string | null };
  collapsed: boolean;
  bookEnabled?: boolean;
  bookMode?: boolean;
}

let { config, user, collapsed = $bindable(false), bookEnabled = false, bookMode = false }: Props = $props();
```

In the `<nav>` section, wrap the existing `{#each}` with a book mode check:

```svelte
<nav class="nav">
  {#if bookMode && bookEnabled}
    <!-- Book mode: show Big Book link directly, no nav groups -->
    <a
      href="/book"
      class="book-item"
      class:active={$page.url.pathname.startsWith('/book')}
      class:collapsed
      title={collapsed ? 'Big Book' : undefined}
    >
      <span class="book-icon" class:active={$page.url.pathname.startsWith('/book')}>
        <Icon name="book-open" size={18} />
      </span>
      {#if !collapsed}
        <span class="book-label">Big Book</span>
      {/if}
    </a>
  {:else}
    {#each config.items as item}
      <!-- ... existing nav group/item rendering (unchanged) ... -->
    {/each}
  {/if}
</nav>
```

In the footer, hide the sign-out link in book mode:

```svelte
{#if !bookMode}
  <a href="/auth/signout" class="signout-btn" title="Sign out">
    <LogOut size={16} strokeWidth={1.75} />
  </a>
{/if}
```

**Step 4: Pass bookMode to the Sidebar in +layout.svelte**

Edit `src/routes/+layout.svelte`, add `bookMode` prop to the Sidebar:

```svelte
<Sidebar
  config={data.config}
  user={data.session.user}
  bind:collapsed={sidebarCollapsed}
  bookEnabled={data.bookEnabled}
  bookMode={data.bookMode}
/>
```

**Step 5: Verify book mode works in dev**

```bash
PORTAL_MODE=book BOOK_DB_PATH=./data/test-book.db npm run dev
```

Open http://localhost:5173. Expected:
- Immediately redirects to `/book`
- Sidebar shows only "Big Book" link (no service groups)
- No sign-out button
- Big Book categories, sections, fields all work normally

**Step 6: Commit**

```bash
git add src/routes/+layout.server.ts src/routes/+page.server.ts src/lib/components/Sidebar.svelte src/routes/+layout.svelte
git commit -m "feat: add PORTAL_MODE=book for desktop Big Book-only mode"
```

---

### Task 3: Create Electron Main Process

**Files:**
- Create: `electron/main.js`

**Step 1: Create the electron directory**

```bash
mkdir -p /home/teedge/projects/portal-template/electron
```

**Step 2: Write electron/main.js**

This file:
1. Finds a free port
2. Sets env vars (BOOK_DB_PATH, PORT, ORIGIN, PORTAL_MODE)
3. Spawns the SvelteKit server with `ELECTRON_RUN_AS_NODE=1`
4. Waits for the server to be ready
5. Opens a BrowserWindow

```javascript
const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

let serverProcess = null;
let mainWindow = null;

// Find a free port
function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

// Wait for server to be ready by attempting TCP connections
function waitForServer(port, retries = 50) {
  return new Promise((resolve, reject) => {
    const attempt = (remaining) => {
      if (remaining <= 0) return reject(new Error('Server failed to start'));
      const socket = new net.Socket();
      socket.setTimeout(200);
      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        setTimeout(() => attempt(remaining - 1), 200);
      });
      socket.on('timeout', () => {
        socket.destroy();
        setTimeout(() => attempt(remaining - 1), 200);
      });
      socket.connect(port, '127.0.0.1');
    };
    attempt(retries);
  });
}

// Resolve path to bundled resources (works in dev and packaged)
function getResourcePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'server');
  }
  // Dev mode: project root
  return path.resolve(__dirname, '..');
}

async function startServer(port) {
  const resourcePath = getResourcePath();
  const serverEntry = path.join(resourcePath, 'build', 'index.js');

  // User data directory for SQLite database
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'book.db');

  const serverEnv = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    PORT: String(port),
    ORIGIN: `http://localhost:${port}`,
    HOST: '127.0.0.1',
    BOOK_DB_PATH: dbPath,
    PORTAL_MODE: 'book',
    NODE_ENV: 'production'
  };

  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: resourcePath,
    env: serverEnv,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[server] ${data.toString().trim()}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[server] ${data.toString().trim()}`);
  });

  serverProcess.on('exit', (code) => {
    console.log(`Server exited with code ${code}`);
    if (code !== 0 && code !== null) {
      app.quit();
    }
  });

  await waitForServer(port);
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Big Book of Everything',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    const port = await getFreePort();
    console.log(`Starting server on port ${port}...`);
    await startServer(port);
    console.log('Server ready, opening window...');
    createWindow(port);
  } catch (err) {
    console.error('Failed to start:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
```

**Step 3: Verify the main process starts in dev mode**

```bash
cd /home/teedge/projects/portal-template
npm run build
npx electron electron/main.js
```

Expected: A window opens showing the Big Book at `/book`. Check the terminal for `[server]` logs showing the SvelteKit server started.

**Step 4: Commit**

```bash
git add electron/main.js
git commit -m "feat: add electron main process with SvelteKit server lifecycle"
```

---

### Task 4: Create Electron Preload Script

**Files:**
- Create: `electron/preload.js`

**Step 1: Write the minimal preload script**

```javascript
// Minimal preload script — contextIsolation enabled, nodeIntegration disabled.
// Placeholder for any future bridge APIs between main and renderer.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true
});
```

**Step 2: Commit**

```bash
git add electron/preload.js
git commit -m "feat: add electron preload script"
```

---

### Task 5: Add electron-builder Configuration

**Files:**
- Modify: `package.json`
- Create: `electron/icons/` (app icons)

**Step 1: Add electron-builder config to package.json**

Add the following top-level keys to `package.json`:

```json
"main": "electron/main.js",
"build": {
  "appId": "com.testdotphp.big-book-of-everything",
  "productName": "Big Book of Everything",
  "directories": {
    "output": "dist"
  },
  "files": [
    "electron/**/*"
  ],
  "extraResources": [
    {
      "from": "build",
      "to": "server/build"
    },
    {
      "from": "drizzle",
      "to": "server/drizzle"
    },
    {
      "from": "configs/book-structure.json",
      "to": "server/configs/book-structure.json"
    },
    {
      "from": ".electron-staging/node_modules",
      "to": "server/node_modules"
    }
  ],
  "mac": {
    "target": [
      {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      }
    ],
    "category": "public.app-category.productivity",
    "icon": "electron/icons/icon.icns"
  },
  "linux": {
    "target": ["AppImage"],
    "category": "Utility",
    "icon": "electron/icons"
  },
  "dmg": {
    "title": "Big Book of Everything",
    "contents": [
      { "x": 130, "y": 220 },
      { "x": 410, "y": 220, "type": "link", "path": "/Applications" }
    ]
  }
}
```

**Step 2: Create placeholder app icons directory**

```bash
mkdir -p /home/teedge/projects/portal-template/electron/icons
```

A 512x512 PNG named `icon.png` is needed for Linux. For macOS, electron-builder auto-converts PNG to icns. A proper icon can be designed later — electron-builder uses a default if none is provided.

**Step 3: Add dist/ and .electron-staging/ to .gitignore**

Add these lines to `.gitignore`:

```
dist/
.electron-staging/
```

**Step 4: Commit**

```bash
git add package.json .gitignore
git commit -m "feat: add electron-builder packaging configuration"
```

---

### Task 6: Add Production node_modules Staging Script

**Files:**
- Create: `scripts/prepare-electron.js`
- Modify: `package.json` (add electron:package script)

**Step 1: Create the prepare script**

Create `scripts/prepare-electron.js`. This creates a clean production-only `node_modules` with `better-sqlite3` rebuilt for Electron:

```javascript
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const stagingDir = path.join(root, '.electron-staging');

// Clean previous staging
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

// Copy package files
fs.copyFileSync(
  path.join(root, 'package.json'),
  path.join(stagingDir, 'package.json')
);
if (fs.existsSync(path.join(root, 'package-lock.json'))) {
  fs.copyFileSync(
    path.join(root, 'package-lock.json'),
    path.join(stagingDir, 'package-lock.json')
  );
}

// Install production dependencies only
console.log('Installing production dependencies...');
execFileSync('npm', ['ci', '--omit=dev', '--legacy-peer-deps'], {
  cwd: stagingDir,
  stdio: 'inherit'
});

// Rebuild better-sqlite3 for Electron
console.log('Rebuilding native modules for Electron...');
execFileSync('npx', ['@electron/rebuild', '-f', '-w', 'better-sqlite3'], {
  cwd: stagingDir,
  stdio: 'inherit'
});

console.log('Staging complete. Production node_modules ready at .electron-staging/');
```

**Step 2: Add the package script to package.json**

Add to `"scripts"`:

```json
"electron:package": "npm run build && node scripts/prepare-electron.js && electron-builder"
```

**Step 3: Commit**

```bash
git add scripts/prepare-electron.js package.json
git commit -m "feat: add production node_modules staging for electron packaging"
```

---

### Task 7: Create GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/desktop-build.yml`

**Step 1: Create the workflow directory and file**

```bash
mkdir -p /home/teedge/projects/portal-template/.github/workflows
```

Write `.github/workflows/desktop-build.yml`:

```yaml
name: Build Desktop App

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Build SvelteKit
        run: npm run build

      - name: Prepare Electron packaging
        run: node scripts/prepare-electron.js

      - name: Build DMG
        run: npx electron-builder --mac
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload macOS artifact
        uses: actions/upload-artifact@v4
        with:
          name: macos-dmg
          path: dist/*.dmg

  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Build SvelteKit
        run: npm run build

      - name: Prepare Electron packaging
        run: node scripts/prepare-electron.js

      - name: Build AppImage
        run: npx electron-builder --linux
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload Linux artifact
        uses: actions/upload-artifact@v4
        with:
          name: linux-appimage
          path: dist/*.AppImage

  release:
    needs: [build-macos, build-linux]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          path: artifacts

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            artifacts/macos-dmg/*.dmg
            artifacts/linux-appimage/*.AppImage
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Step 2: Commit**

```bash
git add .github/workflows/desktop-build.yml
git commit -m "ci: add GitHub Actions workflow for desktop builds"
```

---

### Task 8: Local Verification

**Step 1: Build SvelteKit**

```bash
cd /home/teedge/projects/portal-template
npm run build
```

Expected: No errors. `build/` directory created with `index.js`, `handler.js`, etc.

**Step 2: Test electron dev mode**

```bash
npm run electron:dev
```

Expected:
- Terminal shows `Starting server on port XXXXX...` then `Server ready, opening window...`
- Electron window opens showing Big Book at `/book`
- Sidebar shows only "Big Book" link (no service dashboard items)
- No sign-out button in sidebar footer
- Can navigate to categories, sections, add records
- SQLite database created at Electron's user data directory

**Step 3: Test electron packaging (Linux only — macOS requires macOS runner)**

```bash
npm run electron:package
```

Expected: `dist/` directory created with `.AppImage` file.

**Step 4: Test the AppImage**

```bash
chmod +x dist/*.AppImage
./dist/*.AppImage
```

Expected: App opens, Big Book works identically to dev mode.

---

## File Summary

| Action | File |
|---|---|
| Create | `electron/main.js` |
| Create | `electron/preload.js` |
| Create | `electron/icons/` (placeholder) |
| Create | `scripts/prepare-electron.js` |
| Create | `.github/workflows/desktop-build.yml` |
| Create | `src/routes/+page.server.ts` |
| Modify | `package.json` (deps, scripts, electron-builder config) |
| Modify | `src/routes/+layout.server.ts` (PORTAL_MODE detection) |
| Modify | `src/routes/+layout.svelte` (pass bookMode prop) |
| Modify | `src/lib/components/Sidebar.svelte` (bookMode rendering) |
| Modify | `.gitignore` (add dist/, .electron-staging/) |

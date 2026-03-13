const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');
const https = require('https');
const fs = require('fs');

let serverProcess = null;
let mainWindow = null;

// --- Settings persistence ---
function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(getSettingsPath(), 'utf-8'));
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2));
}

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

function getResourcePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'server');
  }
  return path.resolve(__dirname, '..');
}

async function startServer(port) {
  const resourcePath = getResourcePath();
  const serverEntry = path.join(resourcePath, 'build', 'index.js');
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'book.db');

  const serverEnv = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    PORT: String(port),
    ORIGIN: `http://127.0.0.1:${port}`,
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
      preload: path.join(__dirname, 'preload.cjs'),
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

// --- Update checking ---
const GITHUB_REPO = 'testdotphp/big-book-of-everything';

function checkForUpdates(silent = false) {
  const options = {
    hostname: 'api.github.com',
    path: `/repos/${GITHUB_REPO}/releases/latest`,
    headers: { 'User-Agent': 'Big-Book-of-Everything' }
  };

  https.get(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const release = JSON.parse(data);
        const latestVersion = (release.tag_name || '').replace(/^v/, '');
        const currentVersion = app.getVersion();

        if (mainWindow) {
          mainWindow.webContents.send('update-status', {
            currentVersion,
            latestVersion,
            updateAvailable: isNewerVersion(currentVersion, latestVersion),
            releaseUrl: release.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
            releaseName: release.name || latestVersion,
            silent
          });
        }

        if (!silent && !isNewerVersion(currentVersion, latestVersion)) {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'No Updates Available',
            message: `You're running the latest version (v${currentVersion}).`,
            buttons: ['OK']
          });
        }

        if (isNewerVersion(currentVersion, latestVersion)) {
          // Find the right asset for this platform
          const assets = release.assets || [];
          const platform = process.platform;
          const arch = process.arch;
          let asset = null;

          if (platform === 'darwin') {
            asset = assets.find(a => a.name.endsWith('.dmg') && a.name.includes(arch === 'arm64' ? 'arm64' : 'x64'));
            if (!asset) asset = assets.find(a => a.name.endsWith('.dmg'));
          } else if (platform === 'linux') {
            asset = assets.find(a => a.name.endsWith('.AppImage'));
          } else if (platform === 'win32') {
            asset = assets.find(a => a.name.endsWith('.exe'));
          }

          const buttons = asset ? ['Download', 'View Release', 'Later'] : ['View Release', 'Later'];

          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Update Available',
            message: `A new version is available: v${latestVersion}\nYou are running v${currentVersion}.`,
            detail: release.name || '',
            buttons,
            defaultId: 0
          }).then(async ({ response }) => {
            if (asset && response === 0) {
              // Download the asset to a user-chosen location
              const defaultName = asset.name;
              const { filePath } = await dialog.showSaveDialog(mainWindow, {
                title: 'Save Update',
                defaultPath: path.join(app.getPath('downloads'), defaultName),
                filters: [{ name: 'All Files', extensions: ['*'] }]
              });
              if (filePath) {
                downloadAsset(asset.browser_download_url, filePath, latestVersion);
              }
            } else if ((asset && response === 1) || (!asset && response === 0)) {
              shell.openExternal(release.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`);
            }
          });
        }
      } catch {
        if (!silent) {
          dialog.showMessageBox(mainWindow, {
            type: 'error',
            title: 'Update Check Failed',
            message: 'Could not check for updates. Please try again later.',
            buttons: ['OK']
          });
        }
      }
    });
  }).on('error', () => {
    if (!silent) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Update Check Failed',
        message: 'Could not connect to GitHub. Check your internet connection.',
        buttons: ['OK']
      });
    }
  });
}

function downloadAsset(url, savePath, version) {
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', { percent: 0, version });
  }

  const follow = (downloadUrl) => {
    https.get(downloadUrl, { headers: { 'User-Agent': 'Big-Book-of-Everything' } }, (res) => {
      // Follow redirects (GitHub sends 302 to the actual file)
      if (res.statusCode === 301 || res.statusCode === 302) {
        return follow(res.headers.location);
      }

      if (res.statusCode !== 200) {
        dialog.showMessageBox(mainWindow, {
          type: 'error',
          title: 'Download Failed',
          message: `Server returned status ${res.statusCode}`,
          buttons: ['OK']
        });
        return;
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let downloaded = 0;
      const file = fs.createWriteStream(savePath);

      res.on('data', (chunk) => {
        downloaded += chunk.length;
        if (totalBytes > 0 && mainWindow) {
          mainWindow.webContents.send('download-progress', {
            percent: Math.round((downloaded / totalBytes) * 100),
            version
          });
        }
      });

      res.pipe(file);

      file.on('finish', () => {
        file.close();
        if (mainWindow) {
          mainWindow.webContents.send('download-progress', { percent: 100, version });
        }
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Download Complete',
          message: `v${version} has been downloaded.`,
          detail: savePath,
          buttons: ['Show in Folder', 'OK'],
          defaultId: 0
        }).then(({ response }) => {
          if (response === 0) {
            shell.showItemInFolder(savePath);
          }
        });
      });

      file.on('error', (err) => {
        fs.unlink(savePath, () => {});
        dialog.showMessageBox(mainWindow, {
          type: 'error',
          title: 'Download Failed',
          message: err.message,
          buttons: ['OK']
        });
      });
    }).on('error', (err) => {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Download Failed',
        message: err.message,
        buttons: ['OK']
      });
    });
  };

  follow(url);
}

function isNewerVersion(current, latest) {
  if (!latest) return false;
  const c = current.split('.').map(Number);
  const l = latest.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((l[i] || 0) > (c[i] || 0)) return true;
    if ((l[i] || 0) < (c[i] || 0)) return false;
  }
  return false;
}

// IPC handlers
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('check-for-updates', () => checkForUpdates(false));
ipcMain.handle('get-auto-update', () => {
  const settings = loadSettings();
  return settings.autoUpdate !== false; // default: true
});
ipcMain.handle('set-auto-update', (_event, enabled) => {
  const settings = loadSettings();
  settings.autoUpdate = enabled;
  saveSettings(settings);
});

// Auto-check for updates 5 seconds after window loads (if enabled)
app.on('browser-window-created', () => {
  setTimeout(() => {
    const settings = loadSettings();
    if (settings.autoUpdate !== false) {
      checkForUpdates(true);
    }
  }, 5000);
});

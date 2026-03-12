const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

let serverProcess = null;
let mainWindow = null;

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

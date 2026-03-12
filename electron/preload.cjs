// Minimal preload script — contextIsolation enabled, nodeIntegration disabled.
// Placeholder for any future bridge APIs between main and renderer.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true
});

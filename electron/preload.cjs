const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getAutoUpdate: () => ipcRenderer.invoke('get-auto-update'),
  setAutoUpdate: (enabled) => ipcRenderer.invoke('set-auto-update', enabled),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (_event, data) => callback(data));
  }
});

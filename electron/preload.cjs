const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  toggleFullScreen: () => ipcRenderer.send('window-toggle-fullscreen'),
  reload: () => ipcRenderer.send('window-reload'),
  forceReload: () => ipcRenderer.send('window-force-reload'),
  setZoomFactor: (factor) => webFrame.setZoomFactor(factor),
  getZoomFactor: () => webFrame.getZoomFactor(),
  isElectron: true,
  platform: process.platform,
});

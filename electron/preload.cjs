const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: (payload) => ipcRenderer.invoke('download-update', payload),
  installPendingUpdate: () => ipcRenderer.invoke('install-pending-update'),
  dismissUpdateNotice: () => ipcRenderer.invoke('dismiss-update-notice'),
  onUpdateState: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('update-state-changed', handler);
    return () => ipcRenderer.removeListener('update-state-changed', handler);
  },
  openUpdateRelease: (url) => ipcRenderer.invoke('open-update-release', url),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  toggleFullScreen: () => ipcRenderer.send('window-toggle-fullscreen'),
  reload: () => ipcRenderer.send('window-reload'),
  forceReload: () => ipcRenderer.send('window-force-reload'),
  setZoomFactor: (factor) => webFrame.setZoomFactor(factor),
  getZoomFactor: () => webFrame.getZoomFactor(),
  openInstructionManual: () => ipcRenderer.invoke('open-instruction-manual'),
  testSmtpConnection: (config) => ipcRenderer.invoke('test-smtp-connection', config),
  renderPayslipPdf: (htmlContent) => ipcRenderer.invoke('render-payslip-pdf', htmlContent),
  sendPayslipEmail: (payload) => ipcRenderer.invoke('send-payslip-email', payload),
  isElectron: true,
  platform: process.platform,
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dracoAPI', {
  platform: process.platform,
  version: '0.1.0',
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  readDir: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  deleteFile: (targetPath) => ipcRenderer.invoke('delete-file', targetPath),
  renameFile: (oldPath, newPath) => ipcRenderer.invoke('rename-file', oldPath, newPath),
  statFile: (targetPath) => ipcRenderer.invoke('stat-file', targetPath),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  terminalInit: (cwd) => ipcRenderer.invoke('terminal-init', cwd),
  terminalKill: () => ipcRenderer.invoke('terminal-kill'),
  getNetInterfaces: () => ipcRenderer.invoke('get-net-interfaces'),
  getSysInfo: () => ipcRenderer.invoke('get-sys-info'),
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  getDrives: () => ipcRenderer.invoke('get-drives'),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  listTelemetrySessions: () => ipcRenderer.invoke('telemetry:list-convs'),
  attachTelemetry: (convId, maxHistory) => ipcRenderer.invoke('telemetry:attach', { convId, maxHistory }),
  pauseTelemetry: (paused) => ipcRenderer.invoke('telemetry:pause', { paused }),
  getActiveTelemetrySession: () => ipcRenderer.invoke('telemetry:get-active'),
  setDNS: (dnsServer) => ipcRenderer.invoke('browser-set-dns', dnsServer),
  setProxy: (proxyRules) => ipcRenderer.invoke('browser-set-proxy', proxyRules),
  setUserAgent: (ua) => ipcRenderer.invoke('browser-set-user-agent', ua),
  checkPublicIP: () => ipcRenderer.invoke('browser-check-ip'),
  openWebviewDevTools: () => ipcRenderer.invoke('open-webview-devtools'),
  checkWSL: () => ipcRenderer.invoke('wsl-check'),
  send: (channel, data) => {
    const validChannels = ['toMain', 'terminal-input'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    const validChannels = ['fromMain', 'terminal-output', 'telemetry:stream'];
    if (validChannels.includes(channel)) {
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
    return () => {};
  },
  off: (channel, func) => {
    const validChannels = ['fromMain', 'terminal-output', 'telemetry:stream'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, func);
    }
  },
});

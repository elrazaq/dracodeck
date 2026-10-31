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
  send: (channel, data) => {
    const validChannels = ['toMain', 'terminal-input'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    const validChannels = ['fromMain', 'terminal-output'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
});

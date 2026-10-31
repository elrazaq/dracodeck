const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dracoAPI', {
  platform: process.platform,
  version: '0.1.0',
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  readDir: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
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

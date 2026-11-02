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
  terminalSetCwd: (cwd) => ipcRenderer.invoke('terminal-set-cwd', cwd),
  terminalGetCwd: () => ipcRenderer.invoke('terminal-get-cwd'),
  terminalGetHistory: () => ipcRenderer.invoke('terminal-get-history'),
  terminalClearHistory: () => ipcRenderer.invoke('terminal-clear-history'),
  slayerScanPorts: () => ipcRenderer.invoke('slayer-scan-ports'),
  slayerKillProcess: (pid, forceTree = true) => ipcRenderer.invoke('slayer-kill-process', pid, forceTree),
  slayerKillPort: (port) => ipcRenderer.invoke('slayer-kill-port', port),
  slayerProbePort: (host, port) => ipcRenderer.invoke('slayer-probe-port', host, port),
  vulnScan: (targetUrl) => ipcRenderer.invoke('vuln-scan', targetUrl),
  vulnCertInspect: (host, port) => ipcRenderer.invoke('vuln-cert-inspect', host, port),
  sentinelRunPoV: (targetUrl) => ipcRenderer.invoke('sentinel-run-pov', targetUrl),
  sentinelCrawlShadow: (targetUrl) => ipcRenderer.invoke('sentinel-crawl-shadow', targetUrl),
  sentinelTestTiming: (targetUrl, endpoint, testUser) => ipcRenderer.invoke('sentinel-test-timing', targetUrl, endpoint, testUser),
  sentinelTestConcurrency: (targetUrl, endpoint) => ipcRenderer.invoke('sentinel-test-concurrency', targetUrl, endpoint),
  gitResolveRepo: (workspacePath, activeFilePath, overrideRepoPath) => ipcRenderer.invoke('git-resolve-repo', workspacePath, activeFilePath, overrideRepoPath),
  gitInit: (cwd) => ipcRenderer.invoke('git-init', cwd),
  gitDefaultIdentity: () => ipcRenderer.invoke('git-default-identity'),
  gitUserConfig: (cwd) => ipcRenderer.invoke('git-user-config', cwd),
  gitSetUserConfig: (cwd, config) => ipcRenderer.invoke('git-set-user-config', cwd, config),
  gitAddRemote: (cwd, remoteUrl) => ipcRenderer.invoke('git-add-remote', cwd, remoteUrl),
  gitStatus: (cwd) => ipcRenderer.invoke('git-status', cwd),
  gitBranches: (cwd) => ipcRenderer.invoke('git-branches', cwd),
  gitCheckout: (cwd, branchName, createNew = false) => ipcRenderer.invoke('git-checkout', cwd, branchName, createNew),
  gitStage: (cwd, filePath) => ipcRenderer.invoke('git-stage', cwd, filePath),
  gitUnstage: (cwd, filePath) => ipcRenderer.invoke('git-unstage', cwd, filePath),
  gitDiscard: (cwd, filePath) => ipcRenderer.invoke('git-discard', cwd, filePath),
  gitDiff: (cwd, filePath, staged = false) => ipcRenderer.invoke('git-diff', cwd, filePath, staged),
  gitSync: (cwd, options) => ipcRenderer.invoke('git-sync', cwd, options),
  gitLog: (cwd, limit = 25) => ipcRenderer.invoke('git-log', cwd, limit),
  memoryListNotes: (cwd) => ipcRenderer.invoke('memory-list-notes', cwd),
  memoryReadNote: (cwd, filename) => ipcRenderer.invoke('memory-read-note', cwd, filename),
  memorySaveNote: (cwd, filename, content) => ipcRenderer.invoke('memory-save-note', cwd, filename, content),
  memoryDeleteNote: (cwd, filename) => ipcRenderer.invoke('memory-delete-note', cwd, filename),
  memoryGetTasks: (cwd) => ipcRenderer.invoke('memory-get-tasks', cwd),
  memorySaveTasks: (cwd, tasks) => ipcRenderer.invoke('memory-save-tasks', cwd, tasks),
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

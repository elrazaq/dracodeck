const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const { spawn } = require('child_process');
const telemetry = require('./telemetry.cjs');
const vulnScanner = require('./vulnScanner.cjs');
const portSlayer = require('./portSlayer.cjs');

let mainWindow = null;
let terminalProcess = null;
let activeAppCwd = process.cwd();
let terminalLogBuffer = [
  'DRACODECK ConPTY PseudoConsole Bridge [Version 1.0.0]',
  'Windows PowerShell Interactive Session Connected.',
  'Type any PowerShell / Win32 command and press Enter.',
  '',
];
const MAX_LOG_LINES = 3000;

function appendTerminalLog(data) {
  const str = data.toString();
  const lines = str.split(/\r?\n/);
  for (const l of lines) {
    terminalLogBuffer.push(l);
  }
  if (terminalLogBuffer.length > MAX_LOG_LINES) {
    terminalLogBuffer = terminalLogBuffer.slice(terminalLogBuffer.length - MAX_LOG_LINES);
  }
}

function initTerminal(cwd) {
  if (terminalProcess) {
    const oldPid = terminalProcess.pid;
    try {
      portSlayer.killWin32Process(oldPid, true);
    } catch {}
    terminalProcess = null;
  }

  const isWin = process.platform === 'win32';
  const shell = isWin ? 'powershell.exe' : 'bash';
  const args = isWin ? ['-NoLogo', '-ExecutionPolicy', 'Bypass'] : [];

  try {
    terminalProcess = spawn(shell, args, {
      cwd: cwd || activeAppCwd || process.cwd(),
      env: { ...process.env, TERM: 'xterm-256color' },
      shell: true,
    });

    terminalProcess.stdout.on('data', (chunk) => {
      appendTerminalLog(chunk);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal-output', chunk.toString());
      }
    });

    terminalProcess.stderr.on('data', (chunk) => {
      appendTerminalLog(chunk);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal-output', chunk.toString());
      }
    });

    terminalProcess.on('close', (code) => {
      const msg = `\r\n[Process terminated with code ${code}]\r\n`;
      appendTerminalLog(msg);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal-output', msg);
      }
      terminalProcess = null;
    });
  } catch (err) {
    console.error('Failed to spawn terminal:', err);
  }
}

// Set explicit Windows App User Model ID so Windows Taskbar pins and icons are bound to Dracodeck
if (process.platform === 'win32') {
  app.setAppUserModelId('com.elrazaq.dracodeck');
}

function createWindow() {
  const iconPath = path.join(__dirname, '../public/dracodeck-logo.png');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    fullscreen: true,
    fullscreenable: true,
    frame: false,
    icon: iconPath,
    backgroundColor: '#0b0813',
    title: 'Dracodeck // Offensive Developer Cockpit',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  // Enable WebRTC leak protection by default
  try {
    session.defaultSession.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
  } catch {}

  // Strip restrictive security headers (X-Frame-Options & CSP) to unblock all websites in DracoBrowser
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    callback({ cancel: false, responseHeaders });
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    // Enforce exclusive F11 fullscreen on startup
    mainWindow.setFullScreen(true);
    mainWindow.show();
    mainWindow.focus();
    // Initialize default terminal in app directory
    initTerminal(process.cwd());
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    telemetry.stopTelemetry();
    if (terminalProcess) {
      try {
        terminalProcess.kill();
      } catch {}
      terminalProcess = null;
    }
  });
}

// IPC Handlers - Window Controls
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
    } else {
      mainWindow.setFullScreen(true);
    }
  }
});

ipcMain.handle('window-close', () => {
  app.quit();
});

// IPC Handlers - Terminal ConPTY Engine
ipcMain.on('terminal-input', (event, data) => {
  if (!terminalProcess) {
    initTerminal();
  }
  if (terminalProcess && terminalProcess.stdin && terminalProcess.stdin.writable) {
    terminalProcess.stdin.write(data);
  }
});

ipcMain.handle('terminal-init', (event, cwd) => {
  const targetCwd = cwd || activeAppCwd || process.cwd();
  activeAppCwd = targetCwd;
  initTerminal(targetCwd);
  return true;
});

ipcMain.handle('terminal-set-cwd', (event, newCwd) => {
  if (!newCwd) return false;
  try {
    if (fs.existsSync(newCwd)) {
      activeAppCwd = newCwd;
      if (terminalProcess && terminalProcess.stdin && terminalProcess.stdin.writable) {
        const isWin = process.platform === 'win32';
        const cdCmd = isWin ? `Set-Location -LiteralPath "${newCwd}"\r\n` : `cd "${newCwd}"\n`;
        terminalProcess.stdin.write(cdCmd);
        return true;
      } else {
        initTerminal(newCwd);
        return true;
      }
    }
  } catch (err) {
    console.error('Failed to set terminal CWD:', err);
  }
  return false;
});

ipcMain.handle('terminal-get-cwd', () => {
  return activeAppCwd || process.cwd();
});

ipcMain.handle('terminal-kill', async () => {
  if (terminalProcess) {
    const pid = terminalProcess.pid;
    try {
      await portSlayer.killWin32Process(pid, true);
    } catch {}
    terminalProcess = null;
  }
  return true;
});

ipcMain.handle('terminal-get-history', () => {
  return terminalLogBuffer;
});

ipcMain.handle('terminal-clear-history', () => {
  terminalLogBuffer = [];
  return true;
});

// IPC Handlers - DracoShell CLI & System Telemetry
ipcMain.handle('get-net-interfaces', () => {
  return os.networkInterfaces();
});

ipcMain.handle('get-sys-info', () => {
  const cpus = os.cpus();
  return {
    cpus: cpus.length,
    cpuModel: cpus[0]?.model || 'Generic Processor',
    totalMem: os.totalmem(),
    freeMem: os.freemem(),
    uptime: os.uptime(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    hostname: os.hostname(),
  };
});

ipcMain.handle('check-update', () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/elrazaq/dracodeck/commits/main',
      headers: { 'User-Agent': 'Dracodeck-Cockpit' },
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            commit: parsed.sha ? parsed.sha.slice(0, 7) : 'c407f06',
            message: parsed.commit?.message || 'Latest commit up to date',
            date: parsed.commit?.author?.date || new Date().toISOString(),
            status: 'UP_TO_DATE',
          });
        } catch {
          resolve({ commit: 'c407f06', status: 'LATEST', message: 'Current version active' });
        }
      });
    }).on('error', () => {
      resolve({ commit: 'c407f06', status: 'OFFLINE', message: 'Offline mode / cache valid' });
    });
  });
});

// IPC Handlers - Antigravity Telemetry Engine (M3)
ipcMain.handle('telemetry:list-convs', () => {
  return telemetry.listConversations();
});

ipcMain.handle('telemetry:attach', (event, { convId, maxHistory } = {}) => {
  return telemetry.attachTelemetry(convId, (newEvents) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('telemetry:stream', newEvents);
    }
  }, maxHistory);
});

ipcMain.handle('telemetry:pause', (event, { paused } = {}) => {
  return telemetry.pauseTelemetry(paused);
});

ipcMain.handle('telemetry:get-active', () => {
  return telemetry.getActiveSession();
});

// IPC Handlers - Universal PC Drive & Folder Discovery
ipcMain.handle('get-drives', async () => {
  const home = os.homedir();
  const places = [
    { name: 'Home (~)', path: home, isDrive: false },
    { name: 'Desktop', path: path.join(home, 'Desktop'), isDrive: false },
    { name: 'Downloads', path: path.join(home, 'Downloads'), isDrive: false },
    { name: 'Documents', path: path.join(home, 'Documents'), isDrive: false },
  ];

  const drives = [];
  // Probe Windows drive letters C to Z
  for (let code = 67; code <= 90; code++) {
    const letter = String.fromCharCode(code) + ':\\';
    try {
      if (fs.existsSync(letter)) {
        drives.push({ name: `Local Disk (${letter[0]}:)`, path: letter, isDrive: true });
      }
    } catch {}
  }

  return { drives, places };
});

// IPC Handlers - Filesystem & System Operations
ipcMain.handle('quit-app', () => {
  app.quit();
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Dracodeck Workspace Directory',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths.length) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('read-dir', async (event, dirPath) => {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((e) => !e.name.startsWith('.git') && e.name !== 'node_modules')
      .map((e) => ({
        name: e.name,
        isDirectory: e.isDirectory(),
        path: path.join(dirPath, e.name),
      }));
  } catch (err) {
    console.error('Error reading dir:', err);
    return [];
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch (err) {
    console.error('Error reading file:', err);
    throw err;
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    await fs.promises.writeFile(filePath, content, 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing file:', err);
    throw err;
  }
});

ipcMain.handle('delete-file', async (event, targetPath) => {
  try {
    await fs.promises.rm(targetPath, { recursive: true, force: true });
    return true;
  } catch (err) {
    console.error('Error deleting file/folder:', err);
    throw err;
  }
});

ipcMain.handle('rename-file', async (event, oldPath, newPath) => {
  try {
    await fs.promises.rename(oldPath, newPath);
    return true;
  } catch (err) {
    console.error('Error renaming file/folder:', err);
    throw err;
  }
});

ipcMain.handle('stat-file', async (event, targetPath) => {
  try {
    const stats = await fs.promises.stat(targetPath);
    return {
      size: stats.size,
      mtime: stats.mtime.toISOString(),
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
    };
  } catch (err) {
    console.error('Error stating file:', err);
    return null;
  }
});

// Browser OpSec IPC Handlers: DNS, Proxy, UA, Egress IP, Live DevTools
ipcMain.handle('browser-set-dns', async (event, dnsServer) => {
  try {
    if (!dnsServer || dnsServer === 'direct') {
      app.configureHostResolver({ secureDnsMode: 'off' });
      return { success: true, mode: 'direct' };
    }
    app.configureHostResolver({
      secureDnsMode: 'secure',
      secureDnsServers: [dnsServer],
    });
    return { success: true, mode: dnsServer };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('browser-set-proxy', async (event, proxyRules) => {
  try {
    await session.defaultSession.setProxy({
      proxyRules: proxyRules || '',
      proxyBypassRules: '<local>',
    });
    return { success: true, proxy: proxyRules || 'direct' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('browser-set-user-agent', async (event, userAgent) => {
  try {
    session.defaultSession.setUserAgent(userAgent);
    return { success: true, userAgent };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('browser-check-ip', async () => {
  try {
    const res = await fetch('https://api.ipify.org?format=json').then((r) => r.json());
    return { ip: res.ip, status: 'online' };
  } catch {
    return { ip: 'Offline / Shielded', status: 'offline' };
  }
});

ipcMain.handle('open-webview-devtools', (event, options) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
      return { opened: false };
    } else {
      mainWindow.webContents.openDevTools({ mode: options?.mode || 'right' });
      return { opened: true };
    }
  }
  return { opened: false };
});

// Port Slayer IPC Handlers
ipcMain.handle('slayer-scan-ports', async () => {
  try {
    return await portSlayer.scanWin32Ports();
  } catch (err) {
    return [];
  }
});

ipcMain.handle('slayer-kill-process', async (event, pid, forceTree = true) => {
  try {
    return await portSlayer.killWin32Process(pid, forceTree);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('slayer-kill-port', async (event, port) => {
  try {
    return await portSlayer.killPortProcess(port);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('slayer-probe-port', async (event, host, port) => {
  try {
    return await portSlayer.probeSocket(host, port);
  } catch (err) {
    return { open: false, latencyMs: -1, error: err.message };
  }
});

// Vulnerability Scanner IPC Handlers (Zero CORS via Node Main Process)
ipcMain.handle('vuln-scan', async (event, targetUrl) => {
  try {
    return await vulnScanner.runVulnerabilityAudit(targetUrl);
  } catch (err) {
    return {
      targetUrl,
      timestamp: new Date().toISOString(),
      findings: [{
        id: 'SCAN_CRASH',
        category: 'SYSTEM',
        severity: 'CRITICAL',
        title: 'Scanner Engine Error',
        evidence: err.message,
        description: 'Vulnerability scanner encountered an unhandled exception.',
        remediation: 'Verify target URL format and network accessibility.',
      }],
      summary: { critical: 1, high: 0, medium: 0, low: 0, pass: 0 },
    };
  }
});

ipcMain.handle('vuln-cert-inspect', async (event, hostname, port = 443) => {
  try {
    return await vulnScanner.inspectTlsCert(hostname, port);
  } catch (err) {
    return { valid: false, error: err.message };
  }
});

ipcMain.handle('wsl-check', async () => {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve({ hasWSL: false, isKali: false });
      return;
    }
    const proc = spawn('wsl', ['-l', '-q'], { shell: true });
    let out = '';
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.on('close', () => {
      const clean = out.replace(/\0/g, '').toLowerCase();
      resolve({
        hasWSL: clean.trim().length > 0,
        isKali: clean.includes('kali'),
      });
    });
    proc.on('error', () => resolve({ hasWSL: false, isKali: false }));
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

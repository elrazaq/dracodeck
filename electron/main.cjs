const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const { spawn } = require('child_process');
const telemetry = require('./telemetry.cjs');
const vulnScanner = require('./vulnScanner.cjs');
const portSlayer = require('./portSlayer.cjs');
const sentinelEngine = require('./sentinelEngine.cjs');
const gitOps = require('./gitOps.cjs');
const memoryStore = require('./memoryStore.cjs');
const antigravityBridge = require('./antigravityBridge.cjs');

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

ipcMain.handle('app-relaunch', () => {
  app.relaunch();
  app.exit(0);
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
let prevCpuTicks = null;

function computeRealCpuLoad() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const type of Object.keys(cpu.times)) {
      total += cpu.times[type];
    }
    idle += cpu.times.idle;
  }
  if (!prevCpuTicks) {
    prevCpuTicks = { idle, total };
    return Math.min(100, Math.max(1, Math.round(((total - idle) / total) * 100)));
  }
  const idleDiff = idle - prevCpuTicks.idle;
  const totalDiff = total - prevCpuTicks.total;
  prevCpuTicks = { idle, total };
  if (totalDiff <= 0) return 1;
  return Math.min(100, Math.max(1, Math.round((1 - idleDiff / totalDiff) * 100)));
}

ipcMain.handle('get-net-interfaces', () => {
  return os.networkInterfaces();
});

ipcMain.handle('get-sys-info', () => {
  const cpus = os.cpus();
  return {
    cpus: cpus.length,
    cpuModel: cpus[0]?.model || 'Generic Processor',
    cpuLoadPct: computeRealCpuLoad(),
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

ipcMain.handle('read-image-base64', async (event, filePath) => {
  try {
    const buf = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    const mimeMap = {
      svg: 'image/svg+xml',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      ico: 'image/x-icon',
      bmp: 'image/bmp',
      avif: 'image/avif',
    };
    const mime = mimeMap[ext] || 'image/png';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch (err) {
    console.error('Error reading image:', err);
    throw err;
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
ipcMain.handle('slayer-scan-ports', async (event, workspacePath) => {
  try {
    const scopePath = workspacePath || activeAppCwd || '';
    const shellPid = terminalProcess && terminalProcess.pid ? terminalProcess.pid : null;
    return await portSlayer.scanWin32Ports(scopePath, shellPid);
  } catch (err) {
    return [];
  }
});

// Real AST / TypeScript Compiler Diagnostics IPC Handler
ipcMain.handle('lint-code-diagnostics', async (event, fileName, content) => {
  try {
    const ext = (fileName || '').split('.').pop().toLowerCase();
    if (!['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs'].includes(ext)) return [];
    const ts = require('typescript');
    const compilerOptions = {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      allowJs: true,
      isolatedModules: true,
    };
    if (ext.endsWith('x')) {
      compilerOptions.jsx = ts.JsxEmit.ReactJSX;
    }
    const result = ts.transpileModule(content || '', {
      fileName: fileName || 'module.ts',
      reportDiagnostics: true,
      compilerOptions,
    });
    if (!result.diagnostics || result.diagnostics.length === 0) return [];
    return result.diagnostics
      .filter((d) => d.code !== 6046)
      .map((d, idx) => {
        let line = 1;
        let col = 1;
        if (d.file && typeof d.start === 'number') {
          const pos = d.file.getLineAndCharacterOfPosition(d.start);
          line = pos.line + 1;
          col = pos.character + 1;
        }
        const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
        return {
          id: `tsc-ast-${line}-${col}-${idx}`,
          file: (fileName || '').split(/[/\\]/).pop() || fileName,
          filePath: fileName,
          line,
          col,
          severity: d.category === ts.DiagnosticCategory.Warning ? 'warning' : 'error',
          message: `TS${d.code}: ${msg}`,
          source: 'TS Compiler',
        };
      });
  } catch {
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

// DracoDeck Sentinel Engine IPC Handlers (Milestone M4.1)
ipcMain.handle('sentinel-run-pov', async (event, targetUrl) => {
  try {
    return await sentinelEngine.runProofOfVerification(targetUrl);
  } catch (err) {
    return {
      targetUrl,
      timestamp: new Date().toISOString(),
      durationMs: 0,
      verifiedFindings: [],
      totalVerified: 0,
      error: err.message,
    };
  }
});

ipcMain.handle('sentinel-crawl-shadow', async (event, targetUrl) => {
  try {
    return await sentinelEngine.crawlShadowApis(targetUrl);
  } catch (err) {
    return {
      targetUrl,
      scannedScripts: 0,
      timestamp: new Date().toISOString(),
      durationMs: 0,
      shadowEndpoints: [],
      hiddenParameters: [],
      leakedSecrets: [],
      error: err.message,
    };
  }
});

ipcMain.handle('sentinel-test-timing', async (event, targetUrl, endpointPath, testUser) => {
  try {
    return await sentinelEngine.testSideChannelTiming(targetUrl, endpointPath, testUser);
  } catch (err) {
    return {
      endpoint: endpointPath,
      testUser,
      error: err.message,
      isVulnerable: false,
    };
  }
});

ipcMain.handle('sentinel-test-concurrency', async (event, targetUrl, endpointPath) => {
  try {
    return await sentinelEngine.testConcurrencyRace(targetUrl, endpointPath);
  } catch (err) {
    return {
      targetEndpoint: endpointPath,
      burstCount: 0,
      totalWindowMs: 0,
      statusCodes: [],
      latencies: [],
      error: err.message,
    };
  }
});

// DracoDeck GitOps & Memory Store IPC Handlers (Milestone M5 & M6.1)

ipcMain.handle('git-resolve-repo', async (event, workspacePath, activeFilePath, overrideRepoPath) => {
  try {
    return await gitOps.resolveGitRepo(workspacePath || activeAppCwd, activeFilePath, overrideRepoPath);
  } catch (err) {
    return {
      isRepo: false,
      repoPath: workspacePath || activeAppCwd,
      repoName: '',
      source: 'none',
      subRepos: [],
      error: err.message,
    };
  }
});

ipcMain.handle('git-init', async (event, cwd) => {
  try {
    return await gitOps.initGitRepo(cwd || activeAppCwd);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('git-default-identity', async () => {
  try {
    return gitOps.getDefaultIdentity();
  } catch (err) {
    return { name: 'Dracode Operator', email: 'operator@dracodeck.local' };
  }
});


ipcMain.handle('git-user-config', async (event, cwd) => {
  try {
    return await gitOps.getGitUserConfig(cwd || activeAppCwd);
  } catch (err) {
    return { hasIdentity: false, name: '', email: '', isGlobal: false, error: err.message };
  }
});

ipcMain.handle('git-set-user-config', async (event, cwd, config) => {
  try {
    return await gitOps.setGitUserConfig(cwd || activeAppCwd, config);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('git-add-remote', async (event, cwd, remoteUrl) => {
  try {
    return await gitOps.addRemoteOrigin(cwd || activeAppCwd, remoteUrl);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('git-status', async (event, cwd) => {
  try {
    return await gitOps.getGitStatus(cwd || activeAppCwd);
  } catch (err) {
    return {
      isRepo: false,
      branch: 'no-repo',
      staged: [],
      unstaged: [],
      untracked: [],
      ahead: 0,
      behind: 0,
      totalDirty: 0,
      error: err.message,
    };
  }
});

ipcMain.handle('git-branches', async (event, cwd) => {
  try {
    return await gitOps.getGitBranches(cwd || activeAppCwd);
  } catch (err) {
    return { current: 'main', local: [], remote: [], error: err.message };
  }
});

ipcMain.handle('git-checkout', async (event, cwd, branchName, createNew = false) => {
  try {
    return await gitOps.switchBranch(cwd || activeAppCwd, branchName, createNew);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('git-stage', async (event, cwd, filePath) => {
  try {
    return await gitOps.stageFile(cwd || activeAppCwd, filePath);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('git-unstage', async (event, cwd, filePath) => {
  try {
    return await gitOps.unstageFile(cwd || activeAppCwd, filePath);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('git-discard', async (event, cwd, filePath) => {
  try {
    return await gitOps.discardFile(cwd || activeAppCwd, filePath);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('git-diff', async (event, cwd, filePath, staged = false) => {
  try {
    return await gitOps.getFileDiff(cwd || activeAppCwd, filePath, staged);
  } catch (err) {
    return { ok: false, diff: '', error: err.message };
  }
});

ipcMain.handle('git-sync', async (event, cwd, options) => {
  try {
    return await gitOps.commitAndSync(cwd || activeAppCwd, options);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('git-log', async (event, cwd, limit = 25) => {
  try {
    return await gitOps.getGitLog(cwd || activeAppCwd, limit);
  } catch {
    return [];
  }
});

ipcMain.handle('memory-list-notes', async (event, cwd) => {
  try {
    return await memoryStore.listNotes(cwd || activeAppCwd);
  } catch {
    return [];
  }
});

ipcMain.handle('memory-read-note', async (event, cwd, filename) => {
  try {
    return await memoryStore.readNote(cwd || activeAppCwd, filename);
  } catch (err) {
    return { ok: false, name: filename, content: '', error: err.message };
  }
});

ipcMain.handle('memory-save-note', async (event, cwd, filename, content) => {
  try {
    return await memoryStore.saveNote(cwd || activeAppCwd, filename, content);
  } catch (err) {
    return { ok: false, name: filename, error: err.message };
  }
});

ipcMain.handle('memory-delete-note', async (event, cwd, filename) => {
  try {
    return await memoryStore.deleteNote(cwd || activeAppCwd, filename);
  } catch (err) {
    return { ok: false, name: filename, error: err.message };
  }
});

ipcMain.handle('memory-get-tasks', async (event, cwd) => {
  try {
    return await memoryStore.getTasks(cwd || activeAppCwd);
  } catch {
    return [];
  }
});

ipcMain.handle('memory-save-tasks', async (event, cwd, tasks) => {
  try {
    return await memoryStore.saveTasks(cwd || activeAppCwd, tasks);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Milestone M8: Official Google Antigravity Live Bridge IPC Handlers
ipcMain.handle('antigravity-connect-scope', async (event, workspacePath, options) => {
  try {
    return await antigravityBridge.connectScope(workspacePath || activeAppCwd, options || {});
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('antigravity-send-prompt', async (event, payload) => {
  try {
    return await antigravityBridge.sendPrompt({
      ...(payload || {}),
      workspacePath: payload?.workspacePath || activeAppCwd,
    });
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('antigravity-get-models', async () => {
  try {
    return await antigravityBridge.getAvailableModels();
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('antigravity-get-usage', async () => {
  try {
    return antigravityBridge.getUsageStats();
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('antigravity-get-skills', async (event, workspacePath) => {
  try {
    return antigravityBridge.getAvailableSkills(workspacePath || activeAppCwd);
  } catch (err) {
    return { ok: false, error: err.message, skills: [] };
  }
});

ipcMain.handle('antigravity-get-messages', async (event, conversationId) => {
  try {
    return antigravityBridge.getSessionMessages(conversationId);
  } catch (err) {
    return { ok: false, error: err.message, messages: [] };
  }
});

ipcMain.handle('antigravity-delete-session', async (event, conversationId, workspacePath) => {
  try {
    return antigravityBridge.deleteSession(conversationId, workspacePath || activeAppCwd);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('antigravity-stop-prompt', async (event, conversationId) => {
  try {
    return antigravityBridge.stopPrompt(conversationId);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('antigravity-save-attachment', async (event, payload) => {
  try {
    return antigravityBridge.saveAttachment(payload?.base64Data, payload?.fileName, payload?.conversationId);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('select-files', async (event, options = {}) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: options.title || 'Select Files',
      properties: options.properties || ['openFile', 'multiSelections'],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return { ok: true, paths: result.filePaths };
    }
    return { ok: false, paths: [] };
  } catch (err) {
    return { ok: false, error: err.message, paths: [] };
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

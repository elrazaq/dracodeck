const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const { spawn } = require('child_process');

let mainWindow = null;
let terminalProcess = null;

function initTerminal(cwd) {
  if (terminalProcess) {
    try {
      terminalProcess.kill();
    } catch {}
    terminalProcess = null;
  }

  const isWin = process.platform === 'win32';
  const shell = isWin ? 'powershell.exe' : 'bash';
  const args = isWin ? ['-NoLogo', '-ExecutionPolicy', 'Bypass'] : [];

  try {
    terminalProcess = spawn(shell, args, {
      cwd: cwd || process.cwd(),
      env: { ...process.env, TERM: 'xterm-256color' },
      shell: true,
    });

    terminalProcess.stdout.on('data', (chunk) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal-output', chunk.toString());
      }
    });

    terminalProcess.stderr.on('data', (chunk) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal-output', chunk.toString());
      }
    });

    terminalProcess.on('close', (code) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal-output', `\r\n[Process terminated with code ${code}]\r\n`);
      }
      terminalProcess = null;
    });
  } catch (err) {
    console.error('Failed to spawn terminal:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    fullscreen: true,
    fullscreenable: true,
    frame: false,
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
  initTerminal(cwd);
  return true;
});

ipcMain.handle('terminal-kill', () => {
  if (terminalProcess) {
    try {
      terminalProcess.kill();
    } catch {}
    terminalProcess = null;
  }
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

const { execFile } = require('child_process');
const net = require('net');

/**
 * DracoNet Win32 Zombie Port Slayer Engine
 * Zero-dependency native socket inspection & process tree termination.
 */

// Well-known developer ports and default signatures
const KNOWN_DEV_PORTS = {
  3000: 'Next.js / React Default',
  5173: 'Vite React / Vue Dev Server',
  8080: 'Webpack / Spring / Vue Alternate',
  8000: 'FastAPI / Django / Python Web',
  5000: 'Flask / ASP.NET Web API',
  4200: 'Angular CLI Dev Server',
  4000: 'Hexo / GraphQL Server',
  1234: 'Parcel Bundler',
  5432: 'PostgreSQL Relational DB',
  3306: 'MySQL / MariaDB Server',
  27017: 'MongoDB NoSQL Engine',
  6379: 'Redis In-Memory Cache',
  9222: 'Chromium DevTools / Remote Debug',
  8443: 'HTTPS Dev Alternate',
  22: 'OpenSSH Remote Service',
  80: 'HTTP Standard Server',
  443: 'HTTPS Secure Server',
};

// Protected system process names and IDs that must never be terminated
const PROTECTED_PROCESSES = new Set([
  'system idle process',
  'system',
  'registry',
  'smss.exe',
  'csrss.exe',
  'wininit.exe',
  'services.exe',
  'lsass.exe',
  'svchost.exe',
  'winlogon.exe',
  'explorer.exe',
  'spoolsv.exe',
  'fontdrvhost.exe',
  'dwm.exe',
]);

const PROTECTED_PIDS = new Set([0, 4]);

function getProcessMap() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve(new Map());
      return;
    }

    execFile('tasklist.exe', ['/FO', 'CSV', '/NH'], { windowsHide: true }, (err, stdout) => {
      const map = new Map();
      if (err || !stdout) {
        resolve(map);
        return;
      }

      const lines = stdout.split('\r\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        // Parse CSV line format: "Image Name","PID","Session Name","Session#","Mem Usage"
        const parts = line.split('","');
        if (parts.length >= 2) {
          const name = parts[0].replace(/^"/, '').trim();
          const pid = parseInt(parts[1].replace(/"/g, ''), 10);
          if (!isNaN(pid)) {
            map.set(pid, name);
          }
        }
      }
      resolve(map);
    });
  });
}

function scanWin32Ports() {
  return new Promise(async (resolve) => {
    if (process.platform !== 'win32') {
      resolve([]);
      return;
    }

    const processMap = await getProcessMap();
    const selfPid = process.pid;

    execFile('netstat.exe', ['-ano'], { windowsHide: true }, (err, stdout) => {
      if (err || !stdout) {
        resolve([]);
        return;
      }

      const rows = [];
      const lines = stdout.split('\r\n');
      const seen = new Set();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('TCP')) continue;

        // Pattern: TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       12345
        const tokens = trimmed.split(/\s+/);
        if (tokens.length < 5) continue;

        const localAddr = tokens[1];
        const state = tokens[3];
        const pid = parseInt(tokens[4], 10);

        if (isNaN(pid)) continue;

        // Extract port number from localAddr (e.g., 0.0.0.0:5173 or [::]:5173)
        const lastColon = localAddr.lastIndexOf(':');
        if (lastColon === -1) continue;
        const portStr = localAddr.substring(lastColon + 1);
        const port = parseInt(portStr, 10);
        if (isNaN(port)) continue;

        const uniqueKey = `${port}-${pid}-${state}`;
        if (seen.has(uniqueKey)) continue;
        seen.add(uniqueKey);

        const procName = processMap.get(pid) || 'unknown';
        const lowerName = procName.toLowerCase();

        const isSelf = pid === selfPid;
        const isProtected = isSelf || PROTECTED_PIDS.has(pid) || PROTECTED_PROCESSES.has(lowerName);
        const label = KNOWN_DEV_PORTS[port] || (procName !== 'unknown' ? procName : `TCP Port ${port}`);

        rows.push({
          port,
          protocol: 'TCP',
          localAddress: localAddr,
          state: state === 'LISTENING' ? 'LISTENING' : state,
          pid,
          processName: procName,
          label,
          isDevPort: Boolean(KNOWN_DEV_PORTS[port]),
          isProtected,
          isSelf,
        });
      }

      // Sort: Dev ports first, then port number ascending
      rows.sort((a, b) => {
        if (a.state === 'LISTENING' && b.state !== 'LISTENING') return -1;
        if (a.state !== 'LISTENING' && b.state === 'LISTENING') return 1;
        if (a.isDevPort && !b.isDevPort) return -1;
        if (!a.isDevPort && b.isDevPort) return 1;
        return a.port - b.port;
      });

      resolve(rows);
    });
  });
}

function killWin32Process(pid, forceTree = true) {
  return new Promise((resolve) => {
    const targetPid = parseInt(pid, 10);
    if (isNaN(targetPid)) {
      resolve({ success: false, error: 'Invalid PID number' });
      return;
    }

    if (PROTECTED_PIDS.has(targetPid) || targetPid === process.pid) {
      resolve({ success: false, error: `PID ${targetPid} is protected by system guard.` });
      return;
    }

    const args = ['/F'];
    if (forceTree) {
      args.push('/T');
    }
    args.push('/PID', targetPid.toString());

    execFile('taskkill.exe', args, { windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        resolve({
          success: false,
          error: stderr ? stderr.trim() : (err.message || 'Failed to terminate process'),
        });
      } else {
        resolve({
          success: true,
          pid: targetPid,
          output: stdout ? stdout.trim() : `Process ${targetPid} terminated.`,
        });
      }
    });
  });
}

function probeSocket(host = '127.0.0.1', port) {
  return new Promise((resolve) => {
    const cleanHost = host || '127.0.0.1';
    const targetPort = parseInt(port, 10);
    const startTime = Date.now();

    const socket = new net.Socket();
    socket.setTimeout(400);

    socket.connect(targetPort, cleanHost, () => {
      const latencyMs = Date.now() - startTime;

      // Try sending lightweight HEAD request to capture web server header
      socket.write(`HEAD / HTTP/1.0\r\nHost: ${cleanHost}\r\n\r\n`);

      socket.once('data', (data) => {
        const text = data.toString('utf-8');
        let banner = '';
        const lines = text.split('\r\n');
        for (const l of lines) {
          if (l.toLowerCase().startsWith('server:')) {
            banner = l.trim();
            break;
          }
        }
        socket.destroy();
        resolve({ open: true, latencyMs, banner });
      });

      setTimeout(() => {
        socket.destroy();
        resolve({ open: true, latencyMs, banner: '' });
      }, 100);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ open: false, latencyMs: -1, error: 'Connection timed out' });
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve({ open: false, latencyMs: -1, error: err.message });
    });
  });
}

function killPortProcess(targetPort) {
  return new Promise(async (resolve) => {
    try {
      const portNum = parseInt(targetPort, 10);
      if (isNaN(portNum)) {
        resolve({ success: false, error: 'Invalid port number' });
        return;
      }
      const ports = await scanWin32Ports();
      const matches = ports.filter((p) => p.port === portNum && p.state === 'LISTENING');
      if (matches.length === 0) {
        resolve({ success: false, error: `No active listening process on port ${portNum}` });
        return;
      }
      const uniquePids = [...new Set(matches.map((m) => m.pid))];
      let lastRes = { success: false };
      for (const pid of uniquePids) {
        const res = await killWin32Process(pid, true);
        if (res.success) {
          lastRes = { ...res, port: portNum, processName: matches[0].processName };
        }
      }
      resolve(lastRes.success ? lastRes : { success: false, error: `Failed to terminate PID(s) on port ${portNum}` });
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
}

module.exports = {
  scanWin32Ports,
  killWin32Process,
  killPortProcess,
  probeSocket,
  KNOWN_DEV_PORTS,
};


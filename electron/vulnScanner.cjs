const http = require('http');
const https = require('https');
const tls = require('tls');
const urlModule = require('url');

/**
 * Real Web Vulnerability & Security Scanner (Node.js Main Process)
 * Bypasses browser CORS restrictions completely.
 * Gathers authentic HTTP evidence, headers, and SSL certificates.
 */

const SENSITIVE_PATHS = [
  { path: '/.git/HEAD', name: 'Git Repository Exposure', signature: 'ref: refs/', category: 'EXPOSURE', severity: 'CRITICAL', cwe: 'CWE-527' },
  { path: '/.git/config', name: 'Git Config Exposure', signature: '[core]', category: 'EXPOSURE', severity: 'CRITICAL', cwe: 'CWE-527' },
  { path: '/.env', name: 'Environment Variables Exposure', signature: 'APP_', category: 'EXPOSURE', severity: 'CRITICAL', cwe: 'CWE-552' },
  { path: '/.env.example', name: 'Environment Example Exposure', signature: 'APP_', category: 'EXPOSURE', severity: 'LOW', cwe: 'CWE-552' },
  { path: '/backup.sql', name: 'SQL Database Dump Exposure', signature: 'CREATE TABLE', category: 'EXPOSURE', severity: 'CRITICAL', cwe: 'CWE-552' },
  { path: '/dump.sql', name: 'SQL Dump File', signature: 'INSERT INTO', category: 'EXPOSURE', severity: 'CRITICAL', cwe: 'CWE-552' },
  { path: '/.DS_Store', name: 'macOS Metadata Leak', signature: '\x00\x00\x00\x01Bud1', category: 'EXPOSURE', severity: 'MEDIUM', cwe: 'CWE-200' },
  { path: '/wp-config.php.bak', name: 'WordPress Config Backup', signature: 'DB_PASSWORD', category: 'EXPOSURE', severity: 'CRITICAL', cwe: 'CWE-530' },
  { path: '/phpinfo.php', name: 'PHP Info Configuration Leak', signature: 'PHP Version', category: 'EXPOSURE', severity: 'HIGH', cwe: 'CWE-200' },
  { path: '/server-status', name: 'Apache Server Status Exposure', signature: 'Apache Server Status', category: 'EXPOSURE', severity: 'HIGH', cwe: 'CWE-200' },
  { path: '/robots.txt', name: 'Robots.txt Analysis', signature: 'User-agent:', category: 'RECON', severity: 'INFO', cwe: 'CWE-200' },
];

function rawHttpRequest(targetUrl, method = 'GET', customHeaders = {}, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(targetUrl);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + (parsed.search || ''),
        method: method,
        timeout: timeoutMs,
        rejectUnauthorized: false, // allow inspection of self-signed certs
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Dracodeck/0.1.0 Security-Auditor',
          'Accept': '*/*',
          ...customHeaders,
        },
      };

      const req = client.request(options, (res) => {
        const chunks = [];
        let bodyLength = 0;
        const maxCapture = 16384; // 16KB capture cap

        res.on('data', (chunk) => {
          if (bodyLength < maxCapture) {
            chunks.push(chunk);
            bodyLength += chunk.length;
          }
        });

        res.on('end', () => {
          const bodyBuffer = Buffer.concat(chunks);
          resolve({
            statusCode: res.statusCode || 0,
            statusMessage: res.statusMessage || '',
            headers: res.headers,
            body: bodyBuffer.toString('utf-8', 0, Math.min(bodyBuffer.length, 4096)),
            rawLength: bodyLength,
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          statusCode: 0,
          statusMessage: 'TIMEOUT',
          headers: {},
          body: '',
          rawLength: 0,
        });
      });

      req.on('error', (err) => {
        resolve({
          statusCode: 0,
          statusMessage: err.message,
          headers: {},
          body: '',
          rawLength: 0,
        });
      });

      req.end();
    } catch (err) {
      resolve({
        statusCode: 0,
        statusMessage: err.message,
        headers: {},
        body: '',
        rawLength: 0,
      });
    }
  });
}

function inspectTlsCert(hostname, port = 443) {
  return new Promise((resolve) => {
    try {
      const socket = tls.connect({
        host: hostname,
        port: port,
        servername: hostname,
        rejectUnauthorized: false,
        timeout: 4000,
      }, () => {
        const cert = socket.getPeerCertificate(true);
        const protocol = socket.getProtocol();
        const cipher = socket.getCipher();
        socket.end();

        if (!cert || !cert.subject) {
          resolve({ valid: false, error: 'No peer certificate returned' });
          return;
        }

        const validTo = new Date(cert.valid_to);
        const now = new Date();
        const daysRemaining = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        resolve({
          valid: daysRemaining > 0,
          subject: cert.subject ? (cert.subject.CN || cert.subject.O || 'Unknown') : 'Unknown',
          issuer: cert.issuer ? (cert.issuer.O || cert.issuer.CN || 'Unknown') : 'Unknown',
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          daysRemaining: daysRemaining,
          protocol: protocol || 'Unknown',
          cipher: cipher ? cipher.name : 'Unknown',
          serialNumber: cert.serialNumber,
          san: cert.subjectaltname,
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ valid: false, error: 'TLS Connection Timeout' });
      });

      socket.on('error', (err) => {
        resolve({ valid: false, error: err.message });
      });
    } catch (err) {
      resolve({ valid: false, error: err.message });
    }
  });
}

async function runVulnerabilityAudit(targetUrl) {
  let normalized = targetUrl.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }

  const parsed = new URL(normalized);
  const baseUrl = `${parsed.protocol}//${parsed.host}`;
  const isHttps = parsed.protocol === 'https:';

  const findings = [];
  const startTime = Date.now();

  // 1. Root Probe & Security Headers Audit
  const rootResponse = await rawHttpRequest(baseUrl, 'GET');
  const headers = rootResponse.headers;

  if (rootResponse.statusCode === 0) {
    findings.push({
      id: 'HOST_UNREACHABLE',
      category: 'NETWORK',
      severity: 'CRITICAL',
      cwe: 'CWE-497',
      title: 'Target Host Unreachable',
      evidence: `Error: ${rootResponse.statusMessage}`,
      description: `Gagal terhubung ke host target: ${baseUrl}. Pastikan port web aktif dan koneksi internet stabil.`,
      remediation: 'Verifikasi IP target, pastikan layanan web server (Nginx/Apache/IIS) sedang berjalan.',
    });
    return {
      targetUrl: baseUrl,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      findings,
      summary: { critical: 1, high: 0, medium: 0, low: 0, pass: 0 },
    };
  }

  // Check 1: Content-Security-Policy (CSP)
  const csp = headers['content-security-policy'] || headers['Content-Security-Policy'];
  if (!csp) {
    findings.push({
      id: 'MISSING_CSP',
      category: 'HEADER',
      severity: 'HIGH',
      cwe: 'CWE-1021',
      title: 'Missing Content-Security-Policy (CSP)',
      evidence: 'Header Content-Security-Policy tidak ditemukan pada respons HTTP.',
      description: 'Tanpa CSP, website rentan terhadap serangan Cross-Site Scripting (XSS), data injection, dan eksekusi skrip berbahaya dari domain luar.',
      remediation: "Tambahkan header: Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
    });
  } else {
    findings.push({
      id: 'CSP_CONFIGURED',
      category: 'HEADER',
      severity: 'PASS',
      cwe: 'CWE-1021',
      title: 'Content-Security-Policy Configured',
      evidence: `CSP: ${csp.substring(0, 100)}...`,
      description: 'Target telah mengonfigurasi pembatasan sumber daya skrip via CSP.',
      remediation: 'Pertahankan kebijakan CSP dan tinjau secara berkala.',
    });
  }

  // Check 2: Strict-Transport-Security (HSTS)
  const hsts = headers['strict-transport-security'];
  if (isHttps && !hsts) {
    findings.push({
      id: 'MISSING_HSTS',
      category: 'CRYPTO',
      severity: 'HIGH',
      cwe: 'CWE-319',
      title: 'Missing Strict-Transport-Security (HSTS)',
      evidence: 'Header Strict-Transport-Security tidak ditemukan pada koneksi HTTPS.',
      description: 'Koneksi pengguna rentan terhadap serangan SSL Strip dan downgrade man-in-the-middle ke HTTP biasa.',
      remediation: 'Tambahkan header: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload;',
    });
  }

  // Check 3: X-Frame-Options (Clickjacking)
  const xfo = headers['x-frame-options'];
  if (!xfo && !csp?.includes('frame-ancestors')) {
    findings.push({
      id: 'MISSING_X_FRAME_OPTIONS',
      category: 'HEADER',
      severity: 'MEDIUM',
      cwe: 'CWE-1021',
      title: 'Missing X-Frame-Options (Clickjacking Risk)',
      evidence: 'Header X-Frame-Options tidak ditemukan dan CSP frame-ancestors belum ditentukan.',
      description: 'Website dapat di-embed ke dalam iframe jahat untuk memanipulasi klik pengguna (Clickjacking).',
      remediation: 'Tambahkan header: X-Frame-Options: SAMEORIGIN (atau DENY).',
    });
  }

  // Check 4: X-Content-Type-Options
  const xcto = headers['x-content-type-options'];
  if (xcto !== 'nosniff') {
    findings.push({
      id: 'MISSING_XCTO',
      category: 'HEADER',
      severity: 'LOW',
      cwe: 'CWE-79',
      title: 'Missing X-Content-Type-Options: nosniff',
      evidence: `X-Content-Type-Options: ${xcto || 'Tidak Ditemukan'}`,
      description: 'Browser dapat melakukan MIME-sniffing terhadap berkas upload teks dan mengeksekusinya sebagai HTML/JS.',
      remediation: 'Tambahkan header: X-Content-Type-Options: nosniff;',
    });
  }

  // Check 5: Server Banner / Tech Leak
  const server = headers['server'];
  const poweredBy = headers['x-powered-by'];
  if (server || poweredBy) {
    findings.push({
      id: 'SERVER_BANNER_LEAK',
      category: 'CONFIG',
      severity: 'LOW',
      cwe: 'CWE-200',
      title: 'Server Banner & Technology Leak',
      evidence: `Server: ${server || 'N/A'} | X-Powered-By: ${poweredBy || 'N/A'}`,
      description: 'Mengekspos versi server web memudahkan penyerang memetakan kerentanan 1-day atau CVE publik.',
      remediation: 'Nginx: `server_tokens off;` | Apache: `ServerTokens Prod` & `ServerSignature Off` | Express: `app.disable("x-powered-by");`',
    });
  }

  // 2. SSL/TLS Certificate Inspection (If HTTPS)
  let certInfo = null;
  if (isHttps) {
    certInfo = await inspectTlsCert(parsed.hostname, parsed.port ? parseInt(parsed.port) : 443);
    if (!certInfo.valid) {
      findings.push({
        id: 'SSL_INVALID_OR_EXPIRED',
        category: 'CRYPTO',
        severity: 'CRITICAL',
        cwe: 'CWE-295',
        title: 'SSL/TLS Certificate Invalid or Expired',
        evidence: certInfo.error || `Sisa waktu berlaku: ${certInfo.daysRemaining} hari`,
        description: 'Sertifikat SSL bermasalah atau sudah kedaluwarsa. Browser pengguna akan menampilkan layar peringatan keamanan merah.',
        remediation: 'Perbarui sertifikat SSL melalui Let\'s Encrypt (Certbot) atau CA resmi segera.',
      });
    } else if (certInfo.daysRemaining <= 14) {
      findings.push({
        id: 'SSL_EXPIRING_SOON',
        category: 'CRYPTO',
        severity: 'HIGH',
        cwe: 'CWE-298',
        title: `SSL Certificate Expiring in ${certInfo.daysRemaining} Days`,
        evidence: `Issuer: ${certInfo.issuer} | Valid Hingga: ${certInfo.validTo}`,
        description: `Sertifikat SSL akan segera kedaluwarsa dalam ${certInfo.daysRemaining} hari ke depan.`,
        remediation: 'Jalankan renewal otomatis (cth: certbot renew) sebelum masa berlaku habis.',
      });
    } else {
      findings.push({
        id: 'SSL_CERT_VALID',
        category: 'CRYPTO',
        severity: 'PASS',
        cwe: 'CWE-295',
        title: `SSL Valid (${certInfo.daysRemaining} Hari Tersisa)`,
        evidence: `Issuer: ${certInfo.issuer} | Cipher: ${certInfo.cipher} (${certInfo.protocol})`,
        description: 'Koneksi TLS aman, sertifikat valid dan dikeluarkan oleh CA terpercaya.',
        remediation: 'Pertahankan renewal sertifikat berkala.',
      });
    }
  }

  // 3. Sensitive File & Directory Exposure Probes
  for (const item of SENSITIVE_PATHS) {
    const probeUrl = `${baseUrl}${item.path}`;
    const res = await rawHttpRequest(probeUrl, 'GET', {}, 3000);

    if (res.statusCode === 200 && res.body) {
      const matchSig = item.signature ? res.body.includes(item.signature) : true;
      if (matchSig) {
        findings.push({
          id: `EXPOSURE_${item.path.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`,
          category: item.category,
          severity: item.severity,
          cwe: item.cwe,
          title: `Paparan Berkas Sensitif: ${item.name}`,
          evidence: `GET ${item.path} -> 200 OK (${res.rawLength} bytes)\nCuplikan:\n${res.body.substring(0, 150)}...`,
          description: `Berkas ${item.path} dapat diakses secara publik tanpa otentikasi. Potensi kebocoran source code, kunci rahasia, atau kredensial database.`,
          remediation: `Blokir akses di web server: location ~ ${item.path.replace('.', '\\.')} { deny all; return 404; }`,
        });
      }
    }
  }

  // 4. CORS Misconfiguration Probe
  const corsTest = await rawHttpRequest(baseUrl, 'GET', {
    'Origin': 'https://attacker-origin.test',
  }, 3000);

  const acao = corsTest.headers['access-control-allow-origin'];
  const acac = corsTest.headers['access-control-allow-credentials'];

  if (acao === '*' && acac === 'true') {
    findings.push({
      id: 'CORS_WILDCARD_CREDENTIALS',
      category: 'CONFIG',
      severity: 'CRITICAL',
      cwe: 'CWE-942',
      title: 'Insecure CORS Policy (Wildcard with Credentials)',
      evidence: `Access-Control-Allow-Origin: * | Access-Control-Allow-Credentials: true`,
      description: 'Konfigurasi CORS memungkinkan situs pihak ketiga mengekstrak data terotentikasi pengguna.',
      remediation: 'Tentukan whitelist domain terpercaya secara eksplisit dan tolak origin sembarang.',
    });
  } else if (acao === 'https://attacker-origin.test') {
    findings.push({
      id: 'CORS_ARBITRARY_ORIGIN_REFLECTION',
      category: 'CONFIG',
      severity: 'HIGH',
      cwe: 'CWE-942',
      title: 'CORS Arbitrary Origin Reflection',
      evidence: `Origin attacker dipantulkan: Access-Control-Allow-Origin: ${acao}`,
      description: 'Server memantulkan nilai origin yang dikirimkan klien tanpa validasi whitelist.',
      remediation: 'Validasi header Origin terhadap daftar domain resmi instansi.',
    });
  }

  // Calculate summary counts
  const summary = {
    critical: findings.filter(f => f.severity === 'CRITICAL').length,
    high: findings.filter(f => f.severity === 'HIGH').length,
    medium: findings.filter(f => f.severity === 'MEDIUM').length,
    low: findings.filter(f => f.severity === 'LOW').length,
    pass: findings.filter(f => f.severity === 'PASS').length,
  };

  return {
    targetUrl: baseUrl,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    certInfo,
    findings,
    summary,
  };
}

module.exports = {
  runVulnerabilityAudit,
  inspectTlsCert,
  rawHttpRequest,
};


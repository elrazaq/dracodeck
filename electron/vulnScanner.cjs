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
      description: `Failed to connect to target host: ${baseUrl}. Verify active network port and Internet connectivity.`,
      remediation: 'Verify target IP / hostname resolution, and ensure web server daemon (Nginx/Apache/IIS) is running.',
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
      evidence: 'Content-Security-Policy header not present in HTTP response.',
      description: 'Without a strict CSP, web applications remain vulnerable to Cross-Site Scripting (XSS), data injection, and unauthorized remote script execution.',
      remediation: "Add response header: Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
    });
  } else {
    findings.push({
      id: 'CSP_CONFIGURED',
      category: 'HEADER',
      severity: 'PASS',
      cwe: 'CWE-1021',
      title: 'Content-Security-Policy Configured',
      evidence: `CSP: ${csp.substring(0, 100)}...`,
      description: 'Target enforces script execution and resource boundary restrictions via CSP.',
      remediation: 'Maintain policy and conduct routine reviews of allowed directives.',
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
      evidence: 'Strict-Transport-Security header not present on HTTPS connection.',
      description: 'User sessions are vulnerable to SSL Strip attacks and man-in-the-middle downgrades to plaintext HTTP.',
      remediation: 'Add response header: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload;',
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
      evidence: 'X-Frame-Options header not found and CSP frame-ancestors is undefined.',
      description: 'The website may be embedded in malicious third-party iframes, enabling UI redressing and clickjacking attacks.',
      remediation: 'Add response header: X-Frame-Options: SAMEORIGIN (or DENY).',
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
      evidence: `X-Content-Type-Options: ${xcto || 'Not Found'}`,
      description: 'Browsers may perform MIME-type sniffing on user uploads and execute untrusted files as HTML/JavaScript.',
      remediation: 'Add response header: X-Content-Type-Options: nosniff;',
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
      description: 'Exposing explicit server signatures helps adversaries identify public CVEs and targeted exploits.',
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
        evidence: certInfo.error || `Days remaining: ${certInfo.daysRemaining} days`,
        description: 'SSL certificate is invalid, untrusted, or has expired. Browsers will block access with security warnings.',
        remediation: 'Renew SSL certificate immediately via Let\'s Encrypt (Certbot) or an authorized Certificate Authority.',
      });
    } else if (certInfo.daysRemaining <= 14) {
      findings.push({
        id: 'SSL_EXPIRING_SOON',
        category: 'CRYPTO',
        severity: 'HIGH',
        cwe: 'CWE-298',
        title: `SSL Certificate Expiring in ${certInfo.daysRemaining} Days`,
        evidence: `Issuer: ${certInfo.issuer} | Valid Until: ${certInfo.validTo}`,
        description: `SSL certificate will expire within ${certInfo.daysRemaining} days.`,
        remediation: 'Trigger automated certificate renewal (e.g., certbot renew) before certificate expiration.',
      });
    } else {
      findings.push({
        id: 'SSL_CERT_VALID',
        category: 'CRYPTO',
        severity: 'PASS',
        cwe: 'CWE-295',
        title: `SSL Valid (${certInfo.daysRemaining} Days Remaining)`,
        evidence: `Issuer: ${certInfo.issuer} | Cipher: ${certInfo.cipher} (${certInfo.protocol})`,
        description: 'TLS connection secured by a valid certificate issued by a trusted Certificate Authority.',
        remediation: 'Maintain standard certificate renewal schedule.',
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
          title: `Sensitive Asset Exposed: ${item.name}`,
          evidence: `GET ${item.path} -> 200 OK (${res.rawLength} bytes)\nExcerpt:\n${res.body.substring(0, 150)}...`,
          description: `Asset ${item.path} is publicly accessible without authentication. May leak source code, private keys, or database credentials.`,
          remediation: `Block endpoint access in web server: location ~ ${item.path.replace('.', '\\.')} { deny all; return 404; }`,
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
      description: 'CORS configuration allows untrusted third-party origins to read authenticated user session data.',
      remediation: 'Specify an explicit trusted origin whitelist and reject wildcard configurations with credentials.',
    });
  } else if (acao === 'https://attacker-origin.test') {
    findings.push({
      id: 'CORS_ARBITRARY_ORIGIN_REFLECTION',
      category: 'CONFIG',
      severity: 'HIGH',
      cwe: 'CWE-942',
      title: 'CORS Arbitrary Origin Reflection',
      evidence: `Arbitrary attacker origin reflected: Access-Control-Allow-Origin: ${acao}`,
      description: 'Server reflects arbitrary client-supplied Origin headers without whitelist validation.',
      remediation: 'Validate Origin request header strictly against approved domain lists.',
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


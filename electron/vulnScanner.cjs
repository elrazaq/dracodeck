const http = require('http');
const https = require('https');
const tls = require('tls');

/**
 * Real Web Vulnerability & Modern Cloud-Native Security Scanner (Node.js Main Process)
 * Bypasses browser CORS restrictions completely.
 * Gathers authentic HTTP evidence, CSP policy flaws, exposed API specs, Actuator/Ignition debug leaks, and SSL X.509 certificates.
 */

const SENSITIVE_PATHS = [
  { path: '/.git/HEAD', name: 'Git Repository HEAD Exposure', signature: 'ref: refs/', category: 'EXPOSURE', severity: 'CRITICAL', cwe: 'CWE-527' },
  { path: '/.git/config', name: 'Git Config Exposure', signature: '[core]', category: 'EXPOSURE', severity: 'CRITICAL', cwe: 'CWE-527' },
  { path: '/.env', name: 'Production .env Secrets Exposure', signature: '=', category: 'EXPOSURE', severity: 'CRITICAL', cwe: 'CWE-552', rejectHtml: true },
  { path: '/.env.production', name: 'Production Environment File Leak', signature: '=', category: 'EXPOSURE', severity: 'CRITICAL', cwe: 'CWE-552', rejectHtml: true },
  { path: '/openapi.json', name: 'Unauthenticated OpenAPI 3.0 Schema Leak', signature: '"openapi"', category: 'API_LEAK', severity: 'MEDIUM', cwe: 'CWE-200' },
  { path: '/swagger.json', name: 'Unauthenticated Swagger 2.0 Schema Leak', signature: '"swagger"', category: 'API_LEAK', severity: 'MEDIUM', cwe: 'CWE-200' },
  { path: '/actuator/env', name: 'Spring Boot Actuator Environment Leak', signature: '"propertySources"', category: 'EXPOSURE', severity: 'CRITICAL', cwe: 'CWE-215' },
  { path: '/actuator/health', name: 'Spring Boot Actuator Health Endpoint', signature: '"status"', category: 'RECON', severity: 'LOW', cwe: 'CWE-200' },
  { path: '/_ignition/health-check', name: 'Laravel Ignition Debug Mode Enabled', signature: '"can_execute_commands"', category: 'EXPOSURE', severity: 'CRITICAL', cwe: 'CWE-489' },
  { path: '/debug/pprof/', name: 'Go pprof Runtime Memory Profiler Exposed', signature: 'Types of profiles available', category: 'EXPOSURE', severity: 'HIGH', cwe: 'CWE-215' },
  { path: '/wp-json/wp/v2/users', name: 'WordPress REST API User Enumeration Leak', signature: '"slug":', category: 'EXPOSURE', severity: 'MEDIUM', cwe: 'CWE-200' },
  { path: '/backup.sql', name: 'SQL Database Dump Exposure', signature: 'CREATE TABLE', category: 'EXPOSURE', severity: 'CRITICAL', cwe: 'CWE-552' },
  { path: '/dump.sql', name: 'SQL Dump File Exposure', signature: 'INSERT INTO', category: 'EXPOSURE', severity: 'CRITICAL', cwe: 'CWE-552' },
  { path: '/.DS_Store', name: 'macOS Directory Metadata Leak', signature: 'Bud1', category: 'EXPOSURE', severity: 'MEDIUM', cwe: 'CWE-200' },
  { path: '/wp-config.php.bak', name: 'WordPress Config Backup Exposure', signature: 'DB_PASSWORD', category: 'EXPOSURE', severity: 'CRITICAL', cwe: 'CWE-530' },
  { path: '/phpinfo.php', name: 'PHP Info Configuration Leak', signature: 'PHP Version', category: 'EXPOSURE', severity: 'HIGH', cwe: 'CWE-200' },
  { path: '/server-status', name: 'Apache Server-Status Telemetry Leak', signature: 'Apache Server Status', category: 'EXPOSURE', severity: 'HIGH', cwe: 'CWE-200' },
  { path: '/.well-known/openid-configuration', name: 'OIDC Identity Provider Configuration', signature: '"issuer"', category: 'RECON', severity: 'LOW', cwe: 'CWE-200' },
  { path: '/robots.txt', name: 'Robots.txt Route Disallow Matrix', signature: 'User-agent:', category: 'RECON', severity: 'LOW', cwe: 'CWE-200' },
];

function rawHttpRequest(targetUrl, method = 'GET', customHeaders = {}, timeoutMs = 4000) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + (parsed.search || ''),
        method,
        timeout: timeoutMs,
        rejectUnauthorized: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Dracodeck/2.0 Security-Auditor',
          'Accept': '*/*',
          ...customHeaders,
        },
      };

      const req = client.request(options, (res) => {
        const chunks = [];
        let bodyLength = 0;
        const maxCapture = 24576;

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
            headers: res.headers || {},
            body: bodyBuffer.toString('utf-8', 0, Math.min(bodyBuffer.length, 6144)),
            rawLength: bodyLength,
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ statusCode: 0, statusMessage: 'TIMEOUT', headers: {}, body: '', rawLength: 0 });
      });

      req.on('error', (err) => {
        resolve({ statusCode: 0, statusMessage: err.message, headers: {}, body: '', rawLength: 0 });
      });

      req.end();
    } catch (err) {
      resolve({ statusCode: 0, statusMessage: err.message, headers: {}, body: '', rawLength: 0 });
    }
  });
}

function inspectTlsCert(hostname, port = 443) {
  return new Promise((resolve) => {
    try {
      const socket = tls.connect(
        {
          host: hostname,
          port,
          servername: hostname,
          rejectUnauthorized: false,
          timeout: 4000,
        },
        () => {
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
            subject: cert.subject ? cert.subject.CN || cert.subject.O || 'Unknown' : 'Unknown',
            issuer: cert.issuer ? cert.issuer.O || cert.issuer.CN || 'Unknown' : 'Unknown',
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
            daysRemaining,
            protocol: protocol || 'Unknown',
            cipher: cipher ? cipher.name : 'Unknown',
            serialNumber: cert.serialNumber,
            san: cert.subjectaltname,
          });
        }
      );

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

  // 1. Root Probe & Deep Security Header Analysis
  const rootResponse = await rawHttpRequest(normalized, 'GET');
  const headers = rootResponse.headers;

  if (rootResponse.statusCode === 0) {
    findings.push({
      id: 'HOST_UNREACHABLE',
      category: 'NETWORK',
      severity: 'CRITICAL',
      cwe: 'CWE-497',
      title: 'Target Host Unreachable',
      evidence: `Error: ${rootResponse.statusMessage}`,
      description: `Failed to connect to target host: ${normalized}. Verify active network port and Internet connectivity.`,
      remediation: 'Verify target IP / hostname resolution, and ensure web server daemon (Nginx/Apache/IIS/Node) is running.',
    });
    return {
      targetUrl: normalized,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      findings,
      summary: { critical: 1, high: 0, medium: 0, low: 0, pass: 0 },
    };
  }

  // Check 1: Content-Security-Policy (CSP) Presence AND Directive Strength
  const csp = headers['content-security-policy'] || headers['Content-Security-Policy'];
  if (!csp) {
    findings.push({
      id: 'MISSING_CSP',
      category: 'HEADER',
      severity: 'HIGH',
      cwe: 'CWE-1021',
      title: 'Missing Content-Security-Policy (CSP)',
      evidence: `GET ${parsed.pathname || '/'} -> HTTP ${rootResponse.statusCode}\nContent-Security-Policy header not present in response.`,
      description: 'Without a strict CSP, modern web applications remain exposed to Cross-Site Scripting (XSS), DOM script gadgets, and unauthorized script exfiltration.',
      remediation: "Add response header: Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';",
    });
  } else if (csp.includes("'unsafe-eval'") || csp.includes("'unsafe-inline'") || /script-src[^;]*\s\*\s/.test(csp)) {
    findings.push({
      id: 'WEAK_CSP_DIRECTIVES',
      category: 'HEADER',
      severity: 'MEDIUM',
      cwe: 'CWE-693',
      title: 'Permissive CSP Policy Allows unsafe-inline / unsafe-eval',
      evidence: `Content-Security-Policy: ${csp}`,
      description: "Target defines a CSP header, but includes `'unsafe-inline'`, `'unsafe-eval'`, or wildcard `*` script sources, allowing attacker-injected inline scripts or eval() gadgets to execute.",
      remediation: "Replace `'unsafe-inline'` with cryptographic nonces (`'nonce-...'`) or SHA-256 hashes alongside `'strict-dynamic'`, and remove `'unsafe-eval'`. ",
    });
  } else {
    findings.push({
      id: 'CSP_CONFIGURED',
      category: 'HEADER',
      severity: 'PASS',
      cwe: 'CWE-1021',
      title: 'Hardened Content-Security-Policy Configured',
      evidence: `CSP: ${csp.substring(0, 140)}`,
      description: 'Target enforces strict script execution and resource boundary restrictions via CSP.',
      remediation: 'Maintain policy and conduct routine audits of allowed third-party domains.',
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
      description: 'User sessions are vulnerable to SSL Strip attacks and protocol downgrade interception.',
      remediation: 'Add response header: Strict-Transport-Security: max-age=63072000; includeSubDomains; preload;',
    });
  }

  // Check 3: X-Frame-Options / frame-ancestors
  const xfo = headers['x-frame-options'];
  if (!xfo && !csp?.includes('frame-ancestors')) {
    findings.push({
      id: 'MISSING_X_FRAME_OPTIONS',
      category: 'HEADER',
      severity: 'MEDIUM',
      cwe: 'CWE-1021',
      title: 'Missing Framing Protection (Clickjacking / UI Redressing Risk)',
      evidence: 'Neither X-Frame-Options nor CSP frame-ancestors directive was found.',
      description: 'The application can be framed inside untrusted third-party pages to hijack authenticated user clicks.',
      remediation: "Add `X-Frame-Options: DENY` and `Content-Security-Policy: frame-ancestors 'none';`.",
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
      evidence: `X-Content-Type-Options: ${xcto || 'Not Present'}`,
      description: 'Browsers may MIME-sniff non-HTML responses into executable HTML/JavaScript contexts.',
      remediation: 'Add response header: X-Content-Type-Options: nosniff;',
    });
  }

  // Check 5: Server Banner & Runtime Fingerprint Leak
  const server = headers['server'];
  const poweredBy = headers['x-powered-by'];
  const aspnetVer = headers['x-aspnet-version'];
  if (server || poweredBy || aspnetVer) {
    findings.push({
      id: 'SERVER_BANNER_LEAK',
      category: 'CONFIG',
      severity: 'LOW',
      cwe: 'CWE-200',
      title: 'Backend Runtime & Server Banner Fingerprint Exposed',
      evidence: `Server: ${server || 'N/A'} | X-Powered-By: ${poweredBy || 'N/A'} | X-AspNet-Version: ${aspnetVer || 'N/A'}`,
      description: 'Revealing exact web server or framework versions accelerates targeted CVE exploitation.',
      remediation: 'Nginx: `server_tokens off;` | Express: `app.disable("x-powered-by");` | PHP: `expose_php = Off`',
    });
  }

  // Check 6: Session Cookie Security Attributes
  const setCookies = headers['set-cookie'];
  if (Array.isArray(setCookies) && setCookies.length > 0) {
    const insecureCookies = setCookies.filter((c) => {
      const lower = c.toLowerCase();
      return !lower.includes('httponly') || (isHttps && !lower.includes('secure'));
    });
    if (insecureCookies.length > 0) {
      findings.push({
        id: 'COOKIE_MISSING_SECURITY_FLAGS',
        category: 'AUTH',
        severity: 'MEDIUM',
        cwe: 'CWE-614',
        title: `Cookies Issued Without HttpOnly/Secure Flags (${insecureCookies.length} Cookie(s))`,
        evidence: insecureCookies.join('\n'),
        description: 'Cookies lacking HttpOnly can be stolen via XSS (`document.cookie`), and cookies lacking Secure can leak over plaintext HTTP.',
        remediation: 'Append `; HttpOnly; Secure; SameSite=Lax` to all `Set-Cookie` directives.',
      });
    }
  }

  // 2. SSL/TLS Certificate Inspection (If HTTPS)
  let certInfo = null;
  if (isHttps) {
    certInfo = await inspectTlsCert(parsed.hostname, parsed.port ? parseInt(parsed.port, 10) : 443);
    if (!certInfo.valid) {
      findings.push({
        id: 'SSL_INVALID_OR_EXPIRED',
        category: 'CRYPTO',
        severity: 'CRITICAL',
        cwe: 'CWE-295',
        title: 'SSL/TLS Certificate Invalid or Expired',
        evidence: certInfo.error || `Days remaining: ${certInfo.daysRemaining} days`,
        description: 'SSL certificate is invalid, self-signed, or expired.',
        remediation: 'Renew TLS certificate immediately via ACME / Let\'s Encrypt or authorized CA.',
      });
    } else if (certInfo.daysRemaining <= 14) {
      findings.push({
        id: 'SSL_EXPIRING_SOON',
        category: 'CRYPTO',
        severity: 'HIGH',
        cwe: 'CWE-298',
        title: `SSL Certificate Expiring in ${certInfo.daysRemaining} Days`,
        evidence: `Issuer: ${certInfo.issuer} | Valid Until: ${certInfo.validTo}`,
        description: `SSL certificate expires in ${certInfo.daysRemaining} days.`,
        remediation: 'Trigger automated certificate renewal before expiration.',
      });
    } else {
      findings.push({
        id: 'SSL_CERT_VALID',
        category: 'CRYPTO',
        severity: 'PASS',
        cwe: 'CWE-295',
        title: `TLS Certificate Valid (${certInfo.daysRemaining} Days Remaining)`,
        evidence: `Issuer: ${certInfo.issuer} | Cipher: ${certInfo.cipher} (${certInfo.protocol})`,
        description: 'TLS connection is secured with a valid X.509 certificate.',
        remediation: 'Maintain automated renewal schedule.',
      });
    }
  }

  // 3. Parallel Sensitive Asset, Cloud-Native & Debug Endpoint Probes (Batched in chunks of 6)
  for (let i = 0; i < SENSITIVE_PATHS.length; i += 6) {
    const batch = SENSITIVE_PATHS.slice(i, i + 6);
    const results = await Promise.all(
      batch.map((item) => rawHttpRequest(`${baseUrl}${item.path}`, 'GET', {}, 3000))
    );

    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      const res = results[j];
      if (res.statusCode === 200 && res.body) {
        if (item.rejectHtml && /^\s*<!DOCTYPE html>|^\s*<html/i.test(res.body)) {
          continue; // Ignore SPA catch-all HTML fallback
        }
        const matchSig = item.signature ? res.body.includes(item.signature) : true;
        if (matchSig) {
          findings.push({
            id: `EXPOSURE_${item.path.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`,
            category: item.category,
            severity: item.severity,
            cwe: item.cwe,
            title: `Exposed Endpoint / Asset: ${item.name}`,
            evidence: `GET ${baseUrl}${item.path} -> HTTP 200 OK (${res.rawLength} bytes)\nResponse Excerpt:\n${res.body.substring(0, 220)}`,
            description: `Endpoint ${item.path} returned HTTP 200 with verified signature (${item.signature}). May expose internal configurations, source repository metadata, or API schemas.`,
            remediation: `Restrict access to ${item.path} at reverse proxy / web server edge: location ~ ^${item.path} { deny all; return 404; }`,
          });
        }
      }
    }
  }

  // 4. 3-Way CORS Misconfiguration Probe (Null Origin, Prefix Regex, Arbitrary Origin)
  const corsOrigins = [
    'https://attacker-origin.dracodeck.local',
    `https://${parsed.hostname}.dracodeck.local`,
    'null',
  ];
  const corsResults = await Promise.all(
    corsOrigins.map((orig) => rawHttpRequest(normalized, 'GET', { Origin: orig }, 3000))
  );

  for (let i = 0; i < corsOrigins.length; i++) {
    const testedOrig = corsOrigins[i];
    const cRes = corsResults[i];
    const acao = cRes.headers['access-control-allow-origin'];
    const acac = String(cRes.headers['access-control-allow-credentials'] || '').toLowerCase() === 'true';

    if (acao === testedOrig || (acao === '*' && acac)) {
      findings.push({
        id: `CORS_BYPASS_${i}`,
        category: 'CONFIG',
        severity: acac ? 'CRITICAL' : 'HIGH',
        cwe: 'CWE-942',
        title: `Insecure CORS Trust Policy (Origin: ${testedOrig}${acac ? ' + Credentials' : ''})`,
        evidence: `Request Header -> Origin: ${testedOrig}\nResponse Header -> Access-Control-Allow-Origin: ${acao}\nResponse Header -> Access-Control-Allow-Credentials: ${acac}`,
        description: 'Server trusts untrusted or regex-bypassed origins, allowing cross-origin reading of application responses.',
        remediation: 'Enforce strict exact-match origin validation against an explicit allowlist and disable `Access-Control-Allow-Credentials` on public endpoints.',
      });
      break;
    }
  }

  const summary = {
    critical: findings.filter((f) => f.severity === 'CRITICAL').length,
    high: findings.filter((f) => f.severity === 'HIGH').length,
    medium: findings.filter((f) => f.severity === 'MEDIUM').length,
    low: findings.filter((f) => f.severity === 'LOW').length,
    pass: findings.filter((f) => f.severity === 'PASS').length,
  };

  return {
    targetUrl: normalized,
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

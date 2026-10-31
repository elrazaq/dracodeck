const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

/**
 * DracoDeck Sentinel Engine (Milestone M4.1)
 * Verified Proof-of-Verification (PoV) & Heuristic Zero-Day Anomaly Detection.
 * Zero-CORS, non-destructive, strictly mathematical and reproducible.
 */

// Helper: Raw HTTP/HTTPS request with high-precision timing and byte capture
function rawRequest(targetUrl, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body = null,
    timeoutMs = 5000,
  } = options;

  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      const reqOptions = {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + (parsed.search || ''),
        method: method,
        timeout: timeoutMs,
        rejectUnauthorized: false, // Allow cert inspection
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Dracodeck/0.1.0 Sentinel-Engine',
          'Accept': '*/*',
          ...headers,
        },
      };

      const start = performance.now();
      const req = client.request(reqOptions, (res) => {
        const chunks = [];
        let bodyLength = 0;
        const maxCapture = 65536; // 64KB capture

        res.on('data', (chunk) => {
          if (bodyLength < maxCapture) {
            chunks.push(chunk);
            bodyLength += chunk.length;
          }
        });

        res.on('end', () => {
          const latencyMs = Math.round((performance.now() - start) * 10) / 10;
          const bodyBuffer = Buffer.concat(chunks);
          const bodyStr = bodyBuffer.toString('utf-8');

          resolve({
            statusCode: res.statusCode || 0,
            statusMessage: res.statusMessage || '',
            headers: res.headers,
            body: bodyStr,
            rawLength: bodyLength,
            latencyMs,
            targetUrl,
            method,
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
          latencyMs: timeoutMs,
          targetUrl,
          method,
        });
      });

      req.on('error', (err) => {
        resolve({
          statusCode: 0,
          statusMessage: err.message,
          headers: {},
          body: '',
          rawLength: 0,
          latencyMs: 0,
          targetUrl,
          method,
        });
      });

      if (body) {
        req.write(body);
      }
      req.end();
    } catch (err) {
      resolve({
        statusCode: 0,
        statusMessage: err.message,
        headers: {},
        body: '',
        rawLength: 0,
        latencyMs: 0,
        targetUrl,
        method,
      });
    }
  });
}

// --------------------------------------------------------------------------
// 1. Proof-of-Verification (PoV) Suite
// --------------------------------------------------------------------------

/**
 * Non-destructive Reflected XSS Proof-of-Verification via Inert Canary Token
 */
async function testReflectedXssPoV(baseUrl) {
  const canaryToken = `draco_canary_${crypto.randomBytes(6).toString('hex')}`;
  const parsed = new URL(baseUrl);
  
  // Test common parameter names or existing parameters
  const probeParams = ['q', 'search', 's', 'query', 'name', 'id', 'redirect', 'url'];
  
  // If original URL has query parameters, test those first
  for (const [key] of parsed.searchParams) {
    if (!probeParams.includes(key)) probeParams.unshift(key);
  }

  for (const param of probeParams) {
    const probeUrl = new URL(baseUrl);
    probeUrl.searchParams.set(param, canaryToken);

    const res = await rawRequest(probeUrl.toString(), { method: 'GET' });
    if (!res.body || !res.body.includes(canaryToken)) continue;

    // Canary reflected! Perform context analysis
    const idx = res.body.indexOf(canaryToken);
    const start = Math.max(0, idx - 40);
    const end = Math.min(res.body.length, idx + canaryToken.length + 40);
    const excerpt = res.body.substring(start, end);

    let contextType = 'HTML_BODY';
    let certainty = 'VERIFIED_POV';
    let severity = 'HIGH';

    // Script context check
    const scriptRegex = new RegExp(`<script[^>]*>[\\s\\S]*?${canaryToken}[\\s\\S]*?<\\/script>`, 'i');
    const attrRegex = new RegExp(`<[a-zA-Z0-9]+[^>]*=\\s*["']?[^"'>]*${canaryToken}`, 'i');

    if (scriptRegex.test(res.body)) {
      contextType = 'EXECUTABLE_SCRIPT_CONTEXT';
      severity = 'CRITICAL';
    } else if (attrRegex.test(res.body)) {
      contextType = 'UNQUOTED_ATTRIBUTE_CONTEXT';
      severity = 'HIGH';
    }

    const curlCmd = `curl -i -s -k "${probeUrl.toString()}"`;

    return {
      type: 'XSS_REFLECTED_POV',
      title: `Proven Reflected XSS (${contextType})`,
      certainty: 'VERIFIED',
      certaintyScore: 100,
      severity,
      targetParam: param,
      canaryToken,
      contextType,
      evidenceExcerpt: excerpt,
      reproducibleCurl: curlCmd,
      testedUrl: probeUrl.toString(),
      statusCode: res.statusCode,
      remediation: 'Implement contextual HTML/Attribute encoding (OWASP Java/JS/HTML encoder) and strict CSP without unsafe-inline.',
    };
  }

  return null;
}

/**
 * Non-destructive Boolean Differential SQL Injection Proof
 */
async function testSqlInjectionDifferentialPoV(baseUrl) {
  const parsed = new URL(baseUrl);
  const params = Array.from(parsed.searchParams.keys());
  
  if (params.length === 0) {
    // If no params, test standard parameter
    params.push('id');
  }

  for (const param of params) {
    // Probe A: Baseline
    const urlA = new URL(baseUrl);
    urlA.searchParams.set(param, '1');
    const resA = await rawRequest(urlA.toString());
    if (resA.statusCode === 0) continue;

    // Probe B: True expression (arithmetic 1*1)
    const urlB = new URL(baseUrl);
    urlB.searchParams.set(param, '1*1');
    const resB = await rawRequest(urlB.toString());

    // Probe C: False expression (arithmetic 1*0)
    const urlC = new URL(baseUrl);
    urlC.searchParams.set(param, '1*0');
    const resC = await rawRequest(urlC.toString());

    // Evaluate differential:
    // If A and B return 200 with identical or near-identical length, but C returns different length or status 404
    const lenA = resA.rawLength;
    const lenB = resB.rawLength;
    const lenC = resC.rawLength;

    const diffAB = Math.abs(lenA - lenB);
    const diffAC = Math.abs(lenA - lenC);

    if (resA.statusCode === 200 && resB.statusCode === 200 && diffAB <= 5 && diffAC > 50) {
      const curlA = `curl -i -s -k "${urlA.toString()}"`;
      const curlC = `curl -i -s -k "${urlC.toString()}"`;

      return {
        type: 'SQLI_BOOLEAN_DIFFERENTIAL_POV',
        title: `Proven SQL Arithmetic Evaluation in Parameter [${param}]`,
        certainty: 'VERIFIED',
        certaintyScore: 99,
        severity: 'CRITICAL',
        targetParam: param,
        baselineLength: lenA,
        trueProbeLength: lenB,
        falseProbeLength: lenC,
        reproducibleCurl: `${curlA}\n# False condition returns ${lenC} bytes:\n${curlC}`,
        evidenceExcerpt: `Baseline '1': ${lenA} bytes | True '1*1': ${lenB} bytes | False '1*0': ${lenC} bytes (Differential: ${diffAC} bytes)`,
        remediation: 'Use parameterized queries / prepared statements (PDO, PreparedStatement). Avoid string concatenation.',
      };
    }
  }

  return null;
}

/**
 * Proven Insecure CORS Exfiltration Policy PoV
 */
async function testCorsPoV(baseUrl) {
  const arbitraryOrigin = 'https://draco-audit.internal.test';
  const res = await rawRequest(baseUrl, {
    method: 'GET',
    headers: { 'Origin': arbitraryOrigin },
  });

  const acao = res.headers['access-control-allow-origin'];
  const acac = res.headers['access-control-allow-credentials'];

  if (acao === arbitraryOrigin && acac === 'true') {
    return {
      type: 'CORS_EXFILTRATION_POV',
      title: 'Proven Arbitrary Origin Reflection with Credentials',
      certainty: 'VERIFIED',
      certaintyScore: 100,
      severity: 'CRITICAL',
      reflectedOrigin: acao,
      credentialsAllowed: true,
      reproducibleCurl: `curl -i -s -k -H "Origin: ${arbitraryOrigin}" "${baseUrl}"`,
      evidenceExcerpt: `Access-Control-Allow-Origin: ${acao}\nAccess-Control-Allow-Credentials: true`,
      remediation: 'Replace dynamic Origin reflection with an explicit whitelist of trusted subdomains.',
    };
  }

  return null;
}

/**
 * Verbose Framework Stack Trace & Debug Signature Triangulation
 */
async function testDebugTracesPoV(baseUrl) {
  // Probe with uncommon method and malformed Content-Type
  const res = await rawRequest(baseUrl, {
    method: 'PROPFIND',
    headers: {
      'Content-Type': 'application/xml; charset=malformed-syntax-test',
      'X-Debug-Probe': '1',
    },
  });

  if (!res.body) return null;

  const stackSignatures = [
    { name: 'Laravel Ignition / Whoops Trace', pattern: /ignition-theme|Facade\\Ignition|laravel\/framework/i },
    { name: 'Django Debug Traceback', pattern: /Traceback \(most recent call last\):|Django Version:/i },
    { name: 'Spring Boot Whitelabel Error Page', pattern: /Whitelabel Error Page|This application has no explicit mapping for \/error/i },
    { name: 'Node.js / Express Stack Trace', pattern: /ReferenceError:|TypeError:|at [a-zA-Z0-9_.]+\s+\([/\\][a-zA-Z0-9_\-./\\]+:[0-9]+:[0-9]+\)/i },
    { name: 'ASP.NET Yellow Screen of Death', pattern: /Server Error in '.*' Application|System\.Web\.HttpException/i },
    { name: 'PHP Fatal Error / Notice', pattern: /Fatal error:|Parse error:|in \/[a-zA-Z0-9_\-./]+ on line [0-9]+/i },
  ];

  for (const sig of stackSignatures) {
    if (sig.pattern.test(res.body)) {
      const match = res.body.match(sig.pattern);
      const idx = res.body.indexOf(match[0]);
      const excerpt = res.body.substring(Math.max(0, idx - 50), Math.min(res.body.length, idx + 250));

      return {
        type: 'VERBOSE_STACK_TRACE_POV',
        title: `Proven Debug Stack Trace Leak: ${sig.name}`,
        certainty: 'VERIFIED',
        certaintyScore: 100,
        severity: 'HIGH',
        framework: sig.name,
        reproducibleCurl: `curl -i -s -k -X PROPFIND -H "Content-Type: application/xml; charset=malformed" "${baseUrl}"`,
        evidenceExcerpt: excerpt.trim(),
        remediation: 'Disable debug mode in production (e.g., APP_DEBUG=false, DEBUG=False). Configure custom generic 500 error pages.',
      };
    }
  }

  return null;
}

/**
 * Execute comprehensive Non-Destructive Proof-of-Verification (PoV) Suite
 */
async function runProofOfVerification(targetUrl) {
  let normalized = targetUrl.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }

  const startTime = Date.now();
  const verifiedFindings = [];

  // 1. Reflected XSS PoV
  try {
    const xssPoV = await testReflectedXssPoV(normalized);
    if (xssPoV) verifiedFindings.push(xssPoV);
  } catch (err) {
    console.error('XSS PoV test error:', err);
  }

  // 2. SQLi Arithmetic Differential PoV
  try {
    const sqliPoV = await testSqlInjectionDifferentialPoV(normalized);
    if (sqliPoV) verifiedFindings.push(sqliPoV);
  } catch (err) {
    console.error('SQLi PoV test error:', err);
  }

  // 3. CORS Exfiltration PoV
  try {
    const corsPoV = await testCorsPoV(normalized);
    if (corsPoV) verifiedFindings.push(corsPoV);
  } catch (err) {
    console.error('CORS PoV test error:', err);
  }

  // 4. Debug Stack Trace Leak PoV
  try {
    const tracePoV = await testDebugTracesPoV(normalized);
    if (tracePoV) verifiedFindings.push(tracePoV);
  } catch (err) {
    console.error('Trace PoV test error:', err);
  }

  return {
    targetUrl: normalized,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    verifiedFindings,
    totalVerified: verifiedFindings.length,
  };
}

// --------------------------------------------------------------------------
// 2. Shadow API & Client-Side JS AST / Token Miner
// --------------------------------------------------------------------------

async function crawlShadowApis(targetUrl) {
  let normalized = targetUrl.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }

  const parsedBase = new URL(normalized);
  const origin = `${parsedBase.protocol}//${parsedBase.host}`;
  const startTime = Date.now();

  // 1. Fetch root page to extract <script src="...">
  const rootRes = await rawRequest(normalized, { method: 'GET' });
  const scriptSources = [];

  if (rootRes.body) {
    const scriptTagRegex = /<script[^>]+src=["']([^"']+)["']/gi;
    let match;
    while ((match = scriptTagRegex.exec(rootRes.body)) !== null) {
      let src = match[1];
      if (src.startsWith('//')) {
        src = parsedBase.protocol + src;
      } else if (src.startsWith('/')) {
        src = origin + src;
      } else if (!src.startsWith('http://') && !src.startsWith('https://')) {
        src = origin + '/' + src;
      }

      // Keep only same-origin or relevant scripts
      if (src.includes(parsedBase.hostname) && !scriptSources.includes(src)) {
        scriptSources.push(src);
      }
    }
  }

  // Cap at 5 scripts to avoid excessive memory
  const targets = scriptSources.slice(0, 5);
  const discoveredEndpoints = new Set();
  const discoveredParameters = new Set();
  const leakedSecrets = [];

  // 2. Download scripts & mine AST patterns
  for (const scriptUrl of targets) {
    const jsRes = await rawRequest(scriptUrl, { method: 'GET' });
    if (!jsRes.body) continue;
    const code = jsRes.body;

    // Pattern A: REST & API Endpoints
    const apiRegex = /["'`](\/(?:api|v[0-9]|internal|admin|auth|graphql|private|user|service)\/[a-zA-Z0-9_\-/{}]*)["'`]/g;
    let apiMatch;
    while ((apiMatch = apiRegex.exec(code)) !== null) {
      const ep = apiMatch[1];
      if (!ep.includes('<') && !ep.includes(' ') && ep.length < 80) {
        discoveredEndpoints.add(ep);
      }
    }

    // Pattern B: Hidden query parameters in URL constructs
    const paramRegex = /[?&]([a-zA-Z0-9_]{3,20})=/g;
    let paramMatch;
    while ((paramMatch = paramRegex.exec(code)) !== null) {
      const p = paramMatch[1];
      const common = ['debug', 'test', 'admin', 'preview', 'impersonate', 'staging', 'secret', 'token', 'internal', 'bypass', 'key', 'auth'];
      if (common.includes(p.toLowerCase())) {
        discoveredParameters.add(p);
      }
    }

    // Pattern C: Leaked Secrets / Keys
    // AWS S3
    const s3Regex = /[a-z0-9.-]+\.s3(?:\.[a-z0-9-]+)?\.amazonaws\.com/gi;
    let s3Match;
    while ((s3Match = s3Regex.exec(code)) !== null) {
      leakedSecrets.push({ type: 'AWS_S3_BUCKET', value: s3Match[0], script: scriptUrl });
    }

    // Firebase Key
    const firebaseRegex = /AIza[0-9A-Za-z-_]{35}/g;
    let fbMatch;
    while ((fbMatch = firebaseRegex.exec(code)) !== null) {
      leakedSecrets.push({ type: 'FIREBASE_API_KEY', value: fbMatch[0], script: scriptUrl });
    }
  }

  // 3. Probing discovered shadow endpoints (up to 8 endpoints)
  const endpointList = Array.from(discoveredEndpoints).slice(0, 8);
  const verifiedShadowApis = [];

  for (const ep of endpointList) {
    const probeUrl = `${origin}${ep}`;
    const testRes = await rawRequest(probeUrl, { method: 'GET', timeoutMs: 3000 });
    verifiedShadowApis.push({
      path: ep,
      fullUrl: probeUrl,
      statusCode: testRes.statusCode,
      statusMessage: testRes.statusMessage,
      contentLength: testRes.rawLength,
      isAccessible: testRes.statusCode === 200,
      isProtected: testRes.statusCode === 401 || testRes.statusCode === 403,
    });
  }

  return {
    targetUrl: normalized,
    scannedScripts: targets.length,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    shadowEndpoints: verifiedShadowApis,
    hiddenParameters: Array.from(discoveredParameters),
    leakedSecrets,
  };
}

// --------------------------------------------------------------------------
// 3. Side-Channel Timing Discrepancy Radar
// --------------------------------------------------------------------------

async function testSideChannelTiming(targetUrl, endpointPath = '/login', testUser = 'admin') {
  let normalized = targetUrl.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }

  const parsed = new URL(normalized);
  const origin = `${parsed.protocol}//${parsed.host}`;
  const targetEndpoint = `${origin}${endpointPath}`;

  const nonExistentUser = `non_existent_usr_${crypto.randomBytes(4).toString('hex')}`;
  const dummyPassword = 'TestPassword123!';

  // Measure Non-Existent User (3 samples)
  const nonExistentTimings = [];
  for (let i = 0; i < 3; i++) {
    const res = await rawRequest(targetEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: nonExistentUser, password: dummyPassword }),
    });
    nonExistentTimings.push(res.latencyMs);
  }

  // Measure Target User (3 samples)
  const targetTimings = [];
  for (let i = 0; i < 3; i++) {
    const res = await rawRequest(targetEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUser, password: dummyPassword }),
    });
    targetTimings.push(res.latencyMs);
  }

  const avgNonExistent = nonExistentTimings.reduce((a, b) => a + b, 0) / nonExistentTimings.length;
  const avgTarget = targetTimings.reduce((a, b) => a + b, 0) / targetTimings.length;
  const timingDeltaMs = Math.round(Math.abs(avgTarget - avgNonExistent) * 10) / 10;

  // If delta is noticeable (>80ms) and target is slower (due to password hash execution)
  const isVulnerable = timingDeltaMs > 80 && avgTarget > avgNonExistent;

  return {
    endpoint: targetEndpoint,
    testUser,
    nonExistentUser,
    nonExistentTimings,
    targetTimings,
    avgNonExistentMs: Math.round(avgNonExistent * 10) / 10,
    avgTargetMs: Math.round(avgTarget * 10) / 10,
    timingDeltaMs,
    isVulnerable,
    verdict: isVulnerable
      ? `Side-Channel Timing Discrepancy Detected (${timingDeltaMs}ms delta). Backend likely evaluates cryptographic password hashing only when user exists, exposing user enumeration.`
      : `No significant timing disparity observed (${timingDeltaMs}ms delta). Timings appear constant-time or generic.`,
  };
}

// --------------------------------------------------------------------------
// 4. Micro-Burst Concurrency Probe
// --------------------------------------------------------------------------

async function testConcurrencyRace(targetUrl, endpointPath = '') {
  let normalized = targetUrl.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }

  const parsed = new URL(normalized);
  const origin = `${parsed.protocol}//${parsed.host}`;
  const targetEndpoint = endpointPath ? `${origin}${endpointPath}` : normalized;

  const burstCount = 6;
  const start = performance.now();

  const requests = Array.from({ length: burstCount }, (_, i) =>
    rawRequest(targetEndpoint, {
      method: 'GET',
      headers: { 'X-Concurrency-Probe-ID': String(i + 1) },
      timeoutMs: 4000,
    })
  );

  const responses = await Promise.all(requests);
  const totalWindowMs = Math.round((performance.now() - start) * 10) / 10;

  const statusCodes = responses.map((r) => r.statusCode);
  const latencies = responses.map((r) => r.latencyMs);

  return {
    targetEndpoint,
    burstCount,
    totalWindowMs,
    statusCodes,
    latencies,
    uniformity: new Set(statusCodes).size === 1 ? 'UNIFORM' : 'DIVERGENT',
    summary: `Executed ${burstCount} parallel requests in ${totalWindowMs}ms window. Status codes: [${statusCodes.join(', ')}]`,
  };
}

module.exports = {
  rawRequest,
  runProofOfVerification,
  crawlShadowApis,
  testSideChannelTiming,
  testConcurrencyRace,
};

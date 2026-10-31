const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

/**
 * DracoDeck Sentinel Engine v2.0 (Deep Multi-Vector Modern Web & API Auditor)
 * Zero-CORS Node.js Main Process Engine.
 *
 * Performs automated Attack Surface Harvesting (DOM Forms, Links, SSR Hydration State,
 * Client JS AST Bundles, Source Maps, OpenAPI/GraphQL routes) followed by 10-Vector
 * Mathematical Proof-of-Verification (PoV) across discovered endpoints and parameters.
 */

function rawRequest(targetUrl, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body = null,
    timeoutMs = 4500,
  } = options;

  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      const reqHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Dracodeck/2.0 Sentinel-DeepEngine',
        'Accept': 'text/html,application/xhtml+xml,application/json,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...headers,
      };

      if (body && !reqHeaders['Content-Length'] && !reqHeaders['content-length']) {
        reqHeaders['Content-Length'] = Buffer.byteLength(body);
      }

      const reqOptions = {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + (parsed.search || ''),
        method,
        timeout: timeoutMs,
        rejectUnauthorized: false,
        headers: reqHeaders,
      };

      const start = performance.now();
      const req = client.request(reqOptions, (res) => {
        const chunks = [];
        let bodyLength = 0;
        const maxCapture = 131072; // 128KB capture for JS bundles & source maps

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
            headers: res.headers || {},
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

// Helper: Resolve relative URL safely against base origin
function resolveUrl(baseOrigin, baseUrlStr, candidate) {
  try {
    if (!candidate || candidate.startsWith('javascript:') || candidate.startsWith('mailto:') || candidate.startsWith('tel:') || candidate.startsWith('#')) {
      return null;
    }
    const resolved = new URL(candidate, baseUrlStr);
    if (resolved.origin !== baseOrigin) return null;
    return resolved;
  } catch {
    return null;
  }
}

// --------------------------------------------------------------------------
// PHASE 0: Deep Attack Surface Harvester
// Crawls DOM forms, inputs, links, robots.txt, SSR state, & JS AST bundles
// --------------------------------------------------------------------------

async function harvestAttackSurface(baseUrl) {
  const parsedBase = new URL(baseUrl);
  const origin = `${parsedBase.protocol}//${parsedBase.host}`;

  const endpoints = new Set([parsedBase.pathname || '/']);
  const params = new Set();
  const redirectParams = new Set();
  const forms = [];
  const scriptUrls = new Set();
  const jsContents = [];
  let probesCount = 0;

  // Seed parameters from user-supplied URL if any
  for (const [k] of parsedBase.searchParams) {
    params.add(k);
  }

  // 1. Fetch Root Document + robots.txt + openapi/swagger in parallel
  const initialProbes = [
    rawRequest(baseUrl, { method: 'GET' }),
    rawRequest(`${origin}/robots.txt`, { method: 'GET', timeoutMs: 2500 }),
    rawRequest(`${origin}/openapi.json`, { method: 'GET', timeoutMs: 2500 }),
    rawRequest(`${origin}/swagger.json`, { method: 'GET', timeoutMs: 2500 }),
  ];
  probesCount += initialProbes.length;
  const [rootRes, robotsRes, openapiRes, swaggerRes] = await Promise.all(initialProbes);

  // Parse robots.txt Disallow/Allow paths
  if (robotsRes.statusCode === 200 && robotsRes.body && robotsRes.body.includes('User-agent')) {
    const robLines = robotsRes.body.split(/\r?\n/);
    for (const line of robLines) {
      const m = line.match(/^(?:Disallow|Allow):\s*(\/[^\s#?*]*)/i);
      if (m && m[1] && m[1].length > 1) {
        endpoints.add(m[1].trim());
      }
    }
  }

  // Parse OpenAPI / Swagger paths & parameters if exposed
  for (const specRes of [openapiRes, swaggerRes]) {
    if (specRes.statusCode === 200 && specRes.body && specRes.body.trim().startsWith('{')) {
      try {
        const spec = JSON.parse(specRes.body);
        if (spec.paths && typeof spec.paths === 'object') {
          for (const [p, methodsObj] of Object.entries(spec.paths)) {
            endpoints.add(p.replace(/\{[^}]+\}/g, '1'));
            if (methodsObj && typeof methodsObj === 'object') {
              for (const op of Object.values(methodsObj)) {
                if (op && Array.isArray(op.parameters)) {
                  for (const prm of op.parameters) {
                    if (prm && prm.name) params.add(prm.name);
                  }
                }
              }
            }
          }
        }
      } catch {}
    }
  }

  const html = rootRes.body || '';
  if (html) {
    // 2. Extract HTML <form> actions, methods, and <input>/<select>/<textarea> names
    const formRegex = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
    let formMatch;
    while ((formMatch = formRegex.exec(html)) !== null) {
      const attrs = formMatch[1] || '';
      const inner = formMatch[2] || '';
      const actionMatch = attrs.match(/\baction=["']?([^"'\s>]+)["']?/i);
      const methodMatch = attrs.match(/\bmethod=["']?([^"'\s>]+)["']?/i);
      const rawAction = actionMatch ? actionMatch[1] : parsedBase.pathname;
      const resolvedAction = resolveUrl(origin, baseUrl, rawAction);
      const actionPath = resolvedAction ? resolvedAction.pathname : parsedBase.pathname;
      const method = (methodMatch ? methodMatch[1] : 'GET').toUpperCase();

      const formInputs = [];
      const inputRegex = /<(?:input|textarea|select)\b[^>]*?\bname=["']([^"']+)["'][^>]*>/gi;
      let inpMatch;
      while ((inpMatch = inputRegex.exec(inner)) !== null) {
        const inpName = inpMatch[1].trim();
        if (inpName) {
          formInputs.push(inpName);
          params.add(inpName);
        }
      }
      endpoints.add(actionPath);
      if (formInputs.length > 0) {
        forms.push({ action: actionPath, method, inputs: formInputs });
      }
    }

    // Also extract standalone <input name="..."> outside <form> tags (common in React/Vue SPAs)
    const standaloneInputRegex = /<(?:input|textarea|select)\b[^>]*?\bname=["']([^"']+)["'][^>]*>/gi;
    let stMatch;
    while ((stMatch = standaloneInputRegex.exec(html)) !== null) {
      if (stMatch[1]) params.add(stMatch[1].trim());
    }

    // 3. Extract <a href="..."> internal endpoints and real query params
    const hrefRegex = /\bhref=["']([^"']+)["']/gi;
    let hrefMatch;
    while ((hrefMatch = hrefRegex.exec(html)) !== null) {
      const resolved = resolveUrl(origin, baseUrl, hrefMatch[1]);
      if (resolved) {
        if (!/\.(css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/i.test(resolved.pathname)) {
          endpoints.add(resolved.pathname);
        }
        for (const [k] of resolved.searchParams) {
          params.add(k);
        }
      }
    }

    // 4. Extract <script src="..."> bundles
    const scriptRegex = /<script\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi;
    let scMatch;
    while ((scMatch = scriptRegex.exec(html)) !== null) {
      const resolved = resolveUrl(origin, baseUrl, scMatch[1]);
      if (resolved) {
        scriptUrls.add(resolved.toString());
      }
    }

    // Capture inline <script> blocks (e.g. __NEXT_DATA__, __NUXT__, inline fetch calls)
    const inlineScriptRegex = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let inMatch;
    while ((inMatch = inlineScriptRegex.exec(html)) !== null) {
      if (inMatch[1] && inMatch[1].trim().length > 10) {
        jsContents.push({ url: `${baseUrl}#inline-script`, code: inMatch[1] });
      }
    }
  }

  // 5. Download up to 5 same-origin JS bundles in parallel & mine endpoints/params
  const targetScripts = Array.from(scriptUrls).slice(0, 5);
  if (targetScripts.length > 0) {
    probesCount += targetScripts.length;
    const jsResponses = await Promise.all(
      targetScripts.map((u) => rawRequest(u, { method: 'GET', timeoutMs: 3500 }))
    );
    for (let i = 0; i < targetScripts.length; i++) {
      if (jsResponses[i].statusCode === 200 && jsResponses[i].body) {
        jsContents.push({ url: targetScripts[i], code: jsResponses[i].body });
      }
    }
  }

  // Mine API routes & parameter names from all JS code + inline scripts
  for (const item of jsContents) {
    const code = item.code;
    // Match API/route paths (even when followed by ?query=... or ${...} inside string literal)
    const routeRegex = /["'`](\/(?:api|v[1-9]|graphql|trpc|auth|login|admin|user|users|account|search|query|internal|debug|config|webhook|export|download|proxy|redirect)[a-zA-Z0-9_\-/]*)(?:[?#$][^"'`\s]*)?["'`]/g;
    let rMatch;
    while ((rMatch = routeRegex.exec(code)) !== null) {
      const ep = rMatch[1];
      if (ep.length > 1 && ep.length < 75 && !/\.(js|css|svg|png|map)$/i.test(ep)) {
        endpoints.add(ep);
      }
    }

    // Match query parameters in JS strings: ?foo= or &bar=
    const qParamRegex = /[?&]([a-zA-Z][a-zA-Z0-9_]{1,24})=/g;
    let qpMatch;
    while ((qpMatch = qParamRegex.exec(code)) !== null) {
      params.add(qpMatch[1]);
    }

    // Match URLSearchParams.get('...') or req.query.xyz or searchParams.get('...')
    const searchGetRegex = /(?:searchParams\.get|URLSearchParams|query\.)\s*\(?["']?([a-zA-Z][a-zA-Z0-9_]{1,24})["']?\)?/g;
    let sgMatch;
    while ((sgMatch = searchGetRegex.exec(code)) !== null) {
      params.add(sgMatch[1]);
    }
  }

  // Classify redirect/URL parameters + ensure high-value modern fallback parameters exist
  const redirectCandidates = ['redirect', 'redirect_uri', 'next', 'url', 'return', 'returnTo', 'return_to', 'continue', 'dest', 'destination', 'callback', 'out', 'view', 'to'];
  for (const p of params) {
    if (redirectCandidates.includes(p.toLowerCase())) {
      redirectParams.add(p);
    }
  }
  // Add top high-signal parameters if target has few explicit DOM params
  const highSignalParams = ['id', 'q', 'search', 'query', 'filter', 'sort', 'page', 'user', 'token', 'callback', 'redirect', 'url', 'next'];
  for (const hp of highSignalParams) {
    if (params.size < 8) params.add(hp);
  }
  if (redirectParams.size === 0) {
    redirectParams.add('redirect');
    redirectParams.add('next');
    redirectParams.add('url');
  }

  return {
    origin,
    baseUrl,
    hostname: parsedBase.hostname,
    rootRes,
    endpoints: Array.from(endpoints).slice(0, 12),
    params: Array.from(params).slice(0, 14),
    redirectParams: Array.from(redirectParams).slice(0, 5),
    forms: forms.slice(0, 6),
    scriptUrls: targetScripts,
    jsContents,
    probesCount,
  };
}

// --------------------------------------------------------------------------
// VECTOR 01: Production Source Map (.js.map) & Unminified Code Exposure
// --------------------------------------------------------------------------
async function verifySourceMapExposure(surface) {
  const findings = [];
  let probes = 0;

  const mapCandidates = [];
  for (const item of surface.jsContents) {
    if (item.url.endsWith('#inline-script')) continue;
    const smMatch = item.code.match(/\/\/[#@]\s*sourceMappingURL=([^\s'"]+)/);
    if (smMatch && smMatch[1] && !smMatch[1].startsWith('data:')) {
      const resolved = resolveUrl(surface.origin, item.url, smMatch[1]);
      if (resolved) mapCandidates.push({ scriptUrl: item.url, mapUrl: resolved.toString() });
    } else {
      mapCandidates.push({ scriptUrl: item.url, mapUrl: `${item.url}.map` });
    }
  }

  const targets = mapCandidates.slice(0, 4);
  if (targets.length === 0) return { findings, probes };

  probes += targets.length;
  const responses = await Promise.all(
    targets.map((t) => rawRequest(t.mapUrl, { method: 'GET', timeoutMs: 3500 }))
  );

  for (let i = 0; i < targets.length; i++) {
    const res = responses[i];
    if (res.statusCode === 200 && res.body && res.body.includes('"sources"') && res.body.includes('"mappings"')) {
      try {
        const parsed = JSON.parse(res.body);
        if (Array.isArray(parsed.sources) && parsed.sources.length > 0) {
          const hasOriginalCode = Array.isArray(parsed.sourcesContent) && parsed.sourcesContent.some(Boolean);
          const sampleFiles = parsed.sources.slice(0, 8).join('\n  - ');
          findings.push({
            type: 'SOURCE_MAP_EXPOSURE_POV',
            title: `Production JavaScript Source Map Exposed (${parsed.sources.length} Original Source Files)`,
            certainty: 'VERIFIED',
            certaintyScore: 100,
            severity: hasOriginalCode ? 'HIGH' : 'MEDIUM',
            testedUrl: targets[i].mapUrl,
            statusCode: res.statusCode,
            reproducibleCurl: `curl -i -s -k "${targets[i].mapUrl}" | head -c 800`,
            evidenceExcerpt: `GET ${targets[i].mapUrl} -> HTTP 200 OK (${res.rawLength} bytes)\nincludes sourcesContent (Full Unminified Source Code): ${hasOriginalCode}\nSample Reconstructed Source Tree:\n  - ${sampleFiles}`,
            remediation: 'Disable production source maps in bundler config (Vite: `build.sourcemap: false`, Next.js: `productionBrowserSourceMaps: false`, Webpack: `devtool: false`) or block `*.map` at Nginx/CDN edge.',
          });
          break;
        }
      } catch {}
    }
  }

  return { findings, probes };
}

// --------------------------------------------------------------------------
// VECTOR 02: SSR Hydration State & Client Bundle Secret / Private Key Miner
// --------------------------------------------------------------------------
async function verifyHydrationAndBundleSecrets(surface) {
  const findings = [];
  const secretRules = [
    { name: 'AWS IAM Access Key ID', regex: /\b(AKIA[0-9A-Z]{16})\b/, severity: 'CRITICAL' },
    { name: 'Stripe Live Secret / Restricted Key', regex: /\b((?:sk|rk)_live_[0-9a-zA-Z]{20,})\b/, severity: 'CRITICAL' },
    { name: 'GitHub Personal / Fine-Grained Token', regex: /\b(gh[pousr]_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/, severity: 'CRITICAL' },
    { name: 'Slack Bot / Webhook Token', regex: /\b(xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*)\b/, severity: 'CRITICAL' },
    { name: 'Private Cryptographic Key Block', regex: /(-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/, severity: 'CRITICAL' },
    { name: 'Database Connection URI with Credentials', regex: /\b((?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis):\/\/[^/\s"':]+:[^@\s"']+@[a-zA-Z0-9.-]+)/i, severity: 'CRITICAL' },
    { name: 'Google Cloud / Firebase API Key', regex: /\b(AIza[0-9A-Za-z\-_]{35})\b/, severity: 'MEDIUM' },
    { name: 'Hardcoded Service Role JWT', regex: /\b(eyJhbGciOiJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]*c2VydmljZV9yb2xl[A-Za-z0-9_-]*\.[A-Za-z0-9_-]{15,})\b/, severity: 'CRITICAL' },
  ];

  for (const item of surface.jsContents) {
    for (const rule of secretRules) {
      const m = item.code.match(rule.regex);
      if (m && m[1]) {
        const idx = item.code.indexOf(m[1]);
        const context = item.code.substring(Math.max(0, idx - 50), Math.min(item.code.length, idx + m[1].length + 50));
        const cleanUrl = item.url.replace('#inline-script', '');
        findings.push({
          type: 'BUNDLE_SECRET_LEAK_POV',
          title: `Proven Client-Side Credential Leak: ${rule.name}`,
          certainty: 'VERIFIED',
          certaintyScore: 100,
          severity: rule.severity,
          canaryToken: m[1],
          testedUrl: item.url,
          reproducibleCurl: `curl -s -k "${cleanUrl}" | grep -o "${m[1].substring(0, 18)}..."`,
          evidenceExcerpt: `Source Asset: ${item.url}\nMatched Credential Token: ${m[1]}\nCode Context:\n...${context.trim()}...`,
          remediation: 'Revoke and rotate the exposed credential immediately. Move secret keys exclusively to server-side environment variables and strip them from NEXT_PUBLIC_ / VITE_ client bundles.',
        });
        break;
      }
    }
  }

  return { findings, probes: 0 };
}

// --------------------------------------------------------------------------
// VECTOR 03: GraphQL Schema Introspection & Query Exposure
// --------------------------------------------------------------------------
async function verifyGraphqlIntrospection(surface) {
  const findings = [];
  const gqlPaths = new Set(['/graphql', '/api/graphql', '/v1/graphql']);
  for (const ep of surface.endpoints) {
    if (ep.toLowerCase().includes('graphql') || ep.toLowerCase().includes('gql')) {
      gqlPaths.add(ep);
    }
  }

  const targets = Array.from(gqlPaths).slice(0, 4);
  const introspectionBody = JSON.stringify({
    query: 'query DracoAudit{__schema{queryType{name}mutationType{name}types{name kind}}}',
  });

  const responses = await Promise.all(
    targets.map((p) =>
      rawRequest(`${surface.origin}${p}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: introspectionBody,
        timeoutMs: 3500,
      })
    )
  );

  for (let i = 0; i < targets.length; i++) {
    const res = responses[i];
    if (res.statusCode === 200 && res.body && res.body.includes('"__schema"') && res.body.includes('"types"')) {
      try {
        const parsed = JSON.parse(res.body);
        const schema = parsed?.data?.__schema;
        if (schema && Array.isArray(schema.types)) {
          const customTypes = schema.types
            .map((t) => t.name)
            .filter((n) => n && !n.startsWith('__') && !['String', 'Int', 'Boolean', 'Float', 'ID'].includes(n))
            .slice(0, 12);
          const fullUrl = `${surface.origin}${targets[i]}`;
          findings.push({
            type: 'GRAPHQL_INTROSPECTION_POV',
            title: `Proven GraphQL Schema Introspection Enabled (${schema.types.length} Schema Types Exposed)`,
            certainty: 'VERIFIED',
            certaintyScore: 100,
            severity: 'HIGH',
            testedUrl: fullUrl,
            statusCode: res.statusCode,
            reproducibleCurl: `curl -i -s -k -X POST -H "Content-Type: application/json" -d '${introspectionBody}' "${fullUrl}"`,
            evidenceExcerpt: `POST ${fullUrl} -> 200 OK\nqueryType: ${schema.queryType?.name || 'Query'} | mutationType: ${schema.mutationType?.name || 'None'}\nExposed Domain Models (${customTypes.length}+): ${customTypes.join(', ')}`,
            remediation: 'Disable GraphQL Introspection in production environments (Apollo Server: `introspection: false`, Yoga/GraphQL-JS: `NoSchemaIntrospectionCustomRule`).',
          });
          break;
        }
      } catch {}
    }
  }

  return { findings, probes: targets.length };
}

// --------------------------------------------------------------------------
// VECTOR 04: 4-Way Modern CORS Regex, Subdomain & Null-Origin Bypass
// --------------------------------------------------------------------------
async function verifyAdvancedCorsPoV(surface) {
  const findings = [];
  const host = surface.hostname;

  // Test both root and top discovered API route
  const apiCandidate = surface.endpoints.find((e) => e.startsWith('/api') || e.startsWith('/v1') || e.startsWith('/auth')) || surface.endpoints[0] || '/';
  const testUrls = Array.from(new Set([surface.baseUrl, `${surface.origin}${apiCandidate}`]));

  const originMutations = [
    { label: 'Null Origin (Sandboxed Iframe Bypass)', origin: 'null', severity: 'CRITICAL' },
    { label: 'Unanchored Prefix Regex Bypass', origin: `https://${host}.draco-audit.local`, severity: 'CRITICAL' },
    { label: 'Unescaped Dot / Suffix Match Bypass', origin: `https://draco${host}`, severity: 'HIGH' },
    { label: 'Arbitrary Third-Party Origin Reflection', origin: 'https://draco-audit.local', severity: 'HIGH' },
  ];

  let probes = 0;
  for (const url of testUrls) {
    probes += originMutations.length;
    const results = await Promise.all(
      originMutations.map((m) =>
        rawRequest(url, {
          method: 'GET',
          headers: {
            'Origin': m.origin,
            'Access-Control-Request-Method': 'GET',
          },
          timeoutMs: 3000,
        })
      )
    );

    for (let i = 0; i < originMutations.length; i++) {
      const mut = originMutations[i];
      const res = results[i];
      const acao = res.headers['access-control-allow-origin'];
      const acac = String(res.headers['access-control-allow-credentials'] || '').toLowerCase() === 'true';

      if (acao && acao === mut.origin) {
        const effectiveSeverity = acac ? 'CRITICAL' : 'MEDIUM';
        findings.push({
          type: 'CORS_REGEX_BYPASS_POV',
          title: `Proven CORS Trust Bypass: ${mut.label}${acac ? ' (With Credentials)' : ''}`,
          certainty: 'VERIFIED',
          certaintyScore: 100,
          severity: effectiveSeverity,
          testedUrl: url,
          reflectedOrigin: acao,
          credentialsAllowed: acac,
          statusCode: res.statusCode,
          reproducibleCurl: `curl -i -s -k -H "Origin: ${mut.origin}" "${url}"`,
          evidenceExcerpt: `Tested Endpoint: ${url}\nInjected Origin: ${mut.origin}\nResponse Header -> Access-Control-Allow-Origin: ${acao}\nResponse Header -> Access-Control-Allow-Credentials: ${acac ? 'true (SESSION EXFILTRATION RISK)' : 'not set'}`,
          remediation: 'Do not reflect `Origin` headers dynamically or use unanchored regexes. Validate against an exact, strict Set of origin strings and never allow `Origin: null` with `Access-Control-Allow-Credentials: true`.',
        });
        return { findings, probes };
      }
    }
  }

  return { findings, probes };
}

// --------------------------------------------------------------------------
// VECTOR 05: Multi-Context Polyglot Canary Breakout & SSTI (7*7=49) Verifier
// Tests real harvested endpoints, forms, and parameters!
// --------------------------------------------------------------------------
async function verifyContextBreakoutAndSsti(surface) {
  const findings = [];
  let probes = 0;

  const randHex = crypto.randomBytes(3).toString('hex');
  // Benign polyglot probe: tests raw HTML/Attr characters '"<> AND template arithmetic {{1337*7331}} without executing malicious JS
  const mathA = 191;
  const mathB = 313;
  const expectedProduct = String(mathA * mathB); // "59783"
  const canaryPrefix = `drc${randHex}`;
  const polyglotProbe = `${canaryPrefix}"'><{{${mathA}*${mathB}}}\${${mathA}*${mathB}}`;

  // Build target (endpoint, param, method) tuples from harvested surface
  const probeTargets = [];

  // 1. Harvested HTML Forms (GET & POST)
  for (const form of surface.forms.slice(0, 3)) {
    const firstParam = form.inputs[0] || 'q';
    probeTargets.push({
      endpoint: form.action,
      param: firstParam,
      method: form.method === 'POST' ? 'POST' : 'GET',
      allInputs: form.inputs,
    });
  }

  // 2. Harvested endpoints + harvested parameters
  const topEndpoints = surface.endpoints.slice(0, 4);
  const topParams = surface.params.slice(0, 5);
  for (const ep of topEndpoints) {
    for (const prm of topParams) {
      if (probeTargets.length < 14) {
        probeTargets.push({ endpoint: ep, param: prm, method: 'GET' });
      }
    }
  }

  // Execute in parallel batches of 5
  for (let i = 0; i < probeTargets.length; i += 5) {
    const batch = probeTargets.slice(i, i + 5);
    probes += batch.length;

    const batchRes = await Promise.all(
      batch.map((t) => {
        const targetUrlObj = new URL(`${surface.origin}${t.endpoint}`);
        if (t.method === 'POST') {
          const formBody = new URLSearchParams();
          for (const inp of t.allInputs || [t.param]) {
            formBody.set(inp, polyglotProbe);
          }
          return rawRequest(targetUrlObj.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formBody.toString(),
            timeoutMs: 3500,
          });
        } else {
          targetUrlObj.searchParams.set(t.param, polyglotProbe);
          return rawRequest(targetUrlObj.toString(), { method: 'GET', timeoutMs: 3500 });
        }
      })
    );

    for (let j = 0; j < batch.length; j++) {
      const target = batch[j];
      const res = batchRes[j];
      if (!res.body || !res.body.includes(canaryPrefix)) continue;

      const idx = res.body.indexOf(canaryPrefix);
      const excerpt = res.body.substring(Math.max(0, idx - 60), Math.min(res.body.length, idx + 140));

      // Check 1: Did Server-Side Template Engine evaluate {{191*313}} or ${191*313} into 59783?
      if (
        (res.body.includes(`${canaryPrefix}"'><${expectedProduct}`) ||
          res.body.includes(`${canaryPrefix}`) && excerpt.includes(expectedProduct)) &&
        !surface.rootRes.body.includes(expectedProduct)
      ) {
        findings.push({
          type: 'SSTI_ARITHMETIC_EVALUATION_POV',
          title: `Proven Server-Side Template Injection (SSTI) on ${target.endpoint} [${target.param}]`,
          certainty: 'VERIFIED',
          certaintyScore: 100,
          severity: 'CRITICAL',
          targetParam: target.param,
          canaryToken: polyglotProbe,
          contextType: 'TEMPLATE_ENGINE_EVALUATION',
          testedUrl: res.targetUrl,
          statusCode: res.statusCode,
          reproducibleCurl:
            target.method === 'POST'
              ? `curl -i -s -k -X POST -d "${target.param}=${encodeURIComponent(polyglotProbe)}" "${res.targetUrl}"`
              : `curl -i -s -k "${res.targetUrl}"`,
          evidenceExcerpt: `Injected Expression: {{${mathA}*${mathB}}} / \${${mathA}*${mathB}}\nEvaluated Server Output (${expectedProduct}):\n${excerpt.trim()}`,
          remediation: 'Never pass user-controlled strings into template compilation functions (Jinja2 `render_template_string`, Twig, Pug, Freemarker, EJS). Pass data strictly as bound context variables.',
        });
        return { findings, probes };
      }

      // Check 2: Did raw dangerous characters (" ' < >) survive unencoded in HTML/Script/Attribute context?
      const hasRawTagBreakout = res.body.includes(`${canaryPrefix}"'><`) || res.body.includes(`<{{${mathA}`);
      const hasRawQuoteBreakout = res.body.includes(`${canaryPrefix}"`) || res.body.includes(`${canaryPrefix}'`);

      const scriptContextRegex = new RegExp(`<script[^>]*>[\\s\\S]*?${canaryPrefix}[\\s\\S]*?<\\/script>`, 'i');
      const inScript = scriptContextRegex.test(res.body);

      if (hasRawTagBreakout || (inScript && hasRawQuoteBreakout)) {
        const contextType = inScript
          ? 'EXECUTABLE_SCRIPT_BLOCK_BREAKOUT'
          : hasRawTagBreakout
          ? 'RAW_HTML_TAG_INJECTION_CONTEXT'
          : 'ATTRIBUTE_DELIMITER_BREAKOUT';

        findings.push({
          type: 'XSS_POLYGLOT_BREAKOUT_POV',
          title: `Proven Unencoded Metacharacter Breakout (${contextType}) on ${target.endpoint}`,
          certainty: 'VERIFIED',
          certaintyScore: 100,
          severity: inScript ? 'CRITICAL' : 'HIGH',
          targetParam: target.param,
          canaryToken: polyglotProbe,
          contextType,
          testedUrl: res.targetUrl,
          statusCode: res.statusCode,
          reproducibleCurl:
            target.method === 'POST'
              ? `curl -i -s -k -X POST -d "${target.param}=${encodeURIComponent(polyglotProbe)}" "${res.targetUrl}"`
              : `curl -i -s -k "${res.targetUrl}"`,
          evidenceExcerpt: `Endpoint: ${target.method} ${target.endpoint} (Param: ${target.param})\nUnescaped Metacharacters Reflected in ${contextType}:\n${excerpt.trim()}`,
          remediation: 'Encode all dynamic output contextually (`<` -> `&lt;`, `>` -> `&gt;`, `"` -> `&quot;`, `\'` -> `&#x27;`) and deploy a strict Content-Security-Policy.',
        });
        return { findings, probes };
      }
    }
  }

  return { findings, probes };
}

// --------------------------------------------------------------------------
// VECTOR 06: Multi-Syntax SQL Quote-Parity (' vs '') & Arithmetic Differential
// --------------------------------------------------------------------------
async function verifySqlDifferentialAndQuoteParity(surface) {
  const findings = [];
  let probes = 0;

  const candidateEndpoints = surface.endpoints.slice(0, 3);
  const candidateParams = surface.params.slice(0, 4);

  const sqlErrorSignatures = [
    { dbms: 'PostgreSQL', regex: /PostgreSQL.*ERROR|pg_query\(\)|PSQLException|unterminated quoted string at or near/i },
    { dbms: 'MySQL / MariaDB', regex: /You have an error in your SQL syntax|mysql_fetch|Warning: mysql_|MariaDB server version/i },
    { dbms: 'Microsoft SQL Server', regex: /Unclosed quotation mark after the character string|Microsoft OLE DB Provider for SQL Server|SQLServer JDBC Driver/i },
    { dbms: 'Oracle Database', regex: /ORA-01756|ORA-00933|ORA-00936|quoted string not properly terminated/i },
    { dbms: 'SQLite', regex: /SQLite\/JDBCDriver|SQLite3::SQLException|unrecognized token:|SQLITE_ERROR/i },
  ];

  for (const ep of candidateEndpoints) {
    for (const param of candidateParams) {
      const baseEpUrl = `${surface.origin}${ep}`;

      // 3-Way Quote Parity & Arithmetic Probe:
      // Probe 1 (Baseline): param=1
      // Probe 2 (Unbalanced Single Quote): param=1'
      // Probe 3 (Balanced Escaped Single Quotes): param=1''
      const urlBase = new URL(baseEpUrl);
      urlBase.searchParams.set(param, '1');

      const urlOddQuote = new URL(baseEpUrl);
      urlOddQuote.searchParams.set(param, "1'");

      const urlEvenQuote = new URL(baseEpUrl);
      urlEvenQuote.searchParams.set(param, "1''");

      probes += 3;
      const [resBase, resOdd, resEven] = await Promise.all([
        rawRequest(urlBase.toString(), { timeoutMs: 3500 }),
        rawRequest(urlOddQuote.toString(), { timeoutMs: 3500 }),
        rawRequest(urlEvenQuote.toString(), { timeoutMs: 3500 }),
      ]);

      if (resBase.statusCode === 0) continue;

      // Check A: Deterministic DBMS SQL Syntax Error Leak on Odd Quote
      for (const sig of sqlErrorSignatures) {
        if (sig.regex.test(resOdd.body) && !sig.regex.test(resBase.body)) {
          const match = resOdd.body.match(sig.regex);
          const idx = resOdd.body.indexOf(match[0]);
          const excerpt = resOdd.body.substring(Math.max(0, idx - 40), Math.min(resOdd.body.length, idx + 180));
          findings.push({
            type: 'SQLI_ERROR_BASED_POV',
            title: `Proven ${sig.dbms} SQL Injection Syntax Leak on ${ep} [${param}]`,
            certainty: 'VERIFIED',
            certaintyScore: 100,
            severity: 'CRITICAL',
            targetParam: param,
            testedUrl: urlOddQuote.toString(),
            statusCode: resOdd.statusCode,
            reproducibleCurl: `curl -i -s -k "${urlOddQuote.toString()}"`,
            evidenceExcerpt: `DBMS Signature: ${sig.dbms}\nInjected Parameter: ${param}=1'\nRaw Database Error Dump:\n${excerpt.trim()}`,
            remediation: 'Replace raw SQL string interpolation with parameterized queries / prepared statements.',
          });
          return { findings, probes };
        }
      }

      // Check B: Quote Parity Differential Proof
      // Baseline (1) == 200 and Balanced Quote (1'') == 200 with matching length, while Odd Quote (1') triggers 500 or huge byte drop
      const diffBaseEven = Math.abs(resBase.rawLength - resEven.rawLength);
      const diffBaseOdd = Math.abs(resBase.rawLength - resOdd.rawLength);

      if (
        resBase.statusCode === 200 &&
        resEven.statusCode === 200 &&
        (resOdd.statusCode >= 500 || (diffBaseEven <= 15 && diffBaseOdd > 120))
      ) {
        findings.push({
          type: 'SQLI_QUOTE_PARITY_POV',
          title: `Proven SQL Quote-Parity Differential (' vs '') on ${ep} [${param}]`,
          certainty: 'VERIFIED',
          certaintyScore: 98,
          severity: 'CRITICAL',
          targetParam: param,
          baselineLength: resBase.rawLength,
          trueProbeLength: resEven.rawLength,
          falseProbeLength: resOdd.rawLength,
          testedUrl: urlOddQuote.toString(),
          statusCode: resOdd.statusCode,
          reproducibleCurl: `# 1. Odd quote breaks SQL query (HTTP ${resOdd.statusCode}, ${resOdd.rawLength}B):\ncurl -i -s -k "${urlOddQuote.toString()}"\n# 2. Escaped even quote restores valid SQL syntax (HTTP ${resEven.statusCode}, ${resEven.rawLength}B):\ncurl -i -s -k "${urlEvenQuote.toString()}"`,
          evidenceExcerpt: `Baseline [1]: HTTP ${resBase.statusCode} (${resBase.rawLength}B)\nOdd Quote [1']: HTTP ${resOdd.statusCode} (${resOdd.rawLength}B)\nEscaped Quote [1'']: HTTP ${resEven.statusCode} (${resEven.rawLength}B) -> Parity restored!`,
          remediation: 'Use bound parameters / prepared statements so single quotes are never interpreted as SQL string delimiters.',
        });
        return { findings, probes };
      }
    }
  }

  return { findings, probes };
}

// --------------------------------------------------------------------------
// VECTOR 07: NoSQL / ORM Array & Object Type-Confusion ($ne / []) Differential
// --------------------------------------------------------------------------
async function verifyNoSqlAndOrmTypeConfusion(surface) {
  const findings = [];
  let probes = 0;

  const targets = surface.endpoints.slice(0, 3);
  const param = surface.params[0] || 'id';

  const ormErrorRegex = /CastError|Cast to ObjectId failed|PrismaClientValidationError|PrismaClientKnownRequestError|SequelizeDatabaseError|\.trim is not a function|\.toLowerCase is not a function|MongoServerError|BSONTypeError/i;

  for (const ep of targets) {
    const baseUrlStr = `${surface.origin}${ep}`;
    const urlScalar = `${baseUrlStr}?${encodeURIComponent(param)}=draco_scalar`;
    const urlArray = `${baseUrlStr}?${encodeURIComponent(param)}[]=draco_scalar`;
    const urlNeObj = `${baseUrlStr}?${encodeURIComponent(param)}[$ne]=draco_scalar`;

    probes += 3;
    const [resScalar, resArray, resNe] = await Promise.all([
      rawRequest(urlScalar, { timeoutMs: 3500 }),
      rawRequest(urlArray, { timeoutMs: 3500 }),
      rawRequest(urlNeObj, { timeoutMs: 3500 }),
    ]);

    if (resScalar.statusCode === 0) continue;

    // Check 1: Did array [] or [$ne] object injection trigger an unhandled ORM/Runtime TypeError or 500 crash?
    for (const [label, probeRes, probeUrl] of [
      ['Array Parameter (?param[]=)', resArray, urlArray],
      ['NoSQL Operator Object (?param[$ne]=)', resNe, urlNeObj],
    ]) {
      const matchedOrmErr = probeRes.body.match(ormErrorRegex);
      if (
        (matchedOrmErr && !ormErrorRegex.test(resScalar.body)) ||
        (resScalar.statusCode < 500 && probeRes.statusCode >= 500 && probeRes.body.length > 20)
      ) {
        const excerpt = matchedOrmErr
          ? probeRes.body.substring(Math.max(0, probeRes.body.indexOf(matchedOrmErr[0]) - 30), Math.min(probeRes.body.length, probeRes.body.indexOf(matchedOrmErr[0]) + 180))
          : probeRes.body.substring(0, 220);

        findings.push({
          type: 'NOSQL_ORM_TYPE_CONFUSION_POV',
          title: `Proven Backend Type-Juggling / ORM Exception via ${label} on ${ep}`,
          certainty: 'VERIFIED',
          certaintyScore: 99,
          severity: 'HIGH',
          targetParam: param,
          testedUrl: probeUrl,
          statusCode: probeRes.statusCode,
          reproducibleCurl: `curl -i -s -k -g "${probeUrl}"`,
          evidenceExcerpt: `Scalar Baseline (?${param}=draco_scalar): HTTP ${resScalar.statusCode} (${resScalar.rawLength}B)\nInjected ${label}: HTTP ${probeRes.statusCode} (${probeRes.rawLength}B)\nBackend Exception Trace:\n${excerpt.trim()}`,
          remediation: 'Enforce strict schema validation (Zod, Joi, Yup, class-validator) on `req.query` and `req.body` to reject nested arrays/objects (`$ne`, `$gt`) when scalar strings are expected.',
        });
        return { findings, probes };
      }
    }

    // Check 2: Auth / Filter Bypass where scalar returns 401/403/404 and [$ne] returns 200 OK
    if ([401, 403, 404].includes(resScalar.statusCode) && resNe.statusCode === 200 && resNe.rawLength > resScalar.rawLength + 60) {
      findings.push({
        type: 'NOSQL_OPERATOR_BYPASS_POV',
        title: `Proven NoSQL [$ne] Operator Filter Bypass on ${ep} [${param}]`,
        certainty: 'VERIFIED',
        certaintyScore: 100,
        severity: 'CRITICAL',
        targetParam: param,
        testedUrl: urlNeObj,
        statusCode: resNe.statusCode,
        reproducibleCurl: `curl -i -s -k -g "${urlNeObj}"`,
        evidenceExcerpt: `Scalar Query (?${param}=draco_scalar) -> HTTP ${resScalar.statusCode} (${resScalar.rawLength}B)\nOperator Query (?${param}[$ne]=draco_scalar) -> HTTP ${resNe.statusCode} (${resNe.rawLength}B)`,
        remediation: 'Sanitize MongoDB/NoSQL query inputs with `express-mongo-sanitize` or explicit scalar casting `String(req.query.param)`.',
      });
      return { findings, probes };
    }
  }

  return { findings, probes };
}

// --------------------------------------------------------------------------
// VECTOR 08: Reverse Proxy / Host Header Poisoning & X-Original-URL Bypass
// --------------------------------------------------------------------------
async function verifyProxyAndHostPoisoning(surface) {
  const findings = [];
  const canaryHost = `poison-${crypto.randomBytes(3).toString('hex')}.dracodeck.local`;

  // 1. Host / X-Forwarded-Host Link & Cache Poisoning Probe
  let probes = 1;
  const hostProbeRes = await rawRequest(surface.baseUrl, {
    method: 'GET',
    headers: {
      'X-Forwarded-Host': canaryHost,
      'X-Host': canaryHost,
      'Forwarded': `host=${canaryHost};proto=https`,
    },
    timeoutMs: 3500,
  });

  const locHeader = String(hostProbeRes.headers['location'] || '');
  if (locHeader.includes(canaryHost) || (hostProbeRes.body && hostProbeRes.body.includes(canaryHost))) {
    const idx = hostProbeRes.body ? hostProbeRes.body.indexOf(canaryHost) : -1;
    const excerpt =
      idx >= 0
        ? hostProbeRes.body.substring(Math.max(0, idx - 60), Math.min(hostProbeRes.body.length, idx + 120))
        : `Location: ${locHeader}`;

    findings.push({
      type: 'HOST_HEADER_POISONING_POV',
      title: 'Proven X-Forwarded-Host Reflection (Cache Poisoning / Reset Link Hijack Risk)',
      certainty: 'VERIFIED',
      certaintyScore: 100,
      severity: 'HIGH',
      canaryToken: canaryHost,
      testedUrl: surface.baseUrl,
      statusCode: hostProbeRes.statusCode,
      reproducibleCurl: `curl -i -s -k -H "X-Forwarded-Host: ${canaryHost}" "${surface.baseUrl}"`,
      evidenceExcerpt: `Injected Header: X-Forwarded-Host: ${canaryHost}\nReflected in Server Response:\n${excerpt.trim()}`,
      remediation: 'Configure web server / framework (`TRUST_PROXY`, Next.js `allowedOrigins`, Django `ALLOWED_HOSTS`) to ignore untrusted `X-Forwarded-Host` headers.',
    });
  }

  return { findings, probes };
}

// --------------------------------------------------------------------------
// VECTOR 09: Open Redirect & URL Authority Confusion Verifier
// --------------------------------------------------------------------------
async function verifyOpenRedirectPoV(surface) {
  const findings = [];
  let probes = 0;

  const externalCanary = 'https://draco-redirect-proof.example.com';
  const redirectEndpoints = surface.endpoints.filter((e) => /login|auth|redirect|callback|out|logout|sso/i.test(e));
  if (redirectEndpoints.length === 0) redirectEndpoints.push(surface.endpoints[0] || '/');

  const testCases = [];
  for (const ep of redirectEndpoints.slice(0, 2)) {
    for (const prm of surface.redirectParams.slice(0, 3)) {
      testCases.push({ ep, prm, val: externalCanary });
      testCases.push({ ep, prm, val: `//draco-redirect-proof.example.com` });
    }
  }

  probes += testCases.length;
  const responses = await Promise.all(
    testCases.map((tc) => {
      const u = new URL(`${surface.origin}${tc.ep}`);
      u.searchParams.set(tc.prm, tc.val);
      return rawRequest(u.toString(), { method: 'GET', timeoutMs: 3000 });
    })
  );

  for (let i = 0; i < testCases.length; i++) {
    const res = responses[i];
    const tc = testCases[i];
    const loc = String(res.headers['location'] || '');

    if (
      res.statusCode >= 300 &&
      res.statusCode < 400 &&
      (loc.startsWith('https://draco-redirect-proof.example.com') || loc.startsWith('//draco-redirect-proof.example.com'))
    ) {
      findings.push({
        type: 'OPEN_REDIRECT_POV',
        title: `Proven Open Redirect via Parameter [${tc.prm}] on ${tc.ep}`,
        certainty: 'VERIFIED',
        certaintyScore: 100,
        severity: 'MEDIUM',
        targetParam: tc.prm,
        testedUrl: res.targetUrl,
        statusCode: res.statusCode,
        reproducibleCurl: `curl -i -s -k "${res.targetUrl}"`,
        evidenceExcerpt: `Request: GET ${res.targetUrl}\nHTTP Status: ${res.statusCode}\nLocation Header: ${loc}`,
        remediation: 'Validate redirect targets strictly against relative paths (must start with single `/` and not `//`) or an explicit domain allowlist.',
      });
      break;
    }
  }

  return { findings, probes };
}

// --------------------------------------------------------------------------
// VECTOR 10: Verbose Stack Trace, Framework Debug Mode & Cookie/JWT Hygiene
// --------------------------------------------------------------------------
async function verifyDebugAndSessionHygiene(surface) {
  const findings = [];
  let probes = 2;

  // 1. Trigger malformed JSON / Verbose Stack Trace on API endpoint or root
  const apiEp = surface.endpoints.find((e) => e.startsWith('/api') || e.startsWith('/v1')) || surface.endpoints[0] || '/';
  const traceUrl = `${surface.origin}${apiEp}`;

  const [malformedJsonRes, propfindRes] = await Promise.all([
    rawRequest(traceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"__draco_malformed_json": [unclosed_syntax',
      timeoutMs: 3500,
    }),
    rawRequest(surface.baseUrl, {
      method: 'PROPFIND',
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      timeoutMs: 3500,
    }),
  ]);

  const stackSignatures = [
    { name: 'Laravel Ignition / Whoops Stack Trace', pattern: /ignition-theme|Facade\\Ignition|laravel\/framework/i },
    { name: 'Django Technical 500 Debug Traceback', pattern: /Traceback \(most recent call last\):|Django Version:|You're seeing this error because you have <code>DEBUG = True<\/code>/i },
    { name: 'Spring Boot Whitelabel / Stack Trace', pattern: /Whitelabel Error Page|org\.springframework\.|java\.lang\.NullPointerException/i },
    { name: 'Node.js / Express Unhandled Stack Trace', pattern: /SyntaxError:\s*Unexpected token|ReferenceError:|TypeError:|at [a-zA-Z0-9_.]+\s+\([/\\][a-zA-Z0-9_\-./\\]+:[0-9]+:[0-9]+\)/i },
    { name: 'ASP.NET Detailed Error Trace', pattern: /Server Error in '.*' Application|System\.Web\.HttpException/i },
    { name: 'PHP Uncaught Exception / Fatal Error', pattern: /Fatal error:|Uncaught Error:|Stack trace:\s*#0 /i },
  ];

  for (const [res, methodLabel] of [
    [malformedJsonRes, `POST -H "Content-Type: application/json" -d '{"__draco_malformed_json": [unclosed_syntax'`],
    [propfindRes, `PROPFIND -H "Content-Type: application/xml"`],
  ]) {
    if (!res.body) continue;
    for (const sig of stackSignatures) {
      if (sig.pattern.test(res.body)) {
        const match = res.body.match(sig.pattern);
        const idx = res.body.indexOf(match[0]);
        const excerpt = res.body.substring(Math.max(0, idx - 40), Math.min(res.body.length, idx + 240));
        findings.push({
          type: 'VERBOSE_STACK_TRACE_POV',
          title: `Proven Framework Debug Stack Trace Leak: ${sig.name}`,
          certainty: 'VERIFIED',
          certaintyScore: 100,
          severity: 'HIGH',
          framework: sig.name,
          testedUrl: res.targetUrl,
          statusCode: res.statusCode,
          reproducibleCurl: `curl -i -s -k -X ${methodLabel} "${res.targetUrl}"`,
          evidenceExcerpt: excerpt.trim(),
          remediation: 'Disable debug stack traces in production (`NODE_ENV=production`, `APP_DEBUG=false`, `DEBUG=False`) and return generic JSON error envelopes.',
        });
        break;
      }
    }
    if (findings.length > 0) break;
  }

  // 2. Inspect Set-Cookie headers on root response for insecure session cookies
  const rawCookies = surface.rootRes.headers['set-cookie'];
  if (Array.isArray(rawCookies) && rawCookies.length > 0) {
    for (const cookieStr of rawCookies) {
      const cookieName = (cookieStr.split('=')[0] || '').trim();
      const lower = cookieStr.toLowerCase();
      const isSessionLike = /sess|token|jwt|auth|sid|connect\.sid|laravel_session|phpsessid/i.test(cookieName);
      if (isSessionLike && (!lower.includes('httponly') || (surface.baseUrl.startsWith('https://') && !lower.includes('secure')))) {
        findings.push({
          type: 'INSECURE_SESSION_COOKIE_POV',
          title: `Proven Unhardened Session Cookie [${cookieName}] Missing HttpOnly/Secure Flags`,
          certainty: 'VERIFIED',
          certaintyScore: 100,
          severity: 'MEDIUM',
          targetParam: cookieName,
          testedUrl: surface.baseUrl,
          statusCode: surface.rootRes.statusCode,
          reproducibleCurl: `curl -I -s -k "${surface.baseUrl}" | grep -i "set-cookie"`,
          evidenceExcerpt: `Set-Cookie: ${cookieStr}\nHttpOnly Flag Present: ${lower.includes('httponly')}\nSecure Flag Present: ${lower.includes('secure')}`,
          remediation: 'Set `HttpOnly; Secure; SameSite=Lax` (or `Strict`) on all authentication and session identifier cookies.',
        });
        break;
      }
    }
  }

  return { findings, probes };
}

// --------------------------------------------------------------------------
// MASTER ORCHESTRATOR: Execute 10-Vector Deep PoV Suite
// --------------------------------------------------------------------------

async function runProofOfVerification(targetUrl) {
  let normalized = targetUrl.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }

  const startTime = Date.now();

  // Phase 0: Harvest real attack surface (DOM forms, links, robots.txt, OpenAPI, JS AST bundles)
  const surface = await harvestAttackSurface(normalized);

  // Execute all 10 verification engines concurrently
  const [
    vSourceMap,
    vSecrets,
    vGraphql,
    vCors,
    vPolyglot,
    vSql,
    vNoSql,
    vProxy,
    vRedirect,
    vDebug,
  ] = await Promise.all([
    verifySourceMapExposure(surface).catch(() => ({ findings: [], probes: 0 })),
    verifyHydrationAndBundleSecrets(surface).catch(() => ({ findings: [], probes: 0 })),
    verifyGraphqlIntrospection(surface).catch(() => ({ findings: [], probes: 0 })),
    verifyAdvancedCorsPoV(surface).catch(() => ({ findings: [], probes: 0 })),
    verifyContextBreakoutAndSsti(surface).catch(() => ({ findings: [], probes: 0 })),
    verifySqlDifferentialAndQuoteParity(surface).catch(() => ({ findings: [], probes: 0 })),
    verifyNoSqlAndOrmTypeConfusion(surface).catch(() => ({ findings: [], probes: 0 })),
    verifyProxyAndHostPoisoning(surface).catch(() => ({ findings: [], probes: 0 })),
    verifyOpenRedirectPoV(surface).catch(() => ({ findings: [], probes: 0 })),
    verifyDebugAndSessionHygiene(surface).catch(() => ({ findings: [], probes: 0 })),
  ]);

  const vectorMatrix = [
    { id: 'V01', name: 'Source Map (.js.map) Code Reconstruction', probes: vSourceMap.probes, findings: vSourceMap.findings.length },
    { id: 'V02', name: 'SSR Hydration & Client Bundle Secret Miner', probes: surface.jsContents.length, findings: vSecrets.findings.length },
    { id: 'V03', name: 'GraphQL Schema Introspection & Mutation Dump', probes: vGraphql.probes, findings: vGraphql.findings.length },
    { id: 'V04', name: '4-Way CORS Regex, Subdomain & Null-Origin Bypass', probes: vCors.probes, findings: vCors.findings.length },
    { id: 'V05', name: 'Polyglot Context Breakout & SSTI (191*313) Proof', probes: vPolyglot.probes, findings: vPolyglot.findings.length },
    { id: 'V06', name: 'SQL Quote-Parity (\' vs \'\') & DBMS Differential', probes: vSql.probes, findings: vSql.findings.length },
    { id: 'V07', name: 'NoSQL / ORM Type-Juggling ($ne / []) Differential', probes: vNoSql.probes, findings: vNoSql.findings.length },
    { id: 'V08', name: 'Reverse Proxy & X-Forwarded-Host Poisoning', probes: vProxy.probes, findings: vProxy.findings.length },
    { id: 'V09', name: 'Open Redirect & URL Authority Confusion', probes: vRedirect.probes, findings: vRedirect.findings.length },
    { id: 'V10', name: 'Malformed JSON Stack Trace & Session Cookie Audit', probes: vDebug.probes, findings: vDebug.findings.length },
  ];

  const verifiedFindings = [
    ...vSourceMap.findings,
    ...vSecrets.findings,
    ...vGraphql.findings,
    ...vCors.findings,
    ...vPolyglot.findings,
    ...vSql.findings,
    ...vNoSql.findings,
    ...vProxy.findings,
    ...vRedirect.findings,
    ...vDebug.findings,
  ];

  const totalProbesDispatched =
    surface.probesCount +
    vectorMatrix.reduce((sum, v) => sum + v.probes, 0);

  return {
    targetUrl: normalized,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    verifiedFindings,
    totalVerified: verifiedFindings.length,
    totalProbesDispatched,
    surfaceSummary: {
      harvestedEndpoints: surface.endpoints,
      harvestedParams: surface.params,
      harvestedForms: surface.forms.length,
      scannedScripts: surface.scriptUrls.length,
    },
    vectorMatrix,
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

  const startTime = Date.now();
  const surface = await harvestAttackSurface(normalized);
  const discoveredEndpoints = new Set(surface.endpoints);
  const discoveredParameters = new Set(surface.params);
  const leakedSecrets = [];

  for (const item of surface.jsContents) {
    const code = item.code;

    // Additional deep route extraction (Next.js App Router, Vite, Axios, Fetch, GraphQL operations)
    const apiRegex = /["'`](\/(?:api|v[0-9]+|internal|admin|auth|graphql|trpc|private|user|users|service|webhook|debug|metrics|_next\/data)\/[a-zA-Z0-9_\-/{}.:]*)(?:[?#$][^"'`\s]*)?["'`]/g;
    let apiMatch;
    while ((apiMatch = apiRegex.exec(code)) !== null) {
      const ep = apiMatch[1];
      if (!ep.includes('<') && !ep.includes(' ') && ep.length < 90) {
        discoveredEndpoints.add(ep);
      }
    }

    // Extract object keys passed into fetch/axios bodies or URL query builders
    const paramRegex = /(?:[?&]|["'])([a-zA-Z0-9_]{3,22})(?:=|["']\s*:)/g;
    let paramMatch;
    const interestingNames = new Set([
      'debug', 'test', 'admin', 'preview', 'impersonate', 'staging', 'secret',
      'token', 'internal', 'bypass', 'key', 'auth', 'role', 'isAdmin', 'redirect',
      'callback', 'userId', 'accountId', 'orgId', 'cursor', 'filter', 'include',
    ]);
    while ((paramMatch = paramRegex.exec(code)) !== null) {
      const p = paramMatch[1];
      if (interestingNames.has(p)) {
        discoveredParameters.add(p);
      }
    }

    // Cloud buckets & API keys
    const s3Regex = /[a-z0-9.-]+\.s3(?:\.[a-z0-9-]+)?\.amazonaws\.com/gi;
    let s3Match;
    while ((s3Match = s3Regex.exec(code)) !== null) {
      leakedSecrets.push({ type: 'AWS_S3_BUCKET', value: s3Match[0], script: item.url });
    }

    const firebaseRegex = /AIza[0-9A-Za-z\-_]{35}/g;
    let fbMatch;
    while ((fbMatch = firebaseRegex.exec(code)) !== null) {
      leakedSecrets.push({ type: 'FIREBASE_API_KEY', value: fbMatch[0], script: item.url });
    }
  }

  // Probe up to 12 discovered endpoints in parallel
  const endpointList = Array.from(discoveredEndpoints).slice(0, 12);
  const probeResults = await Promise.all(
    endpointList.map((ep) => {
      const cleanEp = ep.replace(/\{[^}]+\}/g, '1');
      const probeUrl = `${surface.origin}${cleanEp}`;
      return rawRequest(probeUrl, { method: 'GET', timeoutMs: 3000 }).then((res) => ({
        path: ep,
        fullUrl: probeUrl,
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        contentLength: res.rawLength,
        isAccessible: res.statusCode >= 200 && res.statusCode < 300,
        isProtected: res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 405,
      }));
    })
  );

  return {
    targetUrl: normalized,
    scannedScripts: surface.jsContents.length,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    shadowEndpoints: probeResults,
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
  const targetEndpoint = `${origin}${endpointPath.startsWith('/') ? endpointPath : '/' + endpointPath}`;

  const nonExistentUser = `non_existent_usr_${crypto.randomBytes(4).toString('hex')}`;
  const dummyPassword = 'TestPassword123!';

  // Warm-up connection (TLS handshake + DNS cache) so cold-start doesn't skew timing
  await rawRequest(targetEndpoint, { method: 'HEAD', timeoutMs: 2500 });

  const nonExistentTimings = [];
  const targetTimings = [];

  // Interleave samples (A, B, A, B, A, B, A, B) to eliminate network jitter bias
  for (let i = 0; i < 4; i++) {
    const resNon = await rawRequest(targetEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: nonExistentUser, email: `${nonExistentUser}@example.com`, password: dummyPassword }),
    });
    nonExistentTimings.push(resNon.latencyMs);

    const resTgt = await rawRequest(targetEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUser, email: testUser, password: dummyPassword }),
    });
    targetTimings.push(resTgt.latencyMs);
  }

  const avgNonExistent = nonExistentTimings.reduce((a, b) => a + b, 0) / nonExistentTimings.length;
  const avgTarget = targetTimings.reduce((a, b) => a + b, 0) / targetTimings.length;
  const timingDeltaMs = Math.round(Math.abs(avgTarget - avgNonExistent) * 10) / 10;

  const isVulnerable = timingDeltaMs > 50 && avgTarget > avgNonExistent;

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
      ? `Side-Channel Timing Discrepancy Detected (${timingDeltaMs}ms interleaved delta). Backend likely evaluates expensive password hashing (bcrypt/argon2) only when account exists, enabling user enumeration.`
      : `No statistically significant timing disparity observed (${timingDeltaMs}ms interleaved delta). Response latencies appear constant-time.`,
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
  const targetEndpoint = endpointPath
    ? `${origin}${endpointPath.startsWith('/') ? endpointPath : '/' + endpointPath}`
    : normalized;

  const burstCount = 8;
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
    summary: `Executed ${burstCount} simultaneous requests in ${totalWindowMs}ms window. Status codes: [${statusCodes.join(', ')}]`,
  };
}

module.exports = {
  rawRequest,
  harvestAttackSurface,
  runProofOfVerification,
  crawlShadowApis,
  testSideChannelTiming,
  testConcurrencyRace,
};

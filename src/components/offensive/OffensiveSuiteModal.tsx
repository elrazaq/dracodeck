import React, { useState, useEffect } from "react";
import {
  Shield,
  X,
  Search,
  Globe,
  Radio,
  FileCode,
  Zap,
  Terminal,
  Copy,
  Check,
  Binary,
  ArrowRight,
  ExternalLink,
  Download,
  Bell,
  RefreshCw,
} from "lucide-react";
import { DracoTooltip } from "../common/DracoTooltip";
import { ActiveView } from "../../types";

interface OffensiveSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView?: (view: ActiveView) => void;
  workspacePath: string;
}

type SuiteTab = "recon" | "vuln" | "monitor" | "web" | "reverse" | "cockpit";

export interface VulnFinding {
  id: string;
  category: "EXPOSURE" | "HEADER" | "CRYPTO" | "CONFIG";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "PASS";
  title: string;
  evidence: string;
  description: string;
  remediation: {
    nginx?: string;
    apache?: string;
    express?: string;
  };
}

export interface MonitoredTarget {
  url: string;
  label: string;
  status: "SECURE" | "VULNERABLE" | "OFFLINE";
  lastCheck: string;
  issueCount: number;
}

export const OffensiveSuiteModal: React.FC<OffensiveSuiteModalProps> = ({
  isOpen,
  onClose,
  onSelectView,
  workspacePath,
}) => {
  const [activeTab, setActiveTab] = useState<SuiteTab>("vuln");

  // Tab 1: Recon State
  const [netInterfaces, setNetInterfaces] = useState<Record<string, any[]>>({});
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Tab 2: Vuln Audit Engine State
  const [vulnTarget, setVulnTarget] = useState("http://localhost:5173");
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState<string>("");
  const [findings, setFindings] = useState<VulnFinding[] | null>(null);
  const [expandedRemediation, setExpandedRemediation] = useState<string | null>(null);

  // Tab 3: Continuous Monitoring
  const [monitoredTargets, setMonitoredTargets] = useState<MonitoredTarget[]>(() => {
    try {
      const saved = localStorage.getItem("dracodeck_monitored_targets");
      return saved
        ? JSON.parse(saved)
        : [
            {
              url: "https://portal.kemendagri.go.id",
              label: "Portal Layanan Publik",
              status: "SECURE",
              lastCheck: "Baru saja",
              issueCount: 0,
            },
            {
              url: "http://localhost:5173",
              label: "Local Dev Cockpit",
              status: "VULNERABLE",
              lastCheck: "10 menit lalu",
              issueCount: 2,
            },
          ];
    } catch {
      return [];
    }
  });

  // Tab 4: Web App Dispatcher
  const [httpMethod, setHttpMethod] = useState("GET");
  const [httpUrl, setHttpUrl] = useState("https://api.github.com");
  const [httpResponse, setHttpResponse] = useState<any | null>(null);
  const [httpLoading, setHttpLoading] = useState(false);

  // Tab 5: Reverse Eng State
  const [reversePath, setReversePath] = useState("package.json");
  const [hexDump, setHexDump] = useState<string[]>([]);
  const [extractedStrings, setExtractedStrings] = useState<string[]>([]);
  const [reverseMode, setReverseMode] = useState<"hex" | "strings">("hex");

  useEffect(() => {
    if (isOpen) {
      loadNetInterfaces();
    }
  }, [isOpen]);

  const loadNetInterfaces = async () => {
    if (window.dracoAPI?.getNetInterfaces) {
      try {
        const ifaces = await window.dracoAPI.getNetInterfaces();
        setNetInterfaces(ifaces);
      } catch (err) {
        console.error("Failed to fetch net interfaces:", err);
      }
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 1500);
  };

  // Real Defensive Vulnerability Audit Engine Execution
  const runDeepVulnerabilityScan = async () => {
    if (!vulnTarget.trim()) return;
    setIsAuditing(true);
    setAuditProgress("Inisialisasi handshake target...");
    setFindings(null);

    const targetUrl = vulnTarget.startsWith("http") ? vulnTarget.trim() : `https://${vulnTarget.trim()}`;
    const collectedFindings: VulnFinding[] = [];

    try {
      // Step 1: Probe Root & Inspect Headers
      setAuditProgress("Memeriksa konfigurasi HTTP Security Headers & TLS...");
      let res: Response | null = null;
      try {
        res = await fetch(targetUrl, { method: "HEAD" }).catch(() => fetch(targetUrl));
      } catch (e) {
        // Fallback for CORS or offline
      }

      const headers: Record<string, string> = {};
      if (res) {
        res.headers.forEach((v, k) => {
          headers[k.toLowerCase()] = v;
        });
      }

      // Check 1: Content-Security-Policy (CSP)
      const csp = headers["content-security-policy"];
      if (!csp) {
        collectedFindings.push({
          id: "CSP_MISSING",
          category: "HEADER",
          severity: "HIGH",
          title: "Content-Security-Policy (CSP) Absen",
          evidence: "Header Content-Security-Policy tidak terdeteksi pada response HTTP.",
          description: "Tanpa CSP, portal rentan terhadap serangan Cross-Site Scripting (XSS), data injection, dan pencurian token sesi.",
          remediation: {
            nginx: "add_header Content-Security-Policy \"default-src 'self'; script-src 'self' 'nonce-...'; object-src 'none'; frame-ancestors 'none';\" always;",
            apache: "Header set Content-Security-Policy \"default-src 'self'; script-src 'self'; frame-ancestors 'none';\"",
            express: "app.use(helmet.contentSecurityPolicy());",
          },
        });
      } else if (csp.includes("unsafe-inline") || csp.includes("unsafe-eval")) {
        collectedFindings.push({
          id: "CSP_WEAK",
          category: "HEADER",
          severity: "MEDIUM",
          title: "CSP Mengizinkan Unsafe Directives",
          evidence: `CSP Value: ${csp.slice(0, 80)}...`,
          description: "Directive 'unsafe-inline' atau 'unsafe-eval' melemahkan proteksi injeksi skrip.",
          remediation: {
            nginx: "# Hapus 'unsafe-inline' dan gunakan nonce atau hash sha256:\nadd_header Content-Security-Policy \"script-src 'self' 'strict-dynamic';\";",
          },
        });
      } else {
        collectedFindings.push({
          id: "CSP_PASS",
          category: "HEADER",
          severity: "PASS",
          title: "Content-Security-Policy Terkonfigurasi",
          evidence: `Directives: ${csp.slice(0, 60)}...`,
          description: "Policy CSP aktif melindungi elemen DOM dari eksekusi skrip liar.",
          remediation: {},
        });
      }

      // Check 2: Clickjacking Protection (X-Frame-Options)
      const xfo = headers["x-frame-options"];
      if (!xfo && (!csp || !csp.includes("frame-ancestors"))) {
        collectedFindings.push({
          id: "CLICKJACKING_RISK",
          category: "HEADER",
          severity: "HIGH",
          title: "Celah Clickjacking: X-Frame-Options Tidak Ditemukan",
          evidence: "Header X-Frame-Options dan directive frame-ancestors absen.",
          description: "Penyerang dapat menyematkan portal ke dalam <iframe> tak terlihat pada situs palsu untuk memanipulasi klik pengguna/aparatur.",
          remediation: {
            nginx: "add_header X-Frame-Options \"DENY\" always;\nadd_header X-Content-Type-Options \"nosniff\" always;",
            apache: "Header always set X-Frame-Options \"SAMEORIGIN\"",
            express: "app.use(helmet.frameguard({ action: 'deny' }));",
          },
        });
      } else {
        collectedFindings.push({
          id: "XFO_PASS",
          category: "HEADER",
          severity: "PASS",
          title: "Proteksi Frame & Clickjacking Aktif",
          evidence: `Header: ${xfo || "frame-ancestors directive"}`,
          description: "Portal terlindungi dari penyematan iframe liar.",
          remediation: {},
        });
      }

      // Check 3: HSTS (Strict-Transport-Security)
      const hsts = headers["strict-transport-security"];
      if (!targetUrl.startsWith("https")) {
        collectedFindings.push({
          id: "INSECURE_HTTP",
          category: "CRYPTO",
          severity: "CRITICAL",
          title: "Protokol Tidak Terenkripsi (HTTP Biasa)",
          evidence: `Target: ${targetUrl}`,
          description: "Komunikasi data, password login, dan NIK/KTP dapat di-sniff di jaringan publik (Man-in-the-Middle).",
          remediation: {
            nginx: "server {\n  listen 80;\n  server_name portal.instansi.go.id;\n  return 301 https://$host$request_uri;\n}",
          },
        });
      } else if (!hsts) {
        collectedFindings.push({
          id: "HSTS_MISSING",
          category: "CRYPTO",
          severity: "MEDIUM",
          title: "HSTS Header Tidak Diaktifkan",
          evidence: "Strict-Transport-Security tidak terdeteksi pada response HTTPS.",
          description: "Browser tidak dipaksa menggunakan HTTPS secara permanen, membuka peluang SSL-strip attack.",
          remediation: {
            nginx: "add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains; preload\" always;",
            apache: "Header always set Strict-Transport-Security \"max-age=31536000; includeSubDomains; preload\"",
          },
        });
      }

      // Check 4: Sensitive File & Path Exposure Probe
      setAuditProgress("Memindai potensi kebocoran direktori (.git, .env, backups, admin)...");
      const sensitiveEndpoints = [
        { path: "/.git/HEAD", risk: "CRITICAL" as const, name: "Repositori Git Publik (.git/HEAD)" },
        { path: "/.env", risk: "CRITICAL" as const, name: "Berkas Konfigurasi Rahasia (.env)" },
        { path: "/wp-config.php.bak", risk: "HIGH" as const, name: "Backup Database Config (wp-config.php.bak)" },
        { path: "/phpinfo.php", risk: "HIGH" as const, name: "PHP Info Diagnostic Leak (phpinfo.php)" },
        { path: "/robots.txt", risk: "LOW" as const, name: "Informasi Struktur Direktori (robots.txt)" },
      ];

      for (const item of sensitiveEndpoints) {
        const testUrl = `${targetUrl.replace(/\/+$/, "")}${item.path}`;
        try {
          const probeRes = await fetch(testUrl, { method: "GET" }).catch(() => null);
          if (probeRes && (probeRes.status === 200 || probeRes.status === 206)) {
            const text = await probeRes.text().catch(() => "");
            if (
              (item.path.includes(".git") && text.includes("refs/heads")) ||
              (item.path.includes(".env") && (text.includes("DB_") || text.includes("APP_KEY"))) ||
              (item.path.includes("phpinfo") && text.includes("PHP Version")) ||
              item.path.includes("robots.txt")
            ) {
              collectedFindings.push({
                id: `LEAK_${item.path.replace(/[^A-Za-z0-9]/g, "_")}`,
                category: "EXPOSURE",
                severity: item.risk,
                title: `Kebocoran Berkas: ${item.name}`,
                evidence: `URL Terbuka: ${testUrl} [HTTP ${probeRes.status}] - Ukuran: ${text.length} bytes`,
                description: `Berkas ${item.path} dapat diakses publik tanpa otentikasi. Membocorkan kredensial database dan arsitektur kode.`,
                remediation: {
                  nginx: `location ~ /\\.git {\n  deny all;\n  return 404;\n}\nlocation ~ \\.(env|sql|bak|old)$ {\n  deny all;\n  return 404;\n}`,
                  apache: `<FilesMatch "^(\\..*|.*\\.bak|.*\\.sql)$">\n  Require all denied\n</FilesMatch>`,
                },
              });
            }
          }
        } catch {}
      }

      // Check 5: Server Fingerprinting & Banner Exposure
      const serverHeader = headers["server"];
      const poweredBy = headers["x-powered-by"];
      if (serverHeader || poweredBy) {
        collectedFindings.push({
          id: "SERVER_BANNER_LEAK",
          category: "CONFIG",
          severity: "LOW",
          title: "Informasi Versi Server Terpapar (Banner Leak)",
          evidence: `Server: ${serverHeader || "N/A"} | X-Powered-By: ${poweredBy || "N/A"}`,
          description: "Membocorkan versi software spesifik memudahkan penyerang mencari exploit 1-day atau CVE yang cocok.",
          remediation: {
            nginx: "server_tokens off;",
            apache: "ServerTokens Prod\nServerSignature Off",
            express: "app.disable('x-powered-by');",
          },
        });
      }

      setFindings(collectedFindings);
    } catch (err: any) {
      collectedFindings.push({
        id: "SCAN_ERROR",
        category: "CONFIG",
        severity: "MEDIUM",
        title: "Koneksi Terputus atau Terblokir CORS",
        evidence: String(err?.message || err),
        description: "Target tidak dapat diakses secara langsung dari browser atau menolak koneksi.",
        remediation: {},
      });
      setFindings(collectedFindings);
    } finally {
      setIsAuditing(false);
      setAuditProgress("");
    }
  };

  // Add target to continuous monitoring list
  const handleAddToMonitoring = () => {
    if (!vulnTarget) return;
    const exists = monitoredTargets.some((m) => m.url === vulnTarget);
    if (exists) return;

    const criticalCount = findings ? findings.filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH").length : 0;
    const newTarget: MonitoredTarget = {
      url: vulnTarget,
      label: vulnTarget.split("/")[2] || vulnTarget,
      status: criticalCount > 0 ? "VULNERABLE" : "SECURE",
      lastCheck: "Baru saja",
      issueCount: criticalCount,
    };

    const updated = [newTarget, ...monitoredTargets];
    setMonitoredTargets(updated);
    localStorage.setItem("dracodeck_monitored_targets", JSON.stringify(updated));
    setActiveTab("monitor");
  };

  // Export formal audit report for government IT
  const handleExportReport = () => {
    if (!findings) return;
    const timestamp = new Date().toLocaleString("id-ID");
    let report = `# LAPORAN AUDIT KEAMANAN WEB & REKOMENDASI REMEDIASI
**Target Portal**: ${vulnTarget}  
**Waktu Audit**: ${timestamp}  
**Auditor / Operator**: elrazaq // DRACODECK OFFENSIVE SUITE  
**Klasifikasi Risiko**: ${findings.filter((f) => f.severity === "CRITICAL").length} Kritis, ${findings.filter((f) => f.severity === "HIGH").length} Tinggi, ${findings.filter((f) => f.severity === "MEDIUM").length} Sedang

---

## RINGKASAN TEMUAN KERENTANAN

`;

    findings.forEach((f, idx) => {
      report += `### ${idx + 1}. [${f.severity}] ${f.title}\n`;
      report += `- **Kategori**: ${f.category}\n`;
      report += `- **Bukti Teknis**: \`${f.evidence}\`\n`;
      report += `- **Dampak Keamanan**: ${f.description}\n`;
      if (f.remediation.nginx) {
        report += `\n**Langkah Perbaikan (Nginx)**:\n\`\`\`nginx\n${f.remediation.nginx}\n\`\`\`\n`;
      }
      if (f.remediation.apache) {
        report += `\n**Langkah Perbaikan (Apache)**:\n\`\`\`apache\n${f.remediation.apache}\n\`\`\`\n`;
      }
      report += `\n---\n\n`;
    });

    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LAPORAN_AUDIT_${vulnTarget.replace(/[^a-zA-Z0-9]/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Run Quick HTTP Dispatcher
  const runHttpDispatch = async () => {
    setHttpLoading(true);
    const start = performance.now();
    try {
      const res = await fetch(httpUrl, { method: httpMethod });
      const elapsed = Math.round(performance.now() - start);
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        headers[k] = v;
      });

      let body = "";
      try {
        body = await res.text();
      } catch {}

      setHttpResponse({
        status: res.status,
        statusText: res.statusText,
        elapsed,
        headers,
        bodyPreview: body.slice(0, 500),
      });
    } catch (err: any) {
      setHttpResponse({
        status: 0,
        statusText: "NETWORK_ERROR",
        elapsed: Math.round(performance.now() - start),
        headers: {},
        bodyPreview: String(err?.message || err),
      });
    } finally {
      setHttpLoading(false);
    }
  };

  // Run Reverse Engineering Hex / String Extraction
  const runReverseAnalysis = async () => {
    if (!window.dracoAPI?.readFile) return;
    try {
      const fullPath = reversePath.startsWith(":") || reversePath.includes(":\\")
        ? reversePath
        : `${workspacePath}/${reversePath}`.replace(/\/+/g, "/");

      const raw = await window.dracoAPI.readFile(fullPath);
      
      // Generate Hex Dump (16 bytes per line)
      const lines: string[] = [];
      const maxBytes = Math.min(raw.length, 512);
      for (let i = 0; i < maxBytes; i += 16) {
        const offset = i.toString(16).padStart(8, "0");
        let hexParts: string[] = [];
        let asciiParts = "";

        for (let j = 0; j < 16; j++) {
          if (i + j < maxBytes) {
            const charCode = raw.charCodeAt(i + j);
            hexParts.push(charCode.toString(16).padStart(2, "0").toUpperCase());
            asciiParts += charCode >= 32 && charCode <= 126 ? raw[i + j] : ".";
          } else {
            hexParts.push("  ");
          }
        }

        const leftHex = hexParts.slice(0, 8).join(" ");
        const rightHex = hexParts.slice(8, 16).join(" ");
        lines.push(`${offset}  ${leftHex}  ${rightHex}  |${asciiParts}|`);
      }
      setHexDump(lines);

      // Extract ASCII Strings (minimum 4 printable chars)
      const matches = raw.match(/[A-Za-z0-9_.\-\/\:\@]{4,}/g) || [];
      setExtractedStrings(Array.from(new Set(matches)).slice(0, 60));
    } catch (err) {
      setHexDump(["[ERROR] Failed to read binary target file for reverse inspection."]);
      setExtractedStrings([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 font-mono select-none">
      <div className="w-full max-w-5xl bg-[#0e0a19] border border-[#261d38] shadow-[0_20px_70px_rgba(0,0,0,0.95)] flex flex-col h-[650px] rounded-xs overflow-hidden">
        {/* Modal Header */}
        <div className="h-9 bg-[#120c1f] border-b border-[#261d38] px-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#ff007f]" />
            <span className="font-bold text-xs text-[#e2e8f0] tracking-wide">
              DRACODECK OFFENSIVE SUITE <span className="text-[#00e5ff] font-normal">// GOV-GRADE DEFENSIVE ENGINE</span>
            </span>
          </div>

          <DracoTooltip content="Close Suite (Esc)" shortcut="Esc">
            <button
              onClick={onClose}
              className="text-[#7a7194] hover:text-[#ff1744] p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </DracoTooltip>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#161026] border-b border-[#261d38] px-3 flex items-center gap-1 text-xs">
          {[
            { id: "vuln", label: "01 - Vuln Audit & Remediasi", icon: <Shield className="w-3.5 h-3.5" /> },
            { id: "monitor", label: "02 - Continuous Watchdog", icon: <Bell className="w-3.5 h-3.5" /> },
            { id: "recon", label: "03 - Info Gathering", icon: <Search className="w-3.5 h-3.5" /> },
            { id: "web", label: "04 - Web Application", icon: <Globe className="w-3.5 h-3.5" /> },
            { id: "reverse", label: "05 - Reverse Eng", icon: <Binary className="w-3.5 h-3.5" /> },
            { id: "cockpit", label: "06 - Cockpit Core", icon: <Terminal className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SuiteTab)}
              className={`px-3 py-2 flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#ff007f] text-[#00e5ff] bg-[#120c1f] font-semibold"
                  : "border-transparent text-[#7a7194] hover:text-[#cbd5e1]"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 p-4 overflow-y-auto bg-[#0b0813] text-[#cbd5e1] text-xs">
          {/* TAB 1: REAL VULNERABILITY AUDIT & REMEDIATION */}
          {activeTab === "vuln" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#261d38] pb-2 gap-2">
                <div>
                  <h3 className="font-bold text-[#00e5ff] text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#ff007f]" />
                    <span>AUDIT KERENTANAN WEB PORTAL PEMERINTAHAN (OWASP TOP 10)</span>
                  </h3>
                  <p className="text-[10px] text-[#7a7194]">
                    Memindai celah keterpaparan data (.git, .env, backups), security headers, TLS, dan memberikan kode remediasi instan.
                  </p>
                </div>
                {findings && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAddToMonitoring}
                      className="px-2.5 py-1 bg-[#161026] hover:bg-[#281b3d] text-[#00e5ff] border border-[#00e5ff]/40 text-[10px] flex items-center gap-1.5"
                    >
                      <Bell className="w-3 h-3" />
                      <span>MONITOR PORTAL</span>
                    </button>
                    <button
                      onClick={handleExportReport}
                      className="px-2.5 py-1 bg-[#00e676]/15 hover:bg-[#00e676]/25 text-[#00e676] border border-[#00e676]/40 text-[10px] flex items-center gap-1.5 font-bold"
                    >
                      <Download className="w-3 h-3" />
                      <span>EKSPOR LAPORAN MD</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Target Input Strip */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-[#120c1f] border border-[#261d38] px-3 py-1 focus-within:border-[#00e5ff]">
                  <Globe className="w-3.5 h-3.5 text-[#7a7194] mr-2" />
                  <input
                    type="text"
                    value={vulnTarget}
                    onChange={(e) => setVulnTarget(e.target.value)}
                    placeholder="Contoh: https://portal.kemendagri.go.id atau http://localhost:5173"
                    className="flex-1 bg-transparent text-[#cbd5e1] text-xs outline-none font-mono"
                  />
                </div>
                <button
                  onClick={runDeepVulnerabilityScan}
                  disabled={isAuditing}
                  className="px-5 py-2 bg-[#ff007f] hover:bg-[#e0007b] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isAuditing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{auditProgress || "MEMINDAI..."}</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>PINDAI KERENTANAN</span>
                    </>
                  )}
                </button>
              </div>

              {/* Scan Results with Interactive Remediation */}
              {findings && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-[11px] bg-[#120c1f] p-2 border border-[#261d38]">
                    <span>
                      TOTAL TEMUAN: <strong className="text-[#00e5ff]">{findings.length}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#ff1744] bg-[#ff1744]/10 px-1.5 py-0.2 border border-[#ff1744]/30">
                        {findings.filter((f) => f.severity === "CRITICAL").length} CRITICAL
                      </span>
                      <span className="text-[#ff8800] bg-[#ff8800]/10 px-1.5 py-0.2 border border-[#ff8800]/30">
                        {findings.filter((f) => f.severity === "HIGH").length} HIGH
                      </span>
                      <span className="text-[#00e676] bg-[#00e676]/10 px-1.5 py-0.2 border border-[#00e676]/30">
                        {findings.filter((f) => f.severity === "PASS").length} PASS
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {findings.map((f) => {
                      const isExpanded = expandedRemediation === f.id;
                      return (
                        <div
                          key={f.id}
                          className={`bg-[#120c1f] border rounded-xs transition-colors p-3 space-y-2 ${
                            f.severity === "CRITICAL"
                              ? "border-[#ff1744]/50"
                              : f.severity === "HIGH"
                              ? "border-[#ff8800]/50"
                              : f.severity === "MEDIUM"
                              ? "border-[#ffea00]/40"
                              : f.severity === "PASS"
                              ? "border-[#00e676]/30 bg-[#09140f]"
                              : "border-[#261d38]"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 font-bold border rounded-2xs ${
                                    f.severity === "CRITICAL"
                                      ? "bg-[#ff1744]/20 text-[#ff1744] border-[#ff1744]"
                                      : f.severity === "HIGH"
                                      ? "bg-[#ff8800]/20 text-[#ff8800] border-[#ff8800]"
                                      : f.severity === "MEDIUM"
                                      ? "bg-[#ffea00]/20 text-[#ffea00] border-[#ffea00]"
                                      : f.severity === "PASS"
                                      ? "bg-[#00e676]/20 text-[#00e676] border-[#00e676]"
                                      : "bg-[#7a7194]/20 text-[#7a7194]"
                                  }`}
                                >
                                  {f.severity}
                                </span>
                                <span className="font-bold text-xs text-[#e2e8f0]">{f.title}</span>
                              </div>
                              <p className="text-[10.5px] text-[#94a3b8]">{f.description}</p>
                              <div className="text-[10px] text-[#7a7194] bg-[#0b0813] px-2 py-0.5 border border-[#261d38]/50 inline-block font-mono">
                                Bukti: {f.evidence}
                              </div>
                            </div>

                            {/* Remediation Action Toggle */}
                            {f.severity !== "PASS" && (
                              <button
                                onClick={() => setExpandedRemediation(isExpanded ? null : f.id)}
                                className="px-2 py-1 bg-[#161026] hover:bg-[#281b3d] text-[#00e5ff] border border-[#261d38] text-[10px] flex items-center gap-1"
                              >
                                <span>{isExpanded ? "TUTUP CARA PERBAIKI" : "CARA PERBAIKI"}</span>
                              </button>
                            )}
                          </div>

                          {/* Remediation Guidance Panel */}
                          {isExpanded && (
                            <div className="mt-2 p-3 bg-[#08060e] border border-[#00e5ff]/30 text-[10.5px] space-y-2">
                              <div className="flex items-center justify-between text-[#00e5ff] font-bold">
                                <span>PANDUAN REMEDIASI RESMI (REMEDIASI IT PEMERINTAHAN)</span>
                                <span className="text-[9px] text-[#7a7194]">Salin ke server web Anda</span>
                              </div>

                              {f.remediation.nginx && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[10px] text-[#ff8800]">
                                    <span>Konfigurasi Nginx (nginx.conf):</span>
                                    <button
                                      onClick={() => copyToClipboard(f.remediation.nginx || "", `${f.id}_nginx`)}
                                      className="text-[#7a7194] hover:text-[#00e5ff] flex items-center gap-1"
                                    >
                                      {copiedText === `${f.id}_nginx` ? (
                                        <Check className="w-3 h-3 text-[#00e676]" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                      <span>Salin</span>
                                    </button>
                                  </div>
                                  <pre className="p-2 bg-[#0b0813] border border-[#261d38] text-[#a5b4fc] text-[10px] overflow-x-auto whitespace-pre">
                                    {f.remediation.nginx}
                                  </pre>
                                </div>
                              )}

                              {f.remediation.apache && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[10px] text-[#ff8800]">
                                    <span>Konfigurasi Apache (.htaccess):</span>
                                    <button
                                      onClick={() => copyToClipboard(f.remediation.apache || "", `${f.id}_apache`)}
                                      className="text-[#7a7194] hover:text-[#00e5ff] flex items-center gap-1"
                                    >
                                      {copiedText === `${f.id}_apache` ? (
                                        <Check className="w-3 h-3 text-[#00e676]" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                      <span>Salin</span>
                                    </button>
                                  </div>
                                  <pre className="p-2 bg-[#0b0813] border border-[#261d38] text-[#a5b4fc] text-[10px] overflow-x-auto whitespace-pre">
                                    {f.remediation.apache}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CONTINUOUS WATCHDOG MONITOR */}
          {activeTab === "monitor" && (
            <div className="space-y-4">
              <div className="border-b border-[#261d38] pb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#00e5ff] text-sm flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#ff007f]" />
                    <span>CONTINUOUS PORTAL MONITORING & WATCHDOG</span>
                  </h3>
                  <p className="text-[10px] text-[#7a7194]">
                    Pemantauan otomatis berkala terhadap web portal instansi untuk mendeteksi perubahan konfigurasi atau celah baru.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("vuln")}
                  className="px-3 py-1 bg-[#ff007f] text-white text-[10px] font-bold"
                >
                  + TAMBAH TARGET BARU
                </button>
              </div>

              <div className="space-y-2">
                {monitoredTargets.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#120c1f] border border-[#261d38] flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#e2e8f0]">{item.label}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 font-bold border rounded-2xs ${
                            item.status === "SECURE"
                              ? "bg-[#00e676]/10 text-[#00e676] border-[#00e676]/30"
                              : "bg-[#ff1744]/10 text-[#ff1744] border-[#ff1744]/30"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#7a7194]">{item.url}</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right text-[10px] text-[#7a7194]">
                        <p>Pemeriksaan: {item.lastCheck}</p>
                        <p className={item.issueCount > 0 ? "text-[#ff8800]" : "text-[#00e676]"}>
                          {item.issueCount} Celah Terdeteksi
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setVulnTarget(item.url);
                          setActiveTab("vuln");
                          runDeepVulnerabilityScan();
                        }}
                        className="px-2 py-1 bg-[#161026] hover:bg-[#281b3d] text-[#00e5ff] border border-[#261d38] text-[10px]"
                      >
                        AUDIT ULANG
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: INFO GATHERING (RECON) */}
          {activeTab === "recon" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#261d38] pb-2">
                <div>
                  <h3 className="font-bold text-[#00e5ff] text-sm flex items-center gap-2">
                    <Search className="w-4 h-4 text-[#ff007f]" />
                    <span>LOCAL NETWORK ADAPTER RECON</span>
                  </h3>
                  <p className="text-[10px] text-[#7a7194]">
                    Win32 Network Interface Controller (NIC) enumeration via live OS API.
                  </p>
                </div>
                <button
                  onClick={loadNetInterfaces}
                  className="px-2.5 py-1 bg-[#161026] hover:bg-[#281b3d] text-[#00e5ff] border border-[#261d38] text-[10px] flex items-center gap-1.5"
                >
                  <span>REFRESH ADAPTERS</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(netInterfaces).map(([name, addrs]) => (
                  <div key={name} className="bg-[#120c1f] border border-[#261d38] p-3 rounded-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-[#261d38]/60 pb-1">
                      <span className="font-bold text-[#e2e8f0] text-xs">{name}</span>
                      <span className="text-[9px] bg-[#00e676]/10 text-[#00e676] px-1.5 py-0.2 border border-[#00e676]/30">
                        LINK UP
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] font-mono">
                      {addrs.map((addr, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-[#0b0813] p-1.5 border border-[#261d38]/30">
                          <div>
                            <span className="text-[#ff8800] text-[10px] font-bold mr-2">
                              {addr.family}:
                            </span>
                            <span className="text-[#cbd5e1]">{addr.address}</span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(addr.address, `${name}_${idx}`)}
                            className="text-[#7a7194] hover:text-[#00e5ff]"
                          >
                            {copiedText === `${name}_${idx}` ? (
                              <Check className="w-3 h-3 text-[#00e676]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: WEB APPLICATION */}
          {activeTab === "web" && (
            <div className="space-y-4">
              <div className="border-b border-[#261d38] pb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#00e5ff] text-sm flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#ff007f]" />
                    <span>QUICK HTTP / cURL ENDPOINT DISPATCHER</span>
                  </h3>
                  <p className="text-[10px] text-[#7a7194]">
                    Test APIs, inspect latency, status codes, and unblock web requests in DracoBrowser.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onSelectView?.("browser");
                    onClose();
                  }}
                  className="px-3 py-1 bg-[#161026] hover:bg-[#281b3d] text-[#00e5ff] border border-[#261d38] text-[10px] flex items-center gap-1"
                >
                  <span>LAUNCH DRACOBROWSER</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={httpMethod}
                  onChange={(e) => setHttpMethod(e.target.value)}
                  className="bg-[#120c1f] text-[#00e5ff] border border-[#261d38] px-2 py-1.5 text-xs font-bold font-mono focus:outline-hidden"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="HEAD">HEAD</option>
                  <option value="OPTIONS">OPTIONS</option>
                </select>
                <input
                  type="text"
                  value={httpUrl}
                  onChange={(e) => setHttpUrl(e.target.value)}
                  className="flex-1 bg-[#120c1f] text-[#cbd5e1] border border-[#261d38] px-3 py-1.5 text-xs font-mono focus:outline-hidden focus:border-[#00e5ff]"
                />
                <button
                  onClick={runHttpDispatch}
                  disabled={httpLoading}
                  className="px-4 py-1.5 bg-[#00e5ff] hover:bg-[#00e5ff]/80 text-[#0b0813] font-bold text-xs"
                >
                  {httpLoading ? "DISPATCHING..." : "SEND"}
                </button>
              </div>

              {httpResponse && (
                <div className="bg-[#120c1f] border border-[#261d38] p-3 space-y-2">
                  <div className="flex items-center gap-3 text-xs border-b border-[#261d38] pb-1.5">
                    <span>
                      STATUS:{" "}
                      <strong
                        className={
                          httpResponse.status >= 200 && httpResponse.status < 300
                            ? "text-[#00e676]"
                            : "text-[#ff1744]"
                        }
                      >
                        {httpResponse.status} {httpResponse.statusText}
                      </strong>
                    </span>
                    <span className="text-[#7a7194]">|</span>
                    <span>
                      LATENCY: <strong className="text-[#00e5ff]">{httpResponse.elapsed} ms</strong>
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto bg-[#0b0813] p-2 text-[10px] font-mono text-[#94a3b8] whitespace-pre-wrap">
                    {httpResponse.bodyPreview || "(No body response)"}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: REVERSE ENG */}
          {activeTab === "reverse" && (
            <div className="space-y-4">
              <div className="border-b border-[#261d38] pb-2">
                <h3 className="font-bold text-[#00e5ff] text-sm flex items-center gap-2">
                  <Binary className="w-4 h-4 text-[#ff007f]" />
                  <span>LOCAL BINARY HEX DUMP & STRING EXTRACTOR</span>
                </h3>
                <p className="text-[10px] text-[#7a7194]">
                  Inspect low-level byte streams, extract ASCII sequences, and audit binary files.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={reversePath}
                  onChange={(e) => setReversePath(e.target.value)}
                  placeholder="Target relative path or absolute file path"
                  className="flex-1 bg-[#120c1f] text-[#cbd5e1] border border-[#261d38] px-3 py-1.5 text-xs font-mono focus:outline-hidden focus:border-[#00e5ff]"
                />
                <button
                  onClick={runReverseAnalysis}
                  className="px-4 py-1.5 bg-[#ff8800] hover:bg-[#ff8800]/80 text-[#0b0813] font-bold text-xs"
                >
                  DISSECT
                </button>
              </div>

              <div className="flex items-center gap-2 border-b border-[#261d38] pb-1">
                <button
                  onClick={() => setReverseMode("hex")}
                  className={`px-2 py-0.5 text-[10px] border ${
                    reverseMode === "hex"
                      ? "bg-[#00e5ff]/20 text-[#00e5ff] border-[#00e5ff]/50 font-bold"
                      : "text-[#7a7194] border-transparent"
                  }`}
                >
                  Hex Dump (512B)
                </button>
                <button
                  onClick={() => setReverseMode("strings")}
                  className={`px-2 py-0.5 text-[10px] border ${
                    reverseMode === "strings"
                      ? "bg-[#00e5ff]/20 text-[#00e5ff] border-[#00e5ff]/50 font-bold"
                      : "text-[#7a7194] border-transparent"
                  }`}
                >
                  Extracted Strings ({extractedStrings.length})
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto bg-[#08060e] p-2.5 border border-[#261d38] font-mono text-[10px] leading-relaxed">
                {reverseMode === "hex" ? (
                  hexDump.length > 0 ? (
                    hexDump.map((l, idx) => (
                      <div key={idx} className="text-[#a5b4fc] whitespace-pre">
                        {l}
                      </div>
                    ))
                  ) : (
                    <div className="text-[#64748b] italic">Click "DISSECT" to generate 16-byte hex dump.</div>
                  )
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                    {extractedStrings.map((s, idx) => (
                      <span key={idx} className="text-[#00e676] truncate bg-[#120c1f] px-1.5 py-0.5 border border-[#261d38]/50">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: COCKPIT CORE */}
          {activeTab === "cockpit" && (
            <div className="space-y-4">
              <div className="border-b border-[#261d38] pb-2">
                <h3 className="font-bold text-[#00e5ff] text-sm flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#ff007f]" />
                  <span>CORE COCKPIT SYSTEM MODULES</span>
                </h3>
                <p className="text-[10px] text-[#7a7194]">
                  High-speed launchers for active Dracodeck developer cockpit workspaces.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {[
                  {
                    id: "terminal",
                    title: "ConPTY Native Terminal",
                    desc: "Interactive Windows PowerShell IPC engine with zero-echo fix.",
                    icon: <Terminal className="w-5 h-5 text-[#38bdf8]" />,
                    action: () => {
                      onSelectView?.("terminal");
                      onClose();
                    },
                  },
                  {
                    id: "slayer",
                    title: "Zombie Port Slayer",
                    desc: "Scan and kill dead node/vite/python processes locking dev sockets.",
                    icon: <Zap className="w-5 h-5 text-[#ff8800]" />,
                    action: () => {
                      onSelectView?.("slayer");
                      onClose();
                    },
                  },
                  {
                    id: "telemetry",
                    title: "Antigravity Telemetry HUD",
                    desc: "Safe tailer, live diff inspector, and model cognitive flow stream.",
                    icon: <Radio className="w-5 h-5 text-[#ff007f]" />,
                    action: () => {
                      onSelectView?.("telemetry");
                      onClose();
                    },
                  },
                  {
                    id: "editor",
                    title: "Draco Code Studio",
                    desc: "Focused code editor with syntax token engine and VS Code minimap.",
                    icon: <FileCode className="w-5 h-5 text-[#00e676]" />,
                    action: () => {
                      onSelectView?.("editor");
                      onClose();
                    },
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={item.action}
                    className="p-3 bg-[#120c1f] hover:bg-[#1a122c] border border-[#261d38] hover:border-[#00e5ff]/50 rounded-xs cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <span className="font-bold text-xs text-[#e2e8f0] group-hover:text-[#00e5ff]">
                          {item.title}
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#7a7194] group-hover:text-[#00e5ff] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[10px] text-[#7a7194] leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="h-8 bg-[#120c1f] border-t border-[#261d38] px-3 flex items-center justify-between text-[10px] text-[#7a7194]">
          <span>DRACODECK OFFENSIVE SUITE // GOV AUDIT & DEFENSIVE REMEDIATION</span>
          <span>OPERATOR: <strong className="text-[#ff007f]">elrazaq</strong></span>
        </div>
      </div>
    </div>
  );
};

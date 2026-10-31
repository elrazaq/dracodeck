import React, { useState } from "react";
import {
  Shield,
  Activity,
  Lock,
  Globe,
  Radio,
  Download,
  Copy,
  Check,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { DracoTooltip } from "../common/DracoTooltip";
import { ActiveView, VulnFinding, CertInfo } from "../../types";

interface OffensiveWorkstationProps {
  workspacePath: string;
  onSelectView?: (view: ActiveView) => void;
}

type WorkstationTab = "vuln" | "cert" | "recon" | "watchdog";

export const OffensiveWorkstation: React.FC<OffensiveWorkstationProps> = ({
  workspacePath: _workspacePath,
  onSelectView,
}) => {
  const [activeTab, setActiveTab] = useState<WorkstationTab>("vuln");
  const [targetUrl, setTargetUrl] = useState("http://localhost:5173");
  const [isAuditing, setIsAuditing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<VulnFinding | null>(null);

  // Real scan state
  const [scanResult, setScanResult] = useState<{
    targetUrl: string;
    timestamp: string;
    durationMs: number;
    certInfo?: CertInfo | null;
    findings: VulnFinding[];
    summary: { critical: number; high: number; medium: number; low: number; pass: number };
  } | null>(null);

  // Watchdog state
  const [watchdogTargets, setWatchdogTargets] = useState<Array<{ url: string; label: string; status: string; lastCheck: string }>>([
    { url: "https://www.kali.org", label: "Kali Linux Official", status: "SECURE", lastCheck: "Live Ready" },
    { url: "http://localhost:5173", label: "Dracodeck Dev Cockpit", status: "MONITORED", lastCheck: "Live Ready" },
  ]);
  const [newWatchdogUrl, setNewWatchdogUrl] = useState("");

  const handleRunAudit = async () => {
    if (!targetUrl.trim() || isAuditing) return;
    setIsAuditing(true);
    setSelectedFinding(null);

    try {
      if (window.dracoAPI?.vulnScan) {
        const result = await window.dracoAPI.vulnScan(targetUrl.trim());
        setScanResult(result);
        if (result.findings && result.findings.length > 0) {
          setSelectedFinding(result.findings[0]);
        }
      } else {
        // Fallback info if API missing
        setScanResult({
          targetUrl,
          timestamp: new Date().toISOString(),
          durationMs: 10,
          findings: [{
            id: "API_UNAVAILABLE",
            category: "SYSTEM",
            severity: "MEDIUM",
            title: "DracoAPI Vuln Scanner Unavailable",
            evidence: "window.dracoAPI.vulnScan not registered",
            description: "Main process IPC handler is initializing.",
            remediation: "Restart Dracodeck to bind IPC channel.",
          }],
          summary: { critical: 0, high: 0, medium: 1, low: 0, pass: 0 },
        });
      }
    } catch (err: any) {
      console.error("Audit error:", err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddWatchdog = () => {
    if (!newWatchdogUrl.trim()) return;
    const clean = newWatchdogUrl.trim();
    if (!watchdogTargets.some((w) => w.url === clean)) {
      setWatchdogTargets([
        ...watchdogTargets,
        { url: clean, label: clean.replace(/^https?:\/\//, ""), status: "MONITORED", lastCheck: "Just added" },
      ]);
    }
    setNewWatchdogUrl("");
  };

  const handleExportReport = () => {
    if (!scanResult) return;
    const timestamp = new Date().toLocaleString("id-ID");
    let md = `# LAPORAN AUDIT KEAMANAN WEB & REKOMENDASI REMEDIASI
**Target**: ${scanResult.targetUrl}  
**Waktu Audit**: ${timestamp}  
**Operator / Auditor**: elrazaq // DRACODECK OFFENSIVE SUITE  
**Durasi Pemindaian**: ${scanResult.durationMs}ms  
**Klasifikasi Temuan**: ${scanResult.summary.critical} Kritis, ${scanResult.summary.high} Tinggi, ${scanResult.summary.medium} Sedang, ${scanResult.summary.low} Rendah, ${scanResult.summary.pass} Pass  

---

## RINGKASAN TEMUAN KERENTANAN

`;

    scanResult.findings.forEach((f, idx) => {
      md += `### ${idx + 1}. [${f.severity}] ${f.title}\n`;
      if (f.cwe) md += `- **CWE**: ${f.cwe}\n`;
      md += `- **Kategori**: ${f.category}\n`;
      md += `- **Bukti Teknis**: \`${f.evidence}\`\n`;
      md += `- **Dampak Keamanan**: ${f.description}\n`;
      md += `\n**Langkah Remediasi**:\n\`\`\`\n${f.remediation}\n\`\`\`\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <span className="bg-[#ff1744]/15 border border-[#ff1744] text-[#ff1744] px-1.5 py-0.5 text-[9px] font-bold">CRITICAL</span>;
      case "HIGH":
        return <span className="bg-[#ff8800]/15 border border-[#ff8800] text-[#ff8800] px-1.5 py-0.5 text-[9px] font-bold">HIGH</span>;
      case "MEDIUM":
        return <span className="bg-[#ffd600]/15 border border-[#ffd600] text-[#ffd600] px-1.5 py-0.5 text-[9px] font-bold">MEDIUM</span>;
      case "LOW":
        return <span className="bg-[#00e5ff]/15 border border-[#00e5ff] text-[#00e5ff] px-1.5 py-0.5 text-[9px] font-bold">LOW</span>;
      case "PASS":
        return <span className="bg-[#00e676]/15 border border-[#00e676] text-[#00e676] px-1.5 py-0.5 text-[9px] font-bold">PASS</span>;
      default:
        return <span className="bg-[#7a7194]/15 border border-[#7a7194] text-[#7a7194] px-1.5 py-0.5 text-[9px] font-bold">INFO</span>;
    }
  };

  return (
    <div className="h-full w-full bg-[#0b0813] flex flex-col font-mono text-xs overflow-hidden select-none">
      {/* Top Workstation Header Bar */}
      <div className="h-10 bg-[#120c1f] border-b border-[#261d38] px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[#ff007f]">
            <Shield className="w-4 h-4 text-[#ff007f]" />
            <span className="font-bold tracking-wider text-[#e2e8f0] text-sm">
              DRACODECK // OFFENSIVE SECURITY WORKSTATION
            </span>
          </div>
          <span className="text-[#261d38]">|</span>
          <span className="text-[10px] text-[#7a7194]">GOV-GRADE DEFENSIVE VULNERABILITY AUDITOR</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {scanResult && (
            <DracoTooltip content="Export Official Government Audit Report (Markdown)" position="bottom" accent="cyan">
              <button
                onClick={handleExportReport}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#161026] hover:bg-[#281b3d] text-[#00e5ff] border border-[#261d38] hover:border-[#00e5ff]/50 font-bold transition-colors cursor-pointer text-[11px]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>EXPORT REPORT</span>
              </button>
            </DracoTooltip>
          )}

          <DracoTooltip content="Open Live ConPTY Terminal" position="bottom" accent="pink">
            <button
              onClick={() => onSelectView?.("terminal")}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#161026] hover:bg-[#281b3d] text-[#ff007f] border border-[#261d38] font-bold transition-colors cursor-pointer text-[11px]"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>CONPTY</span>
            </button>
          </DracoTooltip>
        </div>
      </div>

      {/* Target Omnibar & Scope Ribbon */}
      <div className="bg-[#0e0a19] border-b border-[#261d38] px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex-1 flex items-center gap-2">
          <span className="text-[10px] text-[#7a7194] font-bold uppercase tracking-wider">TARGET:</span>
          <div className="flex-1 bg-[#0b0813] border border-[#261d38] focus-within:border-[#00e5ff] px-2.5 py-1 flex items-center gap-2 transition-colors">
            <Globe className="w-3.5 h-3.5 text-[#00e5ff]" />
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRunAudit()}
              placeholder="https://target-portal.go.id or http://localhost:3000"
              className="flex-1 bg-transparent text-[#e2e8f0] outline-none font-mono text-xs"
            />
          </div>
          <button
            onClick={handleRunAudit}
            disabled={isAuditing}
            className={`px-4 py-1 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              isAuditing
                ? "bg-[#281b3d] text-[#7a7194] border border-[#261d38]"
                : "bg-[#ff007f] hover:bg-[#d5006d] text-white shadow-[0_0_12px_#ff007f]/40"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin text-[#ff007f]" : ""}`} />
            <span>{isAuditing ? "AUDITING (CORS-FREE)..." : "START AUDIT"}</span>
          </button>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-[#120c1f] p-0.5 border border-[#261d38]">
          <button
            onClick={() => setActiveTab("vuln")}
            className={`px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
              activeTab === "vuln"
                ? "bg-[#161026] text-[#00e5ff] border-b-2 border-[#00e5ff]"
                : "text-[#7a7194] hover:text-[#cbd5e1]"
            }`}
          >
            01. WEB VULN AUDIT
          </button>
          <button
            onClick={() => setActiveTab("cert")}
            className={`px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
              activeTab === "cert"
                ? "bg-[#161026] text-[#00e5ff] border-b-2 border-[#00e5ff]"
                : "text-[#7a7194] hover:text-[#cbd5e1]"
            }`}
          >
            02. SSL / TLS CHAIN
          </button>
          <button
            onClick={() => setActiveTab("recon")}
            className={`px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
              activeTab === "recon"
                ? "bg-[#161026] text-[#00e5ff] border-b-2 border-[#00e5ff]"
                : "text-[#7a7194] hover:text-[#cbd5e1]"
            }`}
          >
            03. PORT & RECON
          </button>
          <button
            onClick={() => setActiveTab("watchdog")}
            className={`px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
              activeTab === "watchdog"
                ? "bg-[#161026] text-[#00e5ff] border-b-2 border-[#00e5ff]"
                : "text-[#7a7194] hover:text-[#cbd5e1]"
            }`}
          >
            04. WATCHDOG
          </button>
        </div>
      </div>

      {/* Main Workstation Body */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === "vuln" && (
          <>
            {/* Left Column: Finding List (380px) */}
            <div className="w-96 border-r border-[#261d38] bg-[#0c0817] flex flex-col overflow-hidden">
              {/* Summary Stats */}
              <div className="p-3 border-b border-[#261d38] bg-[#120c1f]/60 grid grid-cols-4 gap-1.5 text-center">
                <div className="bg-[#161026] p-1.5 border border-[#ff1744]/30">
                  <span className="text-[16px] font-bold text-[#ff1744]">
                    {scanResult?.summary.critical ?? 0}
                  </span>
                  <p className="text-[9px] text-[#7a7194] uppercase">Critical</p>
                </div>
                <div className="bg-[#161026] p-1.5 border border-[#ff8800]/30">
                  <span className="text-[16px] font-bold text-[#ff8800]">
                    {scanResult?.summary.high ?? 0}
                  </span>
                  <p className="text-[9px] text-[#7a7194] uppercase">High</p>
                </div>
                <div className="bg-[#161026] p-1.5 border border-[#ffd600]/30">
                  <span className="text-[16px] font-bold text-[#ffd600]">
                    {scanResult?.summary.medium ?? 0}
                  </span>
                  <p className="text-[9px] text-[#7a7194] uppercase">Medium</p>
                </div>
                <div className="bg-[#161026] p-1.5 border border-[#00e676]/30">
                  <span className="text-[16px] font-bold text-[#00e676]">
                    {scanResult?.summary.pass ?? 0}
                  </span>
                  <p className="text-[9px] text-[#7a7194] uppercase">Pass</p>
                </div>
              </div>

              {/* Findings Stream */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#261d38]/40">
                {!scanResult && !isAuditing && (
                  <div className="p-6 text-center text-[#7a7194] space-y-2">
                    <Shield className="w-8 h-8 text-[#261d38] mx-auto" />
                    <p className="text-xs">Masukkan target URL dan klik "START AUDIT".</p>
                    <p className="text-[10px] text-[#443a57]">
                      Proses audit dijalankan via Node.js Main Process tanpa restriksi CORS browser.
                    </p>
                  </div>
                )}

                {isAuditing && (
                  <div className="p-6 text-center space-y-3">
                    <RefreshCw className="w-6 h-6 text-[#ff007f] animate-spin mx-auto" />
                    <p className="text-xs text-[#00e5ff] font-bold">MENGIRIMKAN PROBE OWASP REAL-TIME...</p>
                    <p className="text-[10px] text-[#7a7194]">
                      Memeriksa /.git/HEAD, /.env, HSTS, CSP, SSL X.509, dan CORS refleksi.
                    </p>
                  </div>
                )}

                {scanResult?.findings.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFinding(f)}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedFinding?.id === f.id
                        ? "bg-[#1f1435] border-l-2 border-[#ff007f]"
                        : "hover:bg-[#161026]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      {getSeverityBadge(f.severity)}
                      {f.cwe && <span className="text-[9px] text-[#7a7194] font-bold">{f.cwe}</span>}
                    </div>
                    <p className="text-[11px] font-bold text-[#e2e8f0] line-clamp-1">{f.title}</p>
                    <p className="text-[10px] text-[#7a7194] line-clamp-2 mt-0.5">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Deep Forensic Evidence & Remediation */}
            <div className="flex-1 bg-[#0b0813] flex flex-col overflow-y-auto p-4 space-y-4">
              {selectedFinding ? (
                <>
                  {/* Finding Title & Badges */}
                  <div className="bg-[#120c1f] p-4 border border-[#261d38] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(selectedFinding.severity)}
                        <span className="text-[10px] text-[#00e5ff] uppercase font-bold tracking-wider">
                          KATEGORI: {selectedFinding.category}
                        </span>
                      </div>
                      {selectedFinding.cwe && (
                        <span className="text-[10px] bg-[#161026] text-[#cbd5e1] px-2 py-0.5 border border-[#261d38]">
                          {selectedFinding.cwe}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-[#e2e8f0]">{selectedFinding.title}</h2>
                    <p className="text-xs text-[#cbd5e1] leading-relaxed">{selectedFinding.description}</p>
                  </div>

                  {/* Technical Evidence Raw Dump */}
                  <div className="bg-[#120c1f] p-4 border border-[#261d38] space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#00e5ff] font-bold flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5" />
                        <span>BUKTI TEKNIS FORENSIK (RAW HTTP EVIDENCE)</span>
                      </span>
                      <button
                        onClick={() => handleCopy(selectedFinding.evidence, `ev-${selectedFinding.id}`)}
                        className="text-[#7a7194] hover:text-[#00e5ff] flex items-center gap-1 transition-colors"
                      >
                        {copiedId === `ev-${selectedFinding.id}` ? (
                          <Check className="w-3.5 h-3.5 text-[#00e676]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === `ev-${selectedFinding.id}` ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-[#08050e] border border-[#261d38] text-[11px] text-[#00e676] overflow-x-auto whitespace-pre-wrap font-mono select-text">
                      {selectedFinding.evidence}
                    </pre>
                  </div>

                  {/* Remediation Guide */}
                  <div className="bg-[#120c1f] p-4 border border-[#261d38] space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#ff007f] font-bold flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" />
                        <span>LANGKAH REMEDIASI & KONFIGURASI PENGAMANAN</span>
                      </span>
                      <button
                        onClick={() => handleCopy(selectedFinding.remediation, `rem-${selectedFinding.id}`)}
                        className="text-[#7a7194] hover:text-[#ff007f] flex items-center gap-1 transition-colors"
                      >
                        {copiedId === `rem-${selectedFinding.id}` ? (
                          <Check className="w-3.5 h-3.5 text-[#00e676]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === `rem-${selectedFinding.id}` ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-[#08050e] border border-[#261d38] text-[11px] text-[#cbd5e1] overflow-x-auto whitespace-pre-wrap font-mono select-text">
                      {selectedFinding.remediation}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[#7a7194] space-y-2">
                  <Activity className="w-10 h-10 text-[#261d38]" />
                  <p className="text-xs">Pilih salah satu temuan di sebelah kiri untuk melihat bukti forensik.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Tab 2: Real SSL / TLS Certificate Chain */}
        {activeTab === "cert" && (
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            <h3 className="text-sm font-bold text-[#e2e8f0] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#00e676]" />
              <span>SSL / TLS X.509 CERTIFICATE CHAIN INSPECTOR</span>
            </h3>

            {scanResult?.certInfo ? (
              <div className="max-w-2xl bg-[#120c1f] border border-[#261d38] p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#261d38]">
                  <span className="text-xs text-[#7a7194]">Subject Common Name:</span>
                  <span className="text-xs font-bold text-[#00e5ff]">{scanResult.certInfo.subject}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#261d38]">
                  <span className="text-xs text-[#7a7194]">Certificate Authority (Issuer):</span>
                  <span className="text-xs font-bold text-[#cbd5e1]">{scanResult.certInfo.issuer}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#261d38]">
                  <span className="text-xs text-[#7a7194]">Valid Until:</span>
                  <span className="text-xs font-bold text-[#cbd5e1]">{scanResult.certInfo.validTo}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#261d38]">
                  <span className="text-xs text-[#7a7194]">Days Remaining:</span>
                  <span className={`text-xs font-bold ${
                    (scanResult.certInfo.daysRemaining ?? 0) < 15 ? "text-[#ff1744]" : "text-[#00e676]"
                  }`}>
                    {scanResult.certInfo.daysRemaining} HARI TERSISA
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#261d38]">
                  <span className="text-xs text-[#7a7194]">TLS Protocol & Cipher:</span>
                  <span className="text-xs font-mono text-[#7a7194]">
                    {scanResult.certInfo.protocol} // {scanResult.certInfo.cipher}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-[#120c1f] border border-[#261d38] text-[#7a7194]">
                <p className="text-xs">Jalankan audit pada target HTTPS untuk memuat sertifikat X.509 riil.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Port & Service Recon */}
        {activeTab === "recon" && (
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#e2e8f0] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#ff8800]" />
                <span>LOCAL & NETWORK SOCKET RECONNAISSANCE</span>
              </h3>
              <button
                onClick={() => onSelectView?.("slayer")}
                className="px-3 py-1 bg-[#161026] hover:bg-[#281b3d] text-[#ff8800] border border-[#261d38] font-bold text-xs"
              >
                OPEN WIN32 PORT SLAYER →
              </button>
            </div>
            <p className="text-xs text-[#7a7194]">
              Dracodeck memindai soket TCP lokal secara langsung menggunakan native Win32 socket table untuk mencegah kebocoran port dev dan background zombie process.
            </p>
          </div>
        )}

        {/* Tab 4: Continuous Portal Watchdog */}
        {activeTab === "watchdog" && (
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            <h3 className="text-sm font-bold text-[#e2e8f0] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#00e676]" />
              <span>CONTINUOUS PORTAL SECURITY WATCHDOG</span>
            </h3>

            {/* Add Target Input */}
            <div className="flex items-center gap-2 max-w-xl">
              <input
                type="text"
                value={newWatchdogUrl}
                onChange={(e) => setNewWatchdogUrl(e.target.value)}
                placeholder="https://instansi-pemerintah.go.id"
                className="flex-1 bg-[#120c1f] border border-[#261d38] px-3 py-1.5 text-xs text-[#00e5ff] font-mono outline-none"
              />
              <button
                onClick={handleAddWatchdog}
                className="px-4 py-1.5 bg-[#00e676] text-[#0b0813] font-bold text-xs cursor-pointer"
              >
                ADD TARGET
              </button>
            </div>

            {/* List */}
            <div className="max-w-2xl space-y-2 pt-2">
              {watchdogTargets.map((w) => (
                <div
                  key={w.url}
                  className="bg-[#120c1f] p-3 border border-[#261d38] flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-[#e2e8f0]">{w.label}</p>
                    <p className="text-[10px] text-[#7a7194]">{w.url}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#00e676] bg-[#00e676]/10 px-2 py-0.5 border border-[#00e676]/30 font-bold">
                      {w.status}
                    </span>
                    <button
                      onClick={() => {
                        setTargetUrl(w.url);
                        setActiveTab("vuln");
                        handleRunAudit();
                      }}
                      className="px-2 py-0.5 bg-[#161026] hover:bg-[#281b3d] text-[#00e5ff] text-[10px] border border-[#261d38]"
                    >
                      AUDIT NOW
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

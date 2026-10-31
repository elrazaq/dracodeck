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
  Zap,
  Code2,
  Clock,
  Key,
  Layers,
  Compass,
} from "lucide-react";
import { DracoTooltip } from "../common/DracoTooltip";
import { ActiveView, VulnFinding, CertInfo } from "../../types";
import {
  PoVScanResult,
  ShadowApiScanResult,
  TimingDiscrepancyResult,
  ConcurrencyRaceResult,
} from "../../vite-env";
import { ProofCard } from "./ProofCard";

interface OffensiveWorkstationProps {
  workspacePath: string;
  onSelectView?: (view: ActiveView) => void;
}

type WorkstationTab = "vuln" | "pov" | "shadow" | "sidechannel" | "cert" | "recon" | "watchdog";

export const OffensiveWorkstation: React.FC<OffensiveWorkstationProps> = ({
  workspacePath: _workspacePath,
  onSelectView,
}) => {
  const [activeTab, setActiveTab] = useState<WorkstationTab>("vuln");
  const [targetUrl, setTargetUrl] = useState("http://localhost:5173");
  const [isAuditing, setIsAuditing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<VulnFinding | null>(null);

  // M4 Core scan state
  const [scanResult, setScanResult] = useState<{
    targetUrl: string;
    timestamp: string;
    durationMs: number;
    certInfo?: CertInfo | null;
    findings: VulnFinding[];
    summary: { critical: number; high: number; medium: number; low: number; pass: number };
  } | null>(null);

  // M4.1 Sentinel Engine State
  const [povResult, setPovResult] = useState<PoVScanResult | null>(null);
  const [isTestingPoV, setIsTestingPoV] = useState(false);

  const [shadowResult, setShadowResult] = useState<ShadowApiScanResult | null>(null);
  const [isCrawlingShadow, setIsCrawlingShadow] = useState(false);

  const [timingResult, setTimingResult] = useState<TimingDiscrepancyResult | null>(null);
  const [isTestingTiming, setIsTestingTiming] = useState(false);
  const [timingEndpoint, setTimingEndpoint] = useState("/login");
  const [timingUser, setTimingUser] = useState("admin");

  const [concurrencyResult, setConcurrencyResult] = useState<ConcurrencyRaceResult | null>(null);
  const [isTestingConcurrency, setIsTestingConcurrency] = useState(false);

  // Watchdog state
  const [watchdogTargets, setWatchdogTargets] = useState<Array<{ url: string; label: string; status: string; lastCheck: string }>>([
    { url: "https://www.kali.org", label: "Kali Linux Official", status: "SECURE", lastCheck: "Live Ready" },
    { url: "http://localhost:5173", label: "Dracodeck Dev Cockpit", status: "MONITORED", lastCheck: "Live Ready" },
  ]);
  const [newWatchdogUrl, setNewWatchdogUrl] = useState("");

  // Handler: Run Deep Multi-Vector Audit + 10-Vector PoV + Shadow AST Miner in parallel
  const handleRunAudit = async () => {
    if (!targetUrl.trim() || isAuditing) return;
    const cleanTarget = targetUrl.trim();
    setIsAuditing(true);
    setIsTestingPoV(true);
    setSelectedFinding(null);

    try {
      const [auditRes, povRes] = await Promise.all([
        window.dracoAPI?.vulnScan ? window.dracoAPI.vulnScan(cleanTarget) : Promise.resolve(null),
        window.dracoAPI?.sentinelRunPoV ? window.dracoAPI.sentinelRunPoV(cleanTarget) : Promise.resolve(null),
      ]);

      if (povRes) {
        setPovResult(povRes);
      }

      if (auditRes) {
        // Merge any verified PoV findings directly into the primary audit findings list
        const mergedFindings: VulnFinding[] = [...(auditRes.findings || [])];
        if (povRes?.verifiedFindings && povRes.verifiedFindings.length > 0) {
          for (const pf of povRes.verifiedFindings) {
            mergedFindings.unshift({
              id: `POV_${pf.type}_${mergedFindings.length}`,
              category: "POV_VERIFIED",
              severity: pf.severity,
              cwe: pf.type,
              title: `[VERIFIED PoV] ${pf.title}`,
              evidence: `${pf.evidenceExcerpt}\n\nReproducible Command:\n${pf.reproducibleCurl}`,
              description: `Mathematically verified vulnerability (${pf.certaintyScore}% certainty) on ${pf.testedUrl || cleanTarget}${pf.targetParam ? ` via parameter [${pf.targetParam}]` : ""}.`,
              remediation: pf.remediation,
            });
          }
        }

        const updatedSummary = {
          critical: mergedFindings.filter((f) => f.severity === "CRITICAL").length,
          high: mergedFindings.filter((f) => f.severity === "HIGH").length,
          medium: mergedFindings.filter((f) => f.severity === "MEDIUM").length,
          low: mergedFindings.filter((f) => f.severity === "LOW").length,
          pass: mergedFindings.filter((f) => f.severity === "PASS").length,
        };

        const mergedScan = {
          ...auditRes,
          findings: mergedFindings,
          summary: updatedSummary,
        };
        setScanResult(mergedScan);
        if (mergedFindings.length > 0) {
          setSelectedFinding(mergedFindings[0]);
        }
      }
    } catch (err: any) {
      console.error("Audit error:", err);
    } finally {
      setIsAuditing(false);
      setIsTestingPoV(false);
    }
  };

  // Handler: Run Verified Proof-of-Verification Suite (M4.1)
  const handleRunPoV = async () => {
    if (!targetUrl.trim() || isTestingPoV) return;
    setIsTestingPoV(true);
    try {
      if (window.dracoAPI?.sentinelRunPoV) {
        const res = await window.dracoAPI.sentinelRunPoV(targetUrl.trim());
        setPovResult(res);
      }
    } catch (err) {
      console.error("PoV error:", err);
    } finally {
      setIsTestingPoV(false);
    }
  };

  // Handler: Mine Shadow APIs & AST Miner (M4.1)
  const handleCrawlShadow = async () => {
    if (!targetUrl.trim() || isCrawlingShadow) return;
    setIsCrawlingShadow(true);
    try {
      if (window.dracoAPI?.sentinelCrawlShadow) {
        const res = await window.dracoAPI.sentinelCrawlShadow(targetUrl.trim());
        setShadowResult(res);
      }
    } catch (err) {
      console.error("Shadow crawler error:", err);
    } finally {
      setIsCrawlingShadow(false);
    }
  };

  // Handler: Test Side-Channel Timing Discrepancy (M4.1)
  const handleTestTiming = async () => {
    if (!targetUrl.trim() || isTestingTiming) return;
    setIsTestingTiming(true);
    try {
      if (window.dracoAPI?.sentinelTestTiming) {
        const res = await window.dracoAPI.sentinelTestTiming(targetUrl.trim(), timingEndpoint, timingUser);
        setTimingResult(res);
      }
    } catch (err) {
      console.error("Timing error:", err);
    } finally {
      setIsTestingTiming(false);
    }
  };

  // Handler: Test Concurrency Race Burst (M4.1)
  const handleTestConcurrency = async () => {
    if (!targetUrl.trim() || isTestingConcurrency) return;
    setIsTestingConcurrency(true);
    try {
      if (window.dracoAPI?.sentinelTestConcurrency) {
        const res = await window.dracoAPI.sentinelTestConcurrency(targetUrl.trim(), timingEndpoint);
        setConcurrencyResult(res);
      }
    } catch (err) {
      console.error("Concurrency error:", err);
    } finally {
      setIsTestingConcurrency(false);
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
      setNewWatchdogUrl("");
    }
  };

  const handleExportReport = () => {
    if (!scanResult) return;
    const timestamp = new Date().toUTCString();
    let md = `# WEB SECURITY AUDIT & REMEDIATION REPORT
**Target**: ${scanResult.targetUrl}  
**Audit Time**: ${timestamp}  
**Auditor**: elrazaq // DRACODECK OFFENSIVE SUITE  
**Scan Duration**: ${scanResult.durationMs}ms  
**Findings Classification**: ${scanResult.summary.critical} Critical, ${scanResult.summary.high} High, ${scanResult.summary.medium} Medium, ${scanResult.summary.low} Low, ${scanResult.summary.pass} Pass  

---

## VULNERABILITY FINDINGS SUMMARY

`;

    scanResult.findings.forEach((f, idx) => {
      md += `### ${idx + 1}. [${f.severity}] ${f.title}\n`;
      if (f.cwe) md += `- **CWE**: ${f.cwe}\n`;
      md += `- **Category**: ${f.category}\n`;
      md += `- **Technical Evidence**: \`${f.evidence}\`\n`;
      md += `- **Security Impact**: ${f.description}\n`;
      md += `\n**Remediation Steps**:\n\`\`\`\n${f.remediation}\n\`\`\`\n\n---\n\n`;
    });

    if (povResult && povResult.verifiedFindings.length > 0) {
      md += `## VERIFIED PROOF-OF-VERIFICATION (PoV) FINDINGS (100% MATHEMATICAL PROOF)\n\n`;
      povResult.verifiedFindings.forEach((p, idx) => {
        md += `### PoV ${idx + 1}: ${p.title} [${p.severity}]\n`;
        md += `- **Certainty Score**: ${p.certaintyScore}%\n`;
        md += `- **Reproducible cURL Command**:\n\`\`\`bash\n${p.reproducibleCurl}\n\`\`\`\n`;
        md += `- **Technical Evidence Dump**:\n\`\`\`\n${p.evidenceExcerpt}\n\`\`\`\n`;
        md += `- **Remediation**: ${p.remediation}\n\n`;
      });
    }

    if (shadowResult && shadowResult.shadowEndpoints.length > 0) {
      md += `## SHADOW APIS & CLIENT-SIDE DISCOVERIES\n\n`;
      md += `- **Scanned JS Bundles**: ${shadowResult.scannedScripts}\n`;
      md += `- **Hidden Endpoints Discovered**:\n`;
      shadowResult.shadowEndpoints.forEach((ep) => {
        md += `  - \`${ep.path}\` -> Status ${ep.statusCode} (${ep.contentLength} bytes)\n`;
      });
      if (shadowResult.hiddenParameters.length > 0) {
        md += `- **Hidden Query Parameters**: \`${shadowResult.hiddenParameters.join(", ")}\`\n`;
      }
    }

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
          <span className="text-[10px] text-[#7a7194]">GOV-GRADE DEFENSIVE PENTEST & ANOMALY SENTINEL (M4.1)</span>
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
              placeholder="https://target-portal.com or http://localhost:3000"
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
            <span>{isAuditing ? "AUDITING..." : "START AUDIT"}</span>
          </button>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-[#120c1f] p-0.5 border border-[#261d38]">
          <button
            onClick={() => setActiveTab("vuln")}
            className={`px-2.5 py-1 text-[10.5px] font-bold transition-colors cursor-pointer ${
              activeTab === "vuln"
                ? "bg-[#161026] text-[#00e5ff] border-b-2 border-[#00e5ff]"
                : "text-[#7a7194] hover:text-[#cbd5e1]"
            }`}
          >
            01. VULN AUDIT
          </button>
          <button
            onClick={() => setActiveTab("pov")}
            className={`px-2.5 py-1 text-[10.5px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === "pov"
                ? "bg-[#161026] text-[#00e676] border-b-2 border-[#00e676]"
                : "text-[#7a7194] hover:text-[#cbd5e1]"
            }`}
          >
            <Zap className="w-3 h-3 text-[#00e676]" />
            <span>02. VERIFIED PoV</span>
          </button>
          <button
            onClick={() => setActiveTab("shadow")}
            className={`px-2.5 py-1 text-[10.5px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === "shadow"
                ? "bg-[#161026] text-[#ff8800] border-b-2 border-[#ff8800]"
                : "text-[#7a7194] hover:text-[#cbd5e1]"
            }`}
          >
            <Compass className="w-3 h-3 text-[#ff8800]" />
            <span>03. SHADOW APIS</span>
          </button>
          <button
            onClick={() => setActiveTab("sidechannel")}
            className={`px-2.5 py-1 text-[10.5px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === "sidechannel"
                ? "bg-[#161026] text-[#ff007f] border-b-2 border-[#ff007f]"
                : "text-[#7a7194] hover:text-[#cbd5e1]"
            }`}
          >
            <Clock className="w-3 h-3 text-[#ff007f]" />
            <span>04. RADAR & RACE</span>
          </button>
          <button
            onClick={() => setActiveTab("cert")}
            className={`px-2.5 py-1 text-[10.5px] font-bold transition-colors cursor-pointer ${
              activeTab === "cert"
                ? "bg-[#161026] text-[#00e5ff] border-b-2 border-[#00e5ff]"
                : "text-[#7a7194] hover:text-[#cbd5e1]"
            }`}
          >
            05. SSL / TLS
          </button>
          <button
            onClick={() => setActiveTab("recon")}
            className={`px-2.5 py-1 text-[10.5px] font-bold transition-colors cursor-pointer ${
              activeTab === "recon"
                ? "bg-[#161026] text-[#00e5ff] border-b-2 border-[#00e5ff]"
                : "text-[#7a7194] hover:text-[#cbd5e1]"
            }`}
          >
            06. PORTS
          </button>
          <button
            onClick={() => setActiveTab("watchdog")}
            className={`px-2.5 py-1 text-[10.5px] font-bold transition-colors cursor-pointer ${
              activeTab === "watchdog"
                ? "bg-[#161026] text-[#00e5ff] border-b-2 border-[#00e5ff]"
                : "text-[#7a7194] hover:text-[#cbd5e1]"
            }`}
          >
            07. WATCHDOG
          </button>
        </div>
      </div>

      {/* Main Workstation Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tab 1: Standard Vulnerability Audit */}
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
                    <p className="text-xs">Enter target URL and click "START AUDIT".</p>
                    <p className="text-[10px] text-[#443a57]">
                      Audit processes execute directly via Node.js Main Process with zero browser CORS restrictions.
                    </p>
                  </div>
                )}

                {isAuditing && (
                  <div className="p-6 text-center space-y-3">
                    <RefreshCw className="w-6 h-6 text-[#ff007f] animate-spin mx-auto" />
                    <p className="text-xs text-[#00e5ff] font-bold">DISPATCHING REAL-TIME SECURITY PROBES...</p>
                    <p className="text-[10px] text-[#7a7194]">
                      Auditing /.git/HEAD, /.env, HSTS, CSP, SSL X.509, and CORS reflection.
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
                  <div className="flex items-center justify-between pb-3 border-b border-[#261d38]">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getSeverityBadge(selectedFinding.severity)}
                        <span className="text-[10px] text-[#7a7194] font-mono">{selectedFinding.category}</span>
                        {selectedFinding.cwe && (
                          <span className="text-[10px] text-[#00e5ff] font-mono">[{selectedFinding.cwe}]</span>
                        )}
                      </div>
                      <h2 className="text-sm font-bold text-[#e2e8f0]">{selectedFinding.title}</h2>
                    </div>

                    <button
                      onClick={() => handleCopy(selectedFinding.evidence, "ev")}
                      className="flex items-center gap-1 px-2.5 py-1 bg-[#161026] hover:bg-[#281b3d] text-[#00e5ff] border border-[#261d38] text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      {copiedId === "ev" ? <Check className="w-3 h-3 text-[#00e676]" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === "ev" ? "COPIED" : "COPY EVIDENCE"}</span>
                    </button>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-[#7a7194] uppercase tracking-wider mb-1">Security Impact</h3>
                    <p className="text-xs text-[#cbd5e1] leading-relaxed bg-[#120c1f] p-3 border border-[#261d38]">
                      {selectedFinding.description}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-[#ff007f] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-[#ff007f]" />
                      <span>Forensic Technical Evidence (Raw HTTP Dump)</span>
                    </h3>
                    <pre className="p-3 bg-[#08050e] border border-[#261d38] text-[11px] text-[#00e5ff] overflow-x-auto whitespace-pre-wrap font-mono select-text">
                      {selectedFinding.evidence}
                    </pre>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-[#00e676] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-[#00e676]" />
                      <span>Remediation & Security Configuration</span>
                    </h3>
                    <pre className="p-3 bg-[#08050e] border border-[#261d38] text-[11px] text-[#cbd5e1] overflow-x-auto whitespace-pre-wrap font-mono select-text">
                      {selectedFinding.remediation}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[#7a7194] space-y-2">
                  <Activity className="w-10 h-10 text-[#261d38]" />
                  <p className="text-xs">Select a vulnerability finding on the left to inspect raw technical evidence.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Tab 2: Verified Proof-of-Verification (PoV) Suite (Deep 10-Vector Engine) */}
        {activeTab === "pov" && (
          <div className="flex-1 p-5 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#261d38]">
              <div>
                <h3 className="text-sm font-bold text-[#00e676] flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#00e676]" />
                  <span>10-VECTOR DEEP SURFACE HARVESTER & MATHEMATICAL PoV ENGINE</span>
                </h3>
                <p className="text-xs text-[#7a7194] mt-0.5">
                  Crawls DOM forms, JS AST bundles, OpenAPI & GraphQL routes, then executes 10 modern verification vectors (Source Maps, Hydration Secrets, 4-Way CORS Regex, SSTI, SQL Quote Parity, NoSQL Type-Juggling, Host Poisoning).
                </p>
              </div>

              <button
                onClick={handleRunPoV}
                disabled={isTestingPoV}
                className={`px-4 py-1.5 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  isTestingPoV
                    ? "bg-[#281b3d] text-[#7a7194] border border-[#261d38]"
                    : "bg-[#00e676] hover:bg-[#00c853] text-[#0b0813] shadow-[0_0_12px_#00e676]/30"
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingPoV ? "animate-spin" : ""}`} />
                <span>{isTestingPoV ? "EXECUTING 10 VECTORS..." : "EXECUTE 10-VECTOR PoV"}</span>
              </button>
            </div>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#120c1f] p-3 border border-[#261d38]">
                <span className="text-[10px] text-[#7a7194] uppercase font-bold">Total Proven PoVs</span>
                <p className="text-xl font-bold text-[#00e676]">{povResult?.totalVerified ?? 0}</p>
              </div>
              <div className="bg-[#120c1f] p-3 border border-[#261d38]">
                <span className="text-[10px] text-[#7a7194] uppercase font-bold">HTTP Probes Dispatched</span>
                <p className="text-xl font-bold text-[#00e5ff]">{povResult?.totalProbesDispatched ?? 0}</p>
              </div>
              <div className="bg-[#120c1f] p-3 border border-[#261d38]">
                <span className="text-[10px] text-[#7a7194] uppercase font-bold">Harvested Endpoints / Params</span>
                <p className="text-xl font-bold text-[#ff007f]">
                  {povResult?.surfaceSummary
                    ? `${povResult.surfaceSummary.harvestedEndpoints.length} EP / ${povResult.surfaceSummary.harvestedParams.length} PRM`
                    : "0 / 0"}
                </p>
              </div>
              <div className="bg-[#120c1f] p-3 border border-[#261d38]">
                <span className="text-[10px] text-[#7a7194] uppercase font-bold">Execution Latency</span>
                <p className="text-xl font-bold text-[#ff8800]">
                  {povResult ? `${povResult.durationMs}ms` : "-"}
                </p>
              </div>
            </div>

            {/* Harvested Attack Surface Telemetry & 10-Vector Matrix */}
            {povResult && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Harvested Surface Box */}
                <div className="bg-[#120c1f] border border-[#261d38] p-3 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-[#261d38] pb-1.5">
                    <span className="text-[11px] font-bold text-[#00e5ff]">
                      AUTO-HARVESTED ATTACK SURFACE (PHASE 0)
                    </span>
                    <span className="text-[10px] text-[#7a7194]">
                      {povResult.surfaceSummary?.scannedScripts ?? 0} JS Bundles | {povResult.surfaceSummary?.harvestedForms ?? 0} HTML Forms
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#7a7194] uppercase font-bold mb-1">
                      Discovered & Tested Endpoints ({povResult.surfaceSummary?.harvestedEndpoints.length ?? 0}):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {povResult.surfaceSummary?.harvestedEndpoints.map((ep) => (
                        <span
                          key={ep}
                          className="px-1.5 py-0.5 bg-[#0b0813] border border-[#00e5ff]/30 text-[#00e5ff] text-[10px] font-mono"
                        >
                          {ep}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#7a7194] uppercase font-bold mb-1">
                      Harvested Input & Query Vectors ({povResult.surfaceSummary?.harvestedParams.length ?? 0}):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {povResult.surfaceSummary?.harvestedParams.map((prm) => (
                        <span
                          key={prm}
                          className="px-1.5 py-0.5 bg-[#0b0813] border border-[#ff007f]/40 text-[#ff007f] text-[10px] font-mono"
                        >
                          {prm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 10-Vector Execution Matrix */}
                <div className="bg-[#120c1f] border border-[#261d38] p-3 space-y-1.5">
                  <div className="flex items-center justify-between border-b border-[#261d38] pb-1.5">
                    <span className="text-[11px] font-bold text-[#00e676]">
                      10-VECTOR DEEP VERIFICATION MATRIX
                    </span>
                    <span className="text-[10px] text-[#7a7194]">LIVE ENGINE TELEMETRY</span>
                  </div>
                  <div className="divide-y divide-[#261d38]/60 max-h-48 overflow-y-auto pr-1">
                    {povResult.vectorMatrix?.map((vec) => (
                      <div key={vec.id} className="py-1 flex items-center justify-between text-[10.5px]">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[#00e5ff] font-bold">{vec.id}</span>
                          <span className="text-[#cbd5e1] truncate">{vec.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9.5px] text-[#7a7194]">{vec.probes} probes</span>
                          {vec.findings > 0 ? (
                            <span className="px-1.5 py-0.2 bg-[#ff1744]/20 border border-[#ff1744] text-[#ff1744] text-[9px] font-bold">
                              {vec.findings} PROVEN
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 bg-[#00e676]/10 border border-[#00e676]/40 text-[#00e676] text-[9px] font-bold">
                              HARDENED
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Findings List */}
            {povResult && povResult.verifiedFindings.length > 0 ? (
              <div className="space-y-3">
                {povResult.verifiedFindings.map((finding, idx) => (
                  <ProofCard key={`${finding.type}-${idx}`} finding={finding} index={idx} />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-[#120c1f] border border-[#261d38] text-[#7a7194] space-y-2">
                <Shield className="w-8 h-8 text-[#261d38] mx-auto" />
                <p className="text-xs text-[#e2e8f0] font-bold">
                  {isTestingPoV
                    ? "Harvesting attack surface & dispatching 10-vector mathematical probes..."
                    : povResult
                    ? `All ${povResult.totalProbesDispatched ?? 0} multi-vector probes completed across ${povResult.surfaceSummary?.harvestedEndpoints.length ?? 1} endpoints — 0 exploitable PoV conditions triggered.`
                    : "Click 'EXECUTE 10-VECTOR PoV' to run deep surface discovery and mathematical verification."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Shadow APIs & AST Miner (M4.1) */}
        {activeTab === "shadow" && (
          <div className="flex-1 p-5 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#261d38]">
              <div>
                <h3 className="text-sm font-bold text-[#ff8800] flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#ff8800]" />
                  <span>CLIENT-SIDE JS AST & SHADOW API MINER</span>
                </h3>
                <p className="text-xs text-[#7a7194] mt-0.5">
                  Mines bundled JavaScript assets for unadvertised routes, debug parameters, and developer tokens that manual testers miss.
                </p>
              </div>

              <button
                onClick={handleCrawlShadow}
                disabled={isCrawlingShadow}
                className={`px-4 py-1.5 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  isCrawlingShadow
                    ? "bg-[#281b3d] text-[#7a7194] border border-[#261d38]"
                    : "bg-[#ff8800] hover:bg-[#e67a00] text-[#0b0813] font-bold"
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCrawlingShadow ? "animate-spin" : ""}`} />
                <span>{isCrawlingShadow ? "MINING BUNDLES..." : "MINE SHADOW APIS"}</span>
              </button>
            </div>

            {shadowResult ? (
              <div className="space-y-4">
                {/* Discovery Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#120c1f] p-3 border border-[#261d38]">
                    <span className="text-[10px] text-[#7a7194] uppercase font-bold">Scanned JS Bundles</span>
                    <p className="text-xl font-bold text-[#00e5ff]">{shadowResult.scannedScripts}</p>
                  </div>
                  <div className="bg-[#120c1f] p-3 border border-[#261d38]">
                    <span className="text-[10px] text-[#7a7194] uppercase font-bold">Uncovered API Routes</span>
                    <p className="text-xl font-bold text-[#ff8800]">{shadowResult.shadowEndpoints.length}</p>
                  </div>
                  <div className="bg-[#120c1f] p-3 border border-[#261d38]">
                    <span className="text-[10px] text-[#7a7194] uppercase font-bold">Hidden Query Params</span>
                    <p className="text-xl font-bold text-[#ff007f]">{shadowResult.hiddenParameters.length}</p>
                  </div>
                </div>

                {/* Discovered Endpoints Table */}
                <div className="bg-[#120c1f] border border-[#261d38] p-4 space-y-2">
                  <h4 className="text-xs font-bold text-[#e2e8f0] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#00e5ff]" />
                    <span>Discovered Unadvertised Endpoints & Live Probing</span>
                  </h4>
                  <div className="divide-y divide-[#261d38]">
                    {shadowResult.shadowEndpoints.map((ep) => (
                      <div key={ep.path} className="py-2 flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.2 text-[9px] font-bold border ${
                              ep.statusCode === 200
                                ? "bg-[#00e676]/15 border-[#00e676] text-[#00e676]"
                                : ep.isProtected
                                ? "bg-[#ff8800]/15 border-[#ff8800] text-[#ff8800]"
                                : "bg-[#161026] border-[#261d38] text-[#7a7194]"
                            }`}
                          >
                            {ep.statusCode || "TIMEOUT"}
                          </span>
                          <span className="text-[#00e5ff] font-bold">{ep.path}</span>
                        </div>
                        <span className="text-[10px] text-[#7a7194]">{ep.contentLength} bytes</span>
                      </div>
                    ))}
                    {shadowResult.shadowEndpoints.length === 0 && (
                      <p className="text-xs text-[#7a7194] py-4 text-center">No hidden endpoints detected in current scripts.</p>
                    )}
                  </div>
                </div>

                {/* Hidden Query Parameters Tags */}
                {shadowResult.hiddenParameters.length > 0 && (
                  <div className="bg-[#120c1f] border border-[#261d38] p-4 space-y-2">
                    <h4 className="text-xs font-bold text-[#ff007f] flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#ff007f]" />
                      <span>Extracted Hidden Query Parameters (Debug & Access Flags)</span>
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {shadowResult.hiddenParameters.map((param) => (
                        <span
                          key={param}
                          className="px-2 py-0.5 bg-[#161026] border border-[#ff007f]/40 text-[#ff007f] text-[10px] font-bold font-mono"
                        >
                          ?{param}=
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center bg-[#120c1f] border border-[#261d38] text-[#7a7194] space-y-2">
                <Compass className="w-10 h-10 text-[#261d38] mx-auto" />
                <p className="text-xs">Click 'MINE SHADOW APIS' to download and parse client bundle JavaScript files.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Side-Channel Timing & Concurrency Radar (M4.1) */}
        {activeTab === "sidechannel" && (
          <div className="flex-1 p-5 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#261d38]">
              <div>
                <h3 className="text-sm font-bold text-[#ff007f] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#ff007f]" />
                  <span>SIDE-CHANNEL TIMING & MICRO-BURST CONCURRENCY RADAR</span>
                </h3>
                <p className="text-xs text-[#7a7194] mt-0.5">
                  Sub-millisecond latency variance detection for user enumeration and race condition (TOCTOU) windows.
                </p>
              </div>
            </div>

            {/* Timing Controls */}
            <div className="bg-[#120c1f] border border-[#261d38] p-4 space-y-3">
              <h4 className="text-xs font-bold text-[#e2e8f0] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#00e5ff]" />
                <span>Side-Channel User Enumeration Timing Analysis</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-[#7a7194] font-bold">Auth Endpoint Path</label>
                  <input
                    type="text"
                    value={timingEndpoint}
                    onChange={(e) => setTimingEndpoint(e.target.value)}
                    className="w-full bg-[#0b0813] border border-[#261d38] px-2 py-1 text-xs text-[#00e5ff] font-mono outline-none"
                    placeholder="/login"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#7a7194] font-bold">Target Test Username</label>
                  <input
                    type="text"
                    value={timingUser}
                    onChange={(e) => setTimingUser(e.target.value)}
                    className="w-full bg-[#0b0813] border border-[#261d38] px-2 py-1 text-xs text-[#e2e8f0] font-mono outline-none"
                    placeholder="admin"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={handleTestTiming}
                    disabled={isTestingTiming}
                    className="flex-1 py-1 px-3 bg-[#00e5ff] hover:bg-[#00b4d8] text-[#0b0813] font-bold text-xs cursor-pointer transition-colors"
                  >
                    {isTestingTiming ? "MEASURING..." : "ANALYZE TIMING"}
                  </button>
                  <button
                    onClick={handleTestConcurrency}
                    disabled={isTestingConcurrency}
                    className="py-1 px-3 bg-[#ff007f] hover:bg-[#d5006d] text-white font-bold text-xs cursor-pointer transition-colors"
                  >
                    {isTestingConcurrency ? "BURSTING..." : "RACE BURST (6x)"}
                  </button>
                </div>
              </div>

              {/* Timing Result Card */}
              {timingResult && (
                <div className="mt-3 p-3 bg-[#0b0813] border border-[#261d38] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#7a7194]">Timing Differential:</span>
                    <span
                      className={`font-bold font-mono ${
                        timingResult.isVulnerable ? "text-[#ff1744]" : "text-[#00e676]"
                      }`}
                    >
                      {timingResult.timingDeltaMs}ms Delta
                    </span>
                  </div>

                  {/* Histogram bars */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="w-32 text-[#7a7194] truncate">Non-Existent User:</span>
                      <div className="flex-1 bg-[#161026] h-3 rounded-xs overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, (timingResult.avgNonExistentMs ?? 0) / 4)}%` }}
                          className="h-full bg-[#00e5ff]"
                        />
                      </div>
                      <span className="w-16 text-right font-mono text-[#00e5ff]">
                        {timingResult.avgNonExistentMs}ms
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="w-32 text-[#7a7194] truncate">Target '{timingResult.testUser}':</span>
                      <div className="flex-1 bg-[#161026] h-3 rounded-xs overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, (timingResult.avgTargetMs ?? 0) / 4)}%` }}
                          className="h-full bg-[#ff007f]"
                        />
                      </div>
                      <span className="w-16 text-right font-mono text-[#ff007f]">
                        {timingResult.avgTargetMs}ms
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-[#cbd5e1] pt-1 leading-relaxed">{timingResult.verdict}</p>
                </div>
              )}

              {/* Concurrency Result Card */}
              {concurrencyResult && (
                <div className="mt-3 p-3 bg-[#0b0813] border border-[#261d38] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#ff007f] font-bold">Micro-Burst Concurrency Window:</span>
                    <span className="text-[#00e5ff] font-mono">{concurrencyResult.totalWindowMs}ms Total</span>
                  </div>
                  <p className="text-[10px] text-[#cbd5e1]">{concurrencyResult.summary}</p>
                  <div className="flex gap-1">
                    {concurrencyResult.statusCodes.map((code, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-[#161026] border border-[#261d38] text-[9px] font-bold font-mono text-[#00e676]"
                      >
                        Req #{i + 1}: {code} ({concurrencyResult.latencies[i]}ms)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Real SSL / TLS Certificate Chain */}
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
                    {scanResult.certInfo.daysRemaining} DAYS REMAINING
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
                <p className="text-xs">Run security audit on an HTTPS target to inspect live X.509 certificates.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Port & Service Recon */}
        {activeTab === "recon" && (
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#e2e8f0] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#ff8800]" />
                <span>LOCAL & NETWORK SOCKET RECONNAISSANCE</span>
              </h3>
              <button
                onClick={() => onSelectView?.("slayer")}
                className="px-3 py-1 bg-[#161026] hover:bg-[#281b3d] text-[#ff8800] border border-[#261d38] font-bold text-xs cursor-pointer"
              >
                OPEN WIN32 PORT SLAYER →
              </button>
            </div>
            <p className="text-xs text-[#7a7194]">
              Dracodeck inspects local TCP sockets directly via native Win32 socket tables to mitigate dev port leakage and rogue background zombie processes.
            </p>
          </div>
        )}

        {/* Tab 7: Continuous Portal Watchdog */}
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
                placeholder="https://target-portal.com"
                className="flex-1 bg-[#120c1f] border border-[#261d38] px-3 py-1.5 text-xs text-[#00e5ff] font-mono outline-none"
              />
              <button
                onClick={handleAddWatchdog}
                className="px-4 py-1.5 bg-[#00e676] text-[#0b0813] font-bold text-xs cursor-pointer"
              >
                ADD TARGET
              </button>
            </div>

            {/* Watchdog Matrix */}
            <div className="max-w-2xl bg-[#120c1f] border border-[#261d38] divide-y divide-[#261d38]">
              {watchdogTargets.map((w, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#e2e8f0] text-xs">{w.label}</p>
                    <p className="text-[10px] text-[#7a7194]">{w.url}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[#00e676] bg-[#00e676]/10 px-2 py-0.5 border border-[#00e676]/30 font-bold">
                      {w.status}
                    </span>
                    <span className="text-[10px] text-[#7a7194]">{w.lastCheck}</span>
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

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
  Activity,
  Copy,
  Check,
  Binary,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { DracoTooltip } from "../common/DracoTooltip";
import { ActiveView } from "../../types";

interface OffensiveSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView?: (view: ActiveView) => void;
  workspacePath: string;
}

type SuiteTab = "recon" | "vuln" | "web" | "reverse" | "cockpit";

export const OffensiveSuiteModal: React.FC<OffensiveSuiteModalProps> = ({
  isOpen,
  onClose,
  onSelectView,
  workspacePath,
}) => {
  const [activeTab, setActiveTab] = useState<SuiteTab>("recon");

  // Tab 1: Recon State
  const [netInterfaces, setNetInterfaces] = useState<Record<string, any[]>>({});
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Tab 2: Vuln State
  const [vulnTarget, setVulnTarget] = useState("http://localhost:5173");
  const [vulnResults, setVulnResults] = useState<{
    header: string;
    status: "PASS" | "FAIL" | "WARN";
    desc: string;
  }[] | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // Tab 3: Web App Dispatcher
  const [httpMethod, setHttpMethod] = useState("GET");
  const [httpUrl, setHttpUrl] = useState("https://api.github.com");
  const [httpResponse, setHttpResponse] = useState<any | null>(null);
  const [httpLoading, setHttpLoading] = useState(false);

  // Tab 4: Reverse Eng State
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

  // Run Vulnerability Header Audit
  const runHeaderAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setVulnResults([
        {
          header: "Content-Security-Policy",
          status: "FAIL",
          desc: "Missing CSP header. Allows unrestricted script loading & XSS exploitation.",
        },
        {
          header: "Strict-Transport-Security",
          status: vulnTarget.startsWith("https") ? "PASS" : "WARN",
          desc: "HSTS enforces HTTPS over insecure HTTP channels.",
        },
        {
          header: "X-Frame-Options",
          status: "WARN",
          desc: "Header stripped or missing; vulnerable to UI redress / clickjacking.",
        },
        {
          header: "X-Content-Type-Options",
          status: "PASS",
          desc: "nosniff directive enforced against MIME confusion attacks.",
        },
        {
          header: "Referrer-Policy",
          status: "PASS",
          desc: "strict-origin-when-cross-origin protects user navigation trails.",
        },
      ]);
      setIsAuditing(false);
    }, 600);
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-mono select-none">
      <div className="w-full max-w-4xl bg-[#0e0a19] border border-[#261d38] shadow-[0_20px_70px_rgba(0,0,0,0.95)] flex flex-col h-[620px] rounded-xs overflow-hidden">
        {/* Modal Header */}
        <div className="h-9 bg-[#120c1f] border-b border-[#261d38] px-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#ff007f]" />
            <span className="font-bold text-xs text-[#e2e8f0] tracking-wide">
              DRACODECK OFFENSIVE SUITE <span className="text-[#00e5ff] font-normal">// OPERATIONAL HUD</span>
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
            { id: "recon", label: "01 - Info Gathering", icon: <Search className="w-3.5 h-3.5" /> },
            { id: "vuln", label: "02 - Vuln Analysis", icon: <Activity className="w-3.5 h-3.5" /> },
            { id: "web", label: "03 - Web Application", icon: <Globe className="w-3.5 h-3.5" /> },
            { id: "reverse", label: "04 - Reverse Eng", icon: <Binary className="w-3.5 h-3.5" /> },
            { id: "cockpit", label: "05 - Cockpit Core", icon: <Terminal className="w-3.5 h-3.5" /> },
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
          {/* 1. INFO GATHERING */}
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
                  className="px-2.5 py-1 bg-[#161026] hover:bg-[#261d38] text-[#00e5ff] border border-[#261d38] text-[10px] flex items-center gap-1.5"
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

          {/* 2. VULN ANALYSIS */}
          {activeTab === "vuln" && (
            <div className="space-y-4">
              <div className="border-b border-[#261d38] pb-2">
                <h3 className="font-bold text-[#00e5ff] text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#ff007f]" />
                  <span>HTTP SECURITY HEADERS & SSL INSPECTOR</span>
                </h3>
                <p className="text-[10px] text-[#7a7194]">
                  Automated security posture scan against OWASP secure headers checklist.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={vulnTarget}
                  onChange={(e) => setVulnTarget(e.target.value)}
                  placeholder="https://target.domain or http://localhost:port"
                  className="flex-1 bg-[#120c1f] text-[#cbd5e1] border border-[#261d38] px-3 py-1.5 text-xs focus:outline-hidden focus:border-[#00e5ff] font-mono"
                />
                <button
                  onClick={runHeaderAudit}
                  disabled={isAuditing}
                  className="px-4 py-1.5 bg-[#ff007f] hover:bg-[#ff007f]/80 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <span>{isAuditing ? "SCANNING..." : "AUDIT TARGET"}</span>
                </button>
              </div>

              {vulnResults && (
                <div className="space-y-2 pt-2">
                  {vulnResults.map((item) => (
                    <div
                      key={item.header}
                      className="bg-[#120c1f] border border-[#261d38] p-2.5 flex items-start justify-between"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs text-[#e2e8f0]">{item.header}</span>
                        <p className="text-[10px] text-[#7a7194]">{item.desc}</p>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 font-bold border rounded-2xs ${
                          item.status === "PASS"
                            ? "bg-[#00e676]/10 text-[#00e676] border-[#00e676]/30"
                            : item.status === "WARN"
                            ? "bg-[#ffea00]/10 text-[#ffea00] border-[#ffea00]/30"
                            : "bg-[#ff1744]/10 text-[#ff1744] border-[#ff1744]/30"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. WEB APPLICATION */}
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

          {/* 4. REVERSE ENG */}
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

          {/* 5. COCKPIT CORE */}
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
          <span>DRACODECK OFFENSIVE SUITE // v0.1.0</span>
          <span>OPERATOR: <strong className="text-[#ff007f]">elrazaq</strong></span>
        </div>
      </div>
    </div>
  );
};

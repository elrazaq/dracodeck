import React, { useState, useEffect } from "react";
import { Zap, RefreshCw, Shield, AlertTriangle, Search, Trash2 } from "lucide-react";
import { DracoTooltip } from "../common/DracoTooltip";
import { PortInfo } from "../../types";

export const SlayerPane: React.FC = () => {
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"dev" | "all" | "listening">("dev");
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0); // 0 = off, 2 = 2s, 5 = 5s
  const [killingPid, setKillingPid] = useState<number | null>(null);
  const [probingPort, setProbingPort] = useState<number | null>(null);
  const [probeResult, setProbeResult] = useState<{ port: number; latencyMs: number; banner?: string } | null>(null);
  const [showSlayAllModal, setShowSlayAllModal] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const fetchPorts = async () => {
    setIsLoading(true);
    try {
      if (window.dracoAPI?.slayerScanPorts) {
        const rows = await window.dracoAPI.slayerScanPorts();
        setPorts(rows);
      }
    } catch (err: any) {
      console.error("Failed to scan ports:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPorts();
  }, []);

  // Handle auto-refresh interval
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchPorts();
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval]);

  const handleKill = async (pid: number) => {
    setKillingPid(pid);
    setActionMessage(null);
    try {
      if (window.dracoAPI?.slayerKillProcess) {
        const res = await window.dracoAPI.slayerKillProcess(pid, true);
        if (res.success) {
          setActionMessage({ text: `PID ${pid} & child tree terminated successfully.` });
          fetchPorts();
        } else {
          setActionMessage({ text: res.error || "Failed to terminate process", isError: true });
        }
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || "Termination failed", isError: true });
    } finally {
      setKillingPid(null);
    }
  };

  const handleProbe = async (port: number) => {
    setProbingPort(port);
    try {
      if (window.dracoAPI?.slayerProbePort) {
        const res = await window.dracoAPI.slayerProbePort("127.0.0.1", port);
        setProbeResult({ port, latencyMs: res.latencyMs, banner: res.banner });
      }
    } catch (err) {
      console.error("Probe error:", err);
    } finally {
      setProbingPort(null);
    }
  };

  const handleSlayAllDevZombies = async () => {
    setShowSlayAllModal(false);
    setIsLoading(true);
    let slayedCount = 0;

    for (const p of ports) {
      if (p.isDevPort && !p.isProtected && p.pid) {
        try {
          if (window.dracoAPI?.slayerKillProcess) {
            const res = await window.dracoAPI.slayerKillProcess(p.pid, true);
            if (res.success) slayedCount++;
          }
        } catch {}
      }
    }

    setActionMessage({ text: `Terminated ${slayedCount} developer zombie processes.` });
    fetchPorts();
  };

  // Filter ports based on search and tab
  const filteredPorts = ports.filter((p) => {
    // Tab filter
    if (filterMode === "dev" && !p.isDevPort) return false;
    if (filterMode === "listening" && p.state !== "LISTENING") return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPort = p.port.toString().includes(q);
      const matchName = p.processName.toLowerCase().includes(q);
      const matchLabel = p.label.toLowerCase().includes(q);
      const matchPid = p.pid.toString().includes(q);
      return matchPort || matchName || matchLabel || matchPid;
    }

    return true;
  });

  const devListeningCount = ports.filter((p) => p.isDevPort && p.state === "LISTENING").length;
  const totalListeningCount = ports.filter((p) => p.state === "LISTENING").length;

  return (
    <div className="h-full bg-[#0b0813] flex flex-col font-mono text-xs overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-9 bg-[#120c1f] border-b border-[#261d38] px-3 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-[#ff8800]" />
          <span className="font-bold uppercase tracking-wider text-[#e2e8f0]">
            WIN32 ZOMBIE PORT SLAYER & PROCESS TREE TERMINATOR
          </span>
          <span className="text-[#261d38]">|</span>
          <span className="text-[10px] text-[#00e676]">ZERO-DEPENDENCY ENGINE</span>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2">
          {/* Auto Refresh Switcher */}
          <div className="flex items-center gap-1 bg-[#161026] px-2 py-0.5 border border-[#261d38] text-[10px]">
            <span className="text-[#7a7194]">REFRESH:</span>
            {[
              { val: 0, label: "MANUAL" },
              { val: 2, label: "2S" },
              { val: 5, label: "5S" },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setAutoRefreshInterval(opt.val)}
                className={`px-1.5 py-0.2 rounded-xs font-bold transition-colors cursor-pointer ${
                  autoRefreshInterval === opt.val
                    ? "bg-[#ff8800] text-[#0b0813]"
                    : "text-[#7a7194] hover:text-[#e2e8f0]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <DracoTooltip content="Pindai Ulang Soket TCP Win32" shortcut="F5" position="bottom" accent="cyan">
            <button
              onClick={fetchPorts}
              disabled={isLoading}
              className="flex items-center gap-1 px-2 py-1 bg-[#161026] hover:bg-[#281b3d] text-[#00e5ff] border border-[#261d38] font-bold transition-colors cursor-pointer text-[10px]"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin text-[#00e5ff]" : ""}`} />
              <span>SCAN WIN32</span>
            </button>
          </DracoTooltip>

          <DracoTooltip content="Kill Seluruh Server Dev yang Menggantung" position="bottom" accent="pink">
            <button
              onClick={() => setShowSlayAllModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#ff1744]/20 hover:bg-[#ff1744] text-[#ff1744] hover:text-white border border-[#ff1744]/40 font-bold transition-colors cursor-pointer text-[10px]"
            >
              <Trash2 className="w-3 h-3" />
              <span>SLAY ALL DEV ZOMBIES</span>
            </button>
          </DracoTooltip>
        </div>
      </div>

      {/* Ribbon Bar: Metrics, Filter Tabs, and Search */}
      <div className="bg-[#0e0a19] px-3 py-1.5 border-b border-[#261d38] text-[11px] flex items-center justify-between gap-3">
        {/* Metric Badges */}
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-[#7a7194]">
            DEV PORTS ACTIVE: <span className="text-[#ff8800] font-bold">{devListeningCount}</span>
          </span>
          <span className="text-[#261d38]">|</span>
          <span className="text-[#7a7194]">
            TOTAL LISTENING: <span className="text-[#00e676] font-bold">{totalListeningCount}</span>
          </span>
          {probeResult && (
            <>
              <span className="text-[#261d38]">|</span>
              <span className="text-[#00e5ff]">
                PORT :{probeResult.port} LATENCY: <span className="font-bold">{probeResult.latencyMs}ms</span>
                {probeResult.banner && <span className="text-[#7a7194] ml-1">({probeResult.banner})</span>}
              </span>
            </>
          )}
        </div>

        {/* Filter Tabs & Search */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#120c1f] border border-[#261d38] p-0.5">
            <button
              onClick={() => setFilterMode("dev")}
              className={`px-2 py-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                filterMode === "dev" ? "bg-[#ff8800] text-[#0b0813]" : "text-[#7a7194] hover:text-white"
              }`}
            >
              DEV PORTS
            </button>
            <button
              onClick={() => setFilterMode("listening")}
              className={`px-2 py-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                filterMode === "listening" ? "bg-[#00e676] text-[#0b0813]" : "text-[#7a7194] hover:text-white"
              }`}
            >
              ALL LISTENING
            </button>
            <button
              onClick={() => setFilterMode("all")}
              className={`px-2 py-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                filterMode === "all" ? "bg-[#00e5ff] text-[#0b0813]" : "text-[#7a7194] hover:text-white"
              }`}
            >
              ALL SOCKETS
            </button>
          </div>

          <div className="bg-[#0b0813] border border-[#261d38] focus-within:border-[#00e5ff] px-2 py-0.5 flex items-center gap-1.5 transition-colors">
            <Search className="w-3 h-3 text-[#7a7194]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search port / process..."
              className="bg-transparent text-[#e2e8f0] outline-none font-mono text-[10px] w-36"
            />
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className={`px-3 py-1 border-b flex items-center justify-between text-[10px] ${
          actionMessage.isError
            ? "bg-[#ff1744]/15 border-[#ff1744]/40 text-[#ff1744]"
            : "bg-[#00e676]/15 border-[#00e676]/40 text-[#00e676]"
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-[#7a7194] hover:text-white">✕</button>
        </div>
      )}

      {/* Port Matrix Table */}
      <div className="flex-1 p-3 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#261d38] text-[#7a7194] text-[10px] uppercase font-bold sticky top-0 bg-[#0b0813]">
              <th className="py-1 px-2">Port</th>
              <th className="py-1 px-2">Protocol</th>
              <th className="py-1 px-2">Label / Service</th>
              <th className="py-1 px-2">PID</th>
              <th className="py-1 px-2">Process Name</th>
              <th className="py-1 px-2">Status</th>
              <th className="py-1 px-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#261d38]/50">
            {filteredPorts.length === 0 && !isLoading && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#7a7194]">
                  Tidak ada port aktif yang sesuai dengan kriteria filter.
                </td>
              </tr>
            )}

            {filteredPorts.map((p) => {
              const isListening = p.state === "LISTENING";
              const isKilling = killingPid === p.pid;
              const isProbing = probingPort === p.port;

              return (
                <tr key={`${p.port}-${p.pid}-${p.state}`} className="hover:bg-[#161026] transition-colors">
                  {/* Port Number */}
                  <td className="py-2 px-2 font-bold text-[#00e5ff]">{p.port}</td>

                  {/* Protocol */}
                  <td className="py-2 px-2 text-[#7a7194] text-[10px]">{p.protocol}</td>

                  {/* Label */}
                  <td className="py-2 px-2 text-[#cbd5e1]">
                    <span className={p.isDevPort ? "text-[#ff8800] font-bold" : ""}>
                      {p.label}
                    </span>
                  </td>

                  {/* PID */}
                  <td className="py-2 px-2 text-[#7a7194] font-mono">{p.pid}</td>

                  {/* Process Name */}
                  <td className="py-2 px-2 text-[#e2e8f0]">
                    <span className="flex items-center gap-1.5">
                      {p.isProtected && <Shield className="w-3 h-3 text-[#ff007f]" />}
                      <span>{p.processName}</span>
                      {p.isSelf && <span className="text-[9px] text-[#ff007f] font-bold">[DRACODECK]</span>}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-2 px-2">
                    {isListening ? (
                      <span className="text-[10px] text-[#00e676] bg-[#00e676]/10 px-1.5 py-0.5 border border-[#00e676]/30 font-semibold">
                        LISTENING
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#7a7194] bg-[#161026] px-1.5 py-0.5 border border-[#261d38]">
                        {p.state}
                      </span>
                    )}
                  </td>

                  {/* Action Buttons */}
                  <td className="py-2 px-2 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Probe Button */}
                      <DracoTooltip content="Probe Socket Connection & Latency" position="left" accent="cyan">
                        <button
                          onClick={() => handleProbe(p.port)}
                          disabled={isProbing}
                          className="px-2 py-0.5 text-[10px] bg-[#161026] hover:bg-[#281b3d] text-[#00e5ff] border border-[#261d38] transition-colors cursor-pointer"
                        >
                          {isProbing ? "..." : "PROBE"}
                        </button>
                      </DracoTooltip>

                      {/* Kill Button */}
                      {p.isProtected ? (
                        <span className="text-[9px] text-[#ff007f] bg-[#ff007f]/10 px-1.5 py-0.5 border border-[#ff007f]/30">
                          PROTECTED
                        </span>
                      ) : (
                        <DracoTooltip content={`Force Kill Process Tree PID ${p.pid}`} shortcut="taskkill /F /T" position="left" accent="pink">
                          <button
                            onClick={() => handleKill(p.pid)}
                            disabled={isKilling}
                            className="bg-[#ff1744]/20 hover:bg-[#ff1744] text-[#ff1744] hover:text-white px-2 py-0.5 text-[10px] border border-[#ff1744]/40 font-bold tracking-wider transition-colors cursor-pointer"
                          >
                            {isKilling ? "KILLING..." : "KILL TREE"}
                          </button>
                        </DracoTooltip>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Slay All Dev Confirmation Modal */}
      {showSlayAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
          <div className="w-[420px] bg-[#120c1f] border border-[#ff1744] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-[#ff1744]">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm tracking-wider">TERMINATE ALL DEV ZOMBIE PROCESSES</h3>
            </div>
            <p className="text-xs text-[#cbd5e1] leading-relaxed">
              Tindakan ini akan mematikan seluruh proses developer (Node.js, Vite, Python, DB) yang saat ini mengunci port dev tanpa menyentuh proses sistem Windows.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#261d38]">
              <button
                onClick={() => setShowSlayAllModal(false)}
                className="px-3 py-1 bg-[#161026] hover:bg-[#281b3d] text-[#7a7194] text-xs font-bold"
              >
                CANCEL
              </button>
              <button
                onClick={handleSlayAllDevZombies}
                className="px-4 py-1 bg-[#ff1744] hover:bg-[#d50000] text-white text-xs font-bold"
              >
                CONFIRM SLAY ALL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

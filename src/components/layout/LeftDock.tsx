import React, { useState, useEffect } from "react";
import {
  Monitor,
  FolderTree,
  Terminal,
  Radio,
  Sliders,
  Globe,
  Zap,
  Lock,
  Power,
  FolderSync,
  Shield,
  Key,
  AlertTriangle,
  X,
  Volume2,
  VolumeX,
  Wifi,
  Cpu,
  Activity,
  Search,
  Binary,
  GitBranch,
} from "lucide-react";
import { ActiveView } from "../../types";
import { DracoTooltip } from "../common/DracoTooltip";
import { DracodeLogo } from "../common/DracodeLogo";

interface LeftDockProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onChangeWorkspace: () => void;
  onOpenOffensiveSuite?: (initialTab?: "recon" | "vuln" | "web" | "reverse" | "cockpit") => void;
}

export const LeftDock: React.FC<LeftDockProps> = ({
  activeView,
  onSelectView,
  onChangeWorkspace,
  onOpenOffensiveSuite,
}) => {
  const [time, setTime] = useState<{ hour: string; min: string; period: string }>({
    hour: "00",
    min: "00",
    period: "AM",
  });
  const [isWhiskerOpen, setIsWhiskerOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockPass, setLockPass] = useState("");
  const [showPowerModal, setShowPowerModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sysGauges, setSysGauges] = useState<{ cpu: number; ram: number }>({ cpu: 12, ram: 44 });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let h = now.getHours();
      const m = now.getMinutes().toString().padStart(2, "0");
      const p = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      setTime({ hour: h.toString().padStart(2, "0"), min: m, period: p });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll system memory & CPU telemetry
  useEffect(() => {
    const fetchSys = async () => {
      if (window.dracoAPI?.getSysInfo) {
        try {
          const info = await window.dracoAPI.getSysInfo();
          const usedMemPct = Math.round(((info.totalMem - info.freeMem) / info.totalMem) * 100);
          setSysGauges({
            cpu: info.cpuLoadPct ?? 10,
            ram: usedMemPct,
          });
        } catch {}
      }
    };
    fetchSys();
    const timer = setInterval(fetchSys, 5000);
    return () => clearInterval(timer);
  }, []);

  const navItems: {
    id: ActiveView;
    label: string;
    shortcut: string;
    accent: "cyan" | "pink" | "green" | "amber";
    icon: React.ReactNode;
  }[] = [
    {
      id: "desktop",
      label: "Kali Desktop Space",
      shortcut: "Alt+D",
      accent: "cyan",
      icon: <Monitor className="w-4 h-4 text-[#38bdf8]" />,
    },
    {
      id: "editor",
      label: "Dracode",
      shortcut: "Alt+E",
      accent: "pink",
      icon: <DracodeLogo size={18} />,
    },
    {
      id: "explorer",
      label: "Draco File Workstation",
      shortcut: "Alt+F",
      accent: "cyan",
      icon: <FolderTree className="w-4 h-4 text-[#00e5ff]" />,
    },
    {
      id: "browser",
      label: "DracoBrowser (Chromium)",
      shortcut: "Alt+B",
      accent: "green",
      icon: <Globe className="w-4 h-4 text-[#00e676]" />,
    },
    {
      id: "terminal",
      label: "ConPTY Terminal",
      shortcut: "Ctrl+`",
      accent: "cyan",
      icon: <Terminal className="w-4 h-4 text-[#00e5ff]" />,
    },
    {
      id: "telemetry",
      label: "Antigravity Telemetry",
      shortcut: "Alt+T",
      accent: "pink",
      icon: <Radio className="w-4 h-4 text-[#d500f9]" />,
    },
    {
      id: "offensive",
      label: "Offensive Security Suite",
      shortcut: "Alt+O",
      accent: "pink",
      icon: <Shield className="w-4 h-4 text-[#ff007f]" />,
    },
    {
      id: "slayer",
      label: "Zombie Port Slayer",
      shortcut: "Alt+P",
      accent: "amber",
      icon: <Zap className="w-4 h-4 text-[#ff8800]" />,
    },
    {
      id: "gitops",
      label: "DracoOps Git & Memory",
      shortcut: "Alt+G",
      accent: "green",
      icon: <GitBranch className="w-4 h-4 text-[#00e676]" />,
    },
  ];

  const offensiveCategories = [
    {
      tab: "recon" as const,
      cat: "01 - Info Gathering",
      tools: ["Network Adapters", "DNS & Host Recon", "Port Discovery"],
      icon: <Search className="w-3 h-3 text-[#ff8800]" />,
    },
    {
      tab: "vuln" as const,
      cat: "02 - Vuln Analysis",
      tools: ["Security Headers Audit", "SSL/TLS Inspector", "Cve Matrix"],
      icon: <Activity className="w-3 h-3 text-[#ff007f]" />,
    },
    {
      tab: "web" as const,
      cat: "03 - Web Application",
      tools: ["DracoBrowser Suite", "HTTP Dispatcher", "Method Prober"],
      icon: <Globe className="w-3 h-3 text-[#00e676]" />,
    },
    {
      tab: "reverse" as const,
      cat: "04 - Reverse Eng",
      tools: ["Binary Hex Dump", "String Extractor", "Checksum Hasher"],
      icon: <Binary className="w-3 h-3 text-[#00e5ff]" />,
    },
    {
      tab: "cockpit" as const,
      cat: "05 - Cockpit Core",
      tools: ["Dracode", "ConPTY Shell", "Port Slayer"],
      icon: <Terminal className="w-3 h-3 text-[#cbd5e1]" />,
    },
  ];

  const handleShutdown = async () => {
    if (window.dracoAPI?.quitApp) {
      await window.dracoAPI.quitApp();
    } else {
      window.close();
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLocked(false);
    setLockPass("");
  };

  return (
    <>
      <aside className="w-14 h-full bg-[#120c1f] border-r border-[#261d38] flex flex-col justify-between items-center py-2 select-none z-40 relative font-mono">
        {/* Top: Kali Dragon Menu Launcher */}
        <div className="flex flex-col items-center gap-2 w-full">
          <DracoTooltip content="Dracodeck Application Launcher" shortcut="Super" position="right" accent="pink">
            <button
              onClick={() => setIsWhiskerOpen(!isWhiskerOpen)}
              className="relative w-10 h-10 rounded-xs bg-[#161026] hover:bg-[#281b3d] border border-[#261d38] flex items-center justify-center p-1 transition-all group"
            >
              <img
                src="/dracodeck-logo.jpg"
                alt="Dracodeck"
                className="w-full h-full object-contain filter group-hover:drop-shadow-[0_0_8px_#ff007f]"
              />
              {/* Neon Magenta Active Indicator Dot */}
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#ff007f] border border-[#120c1f] shadow-[0_0_6px_#ff007f]" />
            </button>
          </DracoTooltip>

          {/* Categorized Whisker Menu Popover */}
          {isWhiskerOpen && (
            <div className="absolute top-2 left-16 w-80 bg-[#161026] border border-[#261d38] shadow-[0_12px_40px_rgba(0,0,0,0.9)] py-2 text-xs z-50">
              <div
                onClick={() => {
                  onOpenOffensiveSuite?.("recon");
                  setIsWhiskerOpen(false);
                }}
                className="px-3 py-1.5 border-b border-[#261d38] flex items-center justify-between text-[10px] text-[#7a7194] uppercase tracking-wider font-bold cursor-pointer hover:bg-[#281b3d] transition-colors"
              >
                <span className="flex items-center gap-1.5 text-[#00e5ff]">
                  <Shield className="w-3.5 h-3.5 text-[#ff007f]" />
                  <span>DRACODECK OFFENSIVE SUITE</span>
                </span>
                <span className="text-[#ff007f]">OPERATOR HUD</span>
              </div>

              {/* Pinned Primary Launchers */}
              <div className="grid grid-cols-2 gap-1 p-2 border-b border-[#261d38]">
                {navItems.slice(0, 4).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectView(item.id);
                      setIsWhiskerOpen(false);
                    }}
                    className="flex items-center gap-2 p-1.5 rounded-xs bg-[#120c1f] hover:bg-[#281b3d] text-[#cbd5e1] hover:text-[#00e5ff] text-[11px] truncate transition-colors text-left"
                  >
                    <span>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Categorized Offensive Domains */}
              <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
                {offensiveCategories.map((group) => (
                  <div key={group.cat} className="space-y-1">
                    <div
                      onClick={() => {
                        onOpenOffensiveSuite?.(group.tab);
                        setIsWhiskerOpen(false);
                      }}
                      className="flex items-center gap-1.5 cursor-pointer hover:text-[#00e5ff]"
                    >
                      {group.icon}
                      <p className="text-[10px] font-bold text-[#ff8800] uppercase tracking-wider">
                        {group.cat}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-0.5">
                      {group.tools.map((t) => (
                        <div
                          key={t}
                          onClick={() => {
                            if (t === "DracoBrowser Suite") onSelectView("browser");
                            else if (t === "Dracode") onSelectView("editor");
                            else if (t === "ConPTY Shell") onSelectView("terminal");
                            else if (t === "Port Slayer") onSelectView("slayer");
                            else onOpenOffensiveSuite?.(group.tab);
                            setIsWhiskerOpen(false);
                          }}
                          className="px-2 py-0.5 text-[10.5px] text-[#94a3b8] hover:bg-[#281b3d] hover:text-[#00e676] cursor-pointer rounded-xs transition-colors truncate"
                        >
                          ▸ {t}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#261d38] mt-1 pt-1.5 px-2 flex justify-between items-center text-[10px]">
                <button
                  onClick={() => {
                    onChangeWorkspace();
                    setIsWhiskerOpen(false);
                  }}
                  className="flex items-center gap-1.5 text-[#ff8800] hover:underline"
                >
                  <FolderSync className="w-3 h-3" />
                  <span>Switch Root</span>
                </button>
                <button
                  onClick={() => {
                    setIsLocked(true);
                    setIsWhiskerOpen(false);
                  }}
                  className="flex items-center gap-1.5 text-[#00e5ff] hover:underline"
                >
                  <Lock className="w-3 h-3" />
                  <span>Lock Deck</span>
                </button>
              </div>
            </div>
          )}

          <div className="w-8 h-px bg-[#261d38] my-1" />

          {/* Middle: Pinned App Launchers with Custom Cyberdeck Tooltips */}
          <div className="flex flex-col items-center gap-1.5 w-full px-1">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <DracoTooltip
                  key={item.id}
                  content={item.label}
                  shortcut={item.shortcut}
                  position="right"
                  accent={item.accent}
                >
                  <button
                    onClick={() => onSelectView(item.id)}
                    className={`relative w-10 h-10 rounded-xs flex items-center justify-center transition-all ${
                      isActive
                        ? "bg-[#281b3d] text-[#00e5ff] border border-[#ff007f]/50 shadow-[0_0_10px_rgba(255,0,127,0.25)]"
                        : "text-[#7a7194] hover:text-[#e2e8f0] hover:bg-[#161026]"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute -left-1 top-2 bottom-2 w-1 bg-[#ff007f] rounded-r-sm" />
                    )}
                    {item.icon}
                  </button>
                </DracoTooltip>
              );
            })}
          </div>
        </div>

        {/* Bottom: Live Telemetry Gauges, Tray, Clock & Shutdown */}
        <div className="flex flex-col items-center gap-2 w-full text-center">
          {/* Live Mini Hardware Resource Gauges */}
          <div className="flex flex-col items-center gap-1 bg-[#0b0813] border border-[#261d38] p-1 rounded-xs w-10">
            <DracoTooltip content={`CPU Load: ~${sysGauges.cpu}%`} position="right" accent="cyan">
              <div className="w-full flex flex-col items-center cursor-help">
                <div className="flex items-center gap-0.5 text-[8px] text-[#00e5ff]">
                  <Cpu className="w-2.5 h-2.5" />
                  <span>{sysGauges.cpu}%</span>
                </div>
                <div className="w-full h-1 bg-[#261d38] rounded-xs overflow-hidden mt-0.5">
                  <div style={{ width: `${sysGauges.cpu}%` }} className="h-full bg-[#00e676]" />
                </div>
              </div>
            </DracoTooltip>

            <DracoTooltip content={`RAM Usage: ${sysGauges.ram}%`} position="right" accent="pink">
              <div className="w-full flex flex-col items-center cursor-help">
                <div className="flex items-center gap-0.5 text-[8px] text-[#ff007f]">
                  <Activity className="w-2.5 h-2.5" />
                  <span>{sysGauges.ram}%</span>
                </div>
                <div className="w-full h-1 bg-[#261d38] rounded-xs overflow-hidden mt-0.5">
                  <div style={{ width: `${sysGauges.ram}%` }} className="h-full bg-[#ff007f]" />
                </div>
              </div>
            </DracoTooltip>
          </div>

          {/* Quick Lock Button */}
          <DracoTooltip content="Lock Cockpit" shortcut="Alt+L" position="right" accent="cyan">
            <button
              onClick={() => setIsLocked(true)}
              className="w-8 h-8 rounded-xs flex items-center justify-center text-[#7a7194] hover:text-[#00e5ff] hover:bg-[#161026] transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </DracoTooltip>

          {/* Settings */}
          <DracoTooltip content="Settings" shortcut="Alt+S" position="right" accent="cyan">
            <button
              onClick={() => onSelectView("settings")}
              className={`w-8 h-8 rounded-xs flex items-center justify-center transition-colors ${
                activeView === "settings"
                  ? "text-[#00e5ff] bg-[#281b3d]"
                  : "text-[#7a7194] hover:text-[#e2e8f0] hover:bg-[#161026]"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </DracoTooltip>

          {/* Mini Tray Indicators */}
          <div className="flex items-center gap-1.5 text-[#7a7194] py-1 border-t border-[#261d38] w-8 justify-center">
            <DracoTooltip content="Network Status: UP" position="right" accent="green">
              <span>
                <Wifi className="w-2.5 h-2.5 text-[#00e676]" />
              </span>
            </DracoTooltip>
            <DracoTooltip content={isMuted ? "Unmute Audio" : "Mute Audio"} position="right" accent="pink">
              <button onClick={() => setIsMuted(!isMuted)} className="hover:text-white">
                {isMuted ? <VolumeX className="w-2.5 h-2.5 text-[#ff1744]" /> : <Volume2 className="w-2.5 h-2.5" />}
              </button>
            </DracoTooltip>
          </div>

          {/* Vertical Stacked Clock */}
          <div className="flex flex-col text-[10px] font-mono leading-tight text-[#e2e8f0] bg-[#161026] px-1 py-1 rounded-xs border border-[#261d38] w-10">
            <span className="font-bold text-[#00e5ff]">{time.hour}</span>
            <span className="text-[#cbd5e1]">{time.min}</span>
            <span className="text-[8px] text-[#ff007f] font-semibold">{time.period}</span>
          </div>

          {/* Dedicated Kali Linux Power / Shutdown Button */}
          <DracoTooltip content="Shutdown Cockpit" shortcut="Alt+F4" position="right" accent="pink">
            <button
              onClick={() => setShowPowerModal(true)}
              className="w-10 h-10 mt-1 rounded-xs flex items-center justify-center bg-[#ff1744]/15 hover:bg-[#ff1744] text-[#ff1744] hover:text-white border border-[#ff1744]/40 transition-all group"
            >
              <Power className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          </DracoTooltip>
        </div>
      </aside>

      {/* Screen Lock Overlay */}
      {isLocked && (
        <div className="fixed inset-0 z-50 bg-[#07050a]/95 backdrop-blur-md flex flex-col items-center justify-center select-none font-mono">
          <div className="w-80 bg-[#161026] border border-[#ff007f]/50 p-6 flex flex-col items-center text-center shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
            <div className="w-14 h-14 rounded-xs bg-[#0b0813] border border-[#261d38] p-2 mb-3">
              <img src="/dracodeck-logo.jpg" alt="Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_8px_#ff007f]" />
            </div>
            <h3 className="font-bold text-[#e2e8f0] text-sm tracking-wider">DRACODECK COCKPIT LOCKED</h3>
            <p className="text-[10px] text-[#7a7194] mt-1 mb-4">Offensive session protected under Kali Dark Vault</p>

            <form onSubmit={handleUnlock} className="w-full space-y-3">
              <div className="flex items-center gap-2 bg-[#0b0813] border border-[#261d38] px-3 py-1.5 focus-within:border-[#00e5ff]">
                <Key className="w-3.5 h-3.5 text-[#ff007f]" />
                <input
                  type="password"
                  value={lockPass}
                  onChange={(e) => setLockPass(e.target.value)}
                  placeholder="Enter passcode to unlock..."
                  className="bg-transparent text-xs text-[#cbd5e1] outline-none flex-1 font-mono"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="w-full py-1.5 bg-[#ff007f] hover:bg-[#e0007b] text-white font-bold text-xs transition-colors"
              >
                UNLOCK SESSION
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Kali System Session Dialog */}
      {showPowerModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center select-none font-mono">
          <div className="w-96 bg-[#161026] border border-[#ff1744]/60 shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#261d38]">
              <div className="flex items-center gap-2 text-[#ff1744]">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-bold text-xs uppercase tracking-wider">KALI SESSION TERMINATION</span>
              </div>
              <button
                onClick={() => setShowPowerModal(false)}
                className="text-[#7a7194] hover:text-white p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#cbd5e1] py-4 leading-relaxed">
              Are you sure you want to terminate the <strong className="text-[#ff007f]">DRACODECK</strong> workstation session and shut down all background telemetry engines?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#261d38]">
              <button
                onClick={() => setShowPowerModal(false)}
                className="px-3 py-1.5 text-xs text-[#7a7194] hover:text-white hover:bg-[#281b3d] border border-[#261d38] transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={handleShutdown}
                className="px-4 py-1.5 text-xs bg-[#ff1744] hover:bg-[#d50000] text-white font-bold transition-colors flex items-center gap-1.5"
              >
                <Power className="w-3.5 h-3.5" />
                <span>SHUTDOWN</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

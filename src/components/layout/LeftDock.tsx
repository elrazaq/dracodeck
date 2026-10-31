import React, { useState, useEffect } from "react";
import { FolderTree, Terminal, Radio, Zap, Sliders, FolderSync, Monitor, Wifi, Volume2, Power, AlertTriangle, X, Globe } from "lucide-react";
import { ActiveView } from "../../types";

interface LeftDockProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onChangeWorkspace: () => void;
}

export const LeftDock: React.FC<LeftDockProps> = ({
  activeView,
  onSelectView,
  onChangeWorkspace,
}) => {
  const [time, setTime] = useState({ hour: "00", min: "00", period: "AM" });
  const [isWhiskerOpen, setIsWhiskerOpen] = useState(false);
  const [showPowerModal, setShowPowerModal] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      let hours = now.getHours();
      const period = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const min = now.getMinutes().toString().padStart(2, "0");
      setTime({ hour: hours.toString().padStart(2, "0"), min, period });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
    { id: "desktop", label: "Kali Desktop Space", icon: <Monitor className="w-4 h-4" /> },
    { id: "explorer", label: "Kali File Manager", icon: <FolderTree className="w-4 h-4" /> },
    { id: "browser", label: "DracoBrowser (Chromium)", icon: <Globe className="w-4 h-4" /> },
    { id: "terminal", label: "ConPTY Terminal", icon: <Terminal className="w-4 h-4" /> },
    { id: "telemetry", label: "Antigravity Telemetry", icon: <Radio className="w-4 h-4" /> },
    { id: "slayer", label: "Zombie Port Slayer", icon: <Zap className="w-4 h-4" /> },
  ];

  const handleShutdown = async () => {
    if (window.dracoAPI?.quitApp) {
      await window.dracoAPI.quitApp();
    } else {
      window.close();
    }
  };

  return (
    <>
      <aside className="w-14 h-screen bg-[#120c1f] border-r border-[#261d38] flex flex-col justify-between items-center py-2 select-none z-40 relative">
        {/* Top: Kali Dragon Menu Launcher */}
        <div className="flex flex-col items-center gap-2 w-full">
          <button
            onClick={() => setIsWhiskerOpen(!isWhiskerOpen)}
            title="Dracodeck Application Launcher"
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

          {/* Whisker Menu Popover */}
          {isWhiskerOpen && (
            <div className="absolute top-2 left-16 w-60 bg-[#161026] border border-[#261d38] shadow-[0_8px_30px_rgba(0,0,0,0.8)] py-1.5 text-xs z-50">
              <div className="px-3 py-1.5 border-b border-[#261d38] flex items-center justify-between text-[10px] text-[#7a7194] uppercase tracking-wider font-bold">
                <span>KALI APPLICATION MENU</span>
                <span className="text-[#ff007f]">DRACODECK</span>
              </div>
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onSelectView(item.id); setIsWhiskerOpen(false); }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-[#cbd5e1] hover:bg-[#281b3d] hover:text-[#00e5ff] transition-colors"
                >
                  <span className="text-[#00e5ff]">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
              <div className="border-t border-[#261d38] mt-1 pt-1">
                <button
                  onClick={() => { onChangeWorkspace(); setIsWhiskerOpen(false); }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 text-[#ff8800] hover:bg-[#281b3d] transition-colors"
                >
                  <FolderSync className="w-3.5 h-3.5" />
                  <span>Switch Workspace Folder</span>
                </button>
                <button
                  onClick={() => { setShowPowerModal(true); setIsWhiskerOpen(false); }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 text-[#ff1744] hover:bg-[#ff1744]/20 transition-colors"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Shutdown Cockpit</span>
                </button>
              </div>
            </div>
          )}

          <div className="w-8 h-px bg-[#261d38] my-1" />

          {/* Middle: Pinned App Launchers */}
          <div className="flex flex-col items-center gap-1.5 w-full px-1">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  title={item.label}
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
              );
            })}
          </div>
        </div>

        {/* Bottom: System Tray, Clock & Shutdown */}
        <div className="flex flex-col items-center gap-2 w-full text-center">
          {/* Switch Workspace Quick Icon */}
          <button
            onClick={onChangeWorkspace}
            title="Switch Workspace Folder"
            className="w-8 h-8 rounded-xs flex items-center justify-center text-[#7a7194] hover:text-[#ff8800] hover:bg-[#161026] transition-colors"
          >
            <FolderSync className="w-3.5 h-3.5" />
          </button>

          {/* Settings */}
          <button
            onClick={() => onSelectView("settings")}
            title="System Settings"
            className={`w-8 h-8 rounded-xs flex items-center justify-center transition-colors ${
              activeView === "settings"
                ? "text-[#00e5ff] bg-[#281b3d]"
                : "text-[#7a7194] hover:text-[#e2e8f0] hover:bg-[#161026]"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Mini Tray Indicators */}
          <div className="flex items-center gap-1.5 text-[#7a7194] py-1 border-t border-[#261d38] w-8 justify-center">
            <Wifi className="w-2.5 h-2.5 text-[#00e676]" />
            <Volume2 className="w-2.5 h-2.5" />
          </div>

          {/* Vertical Stacked Clock (Like Kali XFCE Vertical Panel) */}
          <div className="flex flex-col text-[10px] font-mono leading-tight text-[#e2e8f0] bg-[#161026] px-1 py-1 rounded-xs border border-[#261d38] w-10">
            <span className="font-bold text-[#00e5ff]">{time.hour}</span>
            <span className="text-[#cbd5e1]">{time.min}</span>
            <span className="text-[8px] text-[#ff007f] font-semibold">{time.period}</span>
          </div>

          {/* Dedicated Kali Linux Power / Shutdown Button */}
          <button
            onClick={() => setShowPowerModal(true)}
            title="Shutdown / Exit Dracodeck Cockpit"
            className="w-10 h-10 mt-1 rounded-xs flex items-center justify-center bg-[#ff1744]/15 hover:bg-[#ff1744] text-[#ff1744] hover:text-white border border-[#ff1744]/40 transition-all group"
          >
            <Power className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </aside>

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

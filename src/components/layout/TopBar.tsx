import React, { useState, useEffect } from "react";
import { FolderSync, GitBranch, Radio, Terminal, FileCode, Zap, ChevronDown } from "lucide-react";

interface TopBarProps {
  activePanel: string;
  workspacePath: string;
  onChangeWorkspace: () => void;
  onSelectPanel: (panel: any) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activePanel,
  workspacePath,
  onChangeWorkspace,
  onSelectPanel,
}) => {
  const [time, setTime] = useState<string>("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-GB", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const workspaceBasename = workspacePath.split(/[/\\]/).filter(Boolean).pop() || workspacePath;

  return (
    <header className="h-8 bg-[#0a0e17] border-b border-[#1b253b] flex items-center justify-between px-2 text-xs select-none tracking-tight relative z-30">
      {/* Left: Kali Menu Launcher & Workspace info */}
      <div className="flex items-center gap-2">
        {/* Kali Launcher Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center gap-1.5 px-2 py-1 bg-[#111726] hover:bg-[#1b253b] text-[#00e5ff] border border-[#1b253b] transition-colors"
        >
          <img src="/dracodex-logo.jpg" alt="Logo" className="w-3.5 h-3.5 object-contain" />
          <span className="font-bold tracking-widest text-[11px] uppercase">DRACODEX</span>
          <ChevronDown className="w-3 h-3 text-[#64748b]" />
        </button>

        {/* Dropdown Menu (Whisker Launcher Simulation) */}
        {isMenuOpen && (
          <div className="absolute top-8 left-2 w-56 bg-[#0d131f] border border-[#1b253b] shadow-2xl py-1 text-xs">
            <div className="px-3 py-1.5 border-b border-[#1b253b] text-[10px] text-[#64748b] uppercase tracking-wider font-semibold">
              KALI DEVELOPER TOOLS
            </div>
            <button
              onClick={() => { onSelectPanel("explorer"); setIsMenuOpen(false); }}
              className="w-full px-3 py-2 text-left flex items-center gap-2 text-[#cbd5e1] hover:bg-[#111726] hover:text-[#00e5ff]"
            >
              <FileCode className="w-3.5 h-3.5 text-[#2979ff]" />
              <span>File Explorer</span>
            </button>
            <button
              onClick={() => { onSelectPanel("terminal"); setIsMenuOpen(false); }}
              className="w-full px-3 py-2 text-left flex items-center gap-2 text-[#cbd5e1] hover:bg-[#111726] hover:text-[#00e5ff]"
            >
              <Terminal className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>ConPTY Terminal</span>
            </button>
            <button
              onClick={() => { onSelectPanel("telemetry"); setIsMenuOpen(false); }}
              className="w-full px-3 py-2 text-left flex items-center gap-2 text-[#cbd5e1] hover:bg-[#111726] hover:text-[#00e5ff]"
            >
              <Radio className="w-3.5 h-3.5 text-[#00e676]" />
              <span>Antigravity Telemetry</span>
            </button>
            <button
              onClick={() => { onSelectPanel("slayer"); setIsMenuOpen(false); }}
              className="w-full px-3 py-2 text-left flex items-center gap-2 text-[#cbd5e1] hover:bg-[#111726] hover:text-[#ff1744]"
            >
              <Zap className="w-3.5 h-3.5 text-[#ff1744]" />
              <span>Zombie Port Slayer</span>
            </button>
            <div className="border-t border-[#1b253b] mt-1 pt-1">
              <button
                onClick={() => { onChangeWorkspace(); setIsMenuOpen(false); }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 text-[#ffea00] hover:bg-[#111726]"
              >
                <FolderSync className="w-3.5 h-3.5" />
                <span>Switch Workspace Folder</span>
              </button>
            </div>
          </div>
        )}

        <span className="text-[#1b253b]">|</span>

        {/* Active Workspace Tag with Quick Switcher */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-[#64748b]">WS:</span>
          <span className="text-[#e2e8f0] font-semibold font-mono">{workspaceBasename}</span>
          <button
            onClick={onChangeWorkspace}
            title={`Current: ${workspacePath}\nClick to change`}
            className="flex items-center gap-1 text-[10px] text-[#2979ff] hover:text-[#00e5ff] bg-[#111726] hover:bg-[#1b253b] px-1.5 py-0.5 border border-[#1b253b]"
          >
            <FolderSync className="w-2.5 h-2.5" />
            <span>Switch</span>
          </button>
        </div>

        <span className="text-[#1b253b]">/</span>

        {/* Git Branch Badge */}
        <div className="flex items-center gap-1 text-[11px] text-[#2979ff]">
          <GitBranch className="w-3 h-3 text-[#2979ff]" />
          <span>main</span>
          <span className="text-[9px] text-[#00e676] bg-[#00e676]/10 px-1 py-0.2 border border-[#00e676]/30">
            CLEAN
          </span>
        </div>
      </div>

      {/* Center Active Context */}
      <div className="flex items-center gap-2 text-[#64748b] text-[11px]">
        <span className="text-[#1b253b] font-mono">//</span>
        <span className="text-[#94a3b8] uppercase tracking-wider text-[10px]">
          ACTIVE VIEW: <span className="text-[#00e5ff] font-semibold">{activePanel}</span>
        </span>
      </div>

      {/* System Status & Time */}
      <div className="flex items-center gap-3 text-[11px]">
        {/* Monitored Ports Badges */}
        <div className="flex items-center gap-1 text-[10px] font-mono">
          <span className="text-[#64748b]">PORTS:</span>
          <span className="bg-[#111726] border border-[#00e676]/40 text-[#00e676] px-1.5 py-0.2">
            5173:DEV
          </span>
          <span className="bg-[#111726] border border-[#1b253b] text-[#64748b] px-1.5 py-0.2">
            3000:IDLE
          </span>
        </div>

        <span className="text-[#1b253b]">|</span>

        {/* Telemetry Status Indicator */}
        <div className="flex items-center gap-1 text-[#00e5ff] text-[10px]">
          <Radio className="w-3 h-3 animate-pulse text-[#00e5ff]" />
          <span className="tracking-wider">AI:TAIL</span>
        </div>

        <span className="text-[#1b253b]">|</span>

        {/* Real-time Clock */}
        <div className="text-[#cbd5e1] font-mono text-[11px] tracking-wider">
          {time || "--:--:--"}
        </div>
      </div>
    </header>
  );
};

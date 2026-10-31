import React from "react";
import { Minus, Square, X, Wifi } from "lucide-react";
import { DracoTooltip } from "../common/DracoTooltip";

interface TopBarProps {
  workspace: string | null;
  onQuit?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ workspace, onQuit }) => {
  const handleMinimize = () => {
    window.dracoAPI?.windowMinimize?.();
  };

  const handleMaximize = () => {
    window.dracoAPI?.windowMaximize?.();
  };

  const handleClose = () => {
    if (onQuit) {
      onQuit();
    } else {
      window.dracoAPI?.windowClose?.();
    }
  };

  const workspaceName = workspace
    ? workspace.split(/[/\\]/).filter(Boolean).pop() || workspace
    : "OFFLINE";

  return (
    <header className="h-7 w-full bg-[#0e0a19] border-b border-[#261d38] px-3 flex items-center justify-between text-xs select-none z-50 font-mono text-[#cbd5e1]">
      {/* Left: Branding & Active Workspace Path */}
      <div className="flex items-center gap-2.5 truncate">
        <div className="w-4 h-4 rounded-xs bg-[#161026] border border-[#261d38] p-0.5 flex items-center justify-center">
          <img src="/dracodeck-logo.jpg" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <span className="font-bold text-[#e2e8f0] text-[11px] tracking-wide">
          DRACODECK <span className="text-[#ff007f] font-normal">// KALI RUNTIME</span>
        </span>
        <span className="text-[#443a57] hidden sm:inline">|</span>
        <div className="items-center gap-1.5 text-[10px] text-[#7a7194] truncate hidden md:flex">
          <span>SCOPE:</span>
          <span className="text-[#00e5ff] font-semibold truncate">{workspaceName}</span>
        </div>
      </div>

      {/* Right: Network Status & Frameless Window Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-[10px] text-[#00e676]">
          <Wifi className="w-3 h-3 text-[#00e676]" />
          <span className="hidden sm:inline font-bold">NET READY</span>
        </div>

        <div className="h-3 w-px bg-[#261d38]" />

        {/* Window Controls with Hacker Cyberdeck Tooltips */}
        <div className="flex items-center gap-1 text-[#7a7194]">
          <DracoTooltip content="Minimize Cockpit" shortcut="Alt+F9" position="bottom">
            <button
              onClick={handleMinimize}
              className="p-1 hover:bg-[#281b3d] hover:text-[#00e5ff] transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
          </DracoTooltip>

          <DracoTooltip content="Toggle Fullscreen" shortcut="F11" position="bottom">
            <button
              onClick={handleMaximize}
              className="p-1 hover:bg-[#281b3d] hover:text-[#00e5ff] transition-colors"
            >
              <Square className="w-2.5 h-2.5" />
            </button>
          </DracoTooltip>

          <DracoTooltip content="Terminate Session" shortcut="Alt+F4" position="bottom">
            <button
              onClick={handleClose}
              className="p-1 hover:bg-[#ff1744] hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </DracoTooltip>
        </div>
      </div>
    </header>
  );
};

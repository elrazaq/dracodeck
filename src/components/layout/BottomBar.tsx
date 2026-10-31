import React, { useState } from "react";
import { GitBranch, Radio, Check, Bell, X } from "lucide-react";

interface BottomBarProps {
  workspace: string;
  activeLanguage?: string;
  onFormatCode?: () => void;
  onOpenTelemetry?: () => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  workspace,
  activeLanguage = "Markdown",
  onFormatCode,
  onOpenTelemetry,
}) => {
  const wsName = workspace.split(/[/\\]/).filter(Boolean).pop() || workspace;

  const [activeBranch, setActiveBranch] = useState("main");
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);
  const [showLineJump, setShowLineJump] = useState(false);
  const [jumpLine, setJumpLine] = useState("");
  const [encoding, setEncoding] = useState("UTF-8");
  const [lineEnding, setLineEnding] = useState("LF");
  const [formatStatus, setFormatStatus] = useState<string | null>(null);

  const branches = ["main", "dev", "feature/cyberdeck", "hotfix/conpty"];

  const systemLogs = [
    { time: "17:58:12", source: "ConPTY", msg: "PowerShell bridge listening on IPC" },
    { time: "17:58:14", source: "Chromium", msg: "DracoBrowser webRequest interceptor active" },
    { time: "17:58:15", source: "Filesystem", msg: "Universal drives (C:, D:) mapped" },
    { time: "17:58:20", source: "DracoShell", msg: "Custom command dictionary loaded" },
  ];

  const handleTriggerFormat = () => {
    onFormatCode?.();
    setFormatStatus("FORMATTED");
    setTimeout(() => setFormatStatus(null), 2500);
  };

  const handleJumpLine = (e: React.FormEvent) => {
    e.preventDefault();
    setShowLineJump(false);
    setJumpLine("");
  };

  return (
    <>
      <footer className="h-6 bg-[#ff007f] text-[#0b0813] font-mono text-[11px] font-bold flex items-center justify-between px-3 select-none flex-shrink-0 z-40 shadow-[0_-2px_10px_rgba(255,0,127,0.3)] relative">
        {/* Left items */}
        <div className="flex items-center gap-3">
          {/* Git Branch Selector */}
          <div
            onClick={() => setShowBranchMenu(!showBranchMenu)}
            title="Click to Switch Git Branch"
            className="flex items-center gap-1 hover:bg-[#e0007b] px-1.5 py-0.5 cursor-pointer transition-colors"
          >
            <GitBranch className="w-3 h-3 text-[#0b0813]" />
            <span>{activeBranch}*</span>
          </div>

          {/* Sync Status Button */}
          <div
            onClick={() => alert("Git Sync: Workspace working tree up to date with origin/main.")}
            title="Git Sync Status"
            className="flex items-center gap-1 hover:bg-[#e0007b] px-1.5 py-0.5 cursor-pointer transition-colors"
          >
            <Check className="w-3 h-3 text-[#0b0813]" />
            <span>synced</span>
          </div>

          {/* Notification & System Logs Drawer Trigger */}
          <div
            onClick={() => setShowLogsDrawer(true)}
            title="Open Notification & Diagnostic Logs"
            className="flex items-center gap-1 hover:bg-[#e0007b] px-1.5 py-0.5 cursor-pointer transition-colors"
          >
            <Bell className="w-3 h-3 text-[#0b0813]" />
            <span>4</span>
          </div>

          {/* Workspace Tag */}
          <span className="opacity-60 hidden sm:inline">|</span>
          <span className="tracking-wider uppercase text-[10px] hidden sm:inline truncate max-w-[150px]">
            WS: {wsName}
          </span>
        </div>

        {/* Right items */}
        <div className="flex items-center gap-2.5 text-[10px]">
          {/* Line/Col Jumper */}
          <button
            onClick={() => setShowLineJump(true)}
            title="Jump to Line (Ctrl+G)"
            className="hover:bg-[#e0007b] px-1 py-0.5 cursor-pointer transition-colors"
          >
            Ln 1, Col 1
          </button>

          {/* Encoding Selector */}
          <button
            onClick={() => setEncoding(encoding === "UTF-8" ? "ASCII" : "UTF-8")}
            title="Toggle File Encoding"
            className="hover:bg-[#e0007b] px-1 py-0.5 cursor-pointer transition-colors hidden md:inline"
          >
            {encoding}
          </button>

          {/* Line Ending Selector */}
          <button
            onClick={() => setLineEnding(lineEnding === "LF" ? "CRLF" : "LF")}
            title="Toggle Line Endings"
            className="hover:bg-[#e0007b] px-1 py-0.5 cursor-pointer transition-colors hidden md:inline"
          >
            {lineEnding}
          </button>

          <span className="opacity-60 hidden md:inline">|</span>

          {/* Language Mode */}
          <span className="hover:bg-[#e0007b] px-1 py-0.5 cursor-pointer">{activeLanguage}</span>

          {/* Antigravity AI Telemetry Shortcut */}
          <button
            onClick={onOpenTelemetry}
            title="View Live Antigravity Telemetry"
            className="flex items-center gap-1 bg-[#0b0813] hover:bg-[#161026] text-[#00e5ff] px-2 py-0.5 transition-colors cursor-pointer"
          >
            <Radio className="w-2.5 h-2.5 animate-pulse text-[#00e5ff]" />
            <span>Antigravity</span>
          </button>

          {/* Prettier Auto-Format Trigger Button */}
          <button
            onClick={handleTriggerFormat}
            title="Format Code with Prettier"
            className="flex items-center gap-1 bg-[#0b0813] hover:bg-[#161026] text-[#00e676] px-2 py-0.5 transition-colors cursor-pointer"
          >
            <span>{formatStatus || "Prettier ✓"}</span>
          </button>
        </div>
      </footer>

      {/* Git Branch Switcher Popover */}
      {showBranchMenu && (
        <div
          onClick={() => setShowBranchMenu(false)}
          className="fixed inset-0 z-50 bg-black/40 flex items-end pb-8 pl-4 select-none font-mono"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-64 bg-[#161026] border border-[#261d38] shadow-[0_15px_45px_rgba(0,0,0,0.95)] p-2 text-xs"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-[#261d38] mb-2 text-[#ff007f] font-bold text-[10px]">
              <span className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" />
                <span>SWITCH WORKSPACE BRANCH</span>
              </span>
              <button onClick={() => setShowBranchMenu(false)} className="text-[#7a7194] hover:text-white">
                ✕
              </button>
            </div>
            <div className="space-y-1">
              {branches.map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    setActiveBranch(b);
                    setShowBranchMenu(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 flex items-center justify-between rounded-xs text-[11px] transition-colors ${
                    activeBranch === b
                      ? "bg-[#281b3d] text-[#00e5ff] font-bold border-l-2 border-[#ff007f]"
                      : "text-[#cbd5e1] hover:bg-[#120c1f]"
                  }`}
                >
                  <span>{b}</span>
                  {activeBranch === b && <Check className="w-3 h-3 text-[#00e676]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Line & Column Jump Modal */}
      {showLineJump && (
        <div
          onClick={() => setShowLineJump(false)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center select-none font-mono"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-72 bg-[#161026] border border-[#261d38] p-4 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#261d38] mb-3 text-[#00e5ff] font-bold">
              <span>GO TO LINE</span>
              <button onClick={() => setShowLineJump(false)} className="text-[#7a7194] hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleJumpLine} className="space-y-3">
              <input
                type="number"
                value={jumpLine}
                onChange={(e) => setJumpLine(e.target.value)}
                placeholder="Type line number (1 - 500)..."
                autoFocus
                className="w-full bg-[#0b0813] border border-[#261d38] p-2 text-xs text-[#cbd5e1] outline-none focus:border-[#ff007f]"
              />
              <button
                type="submit"
                className="w-full py-1.5 bg-[#ff007f] hover:bg-[#e0007b] text-white font-bold transition-colors"
              >
                JUMP
              </button>
            </form>
          </div>
        </div>
      )}

      {/* System Diagnostic & Notifications Drawer */}
      {showLogsDrawer && (
        <div
          onClick={() => setShowLogsDrawer(false)}
          className="fixed inset-0 z-50 bg-black/60 flex justify-end select-none font-mono"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-96 h-full bg-[#120c1f] border-l border-[#261d38] p-4 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#261d38] mb-3 text-[#ff007f] font-bold text-xs">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5" />
                <span>DRACODECK DIAGNOSTICS & LOGS</span>
              </div>
              <button onClick={() => setShowLogsDrawer(false)} className="text-[#7a7194] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 text-xs">
              {systemLogs.map((log, i) => (
                <div key={i} className="p-2.5 bg-[#161026] border border-[#261d38] space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-[#7a7194]">
                    <span className="text-[#00e5ff] font-bold">[{log.source}]</span>
                    <span>{log.time}</span>
                  </div>
                  <p className="text-[11px] text-[#cbd5e1]">{log.msg}</p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#261d38] flex justify-between items-center text-[10px] text-[#7a7194]">
              <span>4 Events Captured</span>
              <button
                onClick={() => setShowLogsDrawer(false)}
                className="px-3 py-1 bg-[#281b3d] hover:bg-[#ff007f] text-white transition-colors"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

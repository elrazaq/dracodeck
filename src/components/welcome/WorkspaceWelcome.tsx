import React, { useState } from "react";
import { FolderOpen, ArrowRight, Shield, Terminal, Zap } from "lucide-react";

interface WorkspaceWelcomeProps {
  onSelectWorkspace: (path: string) => void;
}

export const WorkspaceWelcome: React.FC<WorkspaceWelcomeProps> = ({
  onSelectWorkspace,
}) => {
  const [manualPath, setManualPath] = useState("D:\\dracodex");
  const [error, setError] = useState<string | null>(null);

  const handleBrowse = async () => {
    try {
      if (window.dracoAPI?.selectFolder) {
        const selected = await window.dracoAPI.selectFolder();
        if (selected) {
          onSelectWorkspace(selected);
          return;
        }
      } else {
        // Fallback if running outside Electron
        if (manualPath.trim()) {
          onSelectWorkspace(manualPath.trim());
        }
      }
    } catch (err: any) {
      setError(err?.message || "Failed to select folder");
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPath.trim()) {
      setError("Please enter a valid directory path.");
      return;
    }
    onSelectWorkspace(manualPath.trim());
  };

  return (
    <div className="h-screen w-screen bg-[#0a0e17] text-[#cbd5e1] font-mono flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      {/* Background Cyber Grid Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1b253b15_1px,transparent_1px),linear-gradient(to_bottom,#1b253b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Kali Cyberdeck Initializer Card */}
      <div className="relative z-10 w-full max-w-2xl bg-[#0d131f] border-2 border-[#1b253b] shadow-2xl p-8 flex flex-col items-center text-center">
        {/* Top scanline header */}
        <div className="w-full flex items-center justify-between border-b border-[#1b253b] pb-3 mb-6 text-xs text-[#64748b]">
          <div className="flex items-center gap-2 text-[#00e5ff]">
            <Shield className="w-4 h-4 text-[#00e5ff]" />
            <span className="font-bold tracking-widest uppercase">KALI-DECK // WORKSPACE INITIALIZER</span>
          </div>
          <span className="text-[10px] text-[#00e676] bg-[#00e676]/10 px-2 py-0.5 border border-[#00e676]/30">
            SYSTEM READY
          </span>
        </div>

        {/* Dracodex Logo from user */}
        <div className="relative mb-6 group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#00e5ff] to-[#2979ff] opacity-25 blur-md group-hover:opacity-40 transition-opacity" />
          <img
            src="/dracodex-logo.jpg"
            alt="Dracodex Dragon Logo"
            className="relative w-48 h-auto object-contain border border-[#1b253b]"
          />
        </div>

        {/* Typography & Subtitles */}
        <h1 className="text-2xl font-bold tracking-tight text-[#f8fafc] uppercase mb-1">
          DRACODEX <span className="text-[#00e5ff]">COCKPIT</span>
        </h1>
        <p className="text-xs text-[#64748b] max-w-lg mb-6 leading-relaxed">
          Offensive-grade developer workstation for Windows. To begin, select your primary project workspace. This setting is saved permanently and can be switched anytime.
        </p>

        {/* Action Options */}
        <div className="w-full max-w-md space-y-4">
          {/* Primary Native Directory Picker Button */}
          <button
            onClick={handleBrowse}
            className="w-full flex items-center justify-center gap-3 bg-[#00e5ff] hover:bg-[#2979ff] text-[#0a0e17] hover:text-white font-bold py-3 px-4 text-xs uppercase tracking-wider transition-all duration-200 border border-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.2)]"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Select Workspace Folder</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Quick Preset Selector */}
          <button
            onClick={() => onSelectWorkspace("D:\\dracodex")}
            className="w-full flex items-center justify-center gap-2 bg-[#111726] hover:bg-[#1e293b] text-[#94a3b8] hover:text-[#00e5ff] py-2 px-3 text-xs border border-[#1b253b] transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Quick Select: <code className="text-[#e2e8f0]">D:\dracodex</code></span>
          </button>

          {/* Manual Directory Form */}
          <form onSubmit={handleManualSubmit} className="flex gap-2 pt-2">
            <input
              type="text"
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              placeholder="Or enter path e.g. D:\projects\app"
              className="flex-1 bg-[#0a0e17] border border-[#1b253b] focus:border-[#00e5ff] text-xs px-3 py-2 text-[#e2e8f0] outline-none font-mono"
            />
            <button
              type="submit"
              className="bg-[#111726] hover:bg-[#1b253b] text-[#cbd5e1] border border-[#1b253b] px-3 py-2 text-xs font-semibold"
            >
              Set
            </button>
          </form>

          {error && (
            <p className="text-xs text-[#ff1744] bg-[#ff1744]/10 border border-[#ff1744]/30 py-1.5 px-3">
              {error}
            </p>
          )}
        </div>

        {/* Feature Badges Footer */}
        <div className="w-full border-t border-[#1b253b] mt-8 pt-4 flex items-center justify-around text-[10px] text-[#64748b]">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-[#00e5ff]" />
            <span>PowerShell ConPTY</span>
          </div>
          <span className="text-[#1b253b]">|</span>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-[#2979ff]" />
            <span>Kali Dark Aesthetic</span>
          </div>
          <span className="text-[#1b253b]">|</span>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-[#00e676]" />
            <span>Antigravity Telemetry</span>
          </div>
        </div>
      </div>
    </div>
  );
};

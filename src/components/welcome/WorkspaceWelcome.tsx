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
    <div className="h-screen w-screen bg-[#0b0813] text-[#cbd5e1] font-mono flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      {/* Background Cyber Grid Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#261d3820_1px,transparent_1px),linear-gradient(to_bottom,#261d3820_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Kali Cyberdeck Initializer Card */}
      <div className="relative z-10 w-full max-w-2xl bg-[#120c1f] border-2 border-[#261d38] shadow-[0_0_50px_rgba(0,0,0,0.8)] p-8 flex flex-col items-center text-center">
        {/* Top scanline header */}
        <div className="w-full flex items-center justify-between border-b border-[#261d38] pb-3 mb-6 text-xs text-[#7a7194]">
          <div className="flex items-center gap-2 text-[#00e5ff]">
            <Shield className="w-4 h-4 text-[#ff007f]" />
            <span className="font-bold tracking-widest uppercase">KALI-OS // DRACODECK INITIALIZER</span>
          </div>
          <span className="text-[10px] text-[#00e676] bg-[#00e676]/10 px-2 py-0.5 border border-[#00e676]/30">
            SYSTEM READY
          </span>
        </div>

        {/* Dracodeck Logo */}
        <div className="relative mb-6 group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#ff007f] to-[#00e5ff] opacity-25 blur-md group-hover:opacity-40 transition-opacity" />
          <img
            src="/dracodeck-logo.jpg"
            alt="Dracodeck Logo"
            className="relative w-52 h-auto object-contain border border-[#261d38]"
          />
        </div>

        {/* Typography & Subtitles */}
        <h1 className="text-2xl font-bold tracking-tight text-[#f8fafc] uppercase mb-1">
          DRACODECK <span className="text-[#ff007f]">COCKPIT</span>
        </h1>
        <p className="text-xs text-[#7a7194] max-w-lg mb-6 leading-relaxed">
          Offensive-grade developer cockpit for Windows. Select your primary project workspace to initialize the Kali OS desktop environment. Persisted permanently in local storage.
        </p>

        {/* Action Options */}
        <div className="w-full max-w-md space-y-4">
          <button
            onClick={handleBrowse}
            className="w-full flex items-center justify-center gap-3 bg-[#ff007f] hover:bg-[#e0007b] text-white font-bold py-3 px-4 text-xs uppercase tracking-wider transition-all duration-200 border border-[#ff007f] shadow-[0_0_15px_rgba(255,0,127,0.3)]"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Select Workspace Folder</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSelectWorkspace("D:\\dracodex")}
            className="w-full flex items-center justify-center gap-2 bg-[#161026] hover:bg-[#281b3d] text-[#cbd5e1] hover:text-[#00e5ff] py-2 px-3 text-xs border border-[#261d38] transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Quick Select: <code className="text-[#00e5ff]">D:\dracodex</code></span>
          </button>

          <form onSubmit={handleManualSubmit} className="flex gap-2 pt-2">
            <input
              type="text"
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              placeholder="Or enter path e.g. D:\projects\app"
              className="flex-1 bg-[#0b0813] border border-[#261d38] focus:border-[#ff007f] text-xs px-3 py-2 text-[#e2e8f0] outline-none font-mono"
            />
            <button
              type="submit"
              className="bg-[#161026] hover:bg-[#281b3d] text-[#cbd5e1] border border-[#261d38] px-3 py-2 text-xs font-semibold"
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
        <div className="w-full border-t border-[#261d38] mt-8 pt-4 flex items-center justify-around text-[10px] text-[#7a7194]">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-[#00e5ff]" />
            <span>PowerShell ConPTY</span>
          </div>
          <span className="text-[#261d38]">|</span>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-[#ff007f]" />
            <span>Kali Dark OS Experience</span>
          </div>
          <span className="text-[#261d38]">|</span>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-[#00e676]" />
            <span>Antigravity Telemetry</span>
          </div>
        </div>
      </div>
    </div>
  );
};

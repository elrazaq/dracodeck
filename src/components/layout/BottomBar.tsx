import React from "react";
import { GitBranch, Radio, Check, AlertCircle } from "lucide-react";

interface BottomBarProps {
  workspace: string;
  activeLanguage?: string;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  workspace,
  activeLanguage = "Markdown",
}) => {
  const wsName = workspace.split(/[/\\]/).filter(Boolean).pop() || workspace;

  return (
    <footer className="h-6 bg-[#ff007f] text-[#0b0813] font-mono text-[11px] font-bold flex items-center justify-between px-3 select-none flex-shrink-0 z-40 shadow-[0_-2px_10px_rgba(255,0,127,0.3)]">
      {/* Left items */}
      <div className="flex items-center gap-3">
        {/* Git Branch */}
        <div className="flex items-center gap-1 hover:bg-[#e0007b] px-1.5 py-0.5 cursor-pointer">
          <GitBranch className="w-3 h-3 text-[#0b0813]" />
          <span>main*</span>
        </div>

        {/* Sync Status */}
        <div className="flex items-center gap-1 hover:bg-[#e0007b] px-1.5 py-0.5 cursor-pointer">
          <Check className="w-3 h-3 text-[#0b0813]" />
          <span>synced</span>
        </div>

        {/* Errors / Warnings */}
        <div className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-[#0b0813]" />
          <span>0</span>
        </div>

        {/* Workspace Tag */}
        <span className="opacity-60">|</span>
        <span className="tracking-wider uppercase text-[10px]">WS: {wsName}</span>
      </div>

      {/* Right items */}
      <div className="flex items-center gap-3 text-[10px]">
        <span>Ln 1, Col 1</span>
        <span>Spaces: 2</span>
        <span>UTF-8</span>
        <span>LF</span>
        <span className="opacity-60">|</span>
        <span>{activeLanguage}</span>
        <div className="flex items-center gap-1 bg-[#0b0813] text-[#00e5ff] px-2 py-0.2 rounded-xs">
          <Radio className="w-2.5 h-2.5 animate-pulse text-[#00e5ff]" />
          <span>Antigravity</span>
        </div>
        <span>Prettier ✓</span>
      </div>
    </footer>
  );
};

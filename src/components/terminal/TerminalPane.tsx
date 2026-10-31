import React from "react";
import { Terminal, Plus } from "lucide-react";

export const TerminalPane: React.FC = () => {
  return (
    <div className="h-full bg-[#0a0e17] flex flex-col font-mono text-xs overflow-hidden">
      {/* Terminal Tab Bar */}
      <div className="h-7 bg-[#0d131f] border-b border-[#1b253b] flex items-center justify-between px-2 select-none">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#0a0e17] border border-[#1b253b] text-[#00e5ff] text-[11px]">
            <Terminal className="w-3 h-3" />
            <span>pwsh.exe:1</span>
          </div>
          <button
            title="New Terminal"
            className="p-1 hover:bg-[#111726] text-[#64748b] hover:text-[#e2e8f0]"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[#64748b]">
          <span>ConPTY (Windows 11)</span>
          <span className="text-[#1b253b]">|</span>
          <span className="text-[#00e676]">PORTABLE-PTY READY</span>
        </div>
      </div>

      {/* Terminal Screen Canvas */}
      <div className="flex-1 p-3 overflow-y-auto bg-[#0a0e17] text-[#cbd5e1] leading-5 space-y-1">
        <div className="text-[#64748b]">
          Windows PowerShell - ConPTY PseudoConsole Bridge [Version 10.0.26100]
        </div>
        <div className="text-[#64748b]">
          (c) Microsoft Corporation. DRACODECK Terminal Shell v0.1.0.
        </div>
        <div className="mt-2 text-[#00e5ff]">
          <span>[DRACODECK CONSOLE READY FOR M2 xterm.js ATTACH]</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[#2979ff] font-semibold">PS D:\dracodex&gt;</span>
          <span className="text-[#cbd5e1]">Get-Process -Name tauri*</span>
        </div>
        <div className="text-[#94a3b8] text-[11px] py-1">
          <pre className="text-[#64748b]">
            {"Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id ProcessName\n-------  ------    -----      -----     ------     -- -----------\n    182      14    32400      48200       0.12   4920 tauri"}
          </pre>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#2979ff] font-semibold">PS D:\dracodex&gt;</span>
          <span className="inline-block w-2 h-4 bg-[#00e5ff] animate-pulse"></span>
        </div>
      </div>
    </div>
  );
};

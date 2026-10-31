import React from "react";
import { Terminal, Plus } from "lucide-react";

export const TerminalPane: React.FC = () => {
  return (
    <div className="h-full bg-[#0b0813] flex flex-col font-mono text-xs overflow-hidden border-t border-[#261d38]">
      {/* Terminal Tab Bar */}
      <div className="h-7 bg-[#120c1f] border-b border-[#261d38] flex items-center justify-between px-2 select-none">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#0b0813] border border-[#261d38] text-[#00e5ff] text-[11px] font-semibold border-b-2 border-b-[#ff007f]">
            <Terminal className="w-3 h-3 text-[#ff007f]" />
            <span>pwsh.exe:1</span>
          </div>
          <button
            title="New Terminal"
            className="p-1 hover:bg-[#161026] text-[#7a7194] hover:text-[#e2e8f0]"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[#7a7194]">
          <span>ConPTY (Windows 11)</span>
          <span className="text-[#261d38]">|</span>
          <span className="text-[#00e676]">POWER-SHELL READY</span>
        </div>
      </div>

      {/* Terminal Screen Canvas */}
      <div className="flex-1 p-3 overflow-y-auto bg-[#0b0813] text-[#cbd5e1] leading-5 space-y-1">
        <div className="text-[#7a7194]">
          Windows PowerShell - ConPTY PseudoConsole Bridge [Version 10.0.26100]
        </div>
        <div className="text-[#7a7194]">
          (c) Microsoft Corporation. DRACODECK Terminal Shell v0.1.0.
        </div>
        <div className="mt-2 text-[#00e5ff]">
          <span>[DRACODECK CONSOLE READY FOR M2 xterm.js ATTACH]</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[#ff007f] font-semibold">●</span>
          <span className="text-[#00e5ff] font-semibold">PS D:\dracodex&gt;</span>
          <span className="text-[#a3e635]">npm run dev</span>
        </div>
        <div className="text-[#7a7194] text-[11px] py-1">
          <pre className="text-[#00e676]">
            {"[vite] (client) hmr update /src/index.css\n[vite] (client) connected to Dracodeck engine."}
          </pre>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#ff007f] font-semibold">●</span>
          <span className="text-[#00e5ff] font-semibold">PS D:\dracodex&gt;</span>
          <span className="inline-block w-2 h-4 bg-[#ff007f] animate-pulse"></span>
        </div>
      </div>
    </div>
  );
};

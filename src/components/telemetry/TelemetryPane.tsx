import React from "react";
import { Radio, Terminal, FilePlus, ChevronDown, CheckCircle2 } from "lucide-react";

export const TelemetryPane: React.FC = () => {
  return (
    <div className="h-full bg-[#0b0813] flex flex-col font-mono text-xs overflow-hidden">
      {/* Header */}
      <div className="h-7 bg-[#120c1f] border-b border-[#261d38] px-3 flex items-center justify-between text-[11px] select-none">
        <div className="flex items-center gap-2 text-[#00e5ff]">
          <Radio className="w-3.5 h-3.5 text-[#ff007f] animate-pulse" />
          <span className="font-semibold uppercase tracking-wider text-[#e2e8f0]">ANTIGRAVITY LIVE TELEMETRY</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#7a7194]">
          <span className="text-[#00e676] bg-[#00e676]/10 px-1.5 py-0.2 border border-[#00e676]/30 font-semibold">
            TAILER: ACTIVE
          </span>
          <span>FILE_SHARE_READ</span>
        </div>
      </div>

      {/* Target Path Subbar */}
      <div className="bg-[#0e0a19] px-3 py-1 border-b border-[#261d38] text-[10px] text-[#7a7194] truncate flex items-center justify-between">
        <span className="truncate">
          TARGET: <span className="text-[#cbd5e1]">.gemini\antigravity\brain\0e47664f...\logs\transcript.jsonl</span>
        </span>
        <span className="text-[#ff007f] font-semibold flex-shrink-0">M3 ENGINE SLOT</span>
      </div>

      {/* Tool Invocation Events Stream */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
        {/* Step Card 1 */}
        <div className="bg-[#161026] border border-[#261d38] p-2.5 space-y-1.5 rounded-xs">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-[#00e5ff]">
              <Terminal className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span className="font-semibold">run_command</span>
              <span className="text-[#7a7194] text-[10px]">[Step #4]</span>
            </div>
            <div className="flex items-center gap-1 text-[#00e676] text-[10px]">
              <CheckCircle2 className="w-3 h-3" />
              <span>EXIT 0 (5.2s)</span>
            </div>
          </div>
          <div className="bg-[#0b0813] px-2 py-1 text-[11px] text-[#cbd5e1] border border-[#261d38]/60 font-mono">
            npm install lucide-react
          </div>
        </div>

        {/* Step Card 2 */}
        <div className="bg-[#161026] border border-[#261d38] p-2.5 space-y-1.5 rounded-xs">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-[#ff8800]">
              <FilePlus className="w-3.5 h-3.5 text-[#ff8800]" />
              <span className="font-semibold">write_file</span>
              <span className="text-[#7a7194] text-[10px]">[Step #5]</span>
            </div>
            <div className="flex items-center gap-1 text-[#00e676] text-[10px]">
              <CheckCircle2 className="w-3 h-3" />
              <span>SAVED (0.1s)</span>
            </div>
          </div>
          <div className="bg-[#0b0813] px-2 py-1 text-[11px] text-[#cbd5e1] border border-[#261d38]/60 font-mono">
            d:\dracodex\docs\m1-1-kali-os-experience.md
          </div>
        </div>

        {/* Step Card 3 - Thinking Accordion */}
        <div className="bg-[#161026] border border-[#261d38] p-2.5 space-y-1.5 rounded-xs">
          <div className="flex items-center justify-between text-[11px] cursor-pointer">
            <div className="flex items-center gap-1.5 text-[#ffea00]">
              <ChevronDown className="w-3.5 h-3.5" />
              <span className="font-semibold">Cognitive Flow (Model Thinking)</span>
            </div>
            <span className="text-[10px] text-[#7a7194]">240 tokens</span>
          </div>
          <div className="bg-[#0b0813] p-2 text-[10px] text-[#cbd5e1] leading-relaxed border border-[#261d38]/60 font-mono">
            Execute Milestone M1-1. Aligned full color palette with user VS Code Cyberpunk Violet (#ff007f bottom status bar, #0b0813 void, #161026 surface). Integrated strict folder-first ascending sorting in Kali file manager.
          </div>
        </div>
      </div>
    </div>
  );
};

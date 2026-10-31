import React, { useState, useMemo } from "react";
import { Copy, Check, Columns, AlignJustify, FileCode } from "lucide-react";
import type { TelemetryDiff } from "../../vite-env";
import { DracoTooltip } from "../common/DracoTooltip";

interface DiffViewerProps {
  diff: TelemetryDiff;
  compact?: boolean;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, compact = false }) => {
  const [viewMode, setViewMode] = useState<"unified" | "split">("unified");
  const [copied, setCopied] = useState(false);

  const targetLines = useMemo(() => {
    if (!diff.target) return [];
    return diff.target.split(/\r?\n/);
  }, [diff.target]);

  const replacementLines = useMemo(() => {
    if (!diff.replacement) return [];
    return diff.replacement.split(/\r?\n/);
  }, [diff.replacement]);

  const handleCopyPatch = () => {
    let patch = `--- a/${diff.path}\n+++ b/${diff.path}\n`;
    targetLines.forEach((l) => (patch += `-${l}\n`));
    replacementLines.forEach((l) => (patch += `+${l}\n`));

    navigator.clipboard.writeText(patch);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const fileName = diff.path ? diff.path.split(/[/\\]/).pop() || diff.path : "diff";

  return (
    <div className="bg-[#0b0813] border border-[#261d38] font-mono text-[11px] overflow-hidden rounded-xs my-1">
      {/* Diff Header Bar */}
      <div className="bg-[#120c1f] px-2.5 py-1.5 border-b border-[#261d38] flex items-center justify-between select-none">
        <div className="flex items-center gap-1.5 truncate text-[#cbd5e1]">
          <FileCode className="w-3.5 h-3.5 text-[#00e5ff] flex-shrink-0" />
          <span className="font-semibold text-[#00e5ff] truncate">{fileName}</span>
          <span className="text-[#64748b] text-[10px] hidden sm:inline truncate">{diff.path}</span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 text-[10px]">
          {/* Changes badge */}
          <span className="text-[#ff1744] bg-[#ff1744]/10 px-1 py-0.5 border border-[#ff1744]/30">
            -{targetLines.length}
          </span>
          <span className="text-[#00e676] bg-[#00e676]/10 px-1 py-0.5 border border-[#00e676]/30">
            +{replacementLines.length}
          </span>

          {/* Mode Switcher with Cyberdeck Tooltips */}
          {!compact && (
            <div className="flex items-center bg-[#161026] border border-[#261d38] rounded-xs overflow-hidden">
              <DracoTooltip content="Unified View" position="bottom" accent="cyan">
                <button
                  onClick={() => setViewMode("unified")}
                  className={`px-1.5 py-0.5 flex items-center gap-1 transition-colors ${
                    viewMode === "unified" ? "bg-[#00e5ff]/20 text-[#00e5ff]" : "text-[#7a7194] hover:text-[#e2e8f0]"
                  }`}
                >
                  <AlignJustify className="w-3 h-3" />
                  <span className="hidden md:inline">Unified</span>
                </button>
              </DracoTooltip>

              <DracoTooltip content="Split Side-by-Side" position="bottom" accent="cyan">
                <button
                  onClick={() => setViewMode("split")}
                  className={`px-1.5 py-0.5 flex items-center gap-1 transition-colors ${
                    viewMode === "split" ? "bg-[#00e5ff]/20 text-[#00e5ff]" : "text-[#7a7194] hover:text-[#e2e8f0]"
                  }`}
                >
                  <Columns className="w-3 h-3" />
                  <span className="hidden md:inline">Split</span>
                </button>
              </DracoTooltip>
            </div>
          )}

          {/* Copy Patch */}
          <DracoTooltip content="Copy Git Patch" position="bottom" accent="green">
            <button
              onClick={handleCopyPatch}
              className="flex items-center gap-1 px-1.5 py-0.5 bg-[#161026] hover:bg-[#261d38] border border-[#261d38] text-[#cbd5e1] hover:text-[#00e5ff] transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-[#00e676]" /> : <Copy className="w-3 h-3" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </button>
          </DracoTooltip>
        </div>
      </div>

      {/* Diff Content View */}
      <div className={`overflow-x-auto ${compact ? "max-h-48" : "max-h-96"} overflow-y-auto`}>
        {viewMode === "unified" || compact ? (
          <div className="divide-y divide-[#261d38]/30">
            {/* Deleted Target Lines */}
            {targetLines.map((line, idx) => (
              <div
                key={`del_${idx}`}
                className="flex items-start bg-[#ff1744]/15 hover:bg-[#ff1744]/25 transition-colors text-[#ff8a80] leading-relaxed px-2 py-0.5"
              >
                <span className="w-8 select-none text-[#ff1744]/70 text-right pr-2 text-[10px]">
                  {idx + 1}
                </span>
                <span className="w-4 select-none text-[#ff1744] font-bold text-center">-</span>
                <pre className="flex-1 overflow-x-auto font-mono text-[10.5px] whitespace-pre">{line || " "}</pre>
              </div>
            ))}

            {/* Added Replacement Lines */}
            {replacementLines.map((line, idx) => (
              <div
                key={`add_${idx}`}
                className="flex items-start bg-[#00e676]/15 hover:bg-[#00e676]/25 transition-colors text-[#b9f6ca] leading-relaxed px-2 py-0.5"
              >
                <span className="w-8 select-none text-[#00e676]/70 text-right pr-2 text-[10px]">
                  {idx + 1}
                </span>
                <span className="w-4 select-none text-[#00e676] font-bold text-center">+</span>
                <pre className="flex-1 overflow-x-auto font-mono text-[10.5px] whitespace-pre">{line || " "}</pre>
              </div>
            ))}
          </div>
        ) : (
          /* Split Side-by-Side View */
          <div className="grid grid-cols-2 divide-x divide-[#261d38]">
            {/* Left Column: Target (Old) */}
            <div className="divide-y divide-[#261d38]/30 bg-[#120a14]">
              <div className="px-2 py-1 bg-[#1a0e1c] text-[#ff8a80] text-[10px] font-bold border-b border-[#261d38]">
                TARGET (OLD)
              </div>
              {targetLines.length === 0 ? (
                <div className="p-2 text-[#7a7194] italic text-[10px]">Empty / New file created</div>
              ) : (
                targetLines.map((line, idx) => (
                  <div
                    key={`split_del_${idx}`}
                    className="flex items-start bg-[#ff1744]/15 hover:bg-[#ff1744]/25 transition-colors text-[#ff8a80] px-2 py-0.5"
                  >
                    <span className="w-6 select-none text-[#ff1744]/70 text-right pr-2 text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="w-3 select-none text-[#ff1744] font-bold">-</span>
                    <pre className="flex-1 overflow-x-auto font-mono text-[10px] whitespace-pre">{line || " "}</pre>
                  </div>
                ))
              )}
            </div>

            {/* Right Column: Replacement (New) */}
            <div className="divide-y divide-[#261d38]/30 bg-[#0a1610]">
              <div className="px-2 py-1 bg-[#0f241a] text-[#b9f6ca] text-[10px] font-bold border-b border-[#261d38]">
                REPLACEMENT (NEW)
              </div>
              {replacementLines.length === 0 ? (
                <div className="p-2 text-[#7a7194] italic text-[10px]">Deleted / Cleared</div>
              ) : (
                replacementLines.map((line, idx) => (
                  <div
                    key={`split_add_${idx}`}
                    className="flex items-start bg-[#00e676]/15 hover:bg-[#00e676]/25 transition-colors text-[#b9f6ca] px-2 py-0.5"
                  >
                    <span className="w-6 select-none text-[#00e676]/70 text-right pr-2 text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="w-3 select-none text-[#00e676] font-bold">+</span>
                    <pre className="flex-1 overflow-x-auto font-mono text-[10px] whitespace-pre">{line || " "}</pre>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

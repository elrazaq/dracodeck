import React, { useState } from "react";
import {
  Check,
  Copy,
  Terminal,
  Code2,
  ChevronDown,
  ChevronUp,
  FileCode,
} from "lucide-react";
import { VerifiedFinding } from "../../vite-env";
import { DracoTooltip } from "../common/DracoTooltip";

interface ProofCardProps {
  finding: VerifiedFinding;
  index: number;
}

export const ProofCard: React.FC<ProofCardProps> = ({ finding, index }) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleCopyCurl = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(finding.reproducibleCurl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return "border-[#ff1744] text-[#ff1744] bg-[#ff1744]/10";
      case "HIGH":
        return "border-[#ff8800] text-[#ff8800] bg-[#ff8800]/10";
      case "MEDIUM":
        return "border-[#00e5ff] text-[#00e5ff] bg-[#00e5ff]/10";
      default:
        return "border-[#00e676] text-[#00e676] bg-[#00e676]/10";
    }
  };

  return (
    <div className="border border-[#261d38] bg-[#120c1f] hover:border-[#ff007f]/50 transition-colors rounded-xs overflow-hidden font-mono text-xs shadow-md">
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3 py-2 bg-[#161026] border-b border-[#261d38] flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[#7a7194] text-[10px] font-bold">#{index + 1}</span>
          <span className={`px-1.5 py-0.2 border text-[9px] font-bold ${getSeverityStyle(finding.severity)}`}>
            {finding.severity}
          </span>
          <span className="text-[#00e676] bg-[#00e676]/10 border border-[#00e676]/40 px-1.5 py-0.2 text-[9px] font-bold flex items-center gap-1">
            <Check className="w-2.5 h-2.5" />
            <span>VERIFIED PoV ({finding.certaintyScore}%)</span>
          </span>
          <span className="text-[#e2e8f0] font-bold truncate text-[11px]">{finding.title}</span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <DracoTooltip content="Copy Reproducible cURL Command" position="bottom" accent="cyan">
            <button
              onClick={handleCopyCurl}
              className="flex items-center gap-1 px-2 py-0.5 bg-[#0b0813] hover:bg-[#281b3d] text-[#00e5ff] border border-[#261d38] hover:border-[#00e5ff]/50 text-[10px] font-bold transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-[#00e676]" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "COPIED" : "COPY CURL"}</span>
            </button>
          </DracoTooltip>

          <button className="text-[#7a7194] hover:text-[#e2e8f0] p-0.5">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Body Content */}
      {isExpanded && (
        <div className="p-3 space-y-3 bg-[#0d0918]">
          {/* Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-[#7a7194] bg-[#0b0813] p-2 border border-[#261d38]">
            {finding.targetParam && (
              <div>
                <span className="text-[#7a7194]">Vulnerable Parameter:</span>{" "}
                <span className="text-[#ff007f] font-bold font-mono">{finding.targetParam}</span>
              </div>
            )}
            {finding.contextType && (
              <div>
                <span className="text-[#7a7194]">Injection Context:</span>{" "}
                <span className="text-[#00e5ff] font-bold">{finding.contextType}</span>
              </div>
            )}
            {finding.canaryToken && (
              <div className="sm:col-span-2 break-all">
                <span className="text-[#7a7194]">Inert Canary Token:</span>{" "}
                <span className="text-[#00e676] font-mono">{finding.canaryToken}</span>
              </div>
            )}
            {finding.testedUrl && (
              <div className="sm:col-span-2 truncate">
                <span className="text-[#7a7194]">Tested Endpoint:</span>{" "}
                <span className="text-[#cbd5e1] font-mono">{finding.testedUrl}</span>
              </div>
            )}
          </div>

          {/* Forensic Technical Evidence Block */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-[#7a7194] mb-1">
              <span className="flex items-center gap-1 font-bold text-[#ff8800]">
                <FileCode className="w-3 h-3" />
                <span>FORENSIC TECHNICAL EVIDENCE (RAW HTTP DUMP)</span>
              </span>
              <span className="text-[9px] text-[#7a7194]">EXACT BYTE MATCH</span>
            </div>
            <pre className="p-2.5 bg-[#08050e] border border-[#261d38] text-[10.5px] text-[#e2e8f0] overflow-x-auto whitespace-pre-wrap font-mono select-text leading-relaxed">
              {finding.evidenceExcerpt}
            </pre>
          </div>

          {/* Reproducible cURL Command Block */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-[#7a7194] mb-1">
              <span className="flex items-center gap-1 font-bold text-[#00e5ff]">
                <Terminal className="w-3 h-3" />
                <span>REPRODUCIBLE TERMINAL VERIFICATION COMMAND</span>
              </span>
            </div>
            <div className="relative group">
              <pre className="p-2.5 bg-[#050308] border border-[#261d38] text-[10.5px] text-[#00e5ff] overflow-x-auto whitespace-pre font-mono select-text">
                {finding.reproducibleCurl}
              </pre>
              <button
                onClick={handleCopyCurl}
                className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#161026] text-[#7a7194] hover:text-[#00e5ff] border border-[#261d38] text-[9px] font-bold"
              >
                {copied ? "COPIED" : "COPY"}
              </button>
            </div>
          </div>

          {/* Actionable Remediation Guidance */}
          <div className="pt-2 border-t border-[#261d38]">
            <p className="text-[10px] font-bold text-[#00e676] flex items-center gap-1 mb-1">
              <Code2 className="w-3 h-3" />
              <span>ACTIONABLE REMEDIATION GUIDANCE</span>
            </p>
            <p className="text-[11px] text-[#cbd5e1] leading-relaxed bg-[#0b0813] p-2 border border-[#261d38]">
              {finding.remediation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

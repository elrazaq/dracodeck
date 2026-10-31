import React from "react";
import { Zap, RefreshCw } from "lucide-react";

interface PortRow {
  port: number;
  label: string;
  pid: number | null;
  process: string;
  state: "LISTENING" | "IDLE" | "LOCKED";
}

const INITIAL_PORTS: PortRow[] = [
  { port: 1420, label: "Tauri Desktop Host", pid: 4920, process: "tauri.exe", state: "LISTENING" },
  { port: 5173, label: "Vite React Server", pid: 6112, process: "node.exe", state: "LISTENING" },
  { port: 3000, label: "Next.js / Node Default", pid: null, process: "--", state: "IDLE" },
  { port: 8080, label: "Alternative Web Server", pid: null, process: "--", state: "IDLE" },
  { port: 5432, label: "PostgreSQL Database", pid: null, process: "--", state: "IDLE" },
  { port: 8000, label: "FastAPI / Python", pid: null, process: "--", state: "IDLE" },
];

export const SlayerPane: React.FC = () => {
  return (
    <div className="h-full bg-[#0b0813] flex flex-col font-mono text-xs overflow-hidden">
      {/* Header */}
      <div className="h-7 bg-[#120c1f] border-b border-[#261d38] px-3 flex items-center justify-between text-[11px] select-none">
        <div className="flex items-center gap-2 text-[#ff1744]">
          <Zap className="w-3.5 h-3.5 text-[#ff007f]" />
          <span className="font-semibold uppercase tracking-wider text-[#e2e8f0]">PORT & ZOMBIE PROCESS SLAYER</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#7a7194]">
          <button className="flex items-center gap-1 hover:text-[#00e5ff] transition-colors">
            <RefreshCw className="w-3 h-3" />
            <span>SCAN WIN32</span>
          </button>
        </div>
      </div>

      {/* Subheader */}
      <div className="bg-[#0e0a19] px-3 py-1.5 border-b border-[#261d38] text-[10px] text-[#7a7194] flex items-center justify-between">
        <span>Win32 Socket Table: <span className="text-[#00e676]">LATENCY &lt; 2MS</span></span>
        <span className="text-[#00e5ff]">SLAYER ENGINE READY FOR M4</span>
      </div>

      {/* Port Matrix Table */}
      <div className="flex-1 p-3 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#261d38] text-[#7a7194] text-[10px] uppercase font-bold">
              <th className="py-1 px-2">Port</th>
              <th className="py-1 px-2">Label</th>
              <th className="py-1 px-2">PID</th>
              <th className="py-1 px-2">Process</th>
              <th className="py-1 px-2">Status</th>
              <th className="py-1 px-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#261d38]/50">
            {INITIAL_PORTS.map((p) => {
              const isListening = p.state === "LISTENING";
              return (
                <tr key={p.port} className="hover:bg-[#161026] transition-colors">
                  <td className="py-2 px-2 font-bold text-[#00e5ff]">{p.port}</td>
                  <td className="py-2 px-2 text-[#cbd5e1]">{p.label}</td>
                  <td className="py-2 px-2 text-[#7a7194]">{p.pid ?? "-"}</td>
                  <td className="py-2 px-2 text-[#7a7194]">{p.process}</td>
                  <td className="py-2 px-2">
                    {isListening ? (
                      <span className="text-[10px] text-[#00e676] bg-[#00e676]/10 px-1.5 py-0.5 border border-[#00e676]/30 font-semibold">
                        LISTENING
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#7a7194] bg-[#161026] px-1.5 py-0.5 border border-[#261d38]">
                        IDLE
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {p.pid ? (
                      <button
                        title={`Terminate PID ${p.pid}`}
                        className="bg-[#ff1744]/20 hover:bg-[#ff1744] text-[#ff1744] hover:text-white px-2 py-0.5 text-[10px] border border-[#ff1744]/40 font-bold tracking-wider transition-colors"
                      >
                        KILL
                      </button>
                    ) : (
                      <span className="text-[10px] text-[#443a57]">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

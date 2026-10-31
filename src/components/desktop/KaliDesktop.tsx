import React, { useState } from "react";
import { KaliFileManager } from "./KaliFileManager";
import { TerminalPane } from "../terminal/TerminalPane";
import { Folder, Terminal, FileText, Trash2, X, Minus, Square } from "lucide-react";

interface KaliDesktopProps {
  workspacePath: string;
  onOpenFile: (filePath: string, fileName: string) => void;
  onOpenScope: (folderPath: string, folderName: string) => void;
}

export const KaliDesktop: React.FC<KaliDesktopProps> = ({
  workspacePath,
  onOpenFile,
  onOpenScope,
}) => {
  const [isFileWinOpen, setIsFileWinOpen] = useState(true);
  const [isTermWinOpen, setIsTermWinOpen] = useState(false);

  const desktopIcons = [
    {
      id: "files",
      label: "Workspace Root",
      icon: <Folder className="w-10 h-10 text-[#00e5ff] fill-[#00e5ff]/15 stroke-[1.5]" />,
      action: () => setIsFileWinOpen(true),
    },
    {
      id: "term",
      label: "ConPTY Terminal",
      icon: <Terminal className="w-10 h-10 text-[#00e676] stroke-[1.5]" />,
      action: () => setIsTermWinOpen(true),
    },
    {
      id: "readme",
      label: "README.md",
      icon: <FileText className="w-10 h-10 text-[#ff8800] stroke-[1.5]" />,
      action: () => onOpenFile("README.md", "README.md"),
    },
    {
      id: "trash",
      label: "Trash",
      icon: <Trash2 className="w-10 h-10 text-[#7a7194] stroke-[1.5]" />,
      action: () => {},
    },
  ];

  return (
    <div className="h-full w-full bg-[#0b0813] relative overflow-hidden select-none font-mono">
      {/* Kali Cosmic Void Wallpaper */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1d1430] via-[#0e0a19] to-[#07050a] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#261d3810_1px,transparent_1px),linear-gradient(to_bottom,#261d3810_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      {/* Watermark Dracodeck Logo in center background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <img src="/dracodeck-logo.jpg" alt="Watermark" className="w-96 h-auto filter blur-xs" />
      </div>

      {/* Desktop Workspace Icons Grid (Left column on wallpaper) */}
      <div className="absolute top-4 left-6 flex flex-col gap-6 z-10">
        {desktopIcons.map((item) => (
          <div
            key={item.id}
            onDoubleClick={item.action}
            onClick={item.action}
            className="group flex flex-col items-center justify-center w-20 p-2 rounded-xs hover:bg-[#161026]/70 border border-transparent hover:border-[#261d38] cursor-pointer transition-all text-center"
          >
            <div className="mb-1 group-hover:scale-105 transition-transform">
              {item.icon}
            </div>
            <span className="text-[11px] font-mono text-[#cbd5e1] group-hover:text-[#00e5ff] leading-tight break-all">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Neofetch Info Terminal Overlay on Desktop (Like user screenshot) */}
      <div className="absolute bottom-6 right-6 z-10 w-80 bg-[#120c1f]/85 border border-[#261d38] p-3 text-[10px] text-[#cbd5e1] shadow-xl backdrop-blur-sm hidden md:block">
        <div className="flex items-center gap-2 border-b border-[#261d38] pb-1.5 mb-2 text-[#ff007f] font-bold">
          <Terminal className="w-3 h-3" />
          <span>dracodeck@kali: ~</span>
        </div>
        <div className="space-y-0.5 leading-relaxed font-mono">
          <p><span className="text-[#ff007f]">OS:</span> Kali Linux Cyberdeck (Windows 11)</p>
          <p><span className="text-[#00e5ff]">Host:</span> Electron 45.2.1 / Chromium</p>
          <p><span className="text-[#00e676]">Shell:</span> ConPTY PowerShell 7.5</p>
          <p><span className="text-[#ff8800]">DE:</span> Dracodeck XFCE Cyberdeck</p>
          <p><span className="text-[#2979ff]">Theme:</span> Kali Dark Violet [#0b0813]</p>
          <div className="flex gap-1 pt-1.5">
            <span className="w-3 h-2 bg-[#ff007f] inline-block" />
            <span className="w-3 h-2 bg-[#00e5ff] inline-block" />
            <span className="w-3 h-2 bg-[#00e676] inline-block" />
            <span className="w-3 h-2 bg-[#ff8800] inline-block" />
            <span className="w-3 h-2 bg-[#2979ff] inline-block" />
          </div>
        </div>
      </div>

      {/* Floating Kali File Manager Window */}
      {isFileWinOpen && (
        <div className="absolute top-6 left-28 right-8 bottom-12 z-20 shadow-[0_15px_50px_rgba(0,0,0,0.85)] border border-[#261d38] rounded-xs flex flex-col bg-[#161026] overflow-hidden">
          {/* Window Control Header */}
          <div className="h-7 bg-[#120c1f] border-b border-[#261d38] px-3 flex items-center justify-between text-xs select-none">
            <div className="flex items-center gap-2 text-[#e2e8f0]">
              <Folder className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span className="font-bold text-[11px] tracking-wide">Dolphin // Kali File Manager</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFileWinOpen(false)}
                className="p-1 hover:bg-[#281b3d] text-[#7a7194] hover:text-white"
                title="Minimize"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => {}}
                className="p-1 hover:bg-[#281b3d] text-[#7a7194] hover:text-white"
                title="Maximize"
              >
                <Square className="w-2.5 h-2.5" />
              </button>
              <button
                onClick={() => setIsFileWinOpen(false)}
                className="p-1 hover:bg-[#ff1744] text-[#7a7194] hover:text-white"
                title="Close"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <KaliFileManager
              workspacePath={workspacePath}
              onOpenFile={onOpenFile}
              onOpenScope={onOpenScope}
            />
          </div>
        </div>
      )}

      {/* Floating ConPTY Terminal Window */}
      {isTermWinOpen && (
        <div className="absolute top-20 left-36 w-2/3 h-2/3 z-30 shadow-[0_15px_50px_rgba(0,0,0,0.9)] border border-[#261d38] rounded-xs flex flex-col bg-[#0b0813] overflow-hidden">
          <div className="h-7 bg-[#120c1f] border-b border-[#261d38] px-3 flex items-center justify-between text-xs select-none">
            <div className="flex items-center gap-2 text-[#00e676]">
              <Terminal className="w-3.5 h-3.5" />
              <span className="font-bold text-[11px] tracking-wide">ConPTY // PowerShell Terminal</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTermWinOpen(false)}
                className="p-1 hover:bg-[#ff1744] text-[#7a7194] hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <TerminalPane />
          </div>
        </div>
      )}
    </div>
  );
};

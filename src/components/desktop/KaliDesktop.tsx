import React, { useState, useEffect, useRef } from "react";
import { KaliFileManager } from "./KaliFileManager";
import { TerminalPane } from "../terminal/TerminalPane";
import { DracoBrowser } from "../browser/DracoBrowser";
import { TelemetryPane } from "../telemetry/TelemetryPane";
import { DracoTooltip } from "../common/DracoTooltip";
import {
  Folder,
  Terminal,
  FileText,
  Trash2,
  Globe,
  Zap,
  Radio,
  FileCode,
  Image as ImageIcon,
  Palette,
  Check,
  Maximize2,
} from "lucide-react";
import { ActiveView } from "../../types";

interface KaliDesktopProps {
  workspacePath: string;
  onOpenFile: (filePath: string, fileName: string) => void;
  onOpenScope: (folderPath: string, folderName: string) => void;
  onSelectView?: (view: ActiveView) => void;
}

type WallpaperKey = "cosmic" | "dragon" | "matrix" | "abyss";

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isOpen: boolean;
  isMaximized: boolean;
  isMinimized: boolean;
}

export const KaliDesktop: React.FC<KaliDesktopProps> = ({
  workspacePath,
  onOpenFile,
  onOpenScope,
  onSelectView,
}) => {
  // Wallpaper selection with persistence
  const [wallpaper, setWallpaper] = useState<WallpaperKey>(() => {
    return (localStorage.getItem("dracodeck_wallpaper") as WallpaperKey) || "cosmic";
  });
  const [showWallpaperMenu, setShowWallpaperMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  // Floating Windows States (macOS style with Minimize & Dock animations)
  const [fileWin, setFileWin] = useState<WindowState>({
    x: 100,
    y: 40,
    width: 820,
    height: 540,
    isOpen: true,
    isMaximized: false,
    isMinimized: false,
  });

  const [termWin, setTermWin] = useState<WindowState>({
    x: 220,
    y: 120,
    width: 760,
    height: 480,
    isOpen: false,
    isMaximized: false,
    isMinimized: false,
  });

  const [browserWin, setBrowserWin] = useState<WindowState>({
    x: 280,
    y: 80,
    width: 860,
    height: 560,
    isOpen: false,
    isMaximized: false,
    isMinimized: false,
  });

  const [telemetryWin, setTelemetryWin] = useState<WindowState>({
    x: 180,
    y: 70,
    width: 880,
    height: 560,
    isOpen: false,
    isMaximized: false,
    isMinimized: false,
  });

  // Dragging & Resizing References
  const dragRef = useRef<{
    activeWin: "file" | "term" | "browser" | "telemetry" | null;
    mode: "drag" | "resize" | null;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  }>({
    activeWin: null,
    mode: null,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    origW: 0,
    origH: 0,
  });

  const handleWallpaperChange = (key: WallpaperKey) => {
    setWallpaper(key);
    localStorage.setItem("dracodeck_wallpaper", key);
    setShowWallpaperMenu(false);
  };

  const handleDesktopContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowWallpaperMenu(true);
  };

  // Drag & Resize Mouse Handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { activeWin, mode, startX, startY, origX, origY, origW, origH } = dragRef.current;
      if (!activeWin || !mode) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const updateWin = (prev: WindowState) => {
        if (mode === "drag") {
          return {
            ...prev,
            x: Math.max(0, origX + deltaX),
            y: Math.max(0, origY + deltaY),
          };
        }
        if (mode === "resize") {
          return {
            ...prev,
            width: Math.max(480, origW + deltaX),
            height: Math.max(320, origH + deltaY),
          };
        }
        return prev;
      };

      if (activeWin === "file") setFileWin(updateWin);
      if (activeWin === "term") setTermWin(updateWin);
      if (activeWin === "browser") setBrowserWin(updateWin);
      if (activeWin === "telemetry") setTelemetryWin(updateWin);
    };

    const handleMouseUp = () => {
      dragRef.current.activeWin = null;
      dragRef.current.mode = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const startDrag = (winType: "file" | "term" | "browser" | "telemetry", e: React.MouseEvent, win: WindowState) => {
    e.stopPropagation();
    if (win.isMaximized) return;
    dragRef.current = {
      activeWin: winType,
      mode: "drag",
      startX: e.clientX,
      startY: e.clientY,
      origX: win.x,
      origY: win.y,
      origW: win.width,
      origH: win.height,
    };
  };

  const startResize = (winType: "file" | "term" | "browser" | "telemetry", e: React.MouseEvent, win: WindowState) => {
    e.stopPropagation();
    if (win.isMaximized) return;
    dragRef.current = {
      activeWin: winType,
      mode: "resize",
      startX: e.clientX,
      startY: e.clientY,
      origX: win.x,
      origY: win.y,
      origW: win.width,
      origH: win.height,
    };
  };

  // macOS Traffic Light Button Renderer with Hacker Cyberdeck Tooltips
  const renderMacTrafficLights = (
    onClose: () => void,
    onMin: () => void,
    onMax: () => void
  ) => (
    <div className="flex items-center gap-1.5 select-none">
      <DracoTooltip content="Close Window" shortcut="Ctrl+W" position="bottom" accent="pink">
        <button
          onClick={onClose}
          className="w-3 h-3 rounded-full bg-[#ff5f56] hover:brightness-110 border border-[#e0443e] flex items-center justify-center group cursor-pointer"
        >
          <span className="text-[8px] text-[#4a0002] opacity-0 group-hover:opacity-100 font-bold leading-none">×</span>
        </button>
      </DracoTooltip>

      <DracoTooltip content="Minimize (macOS Zoom Effect)" shortcut="Ctrl+M" position="bottom" accent="amber">
        <button
          onClick={onMin}
          className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:brightness-110 border border-[#dea123] flex items-center justify-center group cursor-pointer"
        >
          <span className="text-[8px] text-[#543500] opacity-0 group-hover:opacity-100 font-bold leading-none">-</span>
        </button>
      </DracoTooltip>

      <DracoTooltip content="Maximize / Restore" shortcut="Ctrl+F" position="bottom" accent="green">
        <button
          onClick={onMax}
          className="w-3 h-3 rounded-full bg-[#27c93f] hover:brightness-110 border border-[#1aab29] flex items-center justify-center group cursor-pointer"
        >
          <span className="text-[7px] text-[#004d11] opacity-0 group-hover:opacity-100 font-bold leading-none">⤢</span>
        </button>
      </DracoTooltip>
    </div>
  );

  // Desktop App Shortcuts Grid
  const desktopShortcuts = [
    {
      id: "editor",
      label: "Draco Editor",
      icon: <FileCode className="w-10 h-10 text-[#ff007f] stroke-[1.5]" />,
      action: () => onSelectView?.("editor"),
    },
    {
      id: "files",
      label: "Files Dolphin",
      icon: <Folder className="w-10 h-10 text-[#00e5ff] fill-[#00e5ff]/15 stroke-[1.5]" />,
      action: () => setFileWin((prev) => ({ ...prev, isOpen: true })),
    },
    {
      id: "browser",
      label: "DracoBrowser",
      icon: <Globe className="w-10 h-10 text-[#00e676] stroke-[1.5]" />,
      action: () => setBrowserWin((prev) => ({ ...prev, isOpen: true })),
    },
    {
      id: "term",
      label: "ConPTY Terminal",
      icon: <Terminal className="w-10 h-10 text-[#38bdf8] stroke-[1.5]" />,
      action: () => setTermWin((prev) => ({ ...prev, isOpen: true })),
    },
    {
      id: "slayer",
      label: "Port Slayer",
      icon: <Zap className="w-10 h-10 text-[#ff8800] stroke-[1.5]" />,
      action: () => onSelectView?.("slayer"),
    },
    {
      id: "telemetry",
      label: "AI Telemetry",
      icon: <Radio className="w-10 h-10 text-[#d500f9] stroke-[1.5]" />,
      action: () => setTelemetryWin((prev) => ({ ...prev, isOpen: true })),
    },
    {
      id: "readme",
      label: "README.md",
      icon: <FileText className="w-10 h-10 text-[#cbd5e1] stroke-[1.5]" />,
      action: () => onOpenFile("README.md", "README.md"),
    },
    {
      id: "trash",
      label: "Trash Can",
      icon: <Trash2 className="w-10 h-10 text-[#64748b] stroke-[1.5]" />,
      action: () => {},
    },
  ];

  return (
    <div
      onContextMenu={handleDesktopContextMenu}
      onClick={() => setShowWallpaperMenu(false)}
      className="h-full w-full relative overflow-hidden select-none font-mono"
    >
      {/* Dynamic Desktop Wallpaper Layer */}
      {wallpaper === "cosmic" && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1d1430] via-[#0e0a19] to-[#07050a] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#261d3815_1px,transparent_1px),linear-gradient(to_bottom,#261d3815_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
        </>
      )}

      {wallpaper === "dragon" && (
        <>
          <div className="absolute inset-0 bg-[#07050a] pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center opacity-25 pointer-events-none">
            <img src="/dracodeck-logo.jpg" alt="Dragon Wallpaper" className="w-[600px] h-auto filter drop-shadow-[0_0_50px_#00e5ff]" />
          </div>
        </>
      )}

      {wallpaper === "matrix" && (
        <>
          <div className="absolute inset-0 bg-[#08060e] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(#00e5ff15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        </>
      )}

      {wallpaper === "abyss" && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#08202d] via-[#06121b] to-[#03080e] pointer-events-none" />
      )}

      {/* Windows-style Desktop Application Shortcuts Grid */}
      <div className="absolute top-4 left-4 flex flex-col flex-wrap gap-4 max-h-[85vh] z-10">
        {desktopShortcuts.map((item) => (
          <div
            key={item.id}
            onDoubleClick={item.action}
            onClick={item.action}
            className="group flex flex-col items-center justify-center w-20 p-2 rounded-xs hover:bg-[#161026]/75 border border-transparent hover:border-[#261d38] cursor-pointer transition-all text-center"
          >
            <div className="mb-1 group-hover:scale-110 transition-transform">
              {item.icon}
            </div>
            <span className="text-[11px] font-mono text-[#cbd5e1] group-hover:text-[#00e5ff] leading-tight break-all">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Neofetch System Information Overlay on Desktop */}
      <div className="absolute bottom-6 right-6 z-10 w-80 bg-[#120c1f]/85 border border-[#261d38] p-3 text-[10px] text-[#cbd5e1] shadow-2xl backdrop-blur-sm hidden lg:block">
        <div className="flex items-center gap-2 border-b border-[#261d38] pb-1.5 mb-2 text-[#ff007f] font-bold">
          <Terminal className="w-3 h-3" />
          <span>dracodeck@kali: ~ (Desktop Mode)</span>
        </div>
        <div className="space-y-0.5 leading-relaxed font-mono">
          <p><span className="text-[#ff007f]">OS:</span> Kali Cyberdeck (Exclusive F11)</p>
          <p><span className="text-[#00e5ff]">Engine:</span> Electron 45.2.1 / Node 22</p>
          <p><span className="text-[#00e676]">Browser:</span> Chromium DracoBrowser</p>
          <p><span className="text-[#ff8800]">Window Manager:</span> macOS Traffic Lights [XFCE]</p>
          <p><span className="text-[#38bdf8]">Wallpaper:</span> {wallpaper.toUpperCase()}</p>
          <div className="flex gap-1 pt-1.5">
            <span className="w-3 h-2 bg-[#ff007f] inline-block" />
            <span className="w-3 h-2 bg-[#00e5ff] inline-block" />
            <span className="w-3 h-2 bg-[#00e676] inline-block" />
            <span className="w-3 h-2 bg-[#ff8800] inline-block" />
            <span className="w-3 h-2 bg-[#38bdf8] inline-block" />
          </div>
        </div>
      </div>

      {/* Floating Window 1: Dolphin Kali File Manager (macOS Controls + Resizable) */}
      {fileWin.isOpen && (
        <div
          style={{
            top: fileWin.isMaximized ? 0 : `${fileWin.y}px`,
            left: fileWin.isMaximized ? 0 : `${fileWin.x}px`,
            width: fileWin.isMaximized ? "100%" : `${fileWin.width}px`,
            height: fileWin.isMaximized ? "100%" : `${fileWin.height}px`,
          }}
          className={`absolute shadow-[0_20px_60px_rgba(0,0,0,0.9)] border border-[#261d38] rounded-xs flex flex-col bg-[#161026] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-bottom ${
            fileWin.isMinimized
              ? "scale-0 translate-y-[350px] opacity-0 pointer-events-none"
              : "scale-100 translate-y-0 opacity-100 z-20"
          }`}
        >
          {/* macOS Title Bar */}
          <div
            onMouseDown={(e) => startDrag("file", e, fileWin)}
            className="h-8 bg-[#120c1f] border-b border-[#261d38] px-3 flex items-center justify-between text-xs cursor-move select-none"
          >
            {renderMacTrafficLights(
              () => setFileWin((prev) => ({ ...prev, isOpen: false })),
              () => setFileWin((prev) => ({ ...prev, isMinimized: true })),
              () => setFileWin((prev) => ({ ...prev, isMaximized: !prev.isMaximized, isMinimized: false }))
            )}
            <div className="flex items-center gap-2 text-[#e2e8f0] font-bold text-[11px]">
              <Folder className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>Dolphin // File Manager</span>
            </div>
            <div className="flex items-center gap-2">
              <DracoTooltip content="Tempel di Layar Utama (Dock to Workstation Canvas)" position="bottom" accent="cyan">
                <button
                  onClick={() => setFileWin((prev) => ({ ...prev, isMaximized: !prev.isMaximized, isMinimized: false }))}
                  className="flex items-center gap-1 px-1.5 py-0.5 bg-[#161026] hover:bg-[#281b3d] text-[#00e5ff] border border-[#261d38] hover:border-[#00e5ff]/50 text-[10px] font-bold cursor-pointer transition-colors"
                >
                  <Maximize2 className="w-2.5 h-2.5 text-[#00e5ff]" />
                  <span>TEMPEL</span>
                </button>
              </DracoTooltip>
            </div>
          </div>

          {/* Window Content */}
          <div className="flex-1 overflow-hidden">
            <KaliFileManager
              workspacePath={workspacePath}
              onOpenFile={onOpenFile}
              onOpenScope={onOpenScope}
              onPinToMain={() => onSelectView?.("explorer")}
            />
          </div>

          {/* Resize Grip Corner */}
          {!fileWin.isMaximized && (
            <div
              onMouseDown={(e) => startResize("file", e, fileWin)}
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30 flex items-end justify-end p-0.5 text-[#7a7194] hover:text-[#00e5ff]"
            >
              <div className="w-2 h-2 border-r-2 border-b-2 border-current" />
            </div>
          )}
        </div>
      )}

      {/* Floating Window 2: ConPTY PowerShell Terminal */}
      {termWin.isOpen && (
        <div
          style={{
            top: termWin.isMaximized ? 0 : `${termWin.y}px`,
            left: termWin.isMaximized ? 0 : `${termWin.x}px`,
            width: termWin.isMaximized ? "100%" : `${termWin.width}px`,
            height: termWin.isMaximized ? "100%" : `${termWin.height}px`,
          }}
          className={`absolute shadow-[0_20px_60px_rgba(0,0,0,0.95)] border border-[#261d38] rounded-xs flex flex-col bg-[#0b0813] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-bottom ${
            termWin.isMinimized
              ? "scale-0 translate-y-[350px] opacity-0 pointer-events-none"
              : "scale-100 translate-y-0 opacity-100 z-25"
          }`}
        >
          <div
            onMouseDown={(e) => startDrag("term", e, termWin)}
            className="h-8 bg-[#120c1f] border-b border-[#261d38] px-3 flex items-center justify-between text-xs cursor-move select-none"
          >
            {renderMacTrafficLights(
              () => setTermWin((prev) => ({ ...prev, isOpen: false })),
              () => setTermWin((prev) => ({ ...prev, isMinimized: true })),
              () => setTermWin((prev) => ({ ...prev, isMaximized: !prev.isMaximized, isMinimized: false }))
            )}
            <div className="flex items-center gap-2 text-[#00e676] font-bold text-[11px]">
              <Terminal className="w-3.5 h-3.5" />
              <span>ConPTY // PowerShell Terminal</span>
            </div>
            <div className="flex items-center gap-2">
              <DracoTooltip content="Tempel di Layar Utama (Dock to Workstation Canvas)" position="bottom" accent="green">
                <button
                  onClick={() => setTermWin((prev) => ({ ...prev, isMaximized: !prev.isMaximized, isMinimized: false }))}
                  className="flex items-center gap-1 px-1.5 py-0.5 bg-[#161026] hover:bg-[#281b3d] text-[#00e676] border border-[#261d38] hover:border-[#00e676]/50 text-[10px] font-bold cursor-pointer transition-colors"
                >
                  <Maximize2 className="w-2.5 h-2.5 text-[#00e676]" />
                  <span>TEMPEL</span>
                </button>
              </DracoTooltip>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <TerminalPane />
          </div>

          {!termWin.isMaximized && (
            <div
              onMouseDown={(e) => startResize("term", e, termWin)}
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30 flex items-end justify-end p-0.5 text-[#7a7194] hover:text-[#00e676]"
            >
              <div className="w-2 h-2 border-r-2 border-b-2 border-current" />
            </div>
          )}
        </div>
      )}

      {/* Floating Window 3: Built-in Chromium DracoBrowser */}
      {browserWin.isOpen && (
        <div
          style={{
            top: browserWin.isMaximized ? 0 : `${browserWin.y}px`,
            left: browserWin.isMaximized ? 0 : `${browserWin.x}px`,
            width: browserWin.isMaximized ? "100%" : `${browserWin.width}px`,
            height: browserWin.isMaximized ? "100%" : `${browserWin.height}px`,
          }}
          className={`absolute shadow-[0_20px_70px_rgba(0,0,0,0.95)] border border-[#261d38] rounded-xs flex flex-col bg-[#0b0813] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-bottom ${
            browserWin.isMinimized
              ? "scale-0 translate-y-[350px] opacity-0 pointer-events-none"
              : "scale-100 translate-y-0 opacity-100 z-30"
          }`}
        >
          <div
            onMouseDown={(e) => startDrag("browser", e, browserWin)}
            className="h-8 bg-[#120c1f] border-b border-[#261d38] px-3 flex items-center justify-between text-xs cursor-move select-none"
          >
            {renderMacTrafficLights(
              () => setBrowserWin((prev) => ({ ...prev, isOpen: false })),
              () => setBrowserWin((prev) => ({ ...prev, isMinimized: true })),
              () => setBrowserWin((prev) => ({ ...prev, isMaximized: !prev.isMaximized, isMinimized: false }))
            )}
            <div className="flex items-center gap-2 text-[#00e5ff] font-bold text-[11px]">
              <Globe className="w-3.5 h-3.5" />
              <span>DracoBrowser // Chromium Web Suite</span>
            </div>
            <div className="flex items-center gap-2">
              <DracoTooltip content="Tempel di Layar Utama (Dock to Workstation Canvas)" position="bottom" accent="cyan">
                <button
                  onClick={() => setBrowserWin((prev) => ({ ...prev, isMaximized: !prev.isMaximized, isMinimized: false }))}
                  className="flex items-center gap-1 px-1.5 py-0.5 bg-[#161026] hover:bg-[#281b3d] text-[#00e5ff] border border-[#261d38] hover:border-[#00e5ff]/50 text-[10px] font-bold cursor-pointer transition-colors"
                >
                  <Maximize2 className="w-2.5 h-2.5 text-[#00e5ff]" />
                  <span>TEMPEL</span>
                </button>
              </DracoTooltip>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <DracoBrowser
              onClose={() => setBrowserWin((prev) => ({ ...prev, isOpen: false }))}
              onPinToMain={() => onSelectView?.("browser")}
            />
          </div>

          {!browserWin.isMaximized && (
            <div
              onMouseDown={(e) => startResize("browser", e, browserWin)}
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30 flex items-end justify-end p-0.5 text-[#7a7194] hover:text-[#00e5ff]"
            >
              <div className="w-2 h-2 border-r-2 border-b-2 border-current" />
            </div>
          )}
        </div>
      )}

      {/* Floating Window 4: Antigravity AI Telemetry Hub */}
      {telemetryWin.isOpen && (
        <div
          style={{
            top: telemetryWin.isMaximized ? 0 : `${telemetryWin.y}px`,
            left: telemetryWin.isMaximized ? 0 : `${telemetryWin.x}px`,
            width: telemetryWin.isMaximized ? "100%" : `${telemetryWin.width}px`,
            height: telemetryWin.isMaximized ? "100%" : `${telemetryWin.height}px`,
          }}
          className={`absolute shadow-[0_20px_70px_rgba(0,0,0,0.95)] border border-[#261d38] rounded-xs flex flex-col bg-[#0b0813] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-bottom ${
            telemetryWin.isMinimized
              ? "scale-0 translate-y-[350px] opacity-0 pointer-events-none"
              : "scale-100 translate-y-0 opacity-100 z-35"
          }`}
        >
          <div
            onMouseDown={(e) => startDrag("telemetry", e, telemetryWin)}
            className="h-8 bg-[#120c1f] border-b border-[#261d38] px-3 flex items-center justify-between text-xs cursor-move select-none"
          >
            {renderMacTrafficLights(
              () => setTelemetryWin((prev) => ({ ...prev, isOpen: false })),
              () => setTelemetryWin((prev) => ({ ...prev, isMinimized: true })),
              () => setTelemetryWin((prev) => ({ ...prev, isMaximized: !prev.isMaximized, isMinimized: false }))
            )}
            <div className="flex items-center gap-2 text-[#ff007f] font-bold text-[11px]">
              <Radio className="w-3.5 h-3.5" />
              <span>Antigravity Telemetry // Cognitive Stream</span>
            </div>
            <div className="flex items-center gap-2">
              <DracoTooltip content="Tempel di Layar Utama (Dock to Workstation Canvas)" position="bottom" accent="pink">
                <button
                  onClick={() => setTelemetryWin((prev) => ({ ...prev, isMaximized: !prev.isMaximized, isMinimized: false }))}
                  className="flex items-center gap-1 px-1.5 py-0.5 bg-[#161026] hover:bg-[#281b3d] text-[#ff007f] border border-[#261d38] hover:border-[#ff007f]/50 text-[10px] font-bold cursor-pointer transition-colors"
                >
                  <Maximize2 className="w-2.5 h-2.5 text-[#ff007f]" />
                  <span>TEMPEL</span>
                </button>
              </DracoTooltip>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <TelemetryPane />
          </div>

          {!telemetryWin.isMaximized && (
            <div
              onMouseDown={(e) => startResize("telemetry", e, telemetryWin)}
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30 flex items-end justify-end p-0.5 text-[#7a7194] hover:text-[#ff007f]"
            >
              <div className="w-2 h-2 border-r-2 border-b-2 border-current" />
            </div>
          )}
        </div>
      )}

      {/* macOS Cyberdeck Floating Dock Tray (Restore Minimized / Open Windows) */}
      {(fileWin.isOpen || termWin.isOpen || browserWin.isOpen || telemetryWin.isOpen) && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[#120c1f]/95 border border-[#261d38] backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 shadow-[0_12px_40px_rgba(0,0,0,0.9)]">
          {fileWin.isOpen && (
            <DracoTooltip
              content={fileWin.isMinimized ? "Restore Dolphin File Manager (macOS Zoom)" : "Minimize Dolphin"}
              position="top"
              accent={fileWin.isMinimized ? "amber" : "cyan"}
            >
              <button
                onClick={() => setFileWin((prev) => ({ ...prev, isMinimized: !prev.isMinimized }))}
                className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer ${
                  fileWin.isMinimized
                    ? "bg-[#ffbd2e]/20 text-[#ffbd2e] border border-[#ffbd2e] animate-pulse"
                    : "bg-[#161026] text-[#00e5ff] hover:bg-[#281b3d] border border-[#261d38]"
                }`}
              >
                <Folder className="w-3.5 h-3.5 text-[#00e5ff]" />
                <span>Dolphin</span>
                {fileWin.isMinimized && <span className="text-[9px] text-[#ffbd2e] font-mono">(MIN)</span>}
              </button>
            </DracoTooltip>
          )}

          {termWin.isOpen && (
            <DracoTooltip
              content={termWin.isMinimized ? "Restore ConPTY Shell (macOS Zoom)" : "Minimize ConPTY Shell"}
              position="top"
              accent={termWin.isMinimized ? "amber" : "green"}
            >
              <button
                onClick={() => setTermWin((prev) => ({ ...prev, isMinimized: !prev.isMinimized }))}
                className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer ${
                  termWin.isMinimized
                    ? "bg-[#ffbd2e]/20 text-[#ffbd2e] border border-[#ffbd2e] animate-pulse"
                    : "bg-[#161026] text-[#00e676] hover:bg-[#281b3d] border border-[#261d38]"
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-[#00e676]" />
                <span>ConPTY</span>
                {termWin.isMinimized && <span className="text-[9px] text-[#ffbd2e] font-mono">(MIN)</span>}
              </button>
            </DracoTooltip>
          )}

          {browserWin.isOpen && (
            <DracoTooltip
              content={browserWin.isMinimized ? "Restore DracoBrowser (macOS Zoom)" : "Minimize DracoBrowser"}
              position="top"
              accent={browserWin.isMinimized ? "amber" : "cyan"}
            >
              <button
                onClick={() => setBrowserWin((prev) => ({ ...prev, isMinimized: !prev.isMinimized }))}
                className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer ${
                  browserWin.isMinimized
                    ? "bg-[#ffbd2e]/20 text-[#ffbd2e] border border-[#ffbd2e] animate-pulse"
                    : "bg-[#161026] text-[#00e5ff] hover:bg-[#281b3d] border border-[#261d38]"
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-[#00e5ff]" />
                <span>Browser</span>
                {browserWin.isMinimized && <span className="text-[9px] text-[#ffbd2e] font-mono">(MIN)</span>}
              </button>
            </DracoTooltip>
          )}

          {telemetryWin.isOpen && (
            <DracoTooltip
              content={telemetryWin.isMinimized ? "Restore AI Telemetry (macOS Zoom)" : "Minimize AI Telemetry"}
              position="top"
              accent={telemetryWin.isMinimized ? "amber" : "pink"}
            >
              <button
                onClick={() => setTelemetryWin((prev) => ({ ...prev, isMinimized: !prev.isMinimized }))}
                className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer ${
                  telemetryWin.isMinimized
                    ? "bg-[#ffbd2e]/20 text-[#ffbd2e] border border-[#ffbd2e] animate-pulse"
                    : "bg-[#161026] text-[#ff007f] hover:bg-[#281b3d] border border-[#261d38]"
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-[#ff007f]" />
                <span>Telemetry</span>
                {telemetryWin.isMinimized && <span className="text-[9px] text-[#ffbd2e] font-mono">(MIN)</span>}
              </button>
            </DracoTooltip>
          )}
        </div>
      )}

      {/* Wallpaper Switcher Popover Menu */}
      {showWallpaperMenu && (
        <div
          style={{ top: `${menuPos.y}px`, left: `${menuPos.x}px` }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-64 bg-[#161026] border border-[#261d38] shadow-[0_15px_45px_rgba(0,0,0,0.9)] py-1.5 text-xs font-mono select-none"
        >
          <div className="px-3 py-1.5 border-b border-[#261d38] flex items-center justify-between text-[10px] text-[#7a7194] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-[#e2e8f0]">
              <Palette className="w-3 h-3 text-[#ff007f]" />
              <span>DESKTOP WALLPAPER</span>
            </span>
          </div>

          {[
            { id: "cosmic", label: "Kali Cosmic Void", desc: "Radial Violet Nebula" },
            { id: "dragon", label: "Cyber Dragon Dark", desc: "Glowing Dracodeck Insignia" },
            { id: "matrix", label: "Obsidian Matrix", desc: "Geometric Grid Matrix" },
            { id: "abyss", label: "Deep Ocean Abyss", desc: "Cyan Kali Oceanic Gradient" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleWallpaperChange(item.id as WallpaperKey)}
              className="w-full px-3 py-2 text-left flex items-center justify-between text-[#cbd5e1] hover:bg-[#281b3d] hover:text-[#00e5ff] transition-colors"
            >
              <div className="flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-[#7a7194]" />
                <div>
                  <p className="font-semibold text-xs">{item.label}</p>
                  <p className="text-[9px] text-[#7a7194]">{item.desc}</p>
                </div>
              </div>
              {wallpaper === item.id && <Check className="w-3.5 h-3.5 text-[#00e676]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

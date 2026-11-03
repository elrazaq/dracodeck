import React, { useState, useEffect, useRef } from "react";
import { Minus, Square, X, Wifi, Cpu, Keyboard, RefreshCw, CheckCircle2 } from "lucide-react";
import { DracoTooltip } from "../common/DracoTooltip";
import { ActiveView } from "../../types";
import { SysInfo, UpdateInfo } from "../../vite-env";

interface TopBarProps {
  workspace: string | null;
  scopedWorkspace?: string | null;
  activeView?: ActiveView;
  onSelectView?: (view: ActiveView) => void;
  onChangeWorkspace?: () => void;
  onExitScope?: () => void;
  onToggleTerminal?: () => void;
  onOpenFile?: (filePath: string, fileName: string, isPreview?: boolean) => void;
  onRebootSplash?: () => void;
  onQuit?: () => void;
}

type MenuId = "file" | "edit" | "selection" | "view" | "workplace" | "help" | null;

interface MenuItem {
  label: string;
  shortcut?: string;
  accent?: boolean;
  danger?: boolean;
  dividerAfter?: boolean;
  action: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  workspace,
  scopedWorkspace,
  activeView = "editor",
  onSelectView,
  onChangeWorkspace,
  onExitScope,
  onToggleTerminal,
  onOpenFile,
  onRebootSplash,
  onQuit,
}) => {
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<"shortcuts" | "sysinfo" | null>(null);
  const [sysInfo, setSysInfo] = useState<SysInfo | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const notify = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 2800);
  };

  const dispatchEditorCmd = (action: string, switchToEditor: boolean = false) => {
    if (switchToEditor && onSelectView) {
      onSelectView("editor");
    }
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("dracode:editor-cmd", { detail: { action } }));
    }, switchToEditor ? 40 : 0);
  };

  const handleMinimize = () => window.dracoAPI?.windowMinimize?.();
  const handleMaximize = () => window.dracoAPI?.windowMaximize?.();
  const handleClose = () => {
    if (onQuit) onQuit();
    else window.dracoAPI?.windowClose?.();
  };

  const handleCreateNewScratchFile = async () => {
    const root = scopedWorkspace || workspace;
    if (!root || !window.dracoAPI?.memorySaveNote) {
      notify("Select a workspace folder first");
      return;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `scratch-${stamp}.md`;
    const initial = `# DRACODE SCRATCHPAD // ${stamp}\n\n`;
    const res = await window.dracoAPI.memorySaveNote(root, filename, initial);
    if (res.ok && res.path) {
      onOpenFile?.(res.path, res.name || filename, false);
      notify(`Created ${filename}`);
    }
  };

  const handleSlayDevPorts = async () => {
    if (!window.dracoAPI?.slayerKillPort) return;
    const ports = [3000, 5173, 8080];
    let killed = 0;
    for (const p of ports) {
      try {
        const res = await window.dracoAPI.slayerKillPort(p);
        if (res?.success) killed++;
      } catch {}
    }
    notify(killed > 0 ? `Slayed ${killed} active dev port(s)` : "Dev ports 3000/5173/8080 already clear");
  };

  const handleOpenSysModal = async () => {
    setActiveModal("sysinfo");
    try {
      const [s, u] = await Promise.all([
        window.dracoAPI?.getSysInfo ? window.dracoAPI.getSysInfo() : Promise.resolve(null),
        window.dracoAPI?.checkUpdate ? window.dracoAPI.checkUpdate() : Promise.resolve(null),
      ]);
      if (s) setSysInfo(s);
      if (u) setUpdateInfo(u);
    } catch {}
  };

  const menus: Record<Exclude<MenuId, null>, MenuItem[]> = {
    file: [
      {
        label: "New Scratch File",
        shortcut: "Ctrl+N",
        accent: true,
        action: handleCreateNewScratchFile,
      },
      {
        label: "Open Workspace Folder...",
        shortcut: "Ctrl+O",
        dividerAfter: true,
        action: () => onChangeWorkspace?.(),
      },
      {
        label: "Save Active File",
        shortcut: "Ctrl+S",
        action: () => dispatchEditorCmd("save"),
      },
      {
        label: "Format Document",
        shortcut: "Shift+Alt+F",
        dividerAfter: true,
        action: () => dispatchEditorCmd("format"),
      },
      {
        label: "Close Active Tab",
        shortcut: "Ctrl+W",
        action: () => dispatchEditorCmd("close-tab"),
      },
      {
        label: "Close All Tabs",
        dividerAfter: true,
        action: () => dispatchEditorCmd("close-all"),
      },
      {
        label: "Exit Session",
        shortcut: "Alt+F4",
        danger: true,
        action: handleClose,
      },
    ],
    edit: [
      {
        label: "Undo",
        shortcut: "Ctrl+Z",
        action: () => dispatchEditorCmd("undo"),
      },
      {
        label: "Redo",
        shortcut: "Ctrl+Y",
        dividerAfter: true,
        action: () => dispatchEditorCmd("redo"),
      },
      {
        label: "Cut",
        shortcut: "Ctrl+X",
        action: () => dispatchEditorCmd("cut"),
      },
      {
        label: "Copy",
        shortcut: "Ctrl+C",
        action: () => dispatchEditorCmd("copy"),
      },
      {
        label: "Paste",
        shortcut: "Ctrl+V",
        dividerAfter: true,
        action: () => dispatchEditorCmd("paste"),
      },
      {
        label: "Find in File...",
        shortcut: "Ctrl+F",
        accent: true,
        action: () => dispatchEditorCmd("find", true),
      },
      {
        label: "Replace in File...",
        shortcut: "Ctrl+H",
        action: () => dispatchEditorCmd("replace", true),
      },
    ],
    selection: [
      {
        label: "Select All",
        shortcut: "Ctrl+A",
        action: () => dispatchEditorCmd("select-all"),
      },
      {
        label: "Duplicate Line Down",
        shortcut: "Shift+Alt+↓",
        action: () => dispatchEditorCmd("duplicate-line"),
      },
      {
        label: "Delete Active Line",
        shortcut: "Ctrl+Shift+K",
        danger: true,
        dividerAfter: true,
        action: () => dispatchEditorCmd("delete-line"),
      },
      {
        label: "Auto-Format Code Buffer",
        shortcut: "Shift+Alt+F",
        accent: true,
        action: () => dispatchEditorCmd("format"),
      },
    ],
    view: [
      {
        label: "Kali Desktop Home",
        action: () => onSelectView?.("desktop"),
      },
      {
        label: "Dracode Studio (Editor)",
        accent: true,
        action: () => onSelectView?.("editor"),
      },
      {
        label: "Dolphin File Manager",
        action: () => onSelectView?.("explorer"),
      },
      {
        label: "DracoOps Git & Memory",
        shortcut: "Alt+G",
        action: () => onSelectView?.("gitops"),
      },
      {
        label: "Offensive Pentest Suite",
        action: () => onSelectView?.("offensive"),
      },
      {
        label: "Agent Telemetry HUD",
        action: () => onSelectView?.("telemetry"),
      },
      {
        label: "Port & Process Slayer",
        action: () => onSelectView?.("slayer"),
      },
      {
        label: "Draco Stealth Browser",
        dividerAfter: true,
        action: () => onSelectView?.("browser"),
      },
      {
        label: "Toggle ConPTY Terminal",
        shortcut: "Ctrl+`",
        action: () => onToggleTerminal?.(),
      },
      {
        label: "Toggle Code Minimap",
        action: () => dispatchEditorCmd("toggle-minimap"),
      },
      {
        label: "Toggle Syntax Colors",
        dividerAfter: true,
        action: () => dispatchEditorCmd("toggle-syntax"),
      },
      {
        label: "Toggle Fullscreen",
        shortcut: "F11",
        action: handleMaximize,
      },
    ],
    workplace: [
      {
        label: "Switch Workspace Folder...",
        accent: true,
        action: () => onChangeWorkspace?.(),
      },
      {
        label: "Exit Isolated Subfolder Scope",
        dividerAfter: true,
        action: () => {
          onExitScope?.();
          notify("Returned to root workspace scope");
        },
      },
      {
        label: "Slay Dev Ports (3000/5173/8080)",
        danger: true,
        dividerAfter: true,
        action: handleSlayDevPorts,
      },
      {
        label: "System Configuration",
        action: () => onSelectView?.("settings"),
      },
      {
        label: "Run Boot Diagnostics Splash",
        action: () => onRebootSplash?.(),
      },
    ],
    help: [
      {
        label: "Keyboard Shortcuts Matrix",
        shortcut: "Ctrl+/",
        accent: true,
        action: () => setActiveModal("shortcuts"),
      },
      {
        label: "Live Hardware & OS Telemetry",
        action: handleOpenSysModal,
      },
      {
        label: "Check Repository Update Status",
        action: handleOpenSysModal,
      },
    ],
  };

  const menuOrder: { id: Exclude<MenuId, null>; label: string }[] = [
    { id: "file", label: "File" },
    { id: "edit", label: "Edit" },
    { id: "selection", label: "Selection" },
    { id: "view", label: "View" },
    { id: "workplace", label: "Workplace" },
    { id: "help", label: "Help" },
  ];

  const workspaceName = workspace
    ? workspace.split(/[/\\]/).filter(Boolean).pop() || workspace
    : "OFFLINE";

  return (
    <>
      <header className="h-7 w-full bg-[#0e0a19] border-b border-[#261d38] px-3 flex items-center justify-between text-xs select-none z-50 font-mono text-[#cbd5e1]">
        {/* Left: Branding + Single-Line Toolbar Menu + Active Workspace Scope */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-4 h-4 rounded-xs bg-[#161026] border border-[#261d38] p-0.5 flex items-center justify-center shrink-0">
            <img src="/dracodeck-logo.jpg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-[#e2e8f0] text-[11px] tracking-wide shrink-0">
            DRACODECK <span className="text-[#ff007f] font-normal hidden sm:inline">// KALI RUNTIME</span>
          </span>

          {activeView === "editor" && (
            <>
              <span className="text-[#443a57] shrink-0">|</span>

              {/* Single-Line Interactive Menu Bar (File, Edit, Selection, View, Workplace, Help) */}
              <div ref={menuContainerRef} className="flex items-center gap-0.5 shrink-0">
            {menuOrder.map((m) => {
              const isOpen = openMenu === m.id;
              return (
                <div key={m.id} className="relative">
                  <button
                    onClick={() => setOpenMenu(isOpen ? null : m.id)}
                    onMouseEnter={() => {
                      if (openMenu !== null) setOpenMenu(m.id);
                    }}
                    className={`px-2 py-0.5 text-[11px] transition-colors cursor-pointer ${
                      isOpen
                        ? "bg-[#ff007f] text-white font-bold"
                        : "text-[#cbd5e1] hover:bg-[#281b3d] hover:text-[#00e5ff]"
                    }`}
                  >
                    {m.label}
                  </button>

                  {isOpen && (
                    <div className="absolute left-0 top-full mt-0.5 w-60 bg-[#120c1f] border border-[#ff007f]/60 shadow-[0_14px_40px_rgba(0,0,0,0.95)] py-1 z-50">
                      {menus[m.id].map((item, idx) => (
                        <React.Fragment key={idx}>
                          <button
                            onClick={() => {
                              setOpenMenu(null);
                              item.action();
                            }}
                            className={`w-full px-3 py-1.5 text-left text-[11px] flex items-center justify-between transition-colors cursor-pointer ${
                              item.danger
                                ? "text-[#ff1744] hover:bg-[#ff1744]/20"
                                : item.accent
                                ? "text-[#00e5ff] hover:bg-[#281b3d]"
                                : "text-[#e2e8f0] hover:bg-[#281b3d] hover:text-[#00e5ff]"
                            }`}
                          >
                            <span>{item.label}</span>
                            {item.shortcut && (
                              <span className="text-[9.5px] text-[#7a7194] font-mono">
                                {item.shortcut}
                              </span>
                            )}
                          </button>
                          {item.dividerAfter && (
                            <div className="my-1 border-t border-[#261d38]" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
            </>
          )}

          <span className="text-[#443a57] hidden md:inline shrink-0">|</span>

          {/* Active Scope Indicator */}
          <div className="items-center gap-1.5 text-[10px] text-[#7a7194] truncate hidden md:flex">
            <span>SCOPE:</span>
            <span className="text-[#00e5ff] font-semibold truncate">{workspaceName}</span>
          </div>
        </div>

        {/* Right: Live Action Toast + Network Status + Frameless Window Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {statusToast && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-[#281b3d] border border-[#00e5ff]/50 text-[#00e5ff] text-[10px] font-bold">
              <CheckCircle2 className="w-3 h-3 text-[#00e676]" />
              <span>{statusToast}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[10px] text-[#00e676]">
            <Wifi className="w-3 h-3 text-[#00e676]" />
            <span className="hidden sm:inline font-bold">NET READY</span>
          </div>

          <div className="h-3 w-px bg-[#261d38]" />

          {/* Window Controls with Hacker Cyberdeck Tooltips */}
          <div className="flex items-center gap-1 text-[#7a7194]">
            <DracoTooltip content="Minimize Cockpit" shortcut="Alt+F9" position="bottom">
              <button
                onClick={handleMinimize}
                className="p-1 hover:bg-[#281b3d] hover:text-[#00e5ff] transition-colors cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
            </DracoTooltip>

            <DracoTooltip content="Toggle Fullscreen" shortcut="F11" position="bottom">
              <button
                onClick={handleMaximize}
                className="p-1 hover:bg-[#281b3d] hover:text-[#00e5ff] transition-colors cursor-pointer"
              >
                <Square className="w-2.5 h-2.5" />
              </button>
            </DracoTooltip>

            <DracoTooltip content="Terminate Session" shortcut="Alt+F4" position="bottom">
              <button
                onClick={handleClose}
                className="p-1 hover:bg-[#ff1744] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </DracoTooltip>
          </div>
        </div>
      </header>

      {/* Help Modal 1: Keyboard Shortcuts Matrix */}
      {activeModal === "shortcuts" && (
        <div
          onClick={() => setActiveModal(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 font-mono"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#120c1f] border border-[#ff007f] shadow-[0_20px_60px_rgba(0,0,0,0.95)] p-4 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#261d38] pb-2">
              <div className="flex items-center gap-2 text-[#00e5ff] font-bold">
                <Keyboard className="w-4 h-4 text-[#ff007f]" />
                <span>DRACODECK // KEYBOARD SHORTCUTS</span>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-[#7a7194] hover:text-[#ff1744] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-[11px]">
              {[
                ["Save Active File", "Ctrl + S"],
                ["Find in File", "Ctrl + F"],
                ["Find & Replace Matrix", "Ctrl + H"],
                ["Auto-Format Document (Prettier)", "Shift + Alt + F"],
                ["Toggle Integrated ConPTY Terminal", "Ctrl + `"],
                ["Open DracoOps Git & Memory", "Alt + G"],
                ["Single-Click File in Explorer/Git", "Preview Tab Mode"],
                ["Double-Click File or Edit Buffer", "Pin Tab Permanently"],
              ].map(([desc, key], idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-[#0b0813] px-2.5 py-1.5 border border-[#261d38]"
                >
                  <span className="text-[#cbd5e1]">{desc}</span>
                  <kbd className="text-[#ff007f] font-bold">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Help Modal 2: Live Hardware & Git Update Telemetry */}
      {activeModal === "sysinfo" && (
        <div
          onClick={() => setActiveModal(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 font-mono"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#120c1f] border border-[#00e5ff] shadow-[0_20px_60px_rgba(0,0,0,0.95)] p-4 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#261d38] pb-2">
              <div className="flex items-center gap-2 text-[#00e5ff] font-bold">
                <Cpu className="w-4 h-4 text-[#00e676]" />
                <span>LIVE SYSTEM & REPOSITORY TELEMETRY</span>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-[#7a7194] hover:text-[#ff1744] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {sysInfo ? (
              <div className="space-y-1.5 text-[11px] bg-[#0b0813] p-3 border border-[#261d38]">
                <div className="flex justify-between">
                  <span className="text-[#7a7194]">HOST // ARCH:</span>
                  <span className="text-[#e2e8f0] font-bold">
                    {sysInfo.hostname} ({sysInfo.platform}/{sysInfo.arch})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7a7194]">CPU CORES:</span>
                  <span className="text-[#00e5ff] font-bold">
                    {sysInfo.cpus} Cores ({sysInfo.cpuLoadPct ?? 0}% Load)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7a7194]">MEMORY:</span>
                  <span className="text-[#00e676] font-bold">
                    {(sysInfo.freeMem / 1073741824).toFixed(1)} GB free /{" "}
                    {(sysInfo.totalMem / 1073741824).toFixed(1)} GB
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[#0b0813] border border-[#261d38] text-[#7a7194] flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00e5ff]" />
                <span>Querying OS kernel telemetry...</span>
              </div>
            )}

            {updateInfo && (
              <div className="space-y-1 text-[11px] bg-[#0b0813] p-3 border border-[#261d38]">
                <div className="flex justify-between">
                  <span className="text-[#7a7194]">HEAD COMMIT:</span>
                  <span className="text-[#ff007f] font-bold">{updateInfo.commit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7a7194]">COMMIT DATE:</span>
                  <span className="text-[#cbd5e1]">{updateInfo.date}</span>
                </div>
                <div className="text-[#00e676] truncate pt-1">{updateInfo.message}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

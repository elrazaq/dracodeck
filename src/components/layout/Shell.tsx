import React, { useState, useEffect } from "react";
import { TopBar } from "./TopBar";
import { LeftDock } from "./LeftDock";
import { BottomBar } from "./BottomBar";
import { SplitPane } from "./SplitPane";
import { ExplorerView } from "../explorer/ExplorerView";
import { EditorPane } from "../editor/EditorPane";
import { TerminalPane } from "../terminal/TerminalPane";
import { TelemetryPane } from "../telemetry/TelemetryPane";
import { SlayerPane } from "../slayer/SlayerPane";
import { DracoBrowser } from "../browser/DracoBrowser";
import { KaliDesktop } from "../desktop/KaliDesktop";
import { KaliFileManager } from "../desktop/KaliFileManager";
import { OffensiveWorkstation } from "../offensive/OffensiveWorkstation";
import { GitMemoryWorkstation } from "../gitops/GitMemoryWorkstation";
import { WorkspaceWelcome } from "../welcome/WorkspaceWelcome";
import { ActiveView } from "../../types";

const STORAGE_KEY = "dracodex_workspace";

export const Shell: React.FC = () => {
  const [workspace, setWorkspace] = useState<string | null>(null);
  const [scopedWorkspace, setScopedWorkspace] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("explorer");
  const [activeFile, setActiveFile] = useState<{ path: string; name: string } | undefined>(undefined);
  const [activeLang, setActiveLang] = useState<string>("Markdown");
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);

  // Keyboard shortcut Ctrl+` to toggle terminal, Alt+G to open GitOps & Memory
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault();
        setIsTerminalOpen((prev) => !prev);
      } else if (e.altKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setActiveView("gitops");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setWorkspace(saved);
      if (window.dracoAPI?.terminalSetCwd) {
        window.dracoAPI.terminalSetCwd(saved);
      }
    }
  }, []);

  const handleSelectWorkspace = (path: string) => {
    localStorage.setItem(STORAGE_KEY, path);
    setWorkspace(path);
    setScopedWorkspace(null);
    if (window.dracoAPI?.terminalSetCwd) {
      window.dracoAPI.terminalSetCwd(path);
    }
  };

  const handleOpenFile = (filePath: string, fileName: string) => {
    setActiveFile({ path: filePath, name: fileName });
    setActiveView("editor");
  };

  const handleOpenScope = (folderPath: string) => {
    setScopedWorkspace(folderPath);
    setActiveView("editor");
    if (window.dracoAPI?.terminalSetCwd) {
      window.dracoAPI.terminalSetCwd(folderPath);
    }
  };

  const handleExitScope = () => {
    setScopedWorkspace(null);
    if (workspace && window.dracoAPI?.terminalSetCwd) {
      window.dracoAPI.terminalSetCwd(workspace);
    }
  };

  const handleChangeWorkspace = async () => {
    if (window.dracoAPI) {
      const selected = await window.dracoAPI.selectFolder();
      if (selected) {
        handleSelectWorkspace(selected);
      }
    }
  };

  // If a scoped workspace is active, override current view root
  const currentEffectiveWorkspace = scopedWorkspace || workspace;

  const renderMainWorkspace = () => {
    if (!currentEffectiveWorkspace && activeView !== "desktop" && activeView !== "browser") {
      return (
        <WorkspaceWelcome
          onSelectWorkspace={handleSelectWorkspace}
        />
      );
    }

    const defaultWs = currentEffectiveWorkspace || "";

    switch (activeView) {
      case "desktop":
        return (
          <KaliDesktop
            workspacePath={defaultWs}
            onOpenFile={handleOpenFile}
            onOpenScope={handleOpenScope}
            onSelectView={(v) => setActiveView(v)}
          />
        );

      case "browser":
        return (
          <div className="h-full w-full bg-[#0b0813]">
            <DracoBrowser />
          </div>
        );

      case "explorer":
        // Dedicated Full File Manager Workstation (Dolphin / Kali style)
        return (
          <div className="h-full w-full bg-[#0b0813]">
            <KaliFileManager
              workspacePath={defaultWs}
              onOpenFile={handleOpenFile}
              onOpenScope={handleOpenScope}
            />
          </div>
        );

      case "editor":
        // Focused Code Studio Workstation
        return (
          <SplitPane
            direction="horizontal"
            initialSplit={18}
            minSize={12}
            maxSize={35}
            left={
              <ExplorerView
                workspacePath={defaultWs}
                selectedFile={activeFile?.path}
                onOpenFile={handleOpenFile}
                onOpenScope={handleOpenScope}
              />
            }
            right={
              isTerminalOpen ? (
                <SplitPane
                  direction="vertical"
                  initialSplit={70}
                  minSize={30}
                  maxSize={85}
                  left={
                    <EditorPane
                      activeFile={activeFile}
                      onLanguageChange={(lang) => setActiveLang(lang)}
                      scopedWorkspace={scopedWorkspace}
                      onExitScope={handleExitScope}
                      isTerminalOpen={isTerminalOpen}
                      onToggleTerminal={() => setIsTerminalOpen(!isTerminalOpen)}
                    />
                  }
                  right={<TerminalPane />}
                />
              ) : (
                <EditorPane
                  activeFile={activeFile}
                  onLanguageChange={(lang) => setActiveLang(lang)}
                  scopedWorkspace={scopedWorkspace}
                  onExitScope={handleExitScope}
                  isTerminalOpen={isTerminalOpen}
                  onToggleTerminal={() => setIsTerminalOpen(!isTerminalOpen)}
                />
              )
            }
          />
        );

      case "terminal":
        return (
          <div className="h-full w-full bg-[#0b0813]">
            <TerminalPane />
          </div>
        );

      case "telemetry":
        return (
          <div className="h-full w-full bg-[#0b0813]">
            <TelemetryPane />
          </div>
        );

      case "slayer":
        return (
          <div className="h-full w-full bg-[#0b0813]">
            <SlayerPane />
          </div>
        );

      case "offensive":
        return (
          <div className="h-full w-full bg-[#0b0813]">
            <OffensiveWorkstation
              workspacePath={defaultWs}
              onSelectView={(v) => setActiveView(v)}
            />
          </div>
        );

      case "gitops":
        return (
          <div className="h-full w-full bg-[#0b0813]">
            <GitMemoryWorkstation workspacePath={defaultWs} />
          </div>
        );

      case "settings":
        return (
          <div className="h-full w-full bg-[#0b0813] p-6 text-xs font-mono space-y-4">
            <h2 className="text-lg font-bold text-[#e2e8f0] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff007f]" />
              <span>DRACODECK SYSTEM CONFIGURATION</span>
            </h2>
            <div className="max-w-xl space-y-3 bg-[#120c1f] p-4 border border-[#261d38]">
              <div>
                <p className="text-[10px] text-[#7a7194] uppercase tracking-wider mb-1 font-bold">
                  Active Workspace Directory
                </p>
                <div className="bg-[#0b0813] p-2 border border-[#261d38] text-[#00e5ff] font-mono break-all text-xs">
                  {workspace}
                </div>
                {scopedWorkspace && (
                  <div className="mt-2 text-[#00e676] text-[10px]">
                    ● Focused Scope: {scopedWorkspace}
                  </div>
                )}
              </div>
              <button
                onClick={handleChangeWorkspace}
                className="px-3 py-1.5 bg-[#161026] hover:bg-[#281b3d] text-[#00e5ff] border border-[#261d38] text-xs font-semibold"
              >
                Change Workspace Folder
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0b0813] text-[#cbd5e1] font-mono overflow-hidden select-none">
      {/* Permanent Anti-Clipping Kali Top System Bar */}
      <TopBar workspace={currentEffectiveWorkspace} />

      {/* Main Body (Left Dock + Workstation Canvas) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Vertical Dock (56px) */}
        <LeftDock
          activeView={activeView}
          onSelectView={(v) => setActiveView(v)}
          onChangeWorkspace={handleChangeWorkspace}
          onOpenOffensiveSuite={() => setActiveView("offensive")}
        />

        {/* Dynamic Center Workstation Canvas */}
        <main className="flex-1 overflow-hidden relative">
          {renderMainWorkspace()}
        </main>
      </div>

      {/* Signature Hot Magenta Bottom Status Bar */}
      <BottomBar
        workspace={currentEffectiveWorkspace || ""}
        activeLanguage={activeLang}
        onFormatCode={() => {
          // Triggers format notification
        }}
        onOpenTelemetry={() => setActiveView("telemetry")}
        onOpenGitOps={() => setActiveView("gitops")}
      />
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { LeftDock } from "./LeftDock";
import { BottomBar } from "./BottomBar";
import { SplitPane } from "./SplitPane";
import { ExplorerView } from "../explorer/ExplorerView";
import { EditorPane } from "../editor/EditorPane";
import { TerminalPane } from "../terminal/TerminalPane";
import { TelemetryPane } from "../telemetry/TelemetryPane";
import { SlayerPane } from "../slayer/SlayerPane";
import { KaliDesktop } from "../desktop/KaliDesktop";
import { WorkspaceWelcome } from "../welcome/WorkspaceWelcome";
import { ActiveView } from "../../types";

const STORAGE_KEY = "dracodex_workspace";

export const Shell: React.FC = () => {
  const [workspace, setWorkspace] = useState<string | null>(null);
  const [scopedWorkspace, setScopedWorkspace] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("explorer");
  const [activeFile, setActiveFile] = useState<{ path: string; name: string } | undefined>(undefined);
  const [activeLang, setActiveLang] = useState<string>("Markdown");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setWorkspace(saved);
    }
  }, []);

  const handleSelectWorkspace = (path: string) => {
    localStorage.setItem(STORAGE_KEY, path);
    setWorkspace(path);
    setScopedWorkspace(null);
  };

  const handleChangeWorkspace = () => {
    localStorage.removeItem(STORAGE_KEY);
    setWorkspace(null);
    setScopedWorkspace(null);
  };

  // Open Scope Here: isolates Explorer and Editor to this subfolder
  const handleOpenScope = (folderPath: string, _folderName: string) => {
    setScopedWorkspace(folderPath);
    setActiveView("explorer");
  };

  const handleExitScope = () => {
    setScopedWorkspace(null);
  };

  // If no workspace initialized, display Kali Initializer screen
  if (!workspace) {
    return <WorkspaceWelcome onSelectWorkspace={handleSelectWorkspace} />;
  }

  const handleOpenFile = (filePath: string, fileName: string) => {
    setActiveFile({ path: filePath, name: fileName });
    // Switch view to editor/explorer to show the open code
    if (activeView === "desktop") {
      setActiveView("explorer");
    }
  };

  const currentEffectiveWorkspace = scopedWorkspace || workspace;

  const renderMainWorkspace = () => {
    switch (activeView) {
      case "desktop":
        return (
          <KaliDesktop
            workspacePath={workspace}
            onOpenFile={handleOpenFile}
            onOpenScope={handleOpenScope}
          />
        );

      case "explorer":
      case "editor":
        return (
          <SplitPane
            direction="horizontal"
            initialSplit={20}
            minSize={15}
            maxSize={40}
            left={
              <ExplorerView
                workspacePath={currentEffectiveWorkspace}
                selectedFile={activeFile?.path}
                onOpenFile={handleOpenFile}
                onOpenScope={handleOpenScope}
              />
            }
            right={
              <SplitPane
                direction="vertical"
                initialSplit={65}
                minSize={30}
                maxSize={85}
                left={
                  <EditorPane
                    activeFile={activeFile}
                    onLanguageChange={(lang) => setActiveLang(lang)}
                    scopedWorkspace={scopedWorkspace}
                    onExitScope={handleExitScope}
                  />
                }
                right={<TerminalPane />}
              />
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
                  <div className="mt-2 bg-[#281b3d] p-2 border border-[#ff007f]/50 text-xs">
                    <span className="text-[#ff007f] font-bold">Currently Scoped To: </span>
                    <span className="text-[#e2e8f0]">{scopedWorkspace}</span>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleChangeWorkspace}
                    className="text-xs bg-[#ff007f] hover:bg-[#e0007b] text-white px-3 py-1 font-semibold transition-colors"
                  >
                    Switch Root Workspace
                  </button>
                  {scopedWorkspace && (
                    <button
                      onClick={handleExitScope}
                      className="text-xs bg-[#261d38] hover:bg-[#281b3d] text-[#00e5ff] px-3 py-1 font-semibold border border-[#00e5ff]/40 transition-colors"
                    >
                      Exit Subfolder Scope
                    </button>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-[#261d38]">
                <p className="text-[10px] text-[#7a7194] uppercase tracking-wider mb-1 font-bold">
                  Color Theme
                </p>
                <p className="text-[#00e676]">
                  VS Code Cyberpunk Violet (Hot Magenta #ff007f / Deep Obsidian #0b0813)
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0b0813] text-[#cbd5e1] font-mono overflow-hidden select-none">
      {/* Main Body (Left Dock + Workstation Canvas) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Vertical Dock (56px) */}
        <LeftDock
          activeView={activeView}
          onSelectView={(v) => setActiveView(v)}
          onChangeWorkspace={handleChangeWorkspace}
        />

        {/* Dynamic Center Workstation Canvas */}
        <main className="flex-1 overflow-hidden relative">
          {renderMainWorkspace()}
        </main>
      </div>

      {/* Signature Hot Magenta Bottom Status Bar */}
      <BottomBar
        workspace={currentEffectiveWorkspace}
        activeLanguage={activeLang}
      />
    </div>
  );
};

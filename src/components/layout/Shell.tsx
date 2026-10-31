import React, { useState, useEffect } from "react";
import { TopBar } from "./TopBar";
import { ActivityBar } from "./ActivityBar";
import { SplitPane } from "./SplitPane";
import { ExplorerView } from "../explorer/ExplorerView";
import { EditorPane } from "../editor/EditorPane";
import { TerminalPane } from "../terminal/TerminalPane";
import { TelemetryPane } from "../telemetry/TelemetryPane";
import { SlayerPane } from "../slayer/SlayerPane";
import { WorkspaceWelcome } from "../welcome/WorkspaceWelcome";
import { ActivePanel } from "../../types";

const STORAGE_KEY = "dracodex_workspace";

export const Shell: React.FC = () => {
  const [workspace, setWorkspace] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>("explorer");
  const [activeFile, setActiveFile] = useState<{ path: string; name: string } | undefined>(undefined);

  // Load persisted workspace on boot
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setWorkspace(saved);
    }
  }, []);

  const handleSelectWorkspace = (path: string) => {
    localStorage.setItem(STORAGE_KEY, path);
    setWorkspace(path);
  };

  const handleChangeWorkspace = () => {
    localStorage.removeItem(STORAGE_KEY);
    setWorkspace(null);
  };

  // If no workspace initialized yet, display the Kali Linux Welcome Initializer screen
  if (!workspace) {
    return <WorkspaceWelcome onSelectWorkspace={handleSelectWorkspace} />;
  }

  const renderSideDrawer = () => {
    switch (activePanel) {
      case "explorer":
        return (
          <ExplorerView
            workspacePath={workspace}
            selectedFile={activeFile?.path}
            onOpenFile={(path, name) => setActiveFile({ path, name })}
          />
        );
      case "telemetry":
        return <TelemetryPane />;
      case "slayer":
        return <SlayerPane />;
      case "terminal":
        return (
          <div className="h-full bg-[#0a0e17] p-3 text-xs font-mono text-[#64748b]">
            <p className="text-[#00e5ff] font-semibold mb-2">CONPTY TERMINAL INFO</p>
            <p>Active Console: Windows PowerShell</p>
            <p>Mode: ConPTY Virtual Terminal</p>
            <p className="mt-4 text-[#94a3b8]">Focusing lower canvas...</p>
          </div>
        );
      case "settings":
        return (
          <div className="h-full bg-[#0a0e17] p-4 text-xs font-mono space-y-4">
            <h3 className="text-[#00e5ff] font-bold text-sm">DRACODEX CONFIGURATION</h3>
            <div className="space-y-1 text-[#94a3b8]">
              <p className="text-[#64748b] text-[10px] uppercase">Active Workspace:</p>
              <p className="bg-[#111726] p-2 border border-[#1b253b] text-[11px] font-mono break-all text-[#e2e8f0]">
                {workspace}
              </p>
              <button
                onClick={handleChangeWorkspace}
                className="mt-2 text-xs bg-[#2979ff] hover:bg-[#00e5ff] text-white hover:text-[#0a0e17] px-3 py-1 font-semibold transition-colors"
              >
                Change Workspace Folder
              </button>
            </div>
            <div className="space-y-1 text-[#94a3b8] pt-2 border-t border-[#1b253b]">
              <p className="text-[#64748b] text-[10px] uppercase">Telemetry Path:</p>
              <p className="bg-[#111726] p-2 border border-[#1b253b] text-[11px] truncate">
                %USERPROFILE%\.gemini\antigravity\brain
              </p>
            </div>
            <div className="space-y-1 text-[#94a3b8]">
              <p className="text-[#64748b] text-[10px] uppercase">Active Theme:</p>
              <p className="bg-[#111726] p-2 border border-[#1b253b] text-[11px] text-[#00e676]">
                Kali Dark-Slate Cyberdeck (#0a0e17)
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0e17] text-[#cbd5e1] font-mono overflow-hidden">
      {/* Top Status Bar (Kali XFCE Style) */}
      <TopBar
        activePanel={activePanel}
        workspacePath={workspace}
        onChangeWorkspace={handleChangeWorkspace}
        onSelectPanel={(panel) => setActivePanel(panel)}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Activity Rail */}
        <ActivityBar
          activePanel={activePanel}
          onSelectPanel={(panel) => setActivePanel(panel)}
        />

        {/* Resizable Side Drawer + Main Cockpit Grid */}
        <div className="flex-1 overflow-hidden">
          <SplitPane
            direction="horizontal"
            initialSplit={22}
            minSize={15}
            maxSize={40}
            left={
              <div className="h-full border-r border-[#1b253b] overflow-hidden">
                {renderSideDrawer()}
              </div>
            }
            right={
              <SplitPane
                direction="vertical"
                initialSplit={65}
                minSize={30}
                maxSize={85}
                left={<EditorPane activeFile={activeFile} />}
                right={<TerminalPane />}
              />
            }
          />
        </div>
      </div>
    </div>
  );
};

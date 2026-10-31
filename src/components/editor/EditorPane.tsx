import React, { useState, useEffect } from "react";
import { X, FileCode, Save, Check, FileText } from "lucide-react";

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  isDirty?: boolean;
}

interface EditorPaneProps {
  activeFile?: { path: string; name: string };
}

export const EditorPane: React.FC<EditorPaneProps> = ({ activeFile }) => {
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // When activeFile prop changes from Explorer, open or switch to it
  useEffect(() => {
    if (!activeFile) return;

    const existing = tabs.find((t) => t.path === activeFile.path);
    if (existing) {
      setActiveTabPath(existing.path);
      return;
    }

    // Load file content
    const load = async () => {
      let content = "";
      if (window.dracoAPI?.readFile) {
        try {
          content = await window.dracoAPI.readFile(activeFile.path);
        } catch {
          content = `// Error reading ${activeFile.name}`;
        }
      } else {
        content = `// ${activeFile.name}\n// Running in browser preview mode\n\nconsole.log("Dracodex Cockpit");`;
      }

      const newTab: OpenTab = {
        path: activeFile.path,
        name: activeFile.name,
        content,
        isDirty: false,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabPath(activeFile.path);
    };

    load();
  }, [activeFile]);

  // If no tab opened yet, open default README
  useEffect(() => {
    if (tabs.length === 0 && !activeFile) {
      const defaultPath = "README.md";
      const loadDefault = async () => {
        let content = "";
        if (window.dracoAPI?.readFile) {
          try {
            content = await window.dracoAPI.readFile(defaultPath);
          } catch {
            content = "# DRACODEX\nThe Offensive-Grade Developer Cockpit for Windows";
          }
        } else {
          content = "# DRACODEX\nThe Offensive-Grade Developer Cockpit for Windows";
        }
        setTabs([
          {
            path: defaultPath,
            name: "README.md",
            content,
            isDirty: false,
          },
        ]);
        setActiveTabPath(defaultPath);
      };
      loadDefault();
    }
  }, [tabs.length, activeFile]);

  const currentTab = tabs.find((t) => t.path === activeTabPath);

  const handleContentChange = (newContent: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.path === activeTabPath
          ? { ...t, content: newContent, isDirty: true }
          : t
      )
    );
  };

  const handleSave = async () => {
    if (!currentTab) return;
    if (window.dracoAPI?.writeFile) {
      try {
        await window.dracoAPI.writeFile(currentTab.path, currentTab.content);
        setTabs((prev) =>
          prev.map((t) =>
            t.path === activeTabPath ? { ...t, isDirty: false } : t
          )
        );
        setSaveStatus("SAVED");
        setTimeout(() => setSaveStatus(null), 2000);
      } catch (err) {
        console.error("Failed to save file:", err);
      }
    }
  };

  const closeTab = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const filtered = tabs.filter((t) => t.path !== path);
    setTabs(filtered);
    if (activeTabPath === path && filtered.length > 0) {
      setActiveTabPath(filtered[filtered.length - 1].path);
    }
  };

  // Detect language from extension
  const getLanguage = (fileName?: string) => {
    if (!fileName) return "Plain Text";
    if (fileName.endsWith(".ts") || fileName.endsWith(".tsx")) return "TypeScript";
    if (fileName.endsWith(".js") || fileName.endsWith(".jsx") || fileName.endsWith(".cjs")) return "JavaScript";
    if (fileName.endsWith(".json")) return "JSON";
    if (fileName.endsWith(".md")) return "Markdown";
    if (fileName.endsWith(".css")) return "CSS";
    if (fileName.endsWith(".rs")) return "Rust";
    return "Plain Text";
  };

  const lines = currentTab ? currentTab.content.split("\n") : [];

  return (
    <div className="h-full bg-[#0a0e17] flex flex-col overflow-hidden font-mono text-xs">
      {/* Editor Tab Bar */}
      <div className="h-8 bg-[#0d131f] border-b border-[#1b253b] flex items-center overflow-x-auto select-none">
        {tabs.map((tab) => {
          const isActive = tab.path === activeTabPath;
          const isMarkdown = tab.name.endsWith(".md");
          return (
            <div
              key={tab.path}
              onClick={() => setActiveTabPath(tab.path)}
              className={`h-full flex items-center gap-2 px-3 border-r border-[#1b253b] text-xs font-mono cursor-pointer transition-colors max-w-xs truncate ${
                isActive
                  ? "bg-[#0a0e17] text-[#00e5ff] border-t-2 border-t-[#00e5ff]"
                  : "bg-[#0d131f] text-[#64748b] hover:bg-[#111726] hover:text-[#cbd5e1]"
              }`}
            >
              {isMarkdown ? (
                <FileText className="w-3.5 h-3.5 text-[#64748b]" />
              ) : (
                <FileCode className="w-3.5 h-3.5 text-[#00e5ff]" />
              )}
              <span className="truncate">{tab.name}</span>
              {tab.isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
              )}
              <button
                onClick={(e) => closeTab(e, tab.path)}
                className="hover:text-[#ff1744] hover:bg-[#1b253b]/40 p-0.5 rounded-none"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* Save indicator & action */}
        {currentTab && currentTab.isDirty && (
          <button
            onClick={handleSave}
            title="Save file (Ctrl+S)"
            className="ml-auto mr-2 flex items-center gap-1 text-[10px] bg-[#00e5ff]/20 hover:bg-[#00e5ff] text-[#00e5ff] hover:text-[#0a0e17] px-2 py-0.5 border border-[#00e5ff] transition-colors"
          >
            <Save className="w-3 h-3" />
            <span>SAVE</span>
          </button>
        )}
        {saveStatus && (
          <span className="ml-auto mr-3 text-[10px] text-[#00e676] flex items-center gap-1">
            <Check className="w-3 h-3" />
            <span>SAVED</span>
          </span>
        )}
      </div>

      {/* Editor Content Canvas (VS Code Style Kali Dark) */}
      <div className="flex-1 bg-[#0a0e17] flex overflow-hidden">
        {currentTab ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Line Numbers Gutter */}
            <div className="w-12 bg-[#090d14] text-[#334155] select-none text-right pr-2 pt-3 border-r border-[#1b253b] font-mono overflow-hidden">
              {lines.map((_, i) => (
                <div key={i} className="leading-5 text-[11px]">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Editable Code Canvas */}
            <textarea
              value={currentTab.content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                  e.preventDefault();
                  handleSave();
                }
              }}
              spellCheck={false}
              className="flex-1 bg-[#0a0e17] text-[#cbd5e1] p-3 pl-3 font-mono text-[11px] leading-5 resize-none outline-none overflow-auto border-none selection:bg-[#1b253b] selection:text-[#00e5ff]"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#64748b] gap-2 select-none">
            <FileCode className="w-8 h-8 text-[#1b253b]" />
            <p>No file selected. Choose a file from the explorer.</p>
          </div>
        )}
      </div>

      {/* Editor Footer Status Bar (VS Code Style) */}
      <div className="h-6 bg-[#0d131f] border-t border-[#1b253b] px-3 flex items-center justify-between text-[10px] text-[#64748b] font-mono select-none">
        <div className="flex items-center gap-3">
          <span>Ln {lines.length}, Col 1</span>
          <span>Spaces: 2</span>
          <span>UTF-8</span>
          <span>LF</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#00e5ff]">{getLanguage(currentTab?.name)}</span>
          <span className="text-[#1b253b]">|</span>
          <span className="text-[#00e676]">KALI DARK SYNTAX</span>
        </div>
      </div>
    </div>
  );
};

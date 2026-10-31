import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, FileCode, Save, Check, FileText, CornerDownLeft, Eye, EyeOff } from "lucide-react";
import { highlightCode, Token } from "./syntaxHighlighter";

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  isDirty?: boolean;
}

interface EditorPaneProps {
  activeFile?: { path: string; name: string };
  onLanguageChange?: (lang: string) => void;
  scopedWorkspace?: string | null;
  onExitScope?: () => void;
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  activeFile,
  onLanguageChange,
  scopedWorkspace,
  onExitScope,
}) => {
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSyntaxOn, setIsSyntaxOn] = useState<boolean>(true);

  const gutterRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!activeFile) return;

    const existing = tabs.find((t) => t.path === activeFile.path);
    if (existing) {
      setActiveTabPath(existing.path);
      return;
    }

    const load = async () => {
      let content = "";
      if (window.dracoAPI?.readFile) {
        try {
          content = await window.dracoAPI.readFile(activeFile.path);
        } catch {
          content = `// Error loading ${activeFile.name}`;
        }
      } else {
        content = `# ${activeFile.name}\n\n// Running in preview mode`;
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

  // Default initial tab
  useEffect(() => {
    if (tabs.length === 0 && !activeFile) {
      const defaultPath = "README.md";
      const loadDefault = async () => {
        let content = "";
        if (window.dracoAPI?.readFile) {
          try {
            content = await window.dracoAPI.readFile(defaultPath);
          } catch {
            content = "# DRACODECK\nThe Offensive-Grade Developer Cockpit for Windows";
          }
        } else {
          content = "# DRACODECK\nThe Offensive-Grade Developer Cockpit for Windows";
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

  // Update active language for BottomBar
  useEffect(() => {
    if (currentTab && onLanguageChange) {
      const ext = currentTab.name.split(".").pop()?.toUpperCase() || "PLAINTEXT";
      onLanguageChange(ext === "MD" ? "Markdown" : ext);
    }
  }, [currentTab, onLanguageChange]);

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

  const lines = currentTab ? currentTab.content.split("\n") : [];

  // Syntax highlighting memoization
  const tokenizedLines = useMemo(() => {
    if (!currentTab) return [];
    return highlightCode(currentTab.content, currentTab.name);
  }, [currentTab?.content, currentTab?.name]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
  };

  const renderToken = (tok: Token, idx: number) => {
    switch (tok.type) {
      case "kw-control":
        return <span key={idx} className="text-[#00e676] font-bold">{tok.value}</span>;
      case "kw-decl":
        return <span key={idx} className="text-[#00e5ff] font-semibold">{tok.value}</span>;
      case "type":
        return <span key={idx} className="text-[#38bdf8] font-medium">{tok.value}</span>;
      case "fn-def":
        return <span key={idx} className="text-[#ff007f] font-bold">{tok.value}</span>;
      case "fn-call":
        return <span key={idx} className="text-[#f43f5e]">{tok.value}</span>;
      case "prop":
        return <span key={idx} className="text-[#c084fc]">{tok.value}</span>;
      case "str":
        return <span key={idx} className="text-[#ffb74d]">{tok.value}</span>;
      case "template":
        return <span key={idx} className="text-[#ffcc80]">{tok.value}</span>;
      case "num":
        return <span key={idx} className="text-[#ff9100]">{tok.value}</span>;
      case "bool":
        return <span key={idx} className="text-[#ffd600] font-bold">{tok.value}</span>;
      case "operator":
        return <span key={idx} className="text-[#a3e635]">{tok.value}</span>;
      case "punct":
        return <span key={idx} className="text-[#94a3b8]">{tok.value}</span>;
      case "decorator":
        return <span key={idx} className="text-[#e879f9] italic">{tok.value}</span>;
      case "tag":
        return <span key={idx} className="text-[#ff1744] font-semibold">{tok.value}</span>;
      case "attr":
        return <span key={idx} className="text-[#22d3ee]">{tok.value}</span>;
      case "cmt":
        return <span key={idx} className="text-[#64748b] italic">{tok.value}</span>;
      case "heading":
        return <span key={idx} className="text-[#00e5ff] font-bold">{tok.value}</span>;
      case "md-code":
        return <span key={idx} className="text-[#ff007f] font-semibold">{tok.value}</span>;
      default:
        return <span key={idx} className="text-[#cbd5e1]">{tok.value}</span>;
    }
  };

  const scopedFolderName = scopedWorkspace
    ? scopedWorkspace.split(/[/\\]/).filter(Boolean).pop()
    : null;

  return (
    <div className="h-full bg-[#0b0813] flex flex-col overflow-hidden font-mono text-xs">
      {/* Subfolder Scoping Banner (When scoped) */}
      {scopedWorkspace && (
        <div className="h-6 bg-[#281b3d] border-b border-[#ff007f]/50 px-3 flex items-center justify-between text-[11px] select-none text-[#00e5ff]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff007f] animate-pulse" />
            <span className="font-bold tracking-wide">
              ISOLATED SCOPE: <span className="text-[#e2e8f0]">{scopedFolderName}</span>
            </span>
            <span className="text-[10px] text-[#7a7194] hidden sm:inline">({scopedWorkspace})</span>
          </div>
          {onExitScope && (
            <button
              onClick={onExitScope}
              className="flex items-center gap-1 text-[10px] bg-[#ff007f] hover:bg-[#e0007b] text-white px-2 py-0.5 font-bold transition-colors"
            >
              <CornerDownLeft className="w-3 h-3" />
              <span>EXIT SCOPE</span>
            </button>
          )}
        </div>
      )}

      {/* Editor Tab Bar */}
      <div className="h-8 bg-[#120c1f] border-b border-[#261d38] flex items-center overflow-x-auto select-none">
        {tabs.map((tab) => {
          const isActive = tab.path === activeTabPath;
          const isMarkdown = tab.name.endsWith(".md");
          return (
            <div
              key={tab.path}
              onClick={() => setActiveTabPath(tab.path)}
              className={`h-full flex items-center gap-2 px-3 border-r border-[#261d38] text-xs font-mono cursor-pointer transition-colors max-w-xs truncate ${
                isActive
                  ? "bg-[#0b0813] text-[#e2e8f0] border-t-2 border-t-[#ff007f] font-semibold"
                  : "bg-[#120c1f] text-[#7a7194] hover:bg-[#161026] hover:text-[#cbd5e1]"
              }`}
            >
              {isMarkdown ? (
                <FileText className="w-3.5 h-3.5 text-[#ff8800]" />
              ) : (
                <FileCode className="w-3.5 h-3.5 text-[#00e5ff]" />
              )}
              <span className="truncate">{tab.name}</span>
              {tab.isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff007f] animate-pulse" />
              )}
              <button
                onClick={(e) => closeTab(e, tab.path)}
                className="hover:text-[#ff1744] hover:bg-[#261d38] p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* Syntax Highlight Toggle */}
        <div className="ml-auto mr-2 flex items-center gap-2">
          <button
            onClick={() => setIsSyntaxOn(!isSyntaxOn)}
            title={isSyntaxOn ? "Disable Syntax Colors" : "Enable Syntax Colors"}
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 border transition-colors ${
              isSyntaxOn
                ? "bg-[#281b3d] text-[#00e5ff] border-[#00e5ff]/50"
                : "bg-[#161026] text-[#7a7194] border-[#261d38]"
            }`}
          >
            {isSyntaxOn ? <Eye className="w-3 h-3 text-[#00e676]" /> : <EyeOff className="w-3 h-3" />}
            <span>SYNTAX</span>
          </button>

          {/* Save button if dirty */}
          {currentTab && currentTab.isDirty && (
            <button
              onClick={handleSave}
              title="Save file (Ctrl+S)"
              className="flex items-center gap-1 text-[10px] bg-[#ff007f]/20 hover:bg-[#ff007f] text-[#ff007f] hover:text-white px-2 py-0.5 border border-[#ff007f] transition-colors"
            >
              <Save className="w-3 h-3" />
              <span>SAVE</span>
            </button>
          )}

          {saveStatus && (
            <span className="text-[10px] text-[#00e676] flex items-center gap-1 font-semibold">
              <Check className="w-3 h-3" />
              <span>SAVED</span>
            </span>
          )}
        </div>
      </div>

      {/* Code Editor Body */}
      <div className="flex-1 bg-[#0b0813] flex overflow-hidden">
        {currentTab ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Line Numbers Gutter */}
            <div
              ref={gutterRef}
              className="w-12 bg-[#0e0a19] text-[#443a57] select-none text-right pr-2 pt-3 border-r border-[#261d38] font-mono overflow-hidden"
            >
              {lines.map((_, i) => (
                <div key={i} className="h-5 leading-5 text-[11px]">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Synchronized Editor Canvas */}
            <div className="flex-1 relative overflow-hidden bg-[#0b0813]">
              {/* Syntax Highlighted Underlay */}
              {isSyntaxOn && (
                <pre
                  ref={preRef}
                  aria-hidden="true"
                  className="absolute inset-0 p-3 pt-3 font-mono text-[11px] leading-5 pointer-events-none select-none overflow-hidden whitespace-pre m-0 border-none bg-transparent"
                >
                  {tokenizedLines.map((lineTokens, lineIdx) => (
                    <div key={lineIdx} className="h-5 leading-5">
                      {lineTokens.length === 0 ? " " : lineTokens.map((tok, tokIdx) => renderToken(tok, tokIdx))}
                    </div>
                  ))}
                </pre>
              )}

              {/* Textarea Overlay */}
              <textarea
                ref={textareaRef}
                value={currentTab.content}
                onChange={(e) => handleContentChange(e.target.value)}
                onScroll={handleScroll}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                spellCheck={false}
                className={`absolute inset-0 p-3 pt-3 font-mono text-[11px] leading-5 resize-none outline-none overflow-auto border-none whitespace-pre selection:bg-[#ff007f]/35 selection:text-white ${
                  isSyntaxOn
                    ? "bg-transparent text-transparent caret-[#ff007f]"
                    : "bg-[#0b0813] text-[#cbd5e1] caret-[#00e5ff]"
                }`}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#7a7194] gap-2 select-none">
            <FileCode className="w-8 h-8 text-[#261d38]" />
            <p>No file open. Select a file from the explorer to inspect.</p>
          </div>
        )}
      </div>
    </div>
  );
};

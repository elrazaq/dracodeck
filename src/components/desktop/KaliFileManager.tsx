import React, { useState, useEffect, useCallback } from "react";
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  File,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  RefreshCw,
  Home,
  Clock,
  Trash2,
  HardDrive,
  LayoutGrid,
  List as ListIcon,
  Search,
} from "lucide-react";
import { FileEntry, sortEntries } from "../../types";

interface KaliFileManagerProps {
  workspacePath: string;
  onOpenFile: (filePath: string, fileName: string) => void;
}

export const KaliFileManager: React.FC<KaliFileManagerProps> = ({
  workspacePath,
  onOpenFile,
}) => {
  const [currentDir, setCurrentDir] = useState<string>(workspacePath);
  const [history, setHistory] = useState<string[]>([workspacePath]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // Sync when workspacePath prop changes
  useEffect(() => {
    setCurrentDir(workspacePath);
    setHistory([workspacePath]);
    setHistoryIndex(0);
  }, [workspacePath]);

  const loadDirectory = useCallback(async (dirPath: string) => {
    setLoading(true);
    try {
      let raw: FileEntry[] = [];
      if (window.dracoAPI?.readDir) {
        raw = await window.dracoAPI.readDir(dirPath);
      } else {
        // Fallback demo files if running in browser
        raw = [
          { name: "docs", isDirectory: true, path: `${dirPath}/docs` },
          { name: "electron", isDirectory: true, path: `${dirPath}/electron` },
          { name: "src", isDirectory: true, path: `${dirPath}/src` },
          { name: "public", isDirectory: true, path: `${dirPath}/public` },
          { name: ".agents", isDirectory: true, path: `${dirPath}/.agents` },
          { name: "AGENTS.md", isDirectory: false, path: `${dirPath}/AGENTS.md` },
          { name: "GEMINI.md", isDirectory: false, path: `${dirPath}/GEMINI.md` },
          { name: "package.json", isDirectory: false, path: `${dirPath}/package.json` },
          { name: "README.md", isDirectory: false, path: `${dirPath}/README.md` },
          { name: "index.html", isDirectory: false, path: `${dirPath}/index.html` },
          { name: "vite.config.ts", isDirectory: false, path: `${dirPath}/vite.config.ts` },
        ];
      }

      // CRITICAL: Sort folders first ascending, then files ascending
      const sorted = sortEntries(raw);
      setEntries(sorted);
    } catch (err) {
      console.error("Failed to load directory:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory(currentDir);
  }, [currentDir, loadDirectory]);

  const navigateTo = (newPath: string) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newPath);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    setCurrentDir(newPath);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setCurrentDir(target);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setCurrentDir(target);
    }
  };

  const handleUp = () => {
    const parts = currentDir.split(/[/\\]/).filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      const parent = parts.join("\\");
      navigateTo(parent);
    }
  };

  const filteredEntries = entries.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const folderCount = filteredEntries.filter((e) => e.isDirectory).length;
  const fileCount = filteredEntries.filter((e) => !e.isDirectory).length;

  const renderFileIcon = (item: FileEntry) => {
    if (item.isDirectory) {
      return (
        <div className="relative">
          <Folder className="w-10 h-10 text-[#00e5ff] fill-[#00e5ff]/15 stroke-[1.5]" />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[#ff007f] font-bold">
            /
          </span>
        </div>
      );
    }

    if (item.name.endsWith(".md")) {
      return <FileText className="w-9 h-9 text-[#ff8800] stroke-[1.5]" />;
    }
    if (item.name.endsWith(".ts") || item.name.endsWith(".tsx")) {
      return <FileCode className="w-9 h-9 text-[#00e5ff] stroke-[1.5]" />;
    }
    if (item.name.endsWith(".js") || item.name.endsWith(".cjs") || item.name.endsWith(".json")) {
      return <FileCode className="w-9 h-9 text-[#ffea00] stroke-[1.5]" />;
    }
    return <File className="w-9 h-9 text-[#7a7194] stroke-[1.5]" />;
  };

  return (
    <div className="h-full w-full bg-[#161026] text-[#cbd5e1] font-mono flex flex-col border border-[#261d38] rounded-xs overflow-hidden select-none shadow-2xl">
      {/* Dolphin / Thunar Title Bar */}
      <div className="h-8 bg-[#120c1f] border-b border-[#261d38] px-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-[#ff007f]" />
          <span className="font-bold text-[#e2e8f0] tracking-wide">
            KALI FILE MANAGER // <span className="text-[#00e5ff]">DOLPHIN</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffea00]/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#00e676]/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff1744]/80 inline-block" />
        </div>
      </div>

      {/* Navigation & Toolbar */}
      <div className="h-10 bg-[#161026] border-b border-[#261d38] px-3 flex items-center justify-between gap-3 text-xs">
        {/* History Nav */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleBack}
            disabled={historyIndex === 0}
            className="p-1.5 rounded-xs hover:bg-[#281b3d] disabled:opacity-30 text-[#7a7194] hover:text-[#00e5ff] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleForward}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-xs hover:bg-[#281b3d] disabled:opacity-30 text-[#7a7194] hover:text-[#00e5ff] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleUp}
            className="p-1.5 rounded-xs hover:bg-[#281b3d] text-[#7a7194] hover:text-[#00e5ff] transition-colors"
            title="Up directory"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => loadDirectory(currentDir)}
            className="p-1.5 rounded-xs hover:bg-[#281b3d] text-[#7a7194] hover:text-[#00e5ff] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#ff007f]" : ""}`} />
          </button>
        </div>

        {/* Breadcrumb Path Bar */}
        <div className="flex-1 bg-[#0b0813] border border-[#261d38] px-3 py-1 flex items-center text-[11px] truncate text-[#00e5ff] font-mono">
          <span className="text-[#7a7194] mr-1">PATH:</span>
          <span className="truncate">{currentDir}</span>
        </div>

        {/* Search & View Mode */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#7a7194] absolute left-2 top-1.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter files..."
              className="w-36 bg-[#0b0813] border border-[#261d38] focus:border-[#ff007f] pl-7 pr-2 py-1 text-[11px] outline-none text-[#e2e8f0]"
            />
          </div>
          <div className="flex border border-[#261d38] rounded-xs overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 ${viewMode === "grid" ? "bg-[#ff007f] text-[#0b0813]" : "bg-[#120c1f] text-[#7a7194] hover:text-white"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 ${viewMode === "list" ? "bg-[#ff007f] text-[#0b0813]" : "bg-[#120c1f] text-[#7a7194] hover:text-white"}`}
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Body: Places Sidebar + File Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Places Sidebar */}
        <aside className="w-48 bg-[#120c1f] border-r border-[#261d38] p-2 flex flex-col gap-4 text-xs select-none">
          <div>
            <p className="text-[10px] font-bold text-[#7a7194] uppercase tracking-wider px-2 mb-1">
              PLACES
            </p>
            <div className="space-y-0.5">
              <button
                onClick={() => navigateTo(workspacePath)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xs text-left transition-colors ${
                  currentDir === workspacePath
                    ? "bg-[#281b3d] text-[#00e5ff] font-semibold border-l-2 border-[#ff007f]"
                    : "text-[#cbd5e1] hover:bg-[#161026]"
                }`}
              >
                <Home className="w-3.5 h-3.5 text-[#00e5ff]" />
                <span className="truncate">Workspace Root</span>
              </button>
              <button
                onClick={() => navigateTo(`${workspacePath}\\docs`)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xs text-left text-[#cbd5e1] hover:bg-[#161026] transition-colors"
              >
                <Folder className="w-3.5 h-3.5 text-[#2979ff]" />
                <span className="truncate">Docs</span>
              </button>
              <button
                onClick={() => navigateTo(`${workspacePath}\\src`)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xs text-left text-[#cbd5e1] hover:bg-[#161026] transition-colors"
              >
                <Folder className="w-3.5 h-3.5 text-[#00e676]" />
                <span className="truncate">Source</span>
              </button>
              <button
                onClick={() => navigateTo(`${workspacePath}\\electron`)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xs text-left text-[#cbd5e1] hover:bg-[#161026] transition-colors"
              >
                <Folder className="w-3.5 h-3.5 text-[#ff8800]" />
                <span className="truncate">Electron</span>
              </button>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-[#7a7194] uppercase tracking-wider px-2 mb-1">
              SYSTEM
            </p>
            <div className="space-y-0.5 text-[#7a7194]">
              <div className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-[#161026] hover:text-[#cbd5e1]">
                <Clock className="w-3.5 h-3.5" />
                <span>Recent Files</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-[#161026] hover:text-[#cbd5e1]">
                <Trash2 className="w-3.5 h-3.5" />
                <span>Trash</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Pane (Strict Folder-First Ascending Matrix) */}
        <div className="flex-1 bg-[#0b0813] p-4 overflow-y-auto">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
              {filteredEntries.map((item) => (
                <div
                  key={item.path}
                  onClick={() => {
                    if (item.isDirectory) {
                      navigateTo(item.path);
                    } else {
                      onOpenFile(item.path, item.name);
                    }
                  }}
                  className="group flex flex-col items-center justify-center p-3 rounded-xs border border-transparent hover:border-[#261d38] hover:bg-[#161026] cursor-pointer transition-all text-center"
                >
                  <div className="mb-2 group-hover:scale-105 transition-transform">
                    {renderFileIcon(item)}
                  </div>
                  <span className="text-[11px] font-mono text-[#cbd5e1] group-hover:text-[#00e5ff] truncate max-w-full">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            /* List Mode (Dolphin Detailed View) */
            <div className="space-y-1">
              {filteredEntries.map((item) => (
                <div
                  key={item.path}
                  onClick={() => {
                    if (item.isDirectory) {
                      navigateTo(item.path);
                    } else {
                      onOpenFile(item.path, item.name);
                    }
                  }}
                  className="flex items-center justify-between px-3 py-1.5 rounded-xs hover:bg-[#161026] hover:text-[#00e5ff] cursor-pointer transition-colors border-b border-[#261d38]/40"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {item.isDirectory ? (
                      <Folder className="w-4 h-4 text-[#00e5ff]" />
                    ) : (
                      <FileCode className="w-4 h-4 text-[#7a7194]" />
                    )}
                    <span className="text-xs truncate">{item.name}</span>
                  </div>
                  <span className="text-[10px] text-[#7a7194]">
                    {item.isDirectory ? "Folder" : "File"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {filteredEntries.length === 0 && (
            <div className="h-full flex items-center justify-center text-[#7a7194] text-xs">
              No matching folders or files found.
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Bar (Dolphin Metrics) */}
      <div className="h-7 bg-[#120c1f] border-t border-[#261d38] px-3 flex items-center justify-between text-[11px] text-[#7a7194]">
        <div className="flex items-center gap-3">
          <span className="text-[#00e5ff] font-semibold">{folderCount} Folders</span>
          <span>{fileCount} Files</span>
        </div>
        <div className="flex items-center gap-2">
          <HardDrive className="w-3 h-3 text-[#00e676]" />
          <span>Local Storage: Connected</span>
        </div>
      </div>
    </div>
  );
};

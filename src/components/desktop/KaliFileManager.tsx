import React, { useState, useEffect, useCallback } from "react";
import {
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
  FolderOpen,
} from "lucide-react";
import { FileEntry, sortEntries } from "../../types";
import { FileIcon } from "../common/FileIcon";
import { ContextMenu } from "../common/ContextMenu";

interface KaliFileManagerProps {
  workspacePath: string;
  onOpenFile: (filePath: string, fileName: string) => void;
  onOpenScope?: (folderPath: string, folderName: string) => void;
}

export const KaliFileManager: React.FC<KaliFileManagerProps> = ({
  workspacePath,
  onOpenFile,
  onOpenScope,
}) => {
  const [currentDir, setCurrentDir] = useState<string>(workspacePath);
  const [history, setHistory] = useState<string[]>([workspacePath]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    path: string;
    name: string;
    isDirectory: boolean;
  } | null>(null);

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

      // Strict folder-first ascending sorting
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

  const handleContextMenu = (e: React.MouseEvent, item: FileEntry) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      path: item.path,
      name: item.name,
      isDirectory: item.isDirectory,
    });
  };

  const filteredEntries = entries.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const folderCount = filteredEntries.filter((e) => e.isDirectory).length;
  const fileCount = filteredEntries.filter((e) => !e.isDirectory).length;

  return (
    <div className="h-full w-full bg-[#161026] text-[#cbd5e1] font-mono flex flex-col overflow-hidden select-none">
      {/* Dolphin / Thunar Title & Nav Toolbar */}
      <div className="h-9 bg-[#120c1f] border-b border-[#261d38] px-3 flex items-center justify-between gap-3 text-xs">
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
              placeholder="Filter..."
              className="w-32 bg-[#0b0813] border border-[#261d38] focus:border-[#ff007f] pl-7 pr-2 py-1 text-[11px] outline-none text-[#e2e8f0]"
            />
          </div>
          <div className="flex border border-[#261d38] rounded-xs overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 ${viewMode === "grid" ? "bg-[#ff007f] text-white" : "bg-[#120c1f] text-[#7a7194] hover:text-white"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 ${viewMode === "list" ? "bg-[#ff007f] text-white" : "bg-[#120c1f] text-[#7a7194] hover:text-white"}`}
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
                <FolderOpen className="w-3.5 h-3.5 text-[#2979ff]" />
                <span className="truncate">docs</span>
              </button>
              <button
                onClick={() => navigateTo(`${workspacePath}\\src`)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xs text-left text-[#cbd5e1] hover:bg-[#161026] transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#00e676]" />
                <span className="truncate">src</span>
              </button>
              <button
                onClick={() => navigateTo(`${workspacePath}\\electron`)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xs text-left text-[#cbd5e1] hover:bg-[#161026] transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#ff8800]" />
                <span className="truncate">electron</span>
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

        {/* Content Pane (Folder-First Matrix) */}
        <div className="flex-1 bg-[#0b0813] p-4 overflow-y-auto">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(105px,1fr))] gap-3">
              {filteredEntries.map((item) => (
                <div
                  key={item.path}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                  onClick={() => {
                    if (item.isDirectory) {
                      navigateTo(item.path);
                    } else {
                      onOpenFile(item.path, item.name);
                    }
                  }}
                  className="group flex flex-col items-center justify-center p-3 rounded-xs border border-transparent hover:border-[#261d38] hover:bg-[#161026] cursor-pointer transition-all text-center relative"
                >
                  <div className="mb-2 group-hover:scale-105 transition-transform flex items-center justify-center">
                    <FileIcon name={item.name} isDirectory={item.isDirectory} size="lg" />
                  </div>
                  <span className="text-[11px] font-mono text-[#cbd5e1] group-hover:text-[#00e5ff] truncate max-w-full">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredEntries.map((item) => (
                <div
                  key={item.path}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                  onClick={() => {
                    if (item.isDirectory) {
                      navigateTo(item.path);
                    } else {
                      onOpenFile(item.path, item.name);
                    }
                  }}
                  className="flex items-center justify-between px-3 py-1.5 rounded-xs hover:bg-[#161026] hover:text-[#00e5ff] cursor-pointer transition-colors border-b border-[#261d38]/30"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileIcon name={item.name} isDirectory={item.isDirectory} size="sm" />
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
              No matching files or folders.
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
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

      {/* Right-click Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          targetPath={contextMenu.path}
          targetName={contextMenu.name}
          isDirectory={contextMenu.isDirectory}
          onOpenScope={(path, name) => {
            onOpenScope?.(path, name);
          }}
          onOpenFile={(path, name) => {
            onOpenFile(path, name);
          }}
          onRefresh={() => loadDirectory(currentDir)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

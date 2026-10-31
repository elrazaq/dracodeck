import React, { useState, useEffect, useCallback } from "react";
import { Folder, FolderOpen, FileCode, FileText, ChevronRight, ChevronDown, RefreshCw } from "lucide-react";

export interface ExplorerItem {
  name: string;
  isDirectory: boolean;
  path: string;
  children?: ExplorerItem[];
}

interface ExplorerViewProps {
  workspacePath: string;
  onOpenFile: (filePath: string, fileName: string) => void;
  selectedFile?: string;
}

export const ExplorerView: React.FC<ExplorerViewProps> = ({
  workspacePath,
  onOpenFile,
  selectedFile,
}) => {
  const [items, setItems] = useState<ExplorerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDirs, setOpenDirs] = useState<Record<string, boolean>>({});

  const loadDirectory = useCallback(async (dirPath: string): Promise<ExplorerItem[]> => {
    if (window.dracoAPI?.readDir) {
      const res = await window.dracoAPI.readDir(dirPath);
      return res.map((r: { name: string; isDirectory: boolean; path: string }) => ({
        name: r.name,
        isDirectory: r.isDirectory,
        path: r.path,
      }));
    }
    // Fallback if running outside Electron
    return [
      { name: "docs", isDirectory: true, path: `${dirPath}/docs` },
      { name: "electron", isDirectory: true, path: `${dirPath}/electron` },
      { name: "src", isDirectory: true, path: `${dirPath}/src` },
      { name: "AGENTS.md", isDirectory: false, path: `${dirPath}/AGENTS.md` },
      { name: "GEMINI.md", isDirectory: false, path: `${dirPath}/GEMINI.md` },
      { name: "package.json", isDirectory: false, path: `${dirPath}/package.json` },
      { name: "README.md", isDirectory: false, path: `${dirPath}/README.md` },
    ];
  }, []);

  const refreshRoot = useCallback(async () => {
    if (!workspacePath) return;
    setLoading(true);
    try {
      const rootItems = await loadDirectory(workspacePath);
      setItems(rootItems);
    } catch (err) {
      console.error("Error refreshing explorer:", err);
    } finally {
      setLoading(false);
    }
  }, [workspacePath, loadDirectory]);

  useEffect(() => {
    refreshRoot();
  }, [refreshRoot]);

  const toggleDirectory = async (item: ExplorerItem) => {
    const isCurrentlyOpen = !!openDirs[item.path];
    if (isCurrentlyOpen) {
      setOpenDirs((prev) => ({ ...prev, [item.path]: false }));
      return;
    }

    // If opening and children not yet loaded, load them
    if (!item.children) {
      const subItems = await loadDirectory(item.path);
      item.children = subItems;
      setItems([...items]);
    }

    setOpenDirs((prev) => ({ ...prev, [item.path]: true }));
  };

  const renderItem = (item: ExplorerItem, depth: number = 0) => {
    const isOpen = !!openDirs[item.path];
    const isSelected = selectedFile === item.path || selectedFile === item.name;

    if (item.isDirectory) {
      return (
        <div key={item.path} className="select-none">
          <div
            onClick={() => toggleDirectory(item)}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            className="flex items-center gap-1.5 py-1 pr-2 hover:bg-[#111726] text-[#94a3b8] hover:text-[#e2e8f0] cursor-pointer text-xs transition-colors"
          >
            {isOpen ? (
              <ChevronDown className="w-3 h-3 text-[#64748b] flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-[#64748b] flex-shrink-0" />
            )}
            {isOpen ? (
              <FolderOpen className="w-3.5 h-3.5 text-[#2979ff] flex-shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-[#2979ff] flex-shrink-0" />
            )}
            <span className="font-mono truncate">{item.name}</span>
          </div>

          {isOpen && item.children && (
            <div>
              {item.children.map((child) => renderItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const isMarkdown = item.name.endsWith(".md");

    return (
      <div
        key={item.path}
        onClick={() => onOpenFile(item.path, item.name)}
        style={{ paddingLeft: `${depth * 12 + 20}px` }}
        className={`flex items-center gap-1.5 py-1 pr-2 cursor-pointer text-xs transition-colors font-mono truncate ${
          isSelected
            ? "bg-[#111726] text-[#00e5ff] border-l-2 border-[#00e5ff]"
            : "text-[#94a3b8] hover:bg-[#111726]/50 hover:text-[#e2e8f0]"
        }`}
      >
        {isMarkdown ? (
          <FileText className="w-3.5 h-3.5 text-[#64748b] flex-shrink-0" />
        ) : (
          <FileCode className="w-3.5 h-3.5 text-[#00e5ff] flex-shrink-0" />
        )}
        <span className="truncate">{item.name}</span>
      </div>
    );
  };

  const basename = workspacePath.split(/[/\\]/).filter(Boolean).pop() || workspacePath;

  return (
    <div className="h-full bg-[#0a0e17] flex flex-col select-none overflow-hidden">
      {/* Explorer Subheader */}
      <div className="h-7 border-b border-[#1b253b] px-3 flex items-center justify-between text-[11px] text-[#64748b] bg-[#0d131f]">
        <div className="flex items-center gap-1 truncate">
          <span className="uppercase tracking-widest font-semibold text-[#94a3b8]">EXPLORER:</span>
          <span className="text-[#00e5ff] font-mono truncate">{basename}</span>
        </div>
        <button
          onClick={refreshRoot}
          title="Refresh Workspace"
          className="hover:text-[#00e5ff] transition-colors p-0.5"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-[#00e5ff]" : ""}`} />
        </button>
      </div>

      {/* Directory Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {items.length === 0 && !loading && (
          <div className="p-4 text-center text-xs text-[#64748b]">
            No files found in workspace.
          </div>
        )}
        {items.map((item) => renderItem(item, 0))}
      </div>
    </div>
  );
};

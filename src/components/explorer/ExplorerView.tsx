import React, { useState, useEffect, useCallback } from "react";
import { Folder, FolderOpen, FileCode, FileText, ChevronRight, ChevronDown, RefreshCw } from "lucide-react";
import { FileEntry, sortEntries } from "../../types";

export interface ExplorerItem extends FileEntry {
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
      ];
    }
    // Strict folder-first ascending sorting
    return sortEntries(raw);
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
            className="flex items-center gap-1.5 py-1 pr-2 hover:bg-[#281b3d] text-[#cbd5e1] hover:text-[#00e5ff] cursor-pointer text-xs transition-colors"
          >
            {isOpen ? (
              <ChevronDown className="w-3 h-3 text-[#7a7194] flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-[#7a7194] flex-shrink-0" />
            )}
            {isOpen ? (
              <FolderOpen className="w-3.5 h-3.5 text-[#00e5ff] flex-shrink-0" />
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
            ? "bg-[#281b3d] text-[#ff007f] border-l-2 border-[#ff007f] font-semibold"
            : "text-[#cbd5e1] hover:bg-[#281b3d]/60 hover:text-[#00e5ff]"
        }`}
      >
        {isMarkdown ? (
          <FileText className="w-3.5 h-3.5 text-[#ff8800] flex-shrink-0" />
        ) : (
          <FileCode className="w-3.5 h-3.5 text-[#00e5ff] flex-shrink-0" />
        )}
        <span className="truncate">{item.name}</span>
      </div>
    );
  };

  const basename = workspacePath.split(/[/\\]/).filter(Boolean).pop() || workspacePath;

  return (
    <div className="h-full bg-[#161026] flex flex-col select-none overflow-hidden border-r border-[#261d38]">
      {/* Explorer Header */}
      <div className="h-7 border-b border-[#261d38] px-3 flex items-center justify-between text-[11px] text-[#7a7194] bg-[#120c1f]">
        <div className="flex items-center gap-1.5 truncate">
          <span className="uppercase tracking-widest font-bold text-[#e2e8f0]">EXPLORER:</span>
          <span className="text-[#00e5ff] font-mono truncate">{basename}</span>
        </div>
        <button
          onClick={refreshRoot}
          title="Refresh Workspace"
          className="hover:text-[#ff007f] transition-colors p-0.5"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-[#ff007f]" : ""}`} />
        </button>
      </div>

      {/* Directory Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {items.length === 0 && !loading && (
          <div className="p-4 text-center text-xs text-[#7a7194]">
            No files found in workspace.
          </div>
        )}
        {items.map((item) => renderItem(item, 0))}
      </div>
    </div>
  );
};

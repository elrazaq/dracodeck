import React, { useEffect, useState } from "react";
import { FolderSymlink, Copy, Scissors, Clipboard, Edit3, Trash2, Info, FileCode, Globe, X } from "lucide-react";

export interface ContextMenuProps {
  x: number;
  y: number;
  targetPath: string;
  targetName: string;
  isDirectory?: boolean;
  onOpenScope?: (folderPath: string, folderName: string) => void;
  onOpenFile?: (filePath: string, fileName: string) => void;
  onOpenBrowser?: (url: string) => void;
  onRefresh?: () => void;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  targetPath,
  targetName,
  isDirectory = false,
  onOpenScope,
  onOpenFile,
  onOpenBrowser,
  onRefresh,
  onClose,
}) => {
  const [propModal, setPropModal] = useState<{
    size: number;
    mtime: string;
    isDirectory: boolean;
  } | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => onClose();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("contextmenu", handleGlobalClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("contextmenu", handleGlobalClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${isDirectory ? "folder" : "file"} "${targetName}"?`)) {
      if (window.dracoAPI?.deleteFile) {
        try {
          await window.dracoAPI.deleteFile(targetPath);
          onRefresh?.();
        } catch (err) {
          console.error("Delete failed:", err);
        }
      }
      onClose();
    }
  };

  const handleShowProperties = async () => {
    if (window.dracoAPI?.statFile) {
      try {
        const stat = await window.dracoAPI.statFile(targetPath);
        if (stat) {
          setPropModal({
            size: stat.size,
            mtime: stat.mtime,
            isDirectory: stat.isDirectory,
          });
          return;
        }
      } catch (err) {
        console.error("Stat failed:", err);
      }
    }
    setPropModal({
      size: 0,
      mtime: new Date().toISOString(),
      isDirectory,
    });
  };

  const isWebPreviewable = /\.(html|htm|svg|json|md)$/i.test(targetName);

  return (
    <>
      <div
        style={{ top: `${y}px`, left: `${x}px` }}
        onClick={(e) => e.stopPropagation()}
        className="fixed z-50 w-56 bg-[#161026] border border-[#261d38] shadow-[0_10px_35px_rgba(0,0,0,0.85)] py-1 text-xs select-none font-mono"
      >
        {/* Header Badge */}
        <div className="px-3 py-1.5 border-b border-[#261d38] text-[10px] text-[#7a7194] truncate font-bold flex items-center justify-between">
          <span>{isDirectory ? "DIRECTORY:" : "FILE:"}</span>
          <span className="text-[#00e5ff] truncate max-w-[120px]">{targetName}</span>
        </div>

        {/* Primary Action */}
        {isDirectory ? (
          onOpenScope && (
            <button
              onClick={() => {
                onOpenScope(targetPath, targetName);
                onClose();
              }}
              className="w-full px-3 py-2 text-left flex items-center gap-2 bg-[#281b3d]/40 hover:bg-[#ff007f] text-[#00e5ff] hover:text-white font-bold transition-colors group"
            >
              <FolderSymlink className="w-4 h-4 text-[#ff007f] group-hover:text-white" />
              <span>Open Scope Here</span>
            </button>
          )
        ) : (
          <>
            <button
              onClick={() => {
                onOpenFile?.(targetPath, targetName);
                onClose();
              }}
              className="w-full px-3 py-2 text-left flex items-center gap-2 bg-[#281b3d]/40 hover:bg-[#ff007f] text-[#00e5ff] hover:text-white font-bold transition-colors group"
            >
              <FileCode className="w-4 h-4 text-[#ff007f] group-hover:text-white" />
              <span>Open in Draco Editor</span>
            </button>
            {isWebPreviewable && onOpenBrowser && (
              <button
                onClick={() => {
                  onOpenBrowser(`file://${targetPath}`);
                  onClose();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#00e5ff] hover:bg-[#281b3d] hover:text-white transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-[#00e5ff]" />
                <span>Open in DracoBrowser</span>
              </button>
            )}
          </>
        )}

        <div className="w-full h-px bg-[#261d38] my-1" />

        {/* Standard File Operations */}
        <button
          onClick={() => {
            navigator.clipboard?.writeText(targetPath);
            onClose();
          }}
          className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#cbd5e1] hover:bg-[#281b3d] hover:text-white transition-colors"
        >
          <Copy className="w-3.5 h-3.5 text-[#7a7194]" />
          <span>Copy Absolute Path</span>
        </button>

        <button
          onClick={() => {
            navigator.clipboard?.writeText(targetName);
            onClose();
          }}
          className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#cbd5e1] hover:bg-[#281b3d] hover:text-white transition-colors"
        >
          <Clipboard className="w-3.5 h-3.5 text-[#7a7194]" />
          <span>Copy Name</span>
        </button>

        <button
          onClick={onClose}
          className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#cbd5e1] hover:bg-[#281b3d] hover:text-white transition-colors"
        >
          <Scissors className="w-3.5 h-3.5 text-[#7a7194]" />
          <span>Cut</span>
        </button>

        <button
          onClick={onClose}
          className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#cbd5e1] hover:bg-[#281b3d] hover:text-white transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#7a7194]" />
          <span>Rename</span>
        </button>

        <button
          onClick={handleDelete}
          className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#ff1744] hover:bg-[#ff1744]/20 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>

        <div className="w-full h-px bg-[#261d38] my-1" />

        <button
          onClick={handleShowProperties}
          className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#7a7194] hover:bg-[#281b3d] hover:text-[#cbd5e1] transition-colors text-[11px]"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Properties</span>
        </button>
      </div>

      {/* Properties Modal */}
      {propModal && (
        <div
          onClick={() => setPropModal(null)}
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center font-mono select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-96 bg-[#161026] border border-[#261d38] shadow-[0_15px_45px_rgba(0,0,0,0.9)] p-4 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#261d38] mb-3 text-[#ff007f] font-bold">
              <span>{propModal.isDirectory ? "FOLDER PROPERTIES" : "FILE PROPERTIES"}</span>
              <button
                onClick={() => setPropModal(null)}
                className="text-[#7a7194] hover:text-white p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-[#cbd5e1]">
              <div>
                <span className="text-[10px] text-[#7a7194] block uppercase">Name</span>
                <span className="font-semibold text-[#00e5ff] break-all">{targetName}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#7a7194] block uppercase">Full Path</span>
                <span className="text-[11px] text-[#94a3b8] break-all">{targetPath}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#261d38]">
                <div>
                  <span className="text-[10px] text-[#7a7194] block uppercase">Size</span>
                  <span>{propModal.size ? `${(propModal.size / 1024).toFixed(1)} KB` : "0 KB"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7a7194] block uppercase">Modified</span>
                  <span className="text-[10px]">{new Date(propModal.mtime).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-[#261d38] flex justify-end">
              <button
                onClick={() => setPropModal(null)}
                className="px-3 py-1 bg-[#281b3d] hover:bg-[#ff007f] text-white text-xs transition-colors"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

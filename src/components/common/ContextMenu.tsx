import React, { useEffect } from "react";
import { FolderSymlink, Copy, Scissors, Clipboard, Edit3, Trash2, Info } from "lucide-react";

export interface ContextMenuProps {
  x: number;
  y: number;
  targetPath: string;
  targetName: string;
  onOpenScope: (folderPath: string, folderName: string) => void;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  targetPath,
  targetName,
  onOpenScope,
  onClose,
}) => {
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

  return (
    <div
      style={{ top: `${y}px`, left: `${x}px` }}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-50 w-56 bg-[#161026] border border-[#261d38] shadow-[0_10px_35px_rgba(0,0,0,0.85)] py-1 text-xs select-none font-mono"
    >
      {/* Target Path Header */}
      <div className="px-3 py-1.5 border-b border-[#261d38] text-[10px] text-[#7a7194] truncate font-bold">
        FOLDER: <span className="text-[#00e5ff]">{targetName}</span>
      </div>

      {/* Primary Action: Open Scope Here */}
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
        <span>Copy Path</span>
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
        <Clipboard className="w-3.5 h-3.5 text-[#7a7194]" />
        <span>Paste</span>
      </button>

      <button
        onClick={onClose}
        className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#cbd5e1] hover:bg-[#281b3d] hover:text-white transition-colors"
      >
        <Edit3 className="w-3.5 h-3.5 text-[#7a7194]" />
        <span>Rename</span>
      </button>

      <button
        onClick={onClose}
        className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#ff1744] hover:bg-[#ff1744]/20 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Delete</span>
      </button>

      <div className="w-full h-px bg-[#261d38] my-1" />

      <button
        onClick={onClose}
        className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#7a7194] hover:bg-[#281b3d] hover:text-[#cbd5e1] transition-colors text-[11px]"
      >
        <Info className="w-3.5 h-3.5" />
        <span>Properties</span>
      </button>
    </div>
  );
};

import React from "react";
import { Folder, FolderOpen, FileText, FileCode, File, Image, Terminal, Shield, Key } from "lucide-react";

interface FileIconProps {
  name: string;
  isDirectory?: boolean;
  isOpen?: boolean;
  size?: "sm" | "md" | "lg";
}

export const FileIcon: React.FC<FileIconProps> = ({
  name,
  isDirectory = false,
  isOpen = false,
  size = "md",
}) => {
  const sizeClasses = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-10 h-10",
  }[size];

  if (isDirectory) {
    if (size === "lg") {
      return (
        <div className="relative">
          <Folder className="w-10 h-10 text-[#00e5ff] fill-[#00e5ff]/15 stroke-[1.5]" />
          <span className="absolute inset-0 flex items-center justify-center text-[11px] text-[#ff007f] font-bold">
            /
          </span>
        </div>
      );
    }
    return isOpen ? (
      <FolderOpen className={`${sizeClasses} text-[#00e5ff] flex-shrink-0`} />
    ) : (
      <Folder className={`${sizeClasses} text-[#2979ff] flex-shrink-0`} />
    );
  }

  const lower = name.toLowerCase();

  // TypeScript / TSX
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) {
    return (
      <div className="flex items-center justify-center font-bold font-mono">
        {size === "lg" ? (
          <div className="w-9 h-9 rounded-xs bg-[#2979ff]/15 border border-[#2979ff] flex items-center justify-center text-[#00e5ff] text-xs font-black">
            TS
          </div>
        ) : (
          <FileCode className={`${sizeClasses} text-[#00e5ff] flex-shrink-0`} />
        )}
      </div>
    );
  }

  // JavaScript / JSX / CJS
  if (lower.endsWith(".js") || lower.endsWith(".jsx") || lower.endsWith(".cjs") || lower.endsWith(".mjs")) {
    return (
      <div className="flex items-center justify-center font-bold font-mono">
        {size === "lg" ? (
          <div className="w-9 h-9 rounded-xs bg-[#ffea00]/15 border border-[#ffea00] flex items-center justify-center text-[#ffea00] text-xs font-black">
            JS
          </div>
        ) : (
          <FileCode className={`${sizeClasses} text-[#ffea00] flex-shrink-0`} />
        )}
      </div>
    );
  }

  // Python
  if (lower.endsWith(".py")) {
    return (
      <div className="flex items-center justify-center font-bold font-mono">
        {size === "lg" ? (
          <div className="w-9 h-9 rounded-xs bg-[#38bdf8]/15 border border-[#38bdf8] flex items-center justify-center text-[#38bdf8] text-xs font-black">
            PY
          </div>
        ) : (
          <FileCode className={`${sizeClasses} text-[#38bdf8] flex-shrink-0`} />
        )}
      </div>
    );
  }

  // Dart / Flutter
  if (lower.endsWith(".dart")) {
    return (
      <div className="flex items-center justify-center font-bold font-mono">
        {size === "lg" ? (
          <div className="w-9 h-9 rounded-xs bg-[#00e5ff]/15 border border-[#00e5ff] flex items-center justify-center text-[#00e5ff] text-xs font-black">
            DART
          </div>
        ) : (
          <FileCode className={`${sizeClasses} text-[#00e5ff] flex-shrink-0`} />
        )}
      </div>
    );
  }

  // Rust
  if (lower.endsWith(".rs")) {
    return (
      <div className="flex items-center justify-center font-bold font-mono">
        {size === "lg" ? (
          <div className="w-9 h-9 rounded-xs bg-[#ff8800]/15 border border-[#ff8800] flex items-center justify-center text-[#ff8800] text-xs font-black">
            RS
          </div>
        ) : (
          <FileCode className={`${sizeClasses} text-[#ff8800] flex-shrink-0`} />
        )}
      </div>
    );
  }

  // HTML
  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    return (
      <div className="flex items-center justify-center font-bold font-mono">
        {size === "lg" ? (
          <div className="w-9 h-9 rounded-xs bg-[#ff1744]/15 border border-[#ff1744] flex items-center justify-center text-[#ff1744] text-xs font-black">
            &lt;&gt;
          </div>
        ) : (
          <FileCode className={`${sizeClasses} text-[#ff1744] flex-shrink-0`} />
        )}
      </div>
    );
  }

  // CSS / SCSS
  if (lower.endsWith(".css") || lower.endsWith(".scss")) {
    return (
      <div className="flex items-center justify-center font-bold font-mono">
        {size === "lg" ? (
          <div className="w-9 h-9 rounded-xs bg-[#2979ff]/15 border border-[#2979ff] flex items-center justify-center text-[#2979ff] text-xs font-black">
            #
          </div>
        ) : (
          <FileCode className={`${sizeClasses} text-[#2979ff] flex-shrink-0`} />
        )}
      </div>
    );
  }

  // Markdown
  if (lower.endsWith(".md") || lower.endsWith(".mdx")) {
    return <FileText className={`${sizeClasses} text-[#ff8800] flex-shrink-0 stroke-[1.5]`} />;
  }

  // JSON
  if (lower.endsWith(".json")) {
    return (
      <div className="flex items-center justify-center font-mono">
        {size === "lg" ? (
          <div className="w-9 h-9 rounded-xs bg-[#ffea00]/15 border border-[#ffea00] flex items-center justify-center text-[#ffea00] text-sm font-bold">
            &#123; &#125;
          </div>
        ) : (
          <span className="text-[#ffea00] font-bold text-xs">&#123;&#125;</span>
        )}
      </div>
    );
  }

  // Shell / Scripts
  if (lower.endsWith(".sh") || lower.endsWith(".ps1") || lower.endsWith(".bat") || lower.endsWith(".cmd")) {
    return <Terminal className={`${sizeClasses} text-[#00e676] flex-shrink-0 stroke-[1.5]`} />;
  }

  // Images
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".svg") || lower.endsWith(".ico")) {
    return <Image className={`${sizeClasses} text-[#d500f9] flex-shrink-0 stroke-[1.5]`} />;
  }

  // Environment / Security
  if (lower.startsWith(".env") || lower.includes("secret") || lower.includes("key")) {
    return <Key className={`${sizeClasses} text-[#ffea00] flex-shrink-0 stroke-[1.5]`} />;
  }

  if (lower.startsWith(".git") || lower.includes("license")) {
    return <Shield className={`${sizeClasses} text-[#ff1744] flex-shrink-0 stroke-[1.5]`} />;
  }

  return <File className={`${sizeClasses} text-[#7a7194] flex-shrink-0 stroke-[1.5]`} />;
};

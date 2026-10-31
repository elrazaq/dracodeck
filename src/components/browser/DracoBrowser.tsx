import React, { useState, useRef } from "react";
import { ArrowLeft, ArrowRight, RotateCw, Home, Lock, ExternalLink, ShieldAlert, Code2, Globe } from "lucide-react";

interface DracoBrowserProps {
  initialUrl?: string;
  onClose?: () => void;
}

export const DracoBrowser: React.FC<DracoBrowserProps> = ({
  initialUrl = "https://www.kali.org/docs/",
  onClose,
}) => {
  const [url, setUrl] = useState<string>(initialUrl);
  const [inputUrl, setInputUrl] = useState<string>(initialUrl);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const bookmarks = [
    { name: "Kali Linux Docs", url: "https://www.kali.org/docs/" },
    { name: "Exploit-DB", url: "https://www.exploit-db.com/" },
    { name: "GitHub", url: "https://github.com/" },
    { name: "Google", url: "https://www.google.com/" },
    { name: "Antigravity AI", url: "https://deepmind.google/" },
  ];

  const handleNavigate = (targetUrl: string) => {
    let formatted = targetUrl.trim();
    if (!formatted.startsWith("http://") && !formatted.startsWith("https://") && !formatted.startsWith("file://")) {
      if (formatted.includes(".") && !formatted.includes(" ")) {
        formatted = `https://${formatted}`;
      } else {
        formatted = `https://www.google.com/search?q=${encodeURIComponent(formatted)}`;
      }
    }
    setUrl(formatted);
    setInputUrl(formatted);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleNavigate(inputUrl);
    }
  };

  const handleReload = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="h-full w-full bg-[#0b0813] flex flex-col font-mono text-xs overflow-hidden select-none border border-[#261d38]">
      {/* Top Chrome Tab Bar */}
      <div className="h-8 bg-[#120c1f] border-b border-[#261d38] flex items-center px-2 gap-2">
        <div className="flex items-center gap-2 px-3 py-1 bg-[#0b0813] border-t-2 border-t-[#ff007f] text-[#e2e8f0] text-xs font-semibold max-w-xs truncate">
          <Globe className="w-3.5 h-3.5 text-[#00e5ff]" />
          <span className="truncate">{inputUrl.replace(/^https?:\/\//, "")}</span>
        </div>

        <div className="ml-auto flex items-center gap-2 text-[10px] text-[#7a7194]">
          <span className="flex items-center gap-1 text-[#00e676] bg-[#161026] px-2 py-0.5 border border-[#261d38]">
            <ShieldAlert className="w-3 h-3 text-[#00e676]" />
            <span>DIRECT SOCKET</span>
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-[#7a7194] hover:text-[#ff1744] px-1 font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Navigation Omnibar */}
      <div className="h-9 bg-[#161026] border-b border-[#261d38] px-3 flex items-center gap-2">
        <div className="flex items-center gap-1 text-[#7a7194]">
          <button
            onClick={() => window.history.back()}
            title="Back"
            className="p-1 hover:text-[#00e5ff] hover:bg-[#281b3d] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => window.history.forward()}
            title="Forward"
            className="p-1 hover:text-[#00e5ff] hover:bg-[#281b3d] transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReload}
            title="Reload"
            className="p-1 hover:text-[#ff007f] hover:bg-[#281b3d] transition-colors"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#ff007f]" : ""}`} />
          </button>
          <button
            onClick={() => handleNavigate("https://www.kali.org/docs/")}
            title="Home"
            className="p-1 hover:text-[#00e676] hover:bg-[#281b3d] transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Address URL Input */}
        <div className="flex-1 h-6 bg-[#0b0813] border border-[#261d38] px-2 flex items-center gap-1.5 focus-within:border-[#00e5ff] transition-colors">
          <Lock className="w-2.5 h-2.5 text-[#00e676]" />
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter URL or search syntax..."
            className="flex-1 bg-transparent text-[#cbd5e1] text-[11px] font-mono outline-none"
          />
        </div>

        {/* Quick External Launch / DevTools Toggle */}
        <div className="flex items-center gap-1.5 text-[#7a7194]">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            title="Open in System Browser"
            className="p-1 hover:text-[#00e5ff] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => alert("Chromium DevTools Shortcut: Ctrl+Shift+I")}
            title="Inspect Element"
            className="p-1 hover:text-[#ff007f] transition-colors"
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bookmarks Quick Bar */}
      <div className="h-6 bg-[#120c1f] border-b border-[#261d38] px-3 flex items-center gap-3 text-[10px] text-[#7a7194] overflow-x-auto">
        <span className="text-[#00e5ff] font-bold text-[9px] uppercase tracking-wider">BOOKMARKS:</span>
        {bookmarks.map((b) => (
          <button
            key={b.url}
            onClick={() => handleNavigate(b.url)}
            className="hover:text-[#e2e8f0] hover:bg-[#281b3d] px-1.5 py-0.5 transition-colors truncate"
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* Chromium Viewport (Webview + IFrame Fallback) */}
      <div className="flex-1 bg-black relative">
        <iframe
          ref={iframeRef}
          src={url}
          title="DracoBrowser Webview"
          className="w-full h-full border-none bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
      </div>
    </div>
  );
};


import React, { useState, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Lock,
  ExternalLink,
  ShieldAlert,
  Code2,
  Globe,
  Terminal,
  Activity,
  Layers,
  Database,
  X,
} from "lucide-react";
import { DracoTooltip } from "../common/DracoTooltip";

interface DracoBrowserProps {
  initialUrl?: string;
  onClose?: () => void;
  onPinToMain?: () => void;
}

export const DracoBrowser: React.FC<DracoBrowserProps> = ({
  initialUrl = "https://www.kali.org/docs/",
  onClose,
  onPinToMain,
}) => {
  const [url, setUrl] = useState<string>(initialUrl);
  const [inputUrl, setInputUrl] = useState<string>(initialUrl);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showInspector, setShowInspector] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<"elements" | "network" | "storage" | "console">("elements");
  const [consoleInput, setConsoleInput] = useState("");
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    "[DracoBrowser DOM Engine] Context initialized.",
    "[Security Audit] X-Frame-Options & CSP headers stripped by electron session interceptor.",
  ]);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const bookmarks = [
    { name: "Kali Linux Docs", url: "https://www.kali.org/docs/" },
    { name: "Exploit-DB", url: "https://www.exploit-db.com/" },
    { name: "GitHub", url: "https://github.com/" },
    { name: "Google", url: "https://www.google.com/" },
    { name: "Antigravity AI", url: "https://deepmind.google/" },
  ];

  const handleNavigate = (target: string) => {
    let formatted = target.trim();
    if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
      if (formatted.includes(".") && !formatted.includes(" ")) {
        formatted = "https://" + formatted;
      } else {
        formatted = `https://www.google.com/search?q=${encodeURIComponent(formatted)}`;
      }
    }
    setUrl(formatted);
    setInputUrl(formatted);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 800);
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

  const handleConsoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consoleInput.trim()) return;
    const input = consoleInput.trim();
    setConsoleLogs((prev) => [...prev, `> ${input}`]);
    try {
      if (input === "location" || input === "window.location") {
        setConsoleLogs((prev) => [...prev, `< "${url}"`]);
      } else if (input === "title" || input === "document.title") {
        setConsoleLogs((prev) => [...prev, `< "${inputUrl.split("/").pop() || "DracoBrowser"}"`]);
      } else if (input === "clear") {
        setConsoleLogs([]);
      } else {
        const result = Function(`"use strict"; return (${input})`)();
        setConsoleLogs((prev) => [...prev, `< ${String(result)}`]);
      }
    } catch (err: any) {
      setConsoleLogs((prev) => [...prev, `< [Error]: ${err?.message || "Execution failed"}`]);
    }
    setConsoleInput("");
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
            <span>CSP UNBLOCKED</span>
          </span>

          {onPinToMain && (
            <DracoTooltip content="Tempel di Layar Utama" position="bottom" accent="cyan">
              <button
                onClick={onPinToMain}
                className="text-[#7a7194] hover:text-[#00e5ff] px-1 font-bold"
              >
                ⤢ DOCK
              </button>
            </DracoTooltip>
          )}

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
          <DracoTooltip content="Navigate Back" shortcut="Alt+Left" position="bottom" accent="cyan">
            <button
              onClick={() => window.history.back()}
              className="p-1 hover:text-[#00e5ff] hover:bg-[#281b3d] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </DracoTooltip>

          <DracoTooltip content="Navigate Forward" shortcut="Alt+Right" position="bottom" accent="cyan">
            <button
              onClick={() => window.history.forward()}
              className="p-1 hover:text-[#00e5ff] hover:bg-[#281b3d] transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </DracoTooltip>

          <DracoTooltip content="Reload Page" shortcut="Ctrl+R" position="bottom" accent="pink">
            <button
              onClick={handleReload}
              className="p-1 hover:text-[#ff007f] hover:bg-[#281b3d] transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#ff007f]" : ""}`} />
            </button>
          </DracoTooltip>

          <DracoTooltip content="Kali Docs Home" position="bottom" accent="green">
            <button
              onClick={() => handleNavigate("https://www.kali.org/docs/")}
              className="p-1 hover:text-[#00e676] hover:bg-[#281b3d] transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
            </button>
          </DracoTooltip>
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

        {/* Quick External Launch / Cyberdeck Inspector Toggle */}
        <div className="flex items-center gap-1.5 text-[#7a7194]">
          <DracoTooltip content="Open in External Browser" position="bottom" accent="cyan">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="p-1 hover:text-[#00e5ff] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </DracoTooltip>

          <DracoTooltip content={showInspector ? "Tutup Kali Inspector" : "Buka Kali Cyberdeck Inspector"} shortcut="Ctrl+Shift+I" position="bottom" accent="pink">
            <button
              onClick={() => setShowInspector(!showInspector)}
              className={`p-1 transition-colors ${
                showInspector ? "bg-[#ff007f]/20 text-[#ff007f] border border-[#ff007f]/40" : "hover:text-[#ff007f]"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
            </button>
          </DracoTooltip>
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

      {/* Main Split Body: Webview + Built-in Kali Cyberdeck Inspector */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Chromium Viewport (Iframe with CSP unblocked) */}
        <div className="flex-1 bg-black relative">
          <iframe
            ref={iframeRef}
            src={url}
            title="DracoBrowser Webview"
            className="w-full h-full border-none bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        </div>

        {/* Built-in Kali Cyberdeck Web Inspector Drawer */}
        {showInspector && (
          <div className="h-56 bg-[#0e0a19] border-t border-[#261d38] flex flex-col font-mono text-xs shadow-2xl z-20">
            {/* Inspector Header Tabs */}
            <div className="h-7 bg-[#120c1f] border-b border-[#261d38] px-2 flex items-center justify-between text-[10.5px]">
              <div className="flex items-center gap-1">
                <span className="text-[#ff007f] font-bold mr-2">KALI INSPECTOR:</span>
                {[
                  { id: "elements", label: "Elements (DOM)", icon: <Layers className="w-3 h-3" /> },
                  { id: "network", label: "Network Sniffer", icon: <Activity className="w-3 h-3" /> },
                  { id: "storage", label: "Storage & Cookies", icon: <Database className="w-3 h-3" /> },
                  { id: "console", label: "Console", icon: <Terminal className="w-3 h-3" /> },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setInspectorTab(t.id as any)}
                    className={`px-2 py-0.5 flex items-center gap-1 border-b-2 transition-colors ${
                      inspectorTab === t.id
                        ? "border-[#ff007f] text-[#00e5ff] font-bold bg-[#161026]"
                        : "border-transparent text-[#7a7194] hover:text-[#cbd5e1]"
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowInspector(false)}
                className="text-[#7a7194] hover:text-[#ff1744] p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Inspector Body Canvas */}
            <div className="flex-1 p-2 overflow-y-auto bg-[#0b0813] text-[#cbd5e1] text-[10px]">
              {/* 1. DOM ELEMENTS TREE */}
              {inspectorTab === "elements" && (
                <div className="space-y-1 font-mono leading-relaxed">
                  <div className="text-[#64748b]">&lt;!DOCTYPE html&gt;</div>
                  <div className="pl-2">
                    <span className="text-[#00e5ff]">&lt;html</span> <span className="text-[#ff8800]">lang</span>=<span className="text-[#00e676]">"id"</span><span className="text-[#00e5ff]">&gt;</span>
                  </div>
                  <div className="pl-4 space-y-0.5">
                    <div><span className="text-[#00e5ff]">&lt;head&gt;</span> ... <span className="text-[#00e5ff]">&lt;/head&gt;</span></div>
                    <div>
                      <span className="text-[#00e5ff]">&lt;body</span> <span className="text-[#ff8800]">class</span>=<span className="text-[#00e676]">"kali-cockpit dark-mode"</span><span className="text-[#00e5ff]">&gt;</span>
                    </div>
                    <div className="pl-4 space-y-0.5 border-l border-[#261d38]">
                      <div>
                        <span className="text-[#00e5ff]">&lt;header</span> <span className="text-[#ff8800]">id</span>=<span className="text-[#00e676]">"masthead"</span><span className="text-[#00e5ff]">&gt;</span>
                        <span className="text-[#94a3b8]"> Portal Layanan Publik </span>
                        <span className="text-[#00e5ff]">&lt;/header&gt;</span>
                      </div>
                      <div>
                        <span className="text-[#00e5ff]">&lt;main</span> <span className="text-[#ff8800]">role</span>=<span className="text-[#00e676]">"main"</span><span className="text-[#00e5ff]">&gt;</span>
                        <span className="text-[#64748b]"> &lt;div class="container"&gt;...&lt;/div&gt; </span>
                        <span className="text-[#00e5ff]">&lt;/main&gt;</span>
                      </div>
                      <div>
                        <span className="text-[#00e5ff]">&lt;footer&gt;</span>
                        <span className="text-[#94a3b8]"> &copy; Hak Cipta Dilindungi </span>
                        <span className="text-[#00e5ff]">&lt;/footer&gt;</span>
                      </div>
                    </div>
                    <div><span className="text-[#00e5ff]">&lt;/body&gt;</span></div>
                  </div>
                  <div className="pl-2"><span className="text-[#00e5ff]">&lt;/html&gt;</span></div>
                </div>
              )}

              {/* 2. NETWORK SNIFFER */}
              {inspectorTab === "network" && (
                <div className="space-y-1">
                  <div className="grid grid-cols-5 text-[9px] font-bold text-[#7a7194] border-b border-[#261d38] pb-1">
                    <span>NAME</span>
                    <span>METHOD</span>
                    <span>STATUS</span>
                    <span>TYPE</span>
                    <span className="text-right">TIME</span>
                  </div>
                  {[
                    { name: url.split("/").pop() || "index.html", method: "GET", status: "200 OK", type: "document", time: "142 ms" },
                    { name: "main.css", method: "GET", status: "200 OK", type: "stylesheet", time: "28 ms" },
                    { name: "app.bundle.js", method: "GET", status: "304 Cached", type: "script", time: "12 ms" },
                    { name: "api/v1/auth/session", method: "POST", status: "200 OK", type: "fetch", time: "89 ms" },
                  ].map((row, i) => (
                    <div key={i} className="grid grid-cols-5 py-0.5 hover:bg-[#161026] text-[#cbd5e1]">
                      <span className="truncate text-[#00e5ff]">{row.name}</span>
                      <span className="text-[#ff8800]">{row.method}</span>
                      <span className={row.status.startsWith("200") ? "text-[#00e676]" : "text-[#cbd5e1]"}>{row.status}</span>
                      <span className="text-[#7a7194]">{row.type}</span>
                      <span className="text-right text-[#a5b4fc]">{row.time}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 3. STORAGE & COOKIES */}
              {inspectorTab === "storage" && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-[#00e5ff]">DETECTED STORAGE & COOKIE FLAGS:</div>
                  <div className="bg-[#120c1f] p-2 border border-[#261d38] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#ff007f] font-bold">draco_session_token:</span>
                      <span className="text-[#00e676]">HttpOnly; Secure; SameSite=Strict</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#ff007f] font-bold">theme_preference:</span>
                      <span className="text-[#cbd5e1]">kali-dark-void</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. CONSOLE */}
              {inspectorTab === "console" && (
                <div className="h-full flex flex-col justify-between space-y-2">
                  <div className="flex-1 overflow-y-auto space-y-1">
                    {consoleLogs.map((log, i) => (
                      <div key={i} className={log.startsWith(">") ? "text-[#00e5ff]" : "text-[#a5b4fc]"}>
                        {log}
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleConsoleSubmit} className="flex items-center gap-1 border-t border-[#261d38] pt-1">
                    <span className="text-[#ff007f] font-bold">&gt;</span>
                    <input
                      type="text"
                      value={consoleInput}
                      onChange={(e) => setConsoleInput(e.target.value)}
                      placeholder="Type JS expression (location, title, clear)..."
                      className="flex-1 bg-transparent text-[#cbd5e1] outline-none text-[10px] font-mono"
                    />
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

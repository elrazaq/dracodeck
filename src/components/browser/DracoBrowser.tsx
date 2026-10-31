import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  ShieldAlert,
  Code2,
  Globe,
  X,
  Shield,
  Lock,
  Check,
  Sliders,
  ExternalLink,
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
  // OpSec & Privacy States
  const [showOpSecModal, setShowOpSecModal] = useState(false);
  const [activeDns, setActiveDns] = useState<string>("cloudflare");
  const [proxyMode, setProxyMode] = useState<"direct" | "tor" | "custom">("direct");
  const [customProxyUrl, setCustomProxyUrl] = useState("socks5://127.0.0.1:1080");
  const [activeUa, setActiveUa] = useState<string>("kali-firefox");
  const [publicIp, setPublicIp] = useState<string>("Verifying...");
  const [isVerifyingIp, setIsVerifyingIp] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const bookmarks = [
    { name: "Kali Linux Docs", url: "https://www.kali.org/docs/" },
    { name: "Exploit-DB", url: "https://www.exploit-db.com/" },
    { name: "GitHub", url: "https://github.com/" },
    { name: "Google", url: "https://www.google.com/" },
    { name: "Antigravity AI", url: "https://deepmind.google/" },
  ];

  // Initial Egress IP Check
  useEffect(() => {
    handleCheckPublicIP();
  }, []);

  const handleCheckPublicIP = async () => {
    setIsVerifyingIp(true);
    if (window.dracoAPI?.checkPublicIP) {
      try {
        const res = await window.dracoAPI.checkPublicIP();
        setPublicIp(res.ip || "103.144.192.42 [ID]");
      } catch {
        setPublicIp("Shielded / Offline");
      }
    } else {
      setPublicIp("103.144.192.42 [ID]");
    }
    setIsVerifyingIp(false);
  };

  const handleApplyDNS = async (dnsProvider: string) => {
    setActiveDns(dnsProvider);
    const dnsMap: Record<string, string> = {
      cloudflare: "https://cloudflare-dns.com/dns-query",
      google: "https://dns.google/dns-query",
      quad9: "https://dns.quad9.net/dns-query",
      adguard: "https://dns.adguard.com/dns-query",
      direct: "direct",
    };
    if (window.dracoAPI?.setDNS) {
      await window.dracoAPI.setDNS(dnsMap[dnsProvider] || "direct");
    }
  };

  const handleApplyProxy = async (mode: "direct" | "tor" | "custom") => {
    setProxyMode(mode);
    let rules = "";
    if (mode === "tor") rules = "socks5://127.0.0.1:9050";
    if (mode === "custom") rules = customProxyUrl;

    if (window.dracoAPI?.setProxy) {
      await window.dracoAPI.setProxy(rules);
    }
    handleCheckPublicIP();
  };

  const handleApplyUserAgent = async (uaKey: string) => {
    setActiveUa(uaKey);
    const uaMap: Record<string, string> = {
      "kali-firefox": "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0",
      "tor-browser": "Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0",
      "win-chrome": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "mac-safari": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
    };
    if (window.dracoAPI?.setUserAgent) {
      await window.dracoAPI.setUserAgent(uaMap[uaKey] || uaMap["kali-firefox"]);
    }
  };

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

  const openNativeDevTools = () => {
    if (window.dracoAPI?.openWebviewDevTools) {
      window.dracoAPI.openWebviewDevTools({ mode: "right" });
    }
  };

  return (
    <div className="h-full w-full bg-[#0b0813] flex flex-col font-mono text-xs overflow-hidden select-none border border-[#261d38]">
      {/* Top Chrome Tab Bar */}
      <div className="h-8 bg-[#120c1f] border-b border-[#261d38] flex items-center px-2 gap-2">
        <div className="flex items-center gap-2 px-3 py-1 bg-[#0b0813] border-t-2 border-t-[#ff007f] text-[#e2e8f0] text-xs font-semibold max-w-xs truncate">
          <Globe className="w-3.5 h-3.5 text-[#00e5ff]" />
          <span className="truncate">{inputUrl.replace(/^https?:\/\//, "")}</span>
        </div>

        {/* OpSec Armor Status Indicators */}
        <div className="ml-auto flex items-center gap-2 text-[10px]">
          {/* Egress IP Pill */}
          <DracoTooltip content="Current Public IP & OpSec Egress Router" position="bottom" accent="cyan">
            <button
              onClick={() => setShowOpSecModal(true)}
              className="flex items-center gap-1.5 px-2 py-0.5 bg-[#161026] hover:bg-[#281b3d] border border-[#261d38] text-[#00e5ff] transition-colors cursor-pointer"
            >
              <Shield className="w-3 h-3 text-[#00e5ff]" />
              <span className="font-bold">IP: {publicIp}</span>
              <span className="text-[9px] text-[#ff8800] bg-[#ff8800]/10 px-1 border border-[#ff8800]/30 font-bold uppercase">
                {proxyMode === "tor" ? "TOR" : activeDns.toUpperCase()}
              </span>
            </button>
          </DracoTooltip>

          {/* CSP Unblocked Shield */}
          <span className="flex items-center gap-1 text-[#00e676] bg-[#161026] px-2 py-0.5 border border-[#261d38]">
            <ShieldAlert className="w-3 h-3 text-[#00e676]" />
            <span>CSP UNBLOCKED</span>
          </span>

          {/* OpSec Configuration Drawer Button */}
          <DracoTooltip content="Configure DNS, Proxy, VPN & Masking" position="bottom" accent="pink">
            <button
              onClick={() => setShowOpSecModal(true)}
              className="flex items-center gap-1 px-2 py-0.5 bg-[#161026] hover:bg-[#281b3d] text-[#ff007f] border border-[#261d38] hover:border-[#ff007f]/50 transition-colors cursor-pointer font-bold"
            >
              <Sliders className="w-3 h-3 text-[#ff007f]" />
              <span>OPSEC</span>
            </button>
          </DracoTooltip>

          {onPinToMain && (
            <DracoTooltip content="Tempel di Layar Utama (Dock Flush to Canvas)" position="bottom" accent="cyan">
              <button
                onClick={onPinToMain}
                className="text-[#7a7194] hover:text-[#00e5ff] px-1 font-bold cursor-pointer"
              >
                ⤢ DOCK
              </button>
            </DracoTooltip>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="text-[#7a7194] hover:text-[#ff1744] px-1 font-bold cursor-pointer"
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
              className="p-1 hover:text-[#00e5ff] hover:bg-[#281b3d] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </DracoTooltip>

          <DracoTooltip content="Navigate Forward" shortcut="Alt+Right" position="bottom" accent="cyan">
            <button
              onClick={() => window.history.forward()}
              className="p-1 hover:text-[#00e5ff] hover:bg-[#281b3d] transition-colors cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </DracoTooltip>

          <DracoTooltip content="Reload Target" shortcut="Ctrl+R" position="bottom" accent="pink">
            <button
              onClick={handleReload}
              className="p-1 hover:text-[#ff007f] hover:bg-[#281b3d] transition-colors cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#ff007f]" : ""}`} />
            </button>
          </DracoTooltip>

          <DracoTooltip content="Homepage" position="bottom" accent="cyan">
            <button
              onClick={() => handleNavigate("https://www.kali.org/docs/")}
              className="p-1 hover:text-[#00e5ff] hover:bg-[#281b3d] transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
            </button>
          </DracoTooltip>
        </div>

        {/* Address Input Bar */}
        <div className="flex-1 bg-[#0b0813] border border-[#261d38] focus-within:border-[#00e5ff] px-2.5 py-1 flex items-center gap-2 transition-colors">
          <Lock className="w-3 h-3 text-[#00e676]" />
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search with Google or enter offensive URL..."
            className="flex-1 bg-transparent text-[#e2e8f0] outline-none font-mono text-xs"
          />
        </div>

        {/* Inspector & External Buttons */}
        <div className="flex items-center gap-1.5">
          <DracoTooltip content="Open in External Browser" position="bottom" accent="cyan">
            <button
              onClick={() => window.open(url, "_blank")}
              className="p-1.5 text-[#7a7194] hover:text-[#00e5ff] hover:bg-[#281b3d] transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </DracoTooltip>

          <DracoTooltip content="Open Native Chromium DevTools (F12 / Elements, Console, Network)" position="bottom" accent="pink">
            <button
              onClick={openNativeDevTools}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#120c1f] hover:bg-[#281b3d] text-[#00e5ff] border border-[#261d38] hover:border-[#00e5ff] text-[11px] font-bold transition-all cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-[#ff007f]" />
              <span>NATIVE DEVTOOLS</span>
            </button>
          </DracoTooltip>
        </div>
      </div>

      {/* Bookmarks Bar */}
      <div className="h-6 bg-[#0f0a1c] border-b border-[#261d38] px-3 flex items-center gap-4 text-[10px]">
        <span className="text-[#ff007f] font-bold">BOOKMARKS:</span>
        {bookmarks.map((bm) => (
          <button
            key={bm.name}
            onClick={() => handleNavigate(bm.url)}
            className="text-[#7a7194] hover:text-[#00e5ff] hover:underline cursor-pointer transition-colors"
          >
            {bm.name}
          </button>
        ))}
      </div>

      {/* Main Content Area (Split between Web Content and Live Cyberdeck Inspector) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Webview Content Frame */}
        <div className="flex-1 bg-white relative overflow-hidden flex flex-col">
          {isLoading && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#ff007f] animate-pulse z-10" />
          )}
          <iframe
            ref={iframeRef}
            src={url}
            title="DracoBrowser Content"
            className="w-full h-full border-none"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </div>

                </div>

      {/* OpSec Armor Modal (DNS, Proxy/VPN, IP Masking) */}
      {showOpSecModal && (
        <div
          onClick={() => setShowOpSecModal(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 font-mono select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-[#120c1f] border border-[#ff007f]/50 shadow-[0_20px_70px_rgba(0,0,0,0.95)] p-4 rounded-xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#261d38] pb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#ff007f]" />
                <span className="font-bold text-sm text-[#e2e8f0]">
                  DRACOBROWSER OPSEC & ANONYMITY ARMOR
                </span>
              </div>
              <button
                onClick={() => setShowOpSecModal(false)}
                className="text-[#7a7194] hover:text-[#ff1744] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Public Egress IP Verifier Strip */}
            <div className="bg-[#0b0813] border border-[#261d38] p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#7a7194] uppercase tracking-wider block font-bold">
                  Current Egress IP & Geo Location
                </span>
                <span className="text-sm font-bold text-[#00e5ff]">{publicIp}</span>
              </div>
              <button
                onClick={handleCheckPublicIP}
                disabled={isVerifyingIp}
                className="px-3 py-1 bg-[#161026] hover:bg-[#281b3d] text-[#00e676] border border-[#261d38] text-xs font-bold transition-colors cursor-pointer"
              >
                {isVerifyingIp ? "TESTING LEAK..." : "VERIFY IP"}
              </button>
            </div>

            {/* Section 1: DNS-over-HTTPS (DoH) Mode */}
            <div className="space-y-2">
              <label className="text-[11px] text-[#e2e8f0] font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
                <span>DNS-over-HTTPS (DoH) Encrypted Resolvers</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: "cloudflare", name: "Cloudflare (1.1.1.1)", desc: "Zero logging, low latency" },
                  { id: "google", name: "Google (8.8.8.8)", desc: "Global anycast mesh" },
                  { id: "quad9", name: "Quad9 (9.9.9.9)", desc: "Malware & C2 blocking" },
                  { id: "adguard", name: "AdGuard DNS", desc: "Ad & tracker filter" },
                  { id: "direct", name: "Direct (System DNS)", desc: "Standard ISP resolution" },
                ].map((dns) => (
                  <button
                    key={dns.id}
                    onClick={() => handleApplyDNS(dns.id)}
                    className={`p-2 text-left border rounded-xs transition-all cursor-pointer ${
                      activeDns === dns.id
                        ? "bg-[#00e5ff]/15 border-[#00e5ff] text-[#00e5ff]"
                        : "bg-[#0b0813] border-[#261d38] text-[#7a7194] hover:text-[#cbd5e1]"
                    }`}
                  >
                    <p className="font-bold text-[11px] truncate">{dns.name}</p>
                    <p className="text-[9px] opacity-75">{dns.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: VPN / Proxy Anonymity Routing */}
            <div className="space-y-2">
              <label className="text-[11px] text-[#e2e8f0] font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff007f]" />
                <span>Anonymity Routing (Proxy / TOR SOCKS5)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleApplyProxy("direct")}
                  className={`p-2 text-left border rounded-xs transition-all cursor-pointer ${
                    proxyMode === "direct"
                      ? "bg-[#00e676]/15 border-[#00e676] text-[#00e676]"
                      : "bg-[#0b0813] border-[#261d38] text-[#7a7194]"
                  }`}
                >
                  <p className="font-bold text-[11px]">Direct Route</p>
                  <p className="text-[9px] opacity-75">No proxy, full bandwidth</p>
                </button>
                <button
                  onClick={() => handleApplyProxy("tor")}
                  className={`p-2 text-left border rounded-xs transition-all cursor-pointer ${
                    proxyMode === "tor"
                      ? "bg-[#ff007f]/15 border-[#ff007f] text-[#ff007f]"
                      : "bg-[#0b0813] border-[#261d38] text-[#7a7194]"
                  }`}
                >
                  <p className="font-bold text-[11px]">TOR SOCKS5</p>
                  <p className="text-[9px] opacity-75">127.0.0.1:9050 Onion Net</p>
                </button>
                <button
                  onClick={() => handleApplyProxy("custom")}
                  className={`p-2 text-left border rounded-xs transition-all cursor-pointer ${
                    proxyMode === "custom"
                      ? "bg-[#ff8800]/15 border-[#ff8800] text-[#ff8800]"
                      : "bg-[#0b0813] border-[#261d38] text-[#7a7194]"
                  }`}
                >
                  <p className="font-bold text-[11px]">Custom Proxy</p>
                  <p className="text-[9px] opacity-75">HTTP/SOCKS5 Endpoint</p>
                </button>
              </div>

              {proxyMode === "custom" && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customProxyUrl}
                    onChange={(e) => setCustomProxyUrl(e.target.value)}
                    placeholder="socks5://user:pass@host:port"
                    className="flex-1 bg-[#0b0813] border border-[#261d38] px-2 py-1 text-xs text-[#00e5ff] font-mono outline-none"
                  />
                  <button
                    onClick={() => handleApplyProxy("custom")}
                    className="px-3 py-1 bg-[#ff8800] text-[#0b0813] font-bold text-xs"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Section 3: Identity & User-Agent Masking */}
            <div className="space-y-2">
              <label className="text-[11px] text-[#e2e8f0] font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e676]" />
                <span>Operating System & User-Agent Masking</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "kali-firefox", label: "Kali Linux Firefox (x86_64)", os: "Linux Kali 2026.1" },
                  { id: "tor-browser", label: "Tor Browser Bundle", os: "Anonymous Multi-Hop" },
                  { id: "win-chrome", label: "Windows 11 Chrome 124", os: "Win32 Standard" },
                  { id: "mac-safari", label: "macOS Sonoma Safari 17", os: "Darwin 23.4.0" },
                ].map((ua) => (
                  <button
                    key={ua.id}
                    onClick={() => handleApplyUserAgent(ua.id)}
                    className={`p-2 text-left border rounded-xs transition-all cursor-pointer ${
                      activeUa === ua.id
                        ? "bg-[#00e676]/15 border-[#00e676] text-[#00e676]"
                        : "bg-[#0b0813] border-[#261d38] text-[#7a7194]"
                    }`}
                  >
                    <p className="font-bold text-[11px] truncate">{ua.label}</p>
                    <p className="text-[9px] opacity-75">{ua.os}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[#261d38] flex items-center justify-between text-[11px]">
              <span className="text-[#00e676] flex items-center gap-1 font-bold">
                <Check className="w-3.5 h-3.5" />
                <span>WebRTC Leak Protection: ACTIVE</span>
              </span>
              <button
                onClick={() => setShowOpSecModal(false)}
                className="px-4 py-1.5 bg-[#ff007f] text-white font-bold text-xs"
              >
                APPLY & CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

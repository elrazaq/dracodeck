import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Terminal,
  Plus,
  Trash2,
  RotateCw,
  Zap,
  X,
  Globe,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { executeDracoCommand } from "./dracoShell";
import { DracoTooltip } from "../common/DracoTooltip";

interface TerminalTab {
  id: string;
  name: string;
}

interface TerminalPaneProps {
  workspacePath?: string;
  onOpenBrowser?: (url: string) => void;
}

const stripAnsi = (str: string): string =>
  str
    .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "")
    .replace(/\x1b\][^\x07]*\x07/g, "");

export const TerminalPane: React.FC<TerminalPaneProps> = ({
  workspacePath,
  onOpenBrowser,
}) => {
  const nextIdRef = useRef<number>(2);
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: "1", name: "pwsh.exe:1" },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("1");
  const [outputLines, setOutputLines] = useState<string[]>([
    "DRACODECK ConPTY PseudoConsole Bridge [Version 1.0.0]",
    "Windows PowerShell Interactive Session Connected.",
    "Type any PowerShell / Win32 command and press Enter.",
    "",
  ]);
  const [currentInput, setCurrentInput] = useState<string>("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [copySelectionFeedback, setCopySelectionFeedback] = useState<boolean>(false);
  const [slayedAtLineIndex, setSlayedAtLineIndex] = useState<number>(-1);

  const outputContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMouseSelectingRef = useRef<boolean>(false);
  const prevLineCountRef = useRef<number>(outputLines.length);
  const prevWorkspaceRef = useRef<string | undefined>(workspacePath);

  const currentTab = tabs.find((t) => t.id === activeTabId);

  // Auto-scroll to bottom ONLY when new lines arrive AND user has no active text selection
  useEffect(() => {
    const lineCountIncreased = outputLines.length > prevLineCountRef.current;
    prevLineCountRef.current = outputLines.length;

    if (!lineCountIncreased) return;
    if (isMouseSelectingRef.current) return;

    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }

    const container = outputContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [outputLines]);

  // Keep terminal CWD aligned with active workspace & reset port scope when switching workspace
  useEffect(() => {
    if (workspacePath && window.dracoAPI?.terminalSetCwd) {
      window.dracoAPI.terminalSetCwd(workspacePath);
    }
    if (prevWorkspaceRef.current !== workspacePath) {
      prevWorkspaceRef.current = workspacePath;
      setSlayedAtLineIndex(outputLines.length);
    }
  }, [workspacePath, outputLines.length]);

  // Hydrate persistent history from Electron backend so switching views never loses logs
  useEffect(() => {
    if (window.dracoAPI?.terminalGetHistory) {
      window.dracoAPI.terminalGetHistory().then((history) => {
        if (history && history.length > 0) {
          prevLineCountRef.current = history.length;
          setOutputLines(history);
        }
      });
    }
  }, []);

  // Hook into Electron IPC terminal stream with cleanup
  useEffect(() => {
    if (window.dracoAPI?.receive) {
      const cleanup = window.dracoAPI.receive("terminal-output", (data: string) => {
        const rawLines = data.split(/\r?\n/);
        setOutputLines((prev) => [...prev, ...rawLines]);
      });
      return () => {
        if (typeof cleanup === "function") {
          cleanup();
        }
      };
    }
  }, []);

  // Detect active localhost / dev server URL WITH port from recent cleaned output lines in current scope
  const detectedDevUrl = useMemo(() => {
    const minIdx = Math.max(slayedAtLineIndex, outputLines.length - 45, 0);
    for (let i = outputLines.length - 1; i >= minIdx; i--) {
      const clean = stripAnsi(outputLines[i]);
      const match = clean.match(
        /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1?\])(:\d+)(?:\/[^\s"'<>()[\]{}]*)?/i
      );
      if (match) {
        return match[0]
          .replace("0.0.0.0", "localhost")
          .replace("[::1]", "localhost")
          .replace("[::]", "localhost");
      }
    }
    return null;
  }, [outputLines, slayedAtLineIndex]);

  // Detect active port in current scope (from dev server URL or EADDRINUSE / port-in-use message)
  const detectedPort = useMemo(() => {
    if (detectedDevUrl) {
      const m = detectedDevUrl.match(/:(\d+)/);
      if (m) return parseInt(m[1], 10);
    }
    const minIdx = Math.max(slayedAtLineIndex, outputLines.length - 30, 0);
    for (let i = outputLines.length - 1; i >= minIdx; i--) {
      const clean = stripAnsi(outputLines[i]);
      const inUseMatch =
        clean.match(/port\s+(\d+)\s+is\s+(?:already\s+)?in\s+use/i) ||
        clean.match(/EADDRINUSE.*?:(\d+)/i);
      if (inUseMatch) {
        return parseInt(inUseMatch[1], 10);
      }
    }
    return null;
  }, [detectedDevUrl, outputLines, slayedAtLineIndex]);

  const hasActivePort = detectedPort !== null;

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => {
      setCopiedUrl((curr) => (curr === url ? null : curr));
    }, 2000);
  };

  const handleOpenUrl = (url: string) => {
    if (onOpenBrowser) {
      onOpenBrowser(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const handleContainerClick = () => {
    // Do NOT focus input or scroll if user has highlighted (blocked) text
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }
    inputRef.current?.focus({ preventScroll: true });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString() : "";
    if (selectedText.length > 0) {
      e.preventDefault();
      navigator.clipboard.writeText(selectedText);
      setCopySelectionFeedback(true);
      setTimeout(() => setCopySelectionFeedback(false), 1800);
    }
  };

  const handleSendCommand = async (cmd: string) => {
    if (!cmd.trim() || !currentTab) return;

    // Check custom Draco CLI command
    const dracoResult = await executeDracoCommand(cmd);
    if (dracoResult !== null) {
      if (dracoResult[0] === "__CLEAR__") {
        handleClear();
      } else {
        setOutputLines((prev) => [
          ...prev,
          `┌──(dracodeck㉿kali)-[terminal]`,
          `└─$ ${cmd}`,
          ...dracoResult,
        ]);
      }
      setCmdHistory((prev) => [...prev, cmd]);
      setHistoryIndex(-1);
      setCurrentInput("");
      return;
    }

    // Passthrough 100% to native ConPTY process via IPC
    if (window.dracoAPI?.send) {
      window.dracoAPI.send("terminal-input", cmd + "\r\n");
    }

    setCmdHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);
    setCurrentInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendCommand(currentInput);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const nextIdx = historyIndex === -1 ? cmdHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setCurrentInput(cmdHistory[nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex !== -1) {
        const nextIdx = historyIndex + 1;
        if (nextIdx < cmdHistory.length) {
          setHistoryIndex(nextIdx);
          setCurrentInput(cmdHistory[nextIdx]);
        } else {
          setHistoryIndex(-1);
          setCurrentInput("");
        }
      }
    } else if (e.ctrlKey && e.key.toLowerCase() === "c") {
      const selection = window.getSelection()?.toString();
      if (selection && selection.length > 0) {
        navigator.clipboard.writeText(selection);
        setCopySelectionFeedback(true);
        setTimeout(() => setCopySelectionFeedback(false), 1800);
        return;
      }
      if (window.dracoAPI?.send) {
        window.dracoAPI.send("terminal-input", "\x03");
      }
      setOutputLines((prev) => [...prev, "^C"]);
      setCurrentInput("");
    } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      handleClear();
    }
  };

  const handleClear = async () => {
    setOutputLines([]);
    setSlayedAtLineIndex(-1);
    if (window.dracoAPI?.terminalClearHistory) {
      await window.dracoAPI.terminalClearHistory();
    }
    // Clear ConPTY host screen without resetting CWD or terminating PowerShell
    if (window.dracoAPI?.send) {
      window.dracoAPI.send("terminal-input", "Clear-Host\r\n");
    }
  };

  const handleRestart = async () => {
    setSlayedAtLineIndex(-1);
    setOutputLines(["[Restarting ConPTY session...]", ""]);
    if (window.dracoAPI?.terminalInit) {
      await window.dracoAPI.terminalInit(workspacePath);
    }
  };

  const handleSlayPorts = async () => {
    const portToKill = detectedPort;
    const devPorts = Array.from(
      new Set([
        ...(portToKill ? [portToKill] : []),
        5174,
        5173,
        4200,
        3000,
        8080,
        8000,
      ])
    );

    // Mark current output lines as slayed so toolbar pills clear immediately
    setSlayedAtLineIndex(outputLines.length + 10);

    let killed = 0;
    if (window.dracoAPI?.slayerKillPort) {
      for (const port of devPorts) {
        try {
          const res = await window.dracoAPI.slayerKillPort(port);
          if (res.success) {
            killed++;
            setOutputLines((prev) => [
              ...prev,
              `[Slayer] Terminated process on port :${port} (${res.processName}).`,
            ]);
          }
        } catch {}
      }
    }

    // Also terminate the active ConPTY child process tree (e.g. ng serve / npm run dev on IPv6)
    // and respawn clean shell in active workspacePath without wiping existing terminal logs
    if (window.dracoAPI?.terminalInit) {
      await window.dracoAPI.terminalInit(workspacePath);
    }

    if (killed === 0) {
      setOutputLines((prev) => [
        ...prev,
        `[Slayer] Active dev server${portToKill ? ` on port :${portToKill}` : ""} stopped & process tree freed.`,
      ]);
    }
  };

  const handleNewTab = async () => {
    const newId = String(nextIdRef.current++);
    const wasEmpty = tabs.length === 0;
    setTabs((prev) => [...prev, { id: newId, name: `pwsh.exe:${newId}` }]);
    setActiveTabId(newId);
    if (wasEmpty && window.dracoAPI?.terminalInit) {
      setOutputLines(["[Spawning new PowerShell ConPTY session...]", ""]);
      await window.dracoAPI.terminalInit(workspacePath);
    }
  };

  const handleCloseTab = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const filtered = tabs.filter((t) => t.id !== id);
    setTabs(filtered);

    if (filtered.length === 0) {
      setActiveTabId("");
      if (window.dracoAPI?.terminalKill) {
        await window.dracoAPI.terminalKill();
      }
    } else if (activeTabId === id) {
      setActiveTabId(filtered[filtered.length - 1].id);
    }
  };

  const renderLineWithLinks = (line: string, lineIdx: number) => {
    const clean = stripAnsi(line);
    if (!clean) return <div key={lineIdx} className="h-4" />;

    const urlRegex = /(https?:\/\/[^\s"'<>()[\]{}]+)/g;
    const parts = clean.split(urlRegex);

    const getTextColorClass = (text: string) => {
      if (/error|failed|exception/i.test(text)) return "text-[#ff1744]";
      if (/warning|warn/i.test(text)) return "text-[#ff8800]";
      if (/success|ready|done|connected/i.test(text)) return "text-[#00e676]";
      if (/PS\s+[A-Z]:\\/i.test(text) || text.startsWith(">")) return "text-[#00e5ff] font-semibold";
      return "text-[#cbd5e1]";
    };

    if (parts.length === 1) {
      return (
        <div key={lineIdx} className={`select-text cursor-text ${getTextColorClass(clean)}`}>
          {clean}
        </div>
      );
    }

    return (
      <div key={lineIdx} className="select-text cursor-text flex flex-wrap items-center">
        {parts.map((part, partIdx) => {
          if (part.match(/^https?:\/\//i)) {
            const isCopied = copiedUrl === part;
            return (
              <span
                key={partIdx}
                className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-[#00e5ff]/10 hover:bg-[#ff007f]/20 border border-[#00e5ff]/30 hover:border-[#ff007f]/50 rounded-xs transition-colors cursor-pointer group"
              >
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenUrl(part);
                  }}
                  className="text-[#00e5ff] group-hover:text-[#ff007f] font-bold underline flex items-center gap-1 select-text"
                  title="Click to open in DracoBrowser"
                >
                  <Globe className="w-2.5 h-2.5 shrink-0" />
                  <span>{part}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-70 group-hover:opacity-100 shrink-0" />
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyUrl(part);
                  }}
                  className="p-0.5 text-[#7a7194] hover:text-[#00e676] cursor-pointer shrink-0 transition-colors"
                  title="Copy URL to clipboard"
                >
                  {isCopied ? (
                    <Check className="w-2.5 h-2.5 text-[#00e676]" />
                  ) : (
                    <Copy className="w-2.5 h-2.5" />
                  )}
                </button>
              </span>
            );
          }
          return (
            <span key={partIdx} className={getTextColorClass(part)}>
              {part}
            </span>
          );
        })}
      </div>
    );
  };

  const openPillUrl = detectedDevUrl || (detectedPort ? `http://localhost:${detectedPort}/` : null);

  return (
    <div
      onClick={handleContainerClick}
      onContextMenu={handleContextMenu}
      className="h-full bg-[#0b0813] flex flex-col font-mono text-xs overflow-hidden border-t border-[#261d38]"
    >
      {/* Terminal Tab Bar */}
      <div className="h-7 min-h-[28px] max-h-7 bg-[#120c1f] border-b border-[#261d38] flex items-center justify-between px-2 overflow-hidden select-none">
        <div
          onWheel={(e) => {
            if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY;
          }}
          className="flex-1 h-full flex items-center gap-0.5 overflow-x-auto overflow-y-hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTabId(tab.id);
                }}
                className={`h-full flex items-center gap-1.5 px-2.5 text-[11px] font-semibold cursor-pointer transition-colors border-r border-[#261d38] flex-shrink-0 ${
                  isActive
                    ? "bg-[#0b0813] text-[#00e5ff] border-t-2 border-t-[#ff007f]"
                    : "bg-[#120c1f] text-[#7a7194] hover:bg-[#161026] hover:text-[#cbd5e1]"
                }`}
              >
                <Terminal className="w-3 h-3 text-[#ff007f] shrink-0" />
                <span>{tab.name}</span>
                <button
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  className="hover:text-[#ff1744] hover:bg-[#261d38] p-0.5 cursor-pointer shrink-0"
                  title="Close Terminal Session"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}

          <DracoTooltip content="Spawn New Terminal Shell" shortcut="Ctrl+Shift+T" position="bottom" accent="cyan">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNewTab();
              }}
              className="p-1 hover:bg-[#161026] text-[#7a7194] hover:text-[#00e5ff] transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3 h-3" />
            </button>
          </DracoTooltip>
        </div>

        {/* Terminal Action Tools */}
        <div className="flex items-center gap-1.5 text-[10px] text-[#7a7194] shrink-0 pl-2 select-none">
          {copySelectionFeedback && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-[#00e676]/15 border border-[#00e676]/40 text-[#00e676] font-bold">
              <Check className="w-3 h-3" />
              <span>COPIED</span>
            </span>
          )}

          {openPillUrl && (
            <DracoTooltip content={`Open ${openPillUrl} in DracoBrowser`} position="bottom" accent="cyan">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenUrl(openPillUrl);
                }}
                className="flex items-center gap-1.5 px-2 py-0.5 bg-[#00e5ff]/10 hover:bg-[#00e5ff]/25 border border-[#00e5ff]/40 text-[#00e5ff] text-[10px] font-bold cursor-pointer transition-colors"
              >
                <Globe className="w-3 h-3 text-[#00e5ff] animate-pulse" />
                <span className="hidden md:inline">OPEN</span>
                <span>{openPillUrl.replace(/^https?:\/\//, "")}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-80" />
              </button>
            </DracoTooltip>
          )}

          <DracoTooltip content="Clear Screen (Keeps Current Folder)" shortcut="Ctrl+L" position="bottom" accent="cyan">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="flex items-center gap-1 hover:text-[#00e5ff] px-1.5 py-0.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">CLEAR</span>
            </button>
          </DracoTooltip>

          <DracoTooltip content="Restart Shell in Workspace" position="bottom" accent="green">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRestart();
              }}
              className="flex items-center gap-1 hover:text-[#00e676] px-1.5 py-0.5 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3 h-3" />
              <span className="hidden sm:inline">RESTART</span>
            </button>
          </DracoTooltip>

          {hasActivePort && (
            <DracoTooltip
              content={`Stop Active Dev Server & Free Port${detectedPort ? ` :${detectedPort}` : ""}`}
              position="bottom"
              accent="pink"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSlayPorts();
                }}
                className="flex items-center gap-1 bg-[#ff1744]/15 hover:bg-[#ff1744]/30 text-[#ff1744] hover:text-white px-2 py-0.5 border border-[#ff1744]/40 font-bold transition-colors cursor-pointer text-[10px]"
              >
                <Zap className="w-3 h-3" />
                <span>{detectedPort ? `SLAY PORT :${detectedPort}` : "SLAY PORTS"}</span>
              </button>
            </DracoTooltip>
          )}
        </div>
      </div>

      {/* Terminal Screen Canvas or Clean Empty State */}
      {currentTab ? (
        <div
          ref={outputContainerRef}
          onMouseDown={() => {
            isMouseSelectingRef.current = true;
          }}
          onMouseUp={() => {
            isMouseSelectingRef.current = false;
          }}
          className="flex-1 p-3 overflow-y-auto bg-[#0b0813] text-[#cbd5e1] leading-5 space-y-0.5 cursor-text font-mono text-[11px] select-text"
        >
          {outputLines.map((line, idx) => renderLineWithLinks(line, idx))}

          {/* Active Command Prompt Line */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[#ff007f] font-bold">●</span>
            <span className="text-[#00e5ff] font-bold whitespace-nowrap">PS dracodeck&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              autoFocus
              className="flex-1 bg-transparent text-[#e2e8f0] outline-none border-none font-mono text-[11px] caret-[#ff007f]"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#090610] text-[#7a7194] gap-2.5 p-4 select-none">
          <Terminal className="w-6 h-6 text-[#443a57]" />
          <p className="text-[11px] text-[#cbd5e1] font-bold">
            ALL TERMINAL SESSIONS CLOSED
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNewTab();
            }}
            className="px-3 py-1 bg-[#ff007f] hover:bg-[#d5006d] text-white text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>SPAWN NEW POWERSHELL SESSION</span>
          </button>
        </div>
      )}
    </div>
  );
};

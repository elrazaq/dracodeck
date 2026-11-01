import React, { useState, useEffect, useRef } from "react";
import { Terminal, Plus, Trash2, RotateCw, XCircle, Zap, X } from "lucide-react";
import { executeDracoCommand } from "./dracoShell";
import { DracoTooltip } from "../common/DracoTooltip";

interface TerminalTab {
  id: string;
  name: string;
}

export const TerminalPane: React.FC = () => {
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

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentTab = tabs.find((t) => t.id === activeTabId);

  // Auto-scroll to bottom on new output
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [outputLines]);

  // Hydrate persistent history from Electron backend so switching views never loses logs
  useEffect(() => {
    if (window.dracoAPI?.terminalGetHistory) {
      window.dracoAPI.terminalGetHistory().then((history) => {
        if (history && history.length > 0) {
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

  const handleSendCommand = async (cmd: string) => {
    if (!cmd.trim() || !currentTab) return;

    // Check custom Draco CLI command
    const dracoResult = await executeDracoCommand(cmd);
    if (dracoResult !== null) {
      if (dracoResult[0] === "__CLEAR__") {
        setOutputLines([]);
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
    } else if (e.ctrlKey && e.key === "c") {
      if (window.dracoAPI?.send) {
        window.dracoAPI.send("terminal-input", "\x03");
      }
      setOutputLines((prev) => [...prev, `^C`]);
      setCurrentInput("");
    } else if (e.ctrlKey && e.key === "l") {
      e.preventDefault();
      handleClear();
    }
  };

  const handleClear = async () => {
    setOutputLines([]);
    if (window.dracoAPI?.terminalClearHistory) {
      await window.dracoAPI.terminalClearHistory();
    }
  };

  const handleRestart = async () => {
    setOutputLines(["[Restarting ConPTY session...]", ""]);
    if (window.dracoAPI?.terminalInit) {
      await window.dracoAPI.terminalInit();
    }
  };

  const handleKill = async () => {
    if (window.dracoAPI?.terminalKill) {
      await window.dracoAPI.terminalKill();
      setOutputLines((prev) => [...prev, "[ConPTY process tree terminated. Respawning fresh session...]"]);
      if (window.dracoAPI?.terminalInit) {
        await window.dracoAPI.terminalInit();
      }
    }
  };

  const handleSlayDevServers = async () => {
    const devPorts = [5174, 5173, 3000, 8080, 8000];
    let killed = 0;
    if (window.dracoAPI?.slayerKillPort) {
      for (const port of devPorts) {
        try {
          const res = await window.dracoAPI.slayerKillPort(port);
          if (res.success) {
            killed++;
            setOutputLines((prev) => [...prev, `[Slayer] Terminated process on port ${port} (${res.processName}).`]);
          }
        } catch {}
      }
    }
    if (window.dracoAPI?.terminalKill) {
      await window.dracoAPI.terminalKill();
      if (tabs.length > 0 && window.dracoAPI?.terminalInit) {
        await window.dracoAPI.terminalInit();
      }
    }
    if (killed === 0) {
      setOutputLines((prev) => [...prev, "[Slayer] Process tree terminated. All dev ports checked & free."]);
    }
  };

  const handleNewTab = async () => {
    const newId = String(nextIdRef.current++);
    const wasEmpty = tabs.length === 0;
    setTabs((prev) => [...prev, { id: newId, name: `pwsh.exe:${newId}` }]);
    setActiveTabId(newId);
    if (wasEmpty && window.dracoAPI?.terminalInit) {
      setOutputLines(["[Spawning new PowerShell ConPTY session...]", ""]);
      await window.dracoAPI.terminalInit();
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

  const parseAnsiLine = (line: string) => {
    const clean = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
    if (!clean) return <div className="h-4" />;

    if (/error|failed|exception/i.test(clean)) {
      return <div className="text-[#ff1744]">{clean}</div>;
    }
    if (/warning|warn/i.test(clean)) {
      return <div className="text-[#ff8800]">{clean}</div>;
    }
    if (/success|ready|done|connected/i.test(clean)) {
      return <div className="text-[#00e676]">{clean}</div>;
    }
    if (/PS\s+[A-Z]:\\/i.test(clean) || clean.startsWith(">")) {
      return <div className="text-[#00e5ff] font-semibold">{clean}</div>;
    }
    return <div className="text-[#cbd5e1]">{clean}</div>;
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="h-full bg-[#0b0813] flex flex-col font-mono text-xs overflow-hidden border-t border-[#261d38] select-none"
    >
      {/* Terminal Tab Bar */}
      <div className="h-7 min-h-[28px] max-h-7 bg-[#120c1f] border-b border-[#261d38] flex items-center justify-between px-2 overflow-hidden">
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
        <div className="flex items-center gap-2 text-[10px] text-[#7a7194] shrink-0 pl-2">
          <DracoTooltip content="Clear Screen" shortcut="Ctrl+L" position="bottom" accent="cyan">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="flex items-center gap-1 hover:text-[#00e5ff] p-0.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">CLEAR</span>
            </button>
          </DracoTooltip>

          <DracoTooltip content="Restart Shell Session" position="bottom" accent="green">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRestart();
              }}
              className="flex items-center gap-1 hover:text-[#00e676] p-0.5 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3 h-3" />
              <span className="hidden sm:inline">RESTART</span>
            </button>
          </DracoTooltip>

          <DracoTooltip content="Kill Active Shell Process Tree" shortcut="Ctrl+C" position="bottom" accent="pink">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleKill();
              }}
              className="flex items-center gap-1 hover:text-[#ff1744] p-0.5 transition-colors cursor-pointer"
            >
              <XCircle className="w-3 h-3" />
              <span className="hidden sm:inline">KILL</span>
            </button>
          </DracoTooltip>

          <DracoTooltip content="Force Terminate Background Dev Servers (Ports 5174/5173/3000)" position="bottom" accent="pink">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSlayDevServers();
              }}
              className="flex items-center gap-1 bg-[#ff1744]/20 hover:bg-[#ff1744] text-[#ff1744] hover:text-white px-1.5 py-0.5 border border-[#ff1744]/40 font-bold transition-colors cursor-pointer text-[10px]"
            >
              <Zap className="w-3 h-3" />
              <span className="hidden sm:inline">STOP DEV / SLAY PORTS</span>
            </button>
          </DracoTooltip>

          <span className="text-[#261d38]">|</span>
          <span className={`font-semibold ${currentTab ? "text-[#00e676]" : "text-[#7a7194]"}`}>
            {currentTab ? "ConPTY LIVE" : "STANDBY"}
          </span>
        </div>
      </div>

      {/* Terminal Screen Canvas or Clean Empty State */}
      {currentTab ? (
        <div className="flex-1 p-3 overflow-y-auto bg-[#0b0813] text-[#cbd5e1] leading-5 space-y-0.5 cursor-text font-mono text-[11px]">
          {outputLines.map((line, idx) => (
            <div key={idx}>{parseAnsiLine(line)}</div>
          ))}

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

          <div ref={terminalEndRef} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#090610] text-[#7a7194] gap-2.5 p-4">
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

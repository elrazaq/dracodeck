import React, { useState, useEffect, useRef } from "react";
import { Terminal, Plus, Trash2, RotateCw, XCircle } from "lucide-react";
import { executeDracoCommand } from "./dracoShell";
import { DracoTooltip } from "../common/DracoTooltip";

interface TerminalTab {
  id: string;
  name: string;
  history: string[];
}

export const TerminalPane: React.FC = () => {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: "1", name: "pwsh.exe:1", history: [] },
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

  // Auto-scroll to bottom on new output
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [outputLines]);

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
    if (!cmd.trim()) return;

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
      // Send SIGINT / Interrupt
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

  const handleClear = () => {
    setOutputLines([]);
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
      setOutputLines((prev) => [...prev, "[ConPTY process terminated.]"]);
    }
  };

  const handleNewTab = () => {
    const newId = (tabs.length + 1).toString();
    setTabs([...tabs, { id: newId, name: `pwsh.exe:${newId}`, history: [] }]);
    setActiveTabId(newId);
  };

  // Basic ANSI color strip/render helper
  const parseAnsiLine = (line: string) => {
    // Strip standard ANSI escape codes for crisp readability
    const clean = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
    if (!clean) return <div className="h-4" />;

    // Highlight error or warning patterns
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
      <div className="h-7 bg-[#120c1f] border-b border-[#261d38] flex items-center justify-between px-2">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTabId(tab.id);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold cursor-pointer transition-colors border-r border-[#261d38] ${
                  isActive
                    ? "bg-[#0b0813] text-[#00e5ff] border-t-2 border-t-[#ff007f]"
                    : "bg-[#120c1f] text-[#7a7194] hover:bg-[#161026] hover:text-[#cbd5e1]"
                }`}
              >
                <Terminal className="w-3 h-3 text-[#ff007f]" />
                <span>{tab.name}</span>
              </div>
            );
          })}

          <DracoTooltip content="New Terminal Shell" shortcut="Ctrl+Shift+T" position="bottom" accent="cyan">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNewTab();
              }}
              className="p-1 hover:bg-[#161026] text-[#7a7194] hover:text-[#e2e8f0] transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </DracoTooltip>
        </div>

        {/* Terminal Action Tools with Hacker Cyberdeck Tooltips */}
        <div className="flex items-center gap-2 text-[10px] text-[#7a7194]">
          <DracoTooltip content="Clear Screen" shortcut="Ctrl+L" position="bottom" accent="cyan">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="flex items-center gap-1 hover:text-[#00e5ff] p-0.5 transition-colors"
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
              className="flex items-center gap-1 hover:text-[#00e676] p-0.5 transition-colors"
            >
              <RotateCw className="w-3 h-3" />
              <span className="hidden sm:inline">RESTART</span>
            </button>
          </DracoTooltip>

          <DracoTooltip content="Kill Active Shell Process" shortcut="Ctrl+C" position="bottom" accent="pink">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleKill();
              }}
              className="flex items-center gap-1 hover:text-[#ff1744] p-0.5 transition-colors"
            >
              <XCircle className="w-3 h-3" />
              <span className="hidden sm:inline">KILL</span>
            </button>
          </DracoTooltip>

          <span className="text-[#261d38]">|</span>
          <span className="text-[#00e676] font-semibold">ConPTY LIVE</span>
        </div>
      </div>

      {/* Terminal Screen Canvas */}
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
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  Radio,
  Search,
  RefreshCw,
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

type BottomPanelTab = "problems" | "console" | "terminal" | "ports";

export interface CodeDiagnosticItem {
  id: string;
  file: string;
  filePath?: string;
  line: number;
  col: number;
  severity: "error" | "warning";
  message: string;
  source: string;
}

interface ConsoleEntry {
  id: string;
  time: string;
  level: "info" | "warn" | "error";
  message: string;
  source: string;
}

const stripAnsi = (str: string): string =>
  str
    .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "")
    .replace(/\x1b\][^\x07]*\x07/g, "");

/**
 * Real-time universal syntax & structural error analyzer for all programming languages
 */
function analyzeCodeProblems(fileName: string, filePath: string, content: string): CodeDiagnosticItem[] {
  if (!content || !fileName) return [];
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "avif", "md", "txt"].includes(ext)) {
    return [];
  }

  const diagnostics: CodeDiagnosticItem[] = [];
  const lines = content.split(/\r?\n/);

  // 1. JSON strict validation
  if (ext === "json") {
    try {
      JSON.parse(content);
    } catch (err: any) {
      const msg = err?.message || "Invalid JSON syntax";
      const posMatch = msg.match(/position\s+(\d+)/i);
      let line = 1;
      let col = 1;
      if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const slice = content.slice(0, pos);
        const slicedLines = slice.split(/\r?\n/);
        line = slicedLines.length;
        col = (slicedLines[slicedLines.length - 1]?.length || 0) + 1;
      }
      diagnostics.push({
        id: `json-${line}-${col}`,
        file: fileName,
        filePath,
        line,
        col,
        severity: "error",
        message: msg,
        source: "JSON",
      });
    }
    return diagnostics;
  }

  // 2. Universal bracket, brace, paren & string literal validation across code languages
  const stack: { char: string; expected: string; line: number; col: number }[] = [];
  const openMap: Record<string, string> = { "{": "}", "(": ")", "[": "]" };
  const closeSet = new Set(["}", ")", "]"]);
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNum = i + 1;

    // Check Git merge conflict markers
    if (/^(<<<<<<<|=======|>>>>>>>)/.test(rawLine)) {
      diagnostics.push({
        id: `conflict-${lineNum}`,
        file: fileName,
        filePath,
        line: lineNum,
        col: 1,
        severity: "error",
        message: "Unresolved Git merge conflict marker detected",
        source: "GIT",
      });
    }

    // Python specific indentation & colon checks
    if (ext === "py") {
      if (/^\s*(def\s+\w+\s*\(.*\)|class\s+\w+.*|if\s+.*|elif\s+.*|else|for\s+.*|while\s+.*|try|except.*|finally)\s*$/.test(rawLine)) {
        const trimmed = rawLine.trim();
        if (!trimmed.endsWith(":") && !trimmed.endsWith("\\") && !trimmed.endsWith(",")) {
          diagnostics.push({
            id: `py-colon-${lineNum}`,
            file: fileName,
            filePath,
            line: lineNum,
            col: rawLine.length,
            severity: "error",
            message: "Expected ':' at end of Python compound statement",
            source: "PYTHON",
          });
        }
      }
    }

    let inString: string | null = null;
    let stringStartCol = 1;

    for (let j = 0; j < rawLine.length; j++) {
      const ch = rawLine[j];
      const next = rawLine[j + 1] || "";

      if (inBlockComment) {
        if (ch === "*" && next === "/") {
          inBlockComment = false;
          j++;
        }
        continue;
      }

      if (!inString) {
        if (ch === "/" && next === "/") break; // Line comment
        if (ch === "#" && ["py", "sh", "yaml", "yml", "toml", "rb"].includes(ext)) break;
        if (ch === "/" && next === "*") {
          inBlockComment = true;
          j++;
          continue;
        }
        if (ch === '"' || ch === "'" || ch === "`") {
          // Ignore apostrophes inside words or Rust lifetimes like 'a
          if (ch === "'" && (ext === "rs" || /\w/.test(rawLine[j - 1] || ""))) {
            continue;
          }
          inString = ch;
          stringStartCol = j + 1;
          continue;
        }

        if (openMap[ch]) {
          stack.push({ char: ch, expected: openMap[ch], line: lineNum, col: j + 1 });
        } else if (closeSet.has(ch)) {
          if (stack.length === 0) {
            diagnostics.push({
              id: `unmatched-close-${lineNum}-${j}`,
              file: fileName,
              filePath,
              line: lineNum,
              col: j + 1,
              severity: "error",
              message: `Unexpected closing '${ch}' with no matching opening bracket`,
              source: ext.toUpperCase() || "SYNTAX",
            });
          } else {
            const last = stack[stack.length - 1];
            if (last.expected === ch) {
              stack.pop();
            } else {
              diagnostics.push({
                id: `mismatch-${lineNum}-${j}`,
                file: fileName,
                filePath,
                line: lineNum,
                col: j + 1,
                severity: "error",
                message: `Mismatched bracket: expected '${last.expected}' (to close '${last.char}' from Ln ${last.line}), found '${ch}'`,
                source: ext.toUpperCase() || "SYNTAX",
              });
              stack.pop();
            }
          }
        }
      } else {
        if (ch === "\\") {
          j++; // Skip escaped char
          continue;
        }
        if (ch === inString) {
          inString = null;
        }
      }
    }

    // Single/double quotes (not template backticks) must close on the same line unless escaped
    if (inString && inString !== "`" && !rawLine.trimEnd().endsWith("\\")) {
      diagnostics.push({
        id: `unclosed-str-${lineNum}-${stringStartCol}`,
        file: fileName,
        filePath,
        line: lineNum,
        col: stringStartCol,
        severity: "error",
        message: `Unclosed string literal (${inString})`,
        source: ext.toUpperCase() || "SYNTAX",
      });
    }
  }

  // Remaining unclosed brackets
  for (const unclosed of stack.slice(-5)) {
    diagnostics.push({
      id: `unclosed-open-${unclosed.line}-${unclosed.col}`,
      file: fileName,
      filePath,
      line: unclosed.line,
      col: unclosed.col,
      severity: "error",
      message: `Unclosed '${unclosed.char}' — expected matching '${unclosed.expected}'`,
      source: ext.toUpperCase() || "SYNTAX",
    });
  }

  return diagnostics;
}

export const TerminalPane: React.FC<TerminalPaneProps> = ({
  workspacePath,
  onOpenBrowser,
}) => {
  // Determine Dracodeck's own port in dev mode so we NEVER display or slay ourselves
  const selfPort = useMemo(() => {
    const p = window.location.port ? parseInt(window.location.port, 10) : 5173;
    return isNaN(p) ? 5173 : p;
  }, []);

  const nextIdRef = useRef<number>(2);
  const [activePanelTab, setActivePanelTab] = useState<BottomPanelTab>("terminal");
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: "1", name: "pwsh.exe:1" },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("1");
  const [isShellSelectOpen, setIsShellSelectOpen] = useState<boolean>(false);
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

  // Live Problems state
  const [editorDiagnostics, setEditorDiagnostics] = useState<CodeDiagnosticItem[]>([]);
  // Live Console state
  const [consoleLogs, setConsoleLogs] = useState<ConsoleEntry[]>([
    {
      id: "init-1",
      time: new Date().toLocaleTimeString("en-US", { hour12: false }),
      level: "info",
      message: "Dracodeck Debug Console initialized. Monitoring runtime & IPC events.",
      source: "System",
    },
  ]);
  const [consoleFilter, setConsoleFilter] = useState<"all" | "info" | "warn" | "error">("all");
  const [consoleSearch, setConsoleSearch] = useState<string>("");

  // Live Ports state
  const [activePortsList, setActivePortsList] = useState<any[]>([]);
  const [isScanningPorts, setIsScanningPorts] = useState<boolean>(false);

  const outputContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shellSelectRef = useRef<HTMLDivElement>(null);
  const isMouseSelectingRef = useRef<boolean>(false);
  const prevLineCountRef = useRef<number>(outputLines.length);
  const prevWorkspaceRef = useRef<string | undefined>(workspacePath);

  const currentTab = tabs.find((t) => t.id === activeTabId);

  // Close shell select dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (shellSelectRef.current && !shellSelectRef.current.contains(e.target as Node)) {
        setIsShellSelectOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Listen to real-time code changes from EditorPane to compute live Problems
  useEffect(() => {
    const handleEditorCode = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.content === "string") {
        const items = analyzeCodeProblems(detail.name || "", detail.path || "", detail.content);
        setEditorDiagnostics(items);
      }
    };
    window.addEventListener("dracode:editor-diagnostics", handleEditorCode);
    return () => window.removeEventListener("dracode:editor-diagnostics", handleEditorCode);
  }, []);

  // Parse compiler / linter errors from terminal output lines as well
  const terminalDiagnostics = useMemo(() => {
    const found: CodeDiagnosticItem[] = [];
    const minIdx = Math.max(0, outputLines.length - 80);
    for (let i = minIdx; i < outputLines.length; i++) {
      const clean = stripAnsi(outputLines[i]).trim();
      if (!clean) continue;

      // Match TypeScript: src/file.tsx(12,5): error TS2304: msg
      const tsMatch = clean.match(/^([^\s(]+)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+:\s+.+)$/i);
      if (tsMatch) {
        found.push({
          id: `term-ts-${i}`,
          file: tsMatch[1].split(/[/\\]/).pop() || tsMatch[1],
          filePath: tsMatch[1],
          line: parseInt(tsMatch[2], 10),
          col: parseInt(tsMatch[3], 10),
          severity: tsMatch[4].toLowerCase() === "warning" ? "warning" : "error",
          message: tsMatch[5],
          source: "TSC",
        });
        continue;
      }

      // Match GCC/Rust/ESLint/Vite: path/file.ext:12:5: error: msg
      const colonMatch = clean.match(/^([^\s:]+):(\d+):(\d+):\s*(error|warning|warn):\s*(.+)$/i);
      if (colonMatch) {
        found.push({
          id: `term-col-${i}`,
          file: colonMatch[1].split(/[/\\]/).pop() || colonMatch[1],
          filePath: colonMatch[1],
          line: parseInt(colonMatch[2], 10),
          col: parseInt(colonMatch[3], 10),
          severity: colonMatch[4].toLowerCase().startsWith("warn") ? "warning" : "error",
          message: colonMatch[5],
          source: "COMPILER",
        });
      }
    }
    return found;
  }, [outputLines]);

  const allProblems = useMemo(
    () => [...editorDiagnostics, ...terminalDiagnostics],
    [editorDiagnostics, terminalDiagnostics]
  );

  // Intercept console logs & runtime errors into the Console tab
  useEffect(() => {
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;

    const pushEntry = (level: "info" | "warn" | "error", args: any[], source = "Console") => {
      const msg = args
        .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
        .join(" ");
      const time = new Date().toLocaleTimeString("en-US", { hour12: false });
      setConsoleLogs((prev) => {
        const next = [
          ...prev,
          { id: `${Date.now()}-${Math.random()}`, time, level, message: msg, source },
        ];
        return next.length > 200 ? next.slice(next.length - 200) : next;
      });
    };

    console.log = (...args: any[]) => {
      origLog(...args);
      pushEntry("info", args, "Runtime");
    };
    console.warn = (...args: any[]) => {
      origWarn(...args);
      pushEntry("warn", args, "Runtime");
    };
    console.error = (...args: any[]) => {
      origError(...args);
      pushEntry("error", args, "Runtime");
    };

    return () => {
      console.log = origLog;
      console.warn = origWarn;
      console.error = origError;
    };
  }, []);

  // Poll active listening TCP ports (strictly excluding Dracodeck's own port and process)
  const refreshPorts = useCallback(async () => {
    if (!window.dracoAPI?.slayerScanPorts) return;
    setIsScanningPorts(true);
    try {
      const all = await window.dracoAPI.slayerScanPorts();
      const filtered = (all || []).filter(
        (p: any) =>
          p.state === "LISTENING" &&
          !p.isSelf &&
          !p.isProtected &&
          p.port !== selfPort &&
          p.processName?.toLowerCase() !== "electron.exe" &&
          p.processName?.toLowerCase() !== "dracodeck.exe"
      );
      setActivePortsList(filtered);
    } catch {}
    setIsScanningPorts(false);
  }, [selfPort]);

  useEffect(() => {
    refreshPorts();
    const timer = setInterval(refreshPorts, 4000);
    return () => clearInterval(timer);
  }, [refreshPorts]);

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

  // Reset port scope ONLY when workspacePath actually changes (no outputLines loop)
  useEffect(() => {
    if (prevWorkspaceRef.current !== workspacePath) {
      prevWorkspaceRef.current = workspacePath;
      setSlayedAtLineIndex(prevLineCountRef.current);
    }
  }, [workspacePath]);

  // Hydrate persistent history from Electron backend so switching views never loses logs
  useEffect(() => {
    if (window.dracoAPI?.terminalGetHistory) {
      window.dracoAPI.terminalGetHistory().then((history) => {
        if (history && history.length > 0) {
          const bounded = history.length > 500 ? history.slice(history.length - 500) : history;
          prevLineCountRef.current = bounded.length;
          setOutputLines(bounded);
        }
      });
    }
  }, []);

  // Hook into Electron IPC terminal stream with cleanup & bounded memory buffer
  useEffect(() => {
    if (window.dracoAPI?.receive) {
      const cleanup = window.dracoAPI.receive("terminal-output", (data: string) => {
        const rawLines = data.split(/\r?\n/);
        setOutputLines((prev) => {
          const next = [...prev, ...rawLines];
          return next.length > 500 ? next.slice(next.length - 500) : next;
        });

        // Mirror errors/warnings from terminal into Console tab as well
        const cleanChunk = stripAnsi(data).trim();
        if (cleanChunk && /error|warning|exception|ready|compiled/i.test(cleanChunk)) {
          const level: "info" | "warn" | "error" = /error|exception/i.test(cleanChunk)
            ? "error"
            : /warn/i.test(cleanChunk)
            ? "warn"
            : "info";
          const time = new Date().toLocaleTimeString("en-US", { hour12: false });
          setConsoleLogs((prev) => {
            const next = [
              ...prev,
              {
                id: `${Date.now()}-${Math.random()}`,
                time,
                level,
                message: cleanChunk.slice(0, 300),
                source: "ConPTY",
              },
            ];
            return next.length > 200 ? next.slice(next.length - 200) : next;
          });
        }
      });
      return () => {
        if (typeof cleanup === "function") {
          cleanup();
        }
      };
    }
  }, []);

  // Detect active localhost / dev server URL WITH port from recent cleaned output lines (excluding selfPort)
  const detectedDevUrl = useMemo(() => {
    const minIdx = Math.max(slayedAtLineIndex, outputLines.length - 45, 0);
    for (let i = outputLines.length - 1; i >= minIdx; i--) {
      const clean = stripAnsi(outputLines[i]);
      const match = clean.match(
        /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1?\])(:\d+)(?:\/[^\s"'<>()[\]{}]*)?/i
      );
      if (match) {
        const portNum = parseInt(match[1].slice(1), 10);
        if (portNum === selfPort) continue;
        return match[0]
          .replace("0.0.0.0", "localhost")
          .replace("[::1]", "localhost")
          .replace("[::]", "localhost");
      }
    }
    return null;
  }, [outputLines, slayedAtLineIndex, selfPort]);

  // Detect active port in current scope (never selfPort)
  const detectedPort = useMemo(() => {
    if (detectedDevUrl) {
      const m = detectedDevUrl.match(/:(\d+)/);
      if (m) {
        const p = parseInt(m[1], 10);
        if (p !== selfPort) return p;
      }
    }
    const minIdx = Math.max(slayedAtLineIndex, outputLines.length - 30, 0);
    for (let i = outputLines.length - 1; i >= minIdx; i--) {
      const clean = stripAnsi(outputLines[i]);
      const inUseMatch =
        clean.match(/port\s+(\d+)\s+is\s+(?:already\s+)?in\s+use/i) ||
        clean.match(/EADDRINUSE.*?:(\d+)/i);
      if (inUseMatch) {
        const p = parseInt(inUseMatch[1], 10);
        if (p !== selfPort) return p;
      }
    }
    return null;
  }, [detectedDevUrl, outputLines, slayedAtLineIndex, selfPort]);

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
    if (activePanelTab !== "terminal") return;
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
    if (activePanelTab === "console") {
      setConsoleLogs([]);
      return;
    }
    setOutputLines([]);
    setSlayedAtLineIndex(-1);
    if (window.dracoAPI?.terminalClearHistory) {
      await window.dracoAPI.terminalClearHistory();
    }
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

  // Safe Port Slayer: NEVER touches selfPort (5173) or Dracodeck's own process!
  const handleSlayPorts = async (specificPort?: number) => {
    const targetPort = specificPort ?? detectedPort;
    if (!targetPort || targetPort === selfPort) {
      return;
    }

    setSlayedAtLineIndex(outputLines.length + 10);

    let killed = false;
    if (window.dracoAPI?.slayerKillPort) {
      try {
        const res = await window.dracoAPI.slayerKillPort(targetPort);
        if (res.success) {
          killed = true;
          setOutputLines((prev) => [
            ...prev,
            `[Slayer] Terminated process on port :${targetPort} (${res.processName || "server"}).`,
          ]);
        }
      } catch {}
    }

    // If slaying the terminal's active foreground dev server, respawn clean shell in workspacePath
    if (!specificPort && window.dracoAPI?.terminalInit) {
      await window.dracoAPI.terminalInit(workspacePath);
    }

    if (!killed) {
      setOutputLines((prev) => [
        ...prev,
        `[Slayer] Dev server on port :${targetPort} stopped & freed.`,
      ]);
    }

    refreshPorts();
  };

  const handleNewTab = async () => {
    const newId = String(nextIdRef.current++);
    const wasEmpty = tabs.length === 0;
    setTabs((prev) => [...prev, { id: newId, name: `pwsh.exe:${newId}` }]);
    setActiveTabId(newId);
    setActivePanelTab("terminal");
    setIsShellSelectOpen(false);
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

  const filteredConsoleLogs = useMemo(() => {
    return consoleLogs.filter((item) => {
      if (consoleFilter !== "all" && item.level !== consoleFilter) return false;
      if (consoleSearch && !item.message.toLowerCase().includes(consoleSearch.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [consoleLogs, consoleFilter, consoleSearch]);

  return (
    <div
      onClick={handleContainerClick}
      onContextMenu={handleContextMenu}
      className="h-full bg-[#0b0813] flex flex-col font-mono text-xs overflow-hidden border-t border-[#2d2d3a]"
    >
      {/* Unified Dark Gray Tab Bar (Matches Line Number Gutter #1c1c24) */}
      <div className="h-8 min-h-[32px] max-h-8 bg-[#1c1c24] border-b border-[#2d2d3a] flex items-center justify-between px-3 select-none relative z-20">
        {/* Left: Multi-Tabs (Problems, Console, Terminal, Ports) */}
        <div className="flex items-center gap-1 h-full">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActivePanelTab("problems");
            }}
            className={`px-2.5 py-1 rounded-xs text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors ${
              activePanelTab === "problems"
                ? "bg-[#2d2d3a] text-[#e2e8f0] font-semibold"
                : "text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#252530]"
            }`}
          >
            <span>Problems</span>
            {allProblems.length > 0 && (
              <span className="px-1.5 py-0.2 bg-[#ff1744]/20 text-[#ff1744] border border-[#ff1744]/40 rounded-full text-[9px] font-bold">
                {allProblems.length}
              </span>
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setActivePanelTab("console");
            }}
            className={`px-2.5 py-1 rounded-xs text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors ${
              activePanelTab === "console"
                ? "bg-[#2d2d3a] text-[#e2e8f0] font-semibold"
                : "text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#252530]"
            }`}
          >
            <span>Console</span>
            {consoleLogs.length > 0 && (
              <span className="px-1.5 py-0.2 bg-[#252530] text-[#94a3b8] rounded-full text-[9px]">
                {consoleLogs.length}
              </span>
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setActivePanelTab("terminal");
            }}
            className={`px-2.5 py-1 rounded-xs text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors ${
              activePanelTab === "terminal"
                ? "bg-[#2d2d3a] text-[#e2e8f0] font-semibold"
                : "text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#252530]"
            }`}
          >
            <span>Terminal</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setActivePanelTab("ports");
              refreshPorts();
            }}
            className={`px-2.5 py-1 rounded-xs text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors ${
              activePanelTab === "ports"
                ? "bg-[#2d2d3a] text-[#e2e8f0] font-semibold"
                : "text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#252530]"
            }`}
          >
            <span>Ports</span>
            {activePortsList.length > 0 && (
              <span className="px-1.5 py-0.2 bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/30 rounded-full text-[9px] font-bold">
                {activePortsList.length}
              </span>
            )}
          </button>
        </div>

        {/* Right: Shell Select Box + Icon-Only Action Buttons */}
        <div className="flex items-center gap-1.5 text-[#94a3b8] shrink-0">
          {copySelectionFeedback && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-[#00e676]/15 border border-[#00e676]/40 text-[#00e676] text-[10px] font-bold rounded-xs">
              <Check className="w-3 h-3" />
              <span>COPIED</span>
            </span>
          )}

          {/* Open Dev Server Icon Button */}
          {openPillUrl && (
            <DracoTooltip content={`Open ${openPillUrl} in DracoBrowser`} position="bottom" accent="cyan">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenUrl(openPillUrl);
                }}
                className="p-1.5 bg-[#00e5ff]/15 hover:bg-[#00e5ff]/30 border border-[#00e5ff]/40 text-[#00e5ff] rounded-xs cursor-pointer transition-colors"
              >
                <Globe className="w-3.5 h-3.5 animate-pulse" />
              </button>
            </DracoTooltip>
          )}

          {/* Slay Active Port Icon-Only Button (Only visible when active port detected) */}
          {hasActivePort && (
            <DracoTooltip
              content={`Slay Active Port :${detectedPort}`}
              position="bottom"
              accent="pink"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSlayPorts();
                }}
                className="p-1.5 bg-[#ff1744]/15 hover:bg-[#ff1744]/35 border border-[#ff1744]/40 text-[#ff1744] rounded-xs cursor-pointer transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
              </button>
            </DracoTooltip>
          )}

          {/* Right-Side Shell Select Box (pwsh.exe:1 Dropdown) */}
          <div ref={shellSelectRef} className="relative flex items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsShellSelectOpen((prev) => !prev);
              }}
              className="h-6 px-2 bg-[#121218] hover:bg-[#252530] border border-[#2d2d3a] text-[#e2e8f0] rounded-xs flex items-center gap-1.5 text-[11px] cursor-pointer transition-colors"
              title="Select Active Terminal Session"
            >
              <Terminal className="w-3 h-3 text-[#00e5ff] shrink-0" />
              <span className="font-medium">{currentTab ? currentTab.name : "No Shell"}</span>
              <ChevronDown className="w-3 h-3 text-[#94a3b8]" />
            </button>

            <DracoTooltip content="Spawn New PowerShell Session" shortcut="Ctrl+Shift+T" position="bottom" accent="cyan">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNewTab();
                }}
                className="h-6 w-6 flex items-center justify-center hover:bg-[#252530] text-[#94a3b8] hover:text-[#e2e8f0] rounded-xs cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </DracoTooltip>

            {isShellSelectOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1 w-48 bg-[#1c1c24] border border-[#2d2d3a] shadow-[0_12px_32px_rgba(0,0,0,0.85)] py-1 z-50 rounded-xs"
              >
                <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#7a7194] border-b border-[#2d2d3a]">
                  Active Shells ({tabs.length})
                </div>
                {tabs.map((tab) => {
                  const isActive = tab.id === activeTabId;
                  return (
                    <div
                      key={tab.id}
                      onClick={() => {
                        setActiveTabId(tab.id);
                        setActivePanelTab("terminal");
                        setIsShellSelectOpen(false);
                      }}
                      className={`px-2.5 py-1.5 flex items-center justify-between text-[11px] cursor-pointer transition-colors ${
                        isActive
                          ? "bg-[#2d2d3a] text-[#00e5ff] font-semibold"
                          : "text-[#cbd5e1] hover:bg-[#252530]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Terminal className="w-3 h-3 text-[#ff007f] shrink-0" />
                        <span className="truncate">{tab.name}</span>
                      </div>
                      <button
                        onClick={(e) => handleCloseTab(e, tab.id)}
                        className="p-0.5 text-[#94a3b8] hover:text-[#ff1744] cursor-pointer"
                        title="Kill Session"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                <button
                  onClick={() => handleNewTab()}
                  className="w-full px-2.5 py-1.5 mt-0.5 border-t border-[#2d2d3a] flex items-center gap-1.5 text-[11px] text-[#00e676] hover:bg-[#252530] cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>New PowerShell</span>
                </button>
              </div>
            )}
          </div>

          <span className="text-[#2d2d3a]">|</span>

          {/* Icon-Only Restart Button */}
          <DracoTooltip content="Restart Shell in Workspace" position="bottom" accent="green">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRestart();
              }}
              className="p-1.5 hover:bg-[#252530] text-[#94a3b8] hover:text-[#00e676] rounded-xs transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </DracoTooltip>

          {/* Icon-Only Clear Button */}
          <DracoTooltip content="Clear Screen (Ctrl+L)" position="bottom" accent="cyan">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1.5 hover:bg-[#252530] text-[#94a3b8] hover:text-[#00e5ff] rounded-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </DracoTooltip>
        </div>
      </div>

      {/* Panel Body Content (Terminal background remains #0b0813!) */}
      {activePanelTab === "problems" && (
        <div className="flex-1 bg-[#0b0813] overflow-y-auto p-3 space-y-1 text-[11px]">
          {allProblems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#7a7194] gap-2 select-none">
              <Check className="w-5 h-5 text-[#00e676]" />
              <span>No syntax or compiler problems detected in workspace.</span>
            </div>
          ) : (
            allProblems.map((prob) => (
              <div
                key={prob.id}
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("dracode:jump-to-line", {
                      detail: { path: prob.filePath, line: prob.line, col: prob.col },
                    })
                  );
                }}
                className="flex items-start gap-2.5 px-2.5 py-1.5 bg-[#120c1f]/70 hover:bg-[#1c1c24] border border-[#261d38] rounded-xs cursor-pointer transition-colors"
              >
                {prob.severity === "error" ? (
                  <AlertCircle className="w-3.5 h-3.5 text-[#ff1744] shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-[#ff8800] shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[#e2e8f0] break-words">{prob.message}</div>
                  <div className="text-[10px] text-[#7a7194] flex items-center gap-2 mt-0.5">
                    <span className="text-[#00e5ff] font-semibold">{prob.file}</span>
                    <span>
                      [Ln {prob.line}, Col {prob.col}]
                    </span>
                    <span className="px-1 bg-[#1c1c24] border border-[#2d2d3a] text-[#94a3b8] text-[9px]">
                      {prob.source}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activePanelTab === "console" && (
        <div className="flex-1 bg-[#0b0813] flex flex-col overflow-hidden">
          <div className="h-7 bg-[#120c1f] border-b border-[#261d38] px-3 flex items-center justify-between gap-2 text-[10px] select-none">
            <div className="flex items-center gap-1">
              {(["all", "info", "warn", "error"] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setConsoleFilter(lvl)}
                  className={`px-2 py-0.5 uppercase font-bold rounded-xs cursor-pointer ${
                    consoleFilter === lvl
                      ? "bg-[#2d2d3a] text-[#00e5ff]"
                      : "text-[#7a7194] hover:text-[#cbd5e1]"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 bg-[#0b0813] border border-[#261d38] px-2 py-0.5 w-52">
              <Search className="w-3 h-3 text-[#7a7194]" />
              <input
                type="text"
                value={consoleSearch}
                onChange={(e) => setConsoleSearch(e.target.value)}
                placeholder="Filter console logs..."
                className="bg-transparent text-[#e2e8f0] outline-none w-full text-[10px]"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1 text-[11px] select-text">
            {filteredConsoleLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[#7a7194]">
                No console output matching filter.
              </div>
            ) : (
              filteredConsoleLogs.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-2 py-0.5 border-b border-[#161026] font-mono"
                >
                  <span className="text-[#7a7194] shrink-0">[{entry.time}]</span>
                  <span
                    className={`uppercase font-bold text-[9px] px-1 rounded-xs shrink-0 mt-0.5 ${
                      entry.level === "error"
                        ? "bg-[#ff1744]/20 text-[#ff1744]"
                        : entry.level === "warn"
                        ? "bg-[#ff8800]/20 text-[#ff8800]"
                        : "bg-[#00e5ff]/15 text-[#00e5ff]"
                    }`}
                  >
                    {entry.level}
                  </span>
                  <span className="text-[#e2e8f0] break-all flex-1">{entry.message}</span>
                  <span className="text-[#7a7194] text-[10px] shrink-0">{entry.source}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activePanelTab === "ports" && (
        <div className="flex-1 bg-[#0b0813] flex flex-col overflow-hidden">
          <div className="h-7 bg-[#120c1f] border-b border-[#261d38] px-3 flex items-center justify-between text-[10px] text-[#94a3b8] select-none">
            <div className="flex items-center gap-2">
              <Radio className="w-3 h-3 text-[#00e676]" />
              <span>Active Listening TCP Ports (Dracodeck internal port :{selfPort} excluded)</span>
            </div>
            <button
              onClick={() => refreshPorts()}
              className="flex items-center gap-1 px-2 py-0.5 bg-[#1c1c24] hover:bg-[#2d2d3a] text-[#cbd5e1] rounded-xs cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isScanningPorts ? "animate-spin text-[#00e5ff]" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {activePortsList.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[#7a7194] text-[11px]">
                No external active listening ports detected.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-[#261d38] text-[#7a7194] text-[10px] uppercase">
                    <th className="py-1.5 px-2">Port</th>
                    <th className="py-1.5 px-2">PID</th>
                    <th className="py-1.5 px-2">Process</th>
                    <th className="py-1.5 px-2">Address</th>
                    <th className="py-1.5 px-2">Label</th>
                    <th className="py-1.5 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activePortsList.map((p) => (
                    <tr
                      key={`${p.port}-${p.pid}`}
                      className="border-b border-[#161026] hover:bg-[#120c1f] transition-colors"
                    >
                      <td className="py-1.5 px-2 font-bold text-[#00e5ff]">:{p.port}</td>
                      <td className="py-1.5 px-2 text-[#94a3b8]">{p.pid}</td>
                      <td className="py-1.5 px-2 text-[#e2e8f0]">{p.processName}</td>
                      <td className="py-1.5 px-2 text-[#7a7194]">{p.localAddress}</td>
                      <td className="py-1.5 px-2 text-[#00e676]">{p.label}</td>
                      <td className="py-1.5 px-2 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenUrl(`http://localhost:${p.port}/`)}
                            className="p-1 bg-[#00e5ff]/10 hover:bg-[#00e5ff]/25 text-[#00e5ff] border border-[#00e5ff]/30 rounded-xs cursor-pointer"
                            title={`Open http://localhost:${p.port}/ in DracoBrowser`}
                          >
                            <Globe className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleSlayPorts(p.port)}
                            className="p-1 bg-[#ff1744]/15 hover:bg-[#ff1744]/35 text-[#ff1744] border border-[#ff1744]/40 rounded-xs cursor-pointer"
                            title={`Terminate port :${p.port} (PID ${p.pid})`}
                          >
                            <Zap className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activePanelTab === "terminal" && (
        currentTab ? (
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
          <div className="flex-1 flex flex-col items-center justify-center bg-[#0b0813] text-[#7a7194] gap-2.5 p-4 select-none">
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
        )
      )}
    </div>
  );
};

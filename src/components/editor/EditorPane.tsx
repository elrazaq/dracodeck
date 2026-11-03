import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  X,
  FileCode,
  Save,
  Check,
  FileText,
  CornerDownLeft,
  Layout,
  Wand2,
  Terminal,
  Search,
  Replace,
  ChevronUp,
  ChevronDown,
  Copy,
  Scissors,
  ClipboardPaste,
} from "lucide-react";
import { highlightCode, Token } from "./syntaxHighlighter";
import { formatCode } from "./codeFormatter";
import { DracoTooltip } from "../common/DracoTooltip";
import { DracodeLogo } from "../common/DracodeLogo";

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  isDirty?: boolean;
  isPreview?: boolean;
}

function normalizePathKey(p: string): string {
  return String(p || "")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "")
    .toLowerCase();
}

interface EditorPaneProps {
  activeFile?: { path: string; name: string; isPreview?: boolean };
  onActiveFileChange?: (file?: { path: string; name: string; isPreview?: boolean }) => void;
  onLanguageChange?: (lang: string) => void;
  scopedWorkspace?: string | null;
  onExitScope?: () => void;
  isTerminalOpen?: boolean;
  onToggleTerminal?: () => void;
}

const isImageFile = (fileName: string): boolean =>
  /\.(png|jpe?g|gif|webp|svg|ico|bmp|avif)$/i.test(fileName || "");

const RAINBOW_INDENT_STYLES = [
  "bg-[#00e5ff]/[0.07] border-l border-[#00e5ff]/40",
  "bg-[#ff007f]/[0.07] border-l border-[#ff007f]/40",
  "bg-[#ffeb3b]/[0.07] border-l border-[#ffeb3b]/40",
  "bg-[#00e676]/[0.07] border-l border-[#00e676]/40",
  "bg-[#bb86fc]/[0.07] border-l border-[#bb86fc]/40",
  "bg-[#ff8800]/[0.07] border-l border-[#ff8800]/40",
];

function renderRainbowIndent(rawLine: string) {
  if (!rawLine) return null;
  let spaces = 0;
  for (let i = 0; i < rawLine.length; i++) {
    if (rawLine[i] === " ") spaces += 1;
    else if (rawLine[i] === "\t") spaces += 2;
    else break;
  }
  const levels = Math.floor(spaces / 2);
  if (levels <= 0) return null;
  const guides = [];
  for (let lvl = 0; lvl < Math.min(levels, 24); lvl++) {
    const style = RAINBOW_INDENT_STYLES[lvl % RAINBOW_INDENT_STYLES.length];
    guides.push(
      <span
        key={lvl}
        style={{ left: `${lvl * 2}ch`, width: "2ch" }}
        className={`absolute top-0 bottom-0 pointer-events-none ${style}`}
      />
    );
  }
  return <>{guides}</>;
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  activeFile,
  onActiveFileChange,
  onLanguageChange,
  scopedWorkspace,
  onExitScope,
  isTerminalOpen = true,
  onToggleTerminal,
}) => {
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string>("");
  const [imageZoom, setImageZoom] = useState<number>(100);
  const [imageDimensions, setImageDimensions] = useState<{ w: number; h: number } | null>(null);
  const [imageGridBg, setImageGridBg] = useState<boolean>(true);
  const [isSyntaxOn, setIsSyntaxOn] = useState<boolean>(true);
  const [isMinimapOn, setIsMinimapOn] = useState<boolean>(true);
  const [viewportRatio, setViewportRatio] = useState<{ top: number; height: number }>({
    top: 0,
    height: 0.2,
  });

  // Find & Replace State
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Minimap Dragging State
  const isDraggingMinimap = useRef(false);

  const gutterRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activeFile || !activeFile.path) return;

    const targetNorm = normalizePathKey(activeFile.path);
    const wantPreview = activeFile.isPreview !== false;

    const existing = tabs.find((t) => normalizePathKey(t.path) === targetNorm);
    if (existing) {
      if (!wantPreview && existing.isPreview) {
        setTabs((prev) =>
          prev.map((t) =>
            normalizePathKey(t.path) === targetNorm ? { ...t, isPreview: false } : t
          )
        );
      }
      setActiveTabPath(existing.path);
      return;
    }

    let cancelled = false;
    const load = async () => {
      let content = "";
      if (window.dracoAPI?.readFile) {
        try {
          content = await window.dracoAPI.readFile(activeFile.path);
        } catch {
          content = `// Error loading ${activeFile.name}`;
        }
      }
      if (cancelled) return;

      setTabs((prev) => {
        const alreadyInPrev = prev.find((t) => normalizePathKey(t.path) === targetNorm);
        if (alreadyInPrev) {
          if (!wantPreview && alreadyInPrev.isPreview) {
            return prev.map((t) =>
              normalizePathKey(t.path) === targetNorm ? { ...t, isPreview: false } : t
            );
          }
          return prev;
        }

        const newTab: OpenTab = {
          path: activeFile.path,
          name: activeFile.name,
          content,
          isDirty: false,
          isPreview: wantPreview,
        };

        // VS Code Preview Tab replacement: if opening in preview mode and an untouched preview tab exists, replace it in-place
        if (wantPreview) {
          const previewIdx = prev.findIndex((t) => t.isPreview && !t.isDirty);
          if (previewIdx !== -1) {
            const next = [...prev];
            next[previewIdx] = newTab;
            return next;
          }
        }

        return [...prev, newTab];
      });
      setActiveTabPath(activeFile.path);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [activeFile]);

  const currentTab = tabs.find((t) => normalizePathKey(t.path) === normalizePathKey(activeTabPath));

  // Load Image Preview source when active tab is an image file
  useEffect(() => {
    if (!currentTab || !isImageFile(currentTab.name)) {
      setImagePreviewSrc("");
      setImageDimensions(null);
      return;
    }
    setImageZoom(100);
    setImageDimensions(null);
    let cancelled = false;
    const loadImg = async () => {
      if (window.dracoAPI?.readImageBase64) {
        try {
          const dataUrl = await window.dracoAPI.readImageBase64(currentTab.path);
          if (!cancelled && dataUrl) {
            setImagePreviewSrc(dataUrl);
            return;
          }
        } catch {}
      }
      // Instant fallback via Vite /@fs/ dev server or file:// protocol
      const normalized = currentTab.path.replace(/\\/g, "/");
      const fallbackUrl = window.location.protocol.startsWith("http")
        ? `/@fs/${normalized.startsWith("/") ? normalized.slice(1) : normalized}`
        : `file:///${normalized}`;
      if (!cancelled) {
        setImagePreviewSrc(fallbackUrl);
      }
    };
    loadImg();
    return () => {
      cancelled = true;
    };
  }, [currentTab?.path, currentTab?.name]);

  // Broadcast live code content for real-time Problems tab & listen for jump-to-line
  useEffect(() => {
    if (!currentTab || isImageFile(currentTab.name)) {
      window.dispatchEvent(
        new CustomEvent("dracode:editor-diagnostics", {
          detail: { path: "", name: "", content: "" },
        })
      );
      return;
    }
    const timer = setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("dracode:editor-diagnostics", {
          detail: {
            path: currentTab.path,
            name: currentTab.name,
            content: currentTab.content,
          },
        })
      );
    }, 180);
    return () => clearTimeout(timer);
  }, [currentTab?.path, currentTab?.name, currentTab?.content]);

  useEffect(() => {
    const handleJump = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !textareaRef.current || !currentTab) return;
      const targetLine = Math.max(1, detail.line || 1);
      const allLines = currentTab.content.split("\n");
      let charPos = 0;
      for (let i = 0; i < Math.min(targetLine - 1, allLines.length); i++) {
        charPos += allLines[i].length + 1;
      }
      const lineLen = allLines[targetLine - 1]?.length || 0;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(charPos, charPos + lineLen);
      const targetScroll = Math.max(0, (targetLine - 1) * 20 - textareaRef.current.clientHeight / 2);
      textareaRef.current.scrollTo({ top: targetScroll, behavior: "smooth" });
    };
    window.addEventListener("dracode:jump-to-line", handleJump);
    return () => window.removeEventListener("dracode:jump-to-line", handleJump);
  }, [currentTab]);

  // Update active language for BottomBar
  useEffect(() => {
    if (currentTab && onLanguageChange) {
      const ext = currentTab.name.split(".").pop()?.toUpperCase() || "PLAINTEXT";
      onLanguageChange(ext === "MD" ? "Markdown" : ext);
    } else if (!currentTab && onLanguageChange) {
      onLanguageChange("DRACODE");
    }
  }, [currentTab, onLanguageChange]);

  const handleContentChange = (newContent: string) => {
    const activeNorm = normalizePathKey(activeTabPath);
    setTabs((prev) =>
      prev.map((t) =>
        normalizePathKey(t.path) === activeNorm
          ? { ...t, content: newContent, isDirty: true, isPreview: false }
          : t
      )
    );
  };

  const pinTab = (path: string) => {
    const norm = normalizePathKey(path);
    setTabs((prev) =>
      prev.map((t) => (normalizePathKey(t.path) === norm ? { ...t, isPreview: false } : t))
    );
  };

  const handleFormat = () => {
    if (!currentTab) return;
    const formatted = formatCode(currentTab.content, currentTab.name);
    if (formatted !== currentTab.content) {
      handleContentChange(formatted);
      setSaveStatus("FORMATTED");
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };

  const handleSave = async () => {
    if (!currentTab) return;
    if (window.dracoAPI?.writeFile) {
      try {
        await window.dracoAPI.writeFile(currentTab.path, currentTab.content);
        const activeNorm = normalizePathKey(activeTabPath);
        setTabs((prev) =>
          prev.map((t) =>
            normalizePathKey(t.path) === activeNorm ? { ...t, isDirty: false } : t
          )
        );
        setSaveStatus("SAVED");
        setTimeout(() => setSaveStatus(null), 2000);
      } catch (err) {
        console.error("Failed to save file:", err);
      }
    }
  };

  const closeTab = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const targetNorm = normalizePathKey(path);
    const filtered = tabs.filter((t) => normalizePathKey(t.path) !== targetNorm);
    setTabs(filtered);

    if (filtered.length === 0) {
      setActiveTabPath("");
      onActiveFileChange?.(undefined);
    } else if (normalizePathKey(activeTabPath) === targetNorm) {
      const nextTab = filtered[filtered.length - 1];
      setActiveTabPath(nextTab.path);
      onActiveFileChange?.({ path: nextTab.path, name: nextTab.name });
    }
  };

  const closeAllTabs = () => {
    setTabs([]);
    setActiveTabPath("");
    onActiveFileChange?.(undefined);
  };

  const lines = currentTab && !isImageFile(currentTab.name) ? currentTab.content.split("\n") : [];

  // Syntax highlighting memoization
  const tokenizedLines = useMemo(() => {
    if (!currentTab || isImageFile(currentTab.name)) return [];
    return highlightCode(currentTab.content, currentTab.name);
  }, [currentTab?.content, currentTab?.name]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft, scrollHeight, clientHeight } = e.currentTarget;
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }

    // Update minimap viewport slider
    if (scrollHeight > clientHeight) {
      const top = scrollTop / scrollHeight;
      const height = clientHeight / scrollHeight;
      setViewportRatio({ top, height });
    }
  };

  // Minimap Dragging & Smooth Scrolling Handlers
  const scrollToMinimapY = useCallback(
    (clientY: number, smooth: boolean = false) => {
      if (!textareaRef.current || !minimapRef.current) return;
      const rect = minimapRef.current.getBoundingClientRect();
      const clickY = clientY - rect.top;
      const ratio = Math.max(0, Math.min(1, clickY / rect.height));
      const maxScroll = textareaRef.current.scrollHeight - textareaRef.current.clientHeight;
      const targetScroll = ratio * maxScroll;

      if (smooth) {
        textareaRef.current.scrollTo({ top: Math.max(0, targetScroll), behavior: "smooth" });
      } else {
        textareaRef.current.scrollTop = Math.max(0, targetScroll);
      }
    },
    []
  );

  const handleMinimapMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingMinimap.current = true;
    scrollToMinimapY(e.clientY, true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingMinimap.current) return;
      scrollToMinimapY(moveEvent.clientY, false);
    };

    const onMouseUp = () => {
      isDraggingMinimap.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Find & Replace Logic
  const matches = useMemo(() => {
    if (!findQuery || !currentTab) return [];
    const text = currentTab.content;
    const results: { start: number; end: number }[] = [];

    try {
      if (useRegex) {
        const flags = matchCase ? "g" : "gi";
        const re = new RegExp(findQuery, flags);
        let match;
        while ((match = re.exec(text)) !== null) {
          results.push({ start: match.index, end: match.index + match[0].length });
          if (!re.global) break;
        }
      } else {
        const query = matchCase ? findQuery : findQuery.toLowerCase();
        const src = matchCase ? text : text.toLowerCase();
        let idx = 0;
        while ((idx = src.indexOf(query, idx)) !== -1) {
          results.push({ start: idx, end: idx + query.length });
          idx += query.length;
        }
      }
    } catch {
      // Invalid regex, ignore safely
    }

    return results;
  }, [findQuery, currentTab?.content, matchCase, useRegex]);

  const scrollToMatch = (idx: number) => {
    if (!textareaRef.current || matches.length === 0) return;
    const boundedIdx = (idx + matches.length) % matches.length;
    setCurrentMatchIdx(boundedIdx);
    const m = matches[boundedIdx];

    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(m.start, m.end);

    // Calculate approx line scroll
    const textBefore = currentTab?.content.substring(0, m.start) || "";
    const lineIndex = textBefore.split("\n").length - 1;
    const approxLineHeight = 20;
    const targetScroll = Math.max(0, lineIndex * approxLineHeight - textareaRef.current.clientHeight / 2);
    textareaRef.current.scrollTo({ top: targetScroll, behavior: "smooth" });
  };

  const handleNextMatch = () => scrollToMatch(currentMatchIdx + 1);
  const handlePrevMatch = () => scrollToMatch(currentMatchIdx - 1);

  const handleReplaceCurrent = () => {
    if (!currentTab || matches.length === 0) return;
    const m = matches[currentMatchIdx];
    const before = currentTab.content.substring(0, m.start);
    const after = currentTab.content.substring(m.end);
    const updated = before + replaceQuery + after;
    handleContentChange(updated);
  };

  const handleReplaceAll = () => {
    if (!currentTab || matches.length === 0) return;
    let updated = "";
    if (useRegex) {
      try {
        const flags = matchCase ? "g" : "gi";
        const re = new RegExp(findQuery, flags);
        updated = currentTab.content.replace(re, replaceQuery);
      } catch {
        return;
      }
    } else {
      if (matchCase) {
        updated = currentTab.content.split(findQuery).join(replaceQuery);
      } else {
        const re = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
        updated = currentTab.content.replace(re, replaceQuery);
      }
    }
    handleContentChange(updated);
  };

  // Global Keyboard Shortcuts (Ctrl+F, Ctrl+H, Ctrl+S, Ctrl+`)
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
      e.preventDefault();
      setIsFindOpen(true);
      setIsReplaceMode(false);
      setTimeout(() => findInputRef.current?.focus(), 50);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "h") {
      e.preventDefault();
      setIsFindOpen(true);
      setIsReplaceMode(true);
      setTimeout(() => findInputRef.current?.focus(), 50);
    } else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "`") {
      e.preventDefault();
      onToggleTerminal?.();
    }
  };

  // Context Menu Handlers
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleCut = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = textareaRef.current.value.substring(start, end);
    if (selected) {
      navigator.clipboard.writeText(selected);
      const updated =
        textareaRef.current.value.substring(0, start) + textareaRef.current.value.substring(end);
      handleContentChange(updated);
    }
    setContextMenu(null);
  };

  const handleCopy = () => {
    if (!textareaRef.current) return;
    const selected = textareaRef.current.value.substring(
      textareaRef.current.selectionStart,
      textareaRef.current.selectionEnd
    );
    if (selected) {
      navigator.clipboard.writeText(selected);
    }
    setContextMenu(null);
  };

  const handlePaste = async () => {
    if (!textareaRef.current) return;
    try {
      const text = await navigator.clipboard.readText();
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const updated =
        textareaRef.current.value.substring(0, start) + text + textareaRef.current.value.substring(end);
      handleContentChange(updated);
    } catch {
      // Ignore
    }
    setContextMenu(null);
  };

  const handleSelectAll = () => {
    if (!textareaRef.current) return;
    textareaRef.current.focus();
    textareaRef.current.select();
    setContextMenu(null);
  };

  const handleDuplicateLine = () => {
    if (!currentTab || !textareaRef.current) return;
    const pos = textareaRef.current.selectionStart ?? 0;
    const allLines = currentTab.content.split("\n");
    const lineIdx = currentTab.content.slice(0, pos).split("\n").length - 1;
    const targetLine = allLines[lineIdx] ?? "";
    allLines.splice(lineIdx + 1, 0, targetLine);
    handleContentChange(allLines.join("\n"));
  };

  const handleDeleteLine = () => {
    if (!currentTab || !textareaRef.current) return;
    const pos = textareaRef.current.selectionStart ?? 0;
    const allLines = currentTab.content.split("\n");
    const lineIdx = currentTab.content.slice(0, pos).split("\n").length - 1;
    allLines.splice(lineIdx, 1);
    handleContentChange(allLines.join("\n"));
  };

  // Global TopBar Menu Command Listener ("dracode:editor-cmd")
  useEffect(() => {
    const onCommand = (e: Event) => {
      const custom = e as CustomEvent<{ action: string }>;
      const action = custom.detail?.action;
      if (!action) return;

      switch (action) {
        case "save":
          handleSave();
          break;
        case "format":
          handleFormat();
          break;
        case "find":
          setIsFindOpen(true);
          setIsReplaceMode(false);
          setTimeout(() => findInputRef.current?.focus(), 50);
          break;
        case "replace":
          setIsFindOpen(true);
          setIsReplaceMode(true);
          setTimeout(() => findInputRef.current?.focus(), 50);
          break;
        case "close-tab":
          if (activeTabPath) {
            const targetNorm = normalizePathKey(activeTabPath);
            const filtered = tabs.filter((t) => normalizePathKey(t.path) !== targetNorm);
            setTabs(filtered);
            if (filtered.length === 0) {
              setActiveTabPath("");
              onActiveFileChange?.(undefined);
            } else {
              const nextTab = filtered[filtered.length - 1];
              setActiveTabPath(nextTab.path);
              onActiveFileChange?.({ path: nextTab.path, name: nextTab.name });
            }
          }
          break;
        case "close-all":
          closeAllTabs();
          break;
        case "toggle-minimap":
          setIsMinimapOn((p) => !p);
          break;
        case "toggle-syntax":
          setIsSyntaxOn((p) => !p);
          break;
        case "select-all":
          handleSelectAll();
          break;
        case "cut":
          handleCut();
          break;
        case "copy":
          handleCopy();
          break;
        case "paste":
          handlePaste();
          break;
        case "undo":
          textareaRef.current?.focus();
          document.execCommand("undo");
          break;
        case "redo":
          textareaRef.current?.focus();
          document.execCommand("redo");
          break;
        case "duplicate-line":
          handleDuplicateLine();
          break;
        case "delete-line":
          handleDeleteLine();
          break;
      }
    };

    window.addEventListener("dracode:editor-cmd", onCommand);
    return () => window.removeEventListener("dracode:editor-cmd", onCommand);
  });

  const renderToken = (tok: Token, idx: number) => {
    switch (tok.type) {
      case "kw-control":
        return <span key={idx} className="text-[#00e676] font-bold">{tok.value}</span>;
      case "kw-decl":
        return <span key={idx} className="text-[#00e5ff] font-semibold">{tok.value}</span>;
      case "type":
        return <span key={idx} className="text-[#38bdf8] font-medium">{tok.value}</span>;
      case "fn-def":
        return <span key={idx} className="text-[#ff007f] font-bold">{tok.value}</span>;
      case "fn-call":
        return <span key={idx} className="text-[#f43f5e]">{tok.value}</span>;
      case "prop":
        return <span key={idx} className="text-[#c084fc]">{tok.value}</span>;
      case "str":
        return <span key={idx} className="text-[#ffb74d]">{tok.value}</span>;
      case "template":
        return <span key={idx} className="text-[#ffcc80]">{tok.value}</span>;
      case "num":
        return <span key={idx} className="text-[#ff9100]">{tok.value}</span>;
      case "bool":
        return <span key={idx} className="text-[#ffd600] font-bold">{tok.value}</span>;
      case "operator":
        return <span key={idx} className="text-[#a3e635]">{tok.value}</span>;
      case "punct":
        return <span key={idx} className="text-[#94a3b8]">{tok.value}</span>;
      case "decorator":
        return <span key={idx} className="text-[#e879f9] italic">{tok.value}</span>;
      case "tag":
        return <span key={idx} className="text-[#ff1744] font-semibold">{tok.value}</span>;
      case "attr":
        return <span key={idx} className="text-[#22d3ee]">{tok.value}</span>;
      case "cmt":
        return <span key={idx} className="text-[#64748b] italic">{tok.value}</span>;
      case "heading":
        return <span key={idx} className="text-[#00e5ff] font-bold">{tok.value}</span>;
      case "md-code":
        return <span key={idx} className="text-[#ff007f] font-semibold">{tok.value}</span>;
      default:
        return <span key={idx} className="text-[#cbd5e1]">{tok.value}</span>;
    }
  };

  const scopedFolderName = scopedWorkspace
    ? scopedWorkspace.split(/[/\\]/).filter(Boolean).pop()
    : null;

  return (
    <div
      onClick={() => setContextMenu(null)}
      className="h-full bg-[#0b0813] flex flex-col overflow-hidden font-mono text-xs relative select-none"
    >
      {/* Subfolder Scoping Banner (When scoped) */}
      {scopedWorkspace && (
        <div className="h-6 bg-[#281b3d] border-b border-[#ff007f]/50 px-3 flex items-center justify-between text-[11px] select-none text-[#00e5ff]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff007f] animate-pulse" />
            <span className="font-bold tracking-wide">
              ISOLATED SCOPE: <span className="text-[#e2e8f0]">{scopedFolderName}</span>
            </span>
            <span className="text-[10px] text-[#7a7194] hidden sm:inline">({scopedWorkspace})</span>
          </div>
          {onExitScope && (
            <button
              onClick={onExitScope}
              className="flex items-center gap-1 text-[10px] bg-[#ff007f] hover:bg-[#e0007b] text-white px-2 py-0.5 font-bold transition-colors cursor-pointer"
            >
              <CornerDownLeft className="w-3 h-3" />
              <span>EXIT SCOPE</span>
            </button>
          )}
        </div>
      )}

      {/* Dracode Editor Tab Bar */}
      <div className="h-8 min-h-[32px] max-h-8 flex-shrink-0 bg-[#120c1f] border-b border-[#261d38] flex items-center justify-between select-none relative z-20 overflow-hidden">

        {/* Scrollable Tabs Container (Horizontal Wheel Synced, Vertical Wheel Converted) */}
        <div
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
          className="flex-1 h-full flex items-center overflow-x-auto overflow-y-hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {tabs.map((tab) => {
            const isActive = normalizePathKey(tab.path) === normalizePathKey(activeTabPath);
            const isMarkdown = tab.name.endsWith(".md");
            const isPreviewTab = !!tab.isPreview && !tab.isDirty;
            return (
              <div
                key={normalizePathKey(tab.path)}
                onClick={() => {
                  setActiveTabPath(tab.path);
                  onActiveFileChange?.({ path: tab.path, name: tab.name, isPreview: tab.isPreview });
                }}
                onDoubleClick={() => pinTab(tab.path)}
                title={
                  isPreviewTab
                    ? `${tab.name} — Preview Mode (Double-click or edit to pin)`
                    : tab.path
                }
                className={`h-full flex items-center gap-2 px-3 border-r border-[#261d38] text-xs font-mono cursor-pointer transition-colors max-w-xs truncate flex-shrink-0 ${
                  isActive
                    ? isPreviewTab
                      ? "bg-[#0b0813] text-[#cbd5e1] border-t-2 border-t-[#00e5ff] italic"
                      : "bg-[#0b0813] text-[#e2e8f0] border-t-2 border-t-[#ff007f] font-semibold"
                    : isPreviewTab
                    ? "bg-[#120c1f] text-[#7a7194] italic hover:bg-[#161026] hover:text-[#cbd5e1]"
                    : "bg-[#120c1f] text-[#7a7194] hover:bg-[#161026] hover:text-[#cbd5e1]"
                }`}
              >
                {isMarkdown ? (
                  <FileText className="w-3.5 h-3.5 text-[#ff8800] flex-shrink-0" />
                ) : (
                  <FileCode className="w-3.5 h-3.5 text-[#00e5ff] flex-shrink-0" />
                )}
                <span className="truncate">{tab.name}</span>
                {isPreviewTab && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      pinTab(tab.path);
                    }}
                    className="text-[8px] not-italic px-1 py-0.2 bg-[#161026] border border-[#00e5ff]/40 text-[#00e5ff] hover:bg-[#00e5ff] hover:text-[#0b0813] font-bold uppercase flex-shrink-0"
                    title="Preview Mode — Click or edit to pin tab"
                  >
                    PREVIEW
                  </span>
                )}
                {tab.isDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff007f] animate-pulse flex-shrink-0" />
                )}
                <button
                  onClick={(e) => closeTab(e, tab.path)}
                  className="hover:text-[#ff1744] hover:bg-[#261d38] p-0.5 cursor-pointer flex-shrink-0"
                  title="Close Tab"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {tabs.length > 1 && (
            <button
              onClick={closeAllTabs}
              className="px-2 h-full text-[9px] font-bold text-[#7a7194] hover:text-[#ff1744] hover:bg-[#161026] border-r border-[#261d38] flex-shrink-0 cursor-pointer"
              title="Close All Open Tabs"
            >
              CLOSE ALL
            </button>
          )}
        </div>

        {/* Toolbar Toggles: Format, Minimap, Syntax, Terminal, Save */}
        <div className="flex-shrink-0 h-full flex items-center gap-1.5 px-2 bg-[#120c1f] border-l border-[#261d38] overflow-hidden">
          <DracoTooltip content="Find & Replace" shortcut="Ctrl+H" position="bottom" accent="cyan">
            <button
              onClick={() => {
                setIsFindOpen(!isFindOpen);
                setIsReplaceMode(true);
              }}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 border bg-[#161026] hover:bg-[#281b3d] text-[#00e5ff] border-[#261d38] hover:border-[#00e5ff]/50 transition-colors cursor-pointer"
            >
              <Search className="w-3 h-3 text-[#00e5ff]" />
              <span className="hidden sm:inline">FIND</span>
            </button>
          </DracoTooltip>

          <DracoTooltip content={isMinimapOn ? "Hide Code Minimap" : "Show Code Minimap"} position="bottom" accent="pink">
            <button
              onClick={() => setIsMinimapOn(!isMinimapOn)}
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 border transition-colors cursor-pointer ${
                isMinimapOn
                  ? "bg-[#281b3d] text-[#ff007f] border-[#ff007f]/50"
                  : "bg-[#161026] text-[#7a7194] border-[#261d38]"
              }`}
            >
              <Layout className="w-3 h-3 text-[#ff007f]" />
              <span className="hidden sm:inline">MINIMAP</span>
            </button>
          </DracoTooltip>

          {/* Integrated Terminal Toggle Button */}
          {onToggleTerminal && (
            <DracoTooltip
              content={isTerminalOpen ? "Collapse Integrated Terminal (Expand Editor to 100%)" : "Open Integrated Terminal"}
              shortcut="Ctrl+`"
              position="bottom"
              accent="amber"
            >
              <button
                onClick={onToggleTerminal}
                className={`flex items-center gap-1 text-[10px] px-2 py-0.5 border transition-colors cursor-pointer ${
                  isTerminalOpen
                    ? "bg-[#281b3d] text-[#ff8800] border-[#ff8800]/50"
                    : "bg-[#161026] text-[#7a7194] border-[#261d38] hover:text-[#e2e8f0]"
                }`}
              >
                <Terminal className="w-3 h-3 text-[#ff8800]" />
                <span>TERM</span>{isTerminalOpen ? <ChevronDown className="w-3 h-3 text-[#ff8800]" /> : <ChevronUp className="w-3 h-3 text-[#ff8800]" />}
              </button>
            </DracoTooltip>
          )}

          {/* Save button if dirty */}
          {currentTab && currentTab.isDirty && (
            <DracoTooltip content="Save Active File" shortcut="Ctrl+S" position="bottom" accent="pink">
              <button
                onClick={handleSave}
                className="flex items-center gap-1 text-[10px] bg-[#ff007f]/20 hover:bg-[#ff007f] text-[#ff007f] hover:text-white px-2 py-0.5 border border-[#ff007f] transition-colors cursor-pointer"
              >
                <Save className="w-3 h-3" />
                <span>SAVE</span>
              </button>
            </DracoTooltip>
          )}

          {saveStatus && (
            <span className="text-[10px] text-[#00e676] flex items-center gap-1 font-semibold">
              <Check className="w-3 h-3" />
              <span>SAVED</span>
            </span>
          )}
        </div>
      </div>

      {/* Floating Cyberdeck Find & Replace Bar */}
      {isFindOpen && (
        <div className="absolute top-10 right-4 z-40 bg-[#120c1f] border border-[#ff007f]/50 shadow-[0_10px_30px_rgba(0,0,0,0.9)] p-2.5 rounded-xs flex flex-col gap-2 w-80 text-xs backdrop-blur-md">
          {/* Find Row */}
          <div className="flex items-center gap-1.5">
            <div className="flex-1 bg-[#0b0813] border border-[#261d38] focus-within:border-[#00e5ff] px-2 py-1 flex items-center gap-1">
              <Search className="w-3 h-3 text-[#00e5ff]" />
              <input
                ref={findInputRef}
                type="text"
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.shiftKey ? handlePrevMatch() : handleNextMatch();
                  } else if (e.key === "Escape") {
                    setIsFindOpen(false);
                  }
                }}
                placeholder="Find in file..."
                className="w-full bg-transparent text-[#e2e8f0] outline-none text-[11px] font-mono"
              />
            </div>

            {/* Case Sensitive & Regex Toggles */}
            <button
              onClick={() => setMatchCase(!matchCase)}
              className={`px-1.5 py-0.5 border text-[10px] font-bold cursor-pointer transition-colors ${
                matchCase ? "bg-[#ff007f]/20 text-[#ff007f] border-[#ff007f]" : "bg-[#161026] text-[#7a7194] border-[#261d38]"
              }`}
              title="Match Case"
            >
              Aa
            </button>
            <button
              onClick={() => setUseRegex(!useRegex)}
              className={`px-1.5 py-0.5 border text-[10px] font-bold cursor-pointer transition-colors ${
                useRegex ? "bg-[#00e5ff]/20 text-[#00e5ff] border-[#00e5ff]" : "bg-[#161026] text-[#7a7194] border-[#261d38]"
              }`}
              title="Use Regular Expression"
            >
              .*
            </button>

            {/* Match Counter & Prev/Next */}
            <span className="text-[10px] text-[#7a7194] min-w-[50px] text-center">
              {matches.length > 0 ? `${currentMatchIdx + 1} of ${matches.length}` : findQuery ? "0 results" : ""}
            </span>

            <button
              onClick={handlePrevMatch}
              disabled={matches.length === 0}
              className="p-1 hover:bg-[#281b3d] text-[#cbd5e1] disabled:opacity-30 cursor-pointer"
              title="Previous Match (Shift+Enter)"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNextMatch}
              disabled={matches.length === 0}
              className="p-1 hover:bg-[#281b3d] text-[#cbd5e1] disabled:opacity-30 cursor-pointer"
              title="Next Match (Enter)"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsFindOpen(false)}
              className="p-1 hover:bg-[#281b3d] text-[#ff1744] cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Replace Row */}
          {isReplaceMode && (
            <div className="flex items-center gap-1.5">
              <div className="flex-1 bg-[#0b0813] border border-[#261d38] focus-within:border-[#ff007f] px-2 py-1 flex items-center gap-1">
                <Replace className="w-3 h-3 text-[#ff007f]" />
                <input
                  type="text"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleReplaceCurrent();
                  }}
                  placeholder="Replace with..."
                  className="w-full bg-transparent text-[#e2e8f0] outline-none text-[11px] font-mono"
                />
              </div>

              <button
                onClick={handleReplaceCurrent}
                disabled={matches.length === 0}
                className="px-2 py-1 bg-[#161026] hover:bg-[#281b3d] text-[#00e676] border border-[#261d38] text-[10px] font-bold disabled:opacity-30 cursor-pointer"
              >
                Replace
              </button>
              <button
                onClick={handleReplaceAll}
                disabled={matches.length === 0}
                className="px-2 py-1 bg-[#161026] hover:bg-[#281b3d] text-[#ff007f] border border-[#261d38] text-[10px] font-bold disabled:opacity-30 cursor-pointer"
              >
                All
              </button>
            </div>
          )}
        </div>
      )}

      {/* Code Editor Body */}
      <div className="flex-1 bg-[#0b0813] flex overflow-hidden">
        {currentTab ? (
          isImageFile(currentTab.name) ? (
            <div className="flex-1 flex flex-col bg-[#0b0813] overflow-hidden select-none">
              {/* Image Preview Toolbar */}
              <div className="h-8 bg-[#1c1c24] border-b border-[#2d2d3a] px-3 flex items-center justify-between text-[11px] text-[#cbd5e1]">
                <div className="flex items-center gap-3 truncate">
                  <span className="text-[#00e5ff] font-bold uppercase">IMAGE PREVIEW</span>
                  <span className="text-[#94a3b8] truncate">{currentTab.path}</span>
                  {imageDimensions && (
                    <span className="px-1.5 py-0.5 bg-[#121218] border border-[#2d2d3a] text-[#00e676] text-[10px] font-bold rounded-xs">
                      {imageDimensions.w} x {imageDimensions.h} px
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setImageGridBg((p) => !p)}
                    className={`px-2 py-0.5 border text-[10px] font-semibold rounded-xs cursor-pointer transition-colors ${
                      imageGridBg
                        ? "bg-[#2d2d3a] text-[#00e5ff] border-[#00e5ff]/40"
                        : "bg-[#121218] text-[#94a3b8] border-[#2d2d3a]"
                    }`}
                  >
                    GRID BG
                  </button>
                  <button
                    onClick={() => setImageZoom((z) => Math.max(20, z - 25))}
                    className="px-2 py-0.5 bg-[#121218] hover:bg-[#2d2d3a] border border-[#2d2d3a] text-[#e2e8f0] rounded-xs cursor-pointer font-bold"
                  >
                    -
                  </button>
                  <button
                    onClick={() => setImageZoom(100)}
                    className="px-2 py-0.5 bg-[#121218] hover:bg-[#2d2d3a] border border-[#2d2d3a] text-[#00e5ff] text-[10px] font-bold rounded-xs cursor-pointer min-w-[48px] text-center"
                  >
                    {imageZoom}%
                  </button>
                  <button
                    onClick={() => setImageZoom((z) => Math.min(400, z + 25))}
                    className="px-2 py-0.5 bg-[#121218] hover:bg-[#2d2d3a] border border-[#2d2d3a] text-[#e2e8f0] rounded-xs cursor-pointer font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Image Preview Canvas */}
              <div
                onWheel={(e) => {
                  if (e.ctrlKey) {
                    e.preventDefault();
                    setImageZoom((z) =>
                      e.deltaY < 0 ? Math.min(400, z + 15) : Math.max(20, z - 15)
                    );
                  }
                }}
                style={
                  imageGridBg
                    ? {
                        backgroundImage:
                          "linear-gradient(45deg, #16161e 25%, transparent 25%), linear-gradient(-45deg, #16161e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #16161e 75%), linear-gradient(-45deg, transparent 75%, #16161e 75%)",
                        backgroundSize: "20px 20px",
                        backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                      }
                    : undefined
                }
                className="flex-1 overflow-auto flex items-center justify-center p-6 bg-[#0b0813]"
              >
                {imagePreviewSrc ? (
                  <img
                    src={imagePreviewSrc}
                    alt={currentTab.name}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setImageDimensions({ w: img.naturalWidth, h: img.naturalHeight });
                    }}
                    style={{
                      transform: `scale(${imageZoom / 100})`,
                      transformOrigin: "center center",
                    }}
                    className="max-w-full max-h-full object-contain shadow-[0_12px_40px_rgba(0,0,0,0.85)] border border-[#2d2d3a] transition-transform duration-100"
                  />
                ) : (
                  <span className="text-[#7a7194] text-xs">Loading image preview...</span>
                )}
              </div>
            </div>
          ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Dark Gray Line Numbers Gutter with Brighter Text */}
            <div
              ref={gutterRef}
              className="w-12 bg-[#1c1c24] text-[#a1a1b5] select-none text-right pr-2.5 pt-3 border-r border-[#2d2d3a] font-mono overflow-hidden"
            >
              {lines.map((_, i) => (
                <div key={i} className="h-5 leading-5 text-[11px] hover:text-[#e2e8f0]">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Synchronized Editor Canvas */}
            <div
              onContextMenu={handleContextMenu}
              className="flex-1 relative overflow-hidden bg-[#0b0813]"
            >
              {/* Syntax Highlighted Underlay + Rainbow Indent */}
              {isSyntaxOn && (
                <pre
                  ref={preRef}
                  aria-hidden="true"
                  className="absolute inset-0 p-3 pt-3 font-mono text-[11px] leading-5 pointer-events-none select-none overflow-hidden whitespace-pre m-0 border-none bg-transparent"
                >
                  {tokenizedLines.map((lineTokens, lineIdx) => (
                    <div key={lineIdx} className="h-5 leading-5 relative">
                      {renderRainbowIndent(lines[lineIdx] || "")}
                      {lineTokens.length === 0 ? " " : lineTokens.map((tok, tokIdx) => renderToken(tok, tokIdx))}
                    </div>
                  ))}
                </pre>
              )}

              {/* Textarea Overlay */}
              <textarea
                ref={textareaRef}
                value={currentTab.content}
                onChange={(e) => handleContentChange(e.target.value)}
                onScroll={handleScroll}
                onKeyDown={handleEditorKeyDown}
                spellCheck={false}
                className={`absolute inset-0 p-3 pt-3 font-mono text-[11px] leading-5 resize-none outline-none overflow-auto border-none whitespace-pre selection:bg-[#ff007f]/35 selection:text-white ${
                  isSyntaxOn
                    ? "bg-transparent text-transparent caret-[#ff007f]"
                    : "bg-[#0b0813] text-[#cbd5e1] caret-[#00e5ff]"
                }`}
              />
            </div>

            {/* Interactive VS Code Style Minimap with Drag & Smooth Scroll */}
            {isMinimapOn && (
              <DracoTooltip content="Minimap Viewport Scrubber (Drag or Click to Scroll)" position="left" accent="pink">
                <div
                  ref={minimapRef}
                  onMouseDown={handleMinimapMouseDown}
                  className="w-16 bg-[#0c0817] border-l border-[#261d38] relative overflow-hidden cursor-pointer select-none p-1 font-mono hidden md:block hover:bg-[#120c1f] transition-colors"
                >
                  {/* Viewport Scrubber Slider Box */}
                  <div
                    style={{
                      top: `${viewportRatio.top * 100}%`,
                      height: `${Math.max(10, viewportRatio.height * 100)}%`,
                    }}
                    className="absolute left-0 right-0 bg-[#00e5ff]/15 border-y-2 border-[#00e5ff]/70 shadow-[0_0_10px_rgba(0,229,255,0.3)] pointer-events-none transition-all duration-75"
                  />

                  {/* Micro Code Representation */}
                  <div className="space-y-[1px] opacity-40 leading-none">
                    {lines.slice(0, 100).map((l, i) => (
                      <div
                        key={i}
                        style={{ width: `${Math.min(100, Math.max(15, l.length * 2))}%` }}
                        className={`h-[2px] rounded-xs ${
                          l.trim().startsWith("//") || l.trim().startsWith("#")
                            ? "bg-[#64748b]"
                            : l.includes("function") || l.includes("const")
                            ? "bg-[#00e5ff]"
                            : l.includes("import") || l.includes("export")
                            ? "bg-[#00e676]"
                            : "bg-[#7a7194]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </DracoTooltip>
            )}
          </div>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#090610] text-[#7a7194] p-6 select-none relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#261d3833_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            <div className="relative z-10 max-w-md w-full bg-[#120c1f]/90 border border-[#261d38] p-6 flex flex-col items-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
              <div className="p-3 bg-[#0b0813] border border-[#ff007f]/40 mb-3">
                <DracodeLogo size={56} glow={true} />
              </div>
              <h2 className="text-base font-bold text-[#e2e8f0] tracking-wider">
                DRACODE // CODE STUDIO
              </h2>
              <p className="text-[11px] text-[#7a7194] mt-1 mb-4">
                Zero forced files. Select any source file from the{" "}
                <span className="text-[#00e5ff] font-bold">EXPLORER</span>,{" "}
                <span className="text-[#00e676] font-bold">GIT</span>, or{" "}
                <span className="text-[#ff007f] font-bold">AGENT</span> sidebar to begin editing.
              </p>

              <div className="w-full space-y-1.5 text-[10px] border-t border-[#261d38] pt-3 text-left">
                <div className="flex items-center justify-between bg-[#0b0813] px-2.5 py-1 border border-[#261d38]">
                  <span className="text-[#cbd5e1]">Save Active File</span>
                  <kbd className="text-[#ff007f] font-bold">Ctrl + S</kbd>
                </div>
                <div className="flex items-center justify-between bg-[#0b0813] px-2.5 py-1 border border-[#261d38]">
                  <span className="text-[#cbd5e1]">Find & Replace Matrix</span>
                  <kbd className="text-[#00e5ff] font-bold">Ctrl + H</kbd>
                </div>
                <div className="flex items-center justify-between bg-[#0b0813] px-2.5 py-1 border border-[#261d38]">
                  <span className="text-[#cbd5e1]">Auto-Format Code</span>
                  <kbd className="text-[#00e676] font-bold">Shift + Alt + F</kbd>
                </div>
                <div className="flex items-center justify-between bg-[#0b0813] px-2.5 py-1 border border-[#261d38]">
                  <span className="text-[#cbd5e1]">Toggle ConPTY Terminal</span>
                  <kbd className="text-[#ff8800] font-bold">Ctrl + `</kbd>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cyberdeck Right-Click Context Menu */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-56 bg-[#120c1f] border border-[#ff007f]/50 shadow-[0_15px_45px_rgba(0,0,0,0.9)] py-1.5 text-xs font-mono select-none"
        >
          <div
            onClick={handleCut}
            className="px-3 py-1.5 hover:bg-[#281b3d] hover:text-[#ff007f] cursor-pointer flex items-center justify-between text-[#cbd5e1]"
          >
            <span className="flex items-center gap-2">
              <Scissors className="w-3.5 h-3.5 text-[#ff007f]" />
              <span>Cut</span>
            </span>
            <span className="text-[10px] text-[#7a7194]">Ctrl+X</span>
          </div>
          <div
            onClick={handleCopy}
            className="px-3 py-1.5 hover:bg-[#281b3d] hover:text-[#00e5ff] cursor-pointer flex items-center justify-between text-[#cbd5e1]"
          >
            <span className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>Copy</span>
            </span>
            <span className="text-[10px] text-[#7a7194]">Ctrl+C</span>
          </div>
          <div
            onClick={handlePaste}
            className="px-3 py-1.5 hover:bg-[#281b3d] hover:text-[#00e676] cursor-pointer flex items-center justify-between text-[#cbd5e1]"
          >
            <span className="flex items-center gap-2">
              <ClipboardPaste className="w-3.5 h-3.5 text-[#00e676]" />
              <span>Paste</span>
            </span>
            <span className="text-[10px] text-[#7a7194]">Ctrl+V</span>
          </div>
          <div
            onClick={handleSelectAll}
            className="px-3 py-1.5 hover:bg-[#281b3d] hover:text-white cursor-pointer flex items-center justify-between text-[#cbd5e1]"
          >
            <span>Select All</span>
            <span className="text-[10px] text-[#7a7194]">Ctrl+A</span>
          </div>

          <div className="my-1 border-t border-[#261d38]" />

          <div
            onClick={() => {
              setIsFindOpen(true);
              setIsReplaceMode(true);
              setContextMenu(null);
            }}
            className="px-3 py-1.5 hover:bg-[#281b3d] hover:text-[#00e5ff] cursor-pointer flex items-center justify-between text-[#cbd5e1]"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>Find & Replace...</span>
            </span>
            <span className="text-[10px] text-[#7a7194]">Ctrl+H</span>
          </div>
          <div
            onClick={() => {
              handleFormat();
              setContextMenu(null);
            }}
            className="px-3 py-1.5 hover:bg-[#281b3d] hover:text-[#00e676] cursor-pointer flex items-center justify-between text-[#cbd5e1]"
          >
            <span className="flex items-center gap-2">
              <Wand2 className="w-3.5 h-3.5 text-[#00e676]" />
              <span>Format Document</span>
            </span>
            <span className="text-[10px] text-[#7a7194]">Shift+Alt+F</span>
          </div>
          <div
            onClick={() => {
              setIsMinimapOn(!isMinimapOn);
              setContextMenu(null);
            }}
            className="px-3 py-1.5 hover:bg-[#281b3d] hover:text-[#ff007f] cursor-pointer flex items-center justify-between text-[#cbd5e1]"
          >
            <span className="flex items-center gap-2">
              <Layout className="w-3.5 h-3.5 text-[#ff007f]" />
              <span>Toggle Minimap</span>
            </span>
          </div>
          {onToggleTerminal && (
            <div
              onClick={() => {
                onToggleTerminal();
                setContextMenu(null);
              }}
              className="px-3 py-1.5 hover:bg-[#281b3d] hover:text-[#ff8800] cursor-pointer flex items-center justify-between text-[#cbd5e1]"
            >
              <span className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[#ff8800]" />
                <span>Toggle Terminal</span>
              </span>
              <span className="text-[10px] text-[#7a7194]">Ctrl+`</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
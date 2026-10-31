import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Radio,
  Terminal,
  FileCode,
  FilePlus,
  FileText,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
  Pause,
  Play,
  ArrowDownCircle,
  RotateCw,
  Trash2,
  Cpu,
  Copy,
  Check,
  User,
  Layers,
} from "lucide-react";
import type {
  TelemetryEvent,
  TelemetrySessionItem,
} from "../../vite-env";
import { DiffViewer } from "./DiffViewer";

export const TelemetryPane: React.FC = () => {
  const [sessions, setSessions] = useState<TelemetrySessionItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>("");
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "RUN_COMMAND" | "EDIT_FILE" | "WRITE_FILE" | "THINKING" | "USER_INPUT" | "ERRORS"
  >("ALL");

  // Track expanded thinking cards by event id
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load session list on mount
  const refreshSessions = async () => {
    if (!window.dracoAPI?.listTelemetrySessions) return;
    try {
      const list = await window.dracoAPI.listTelemetrySessions();
      setSessions(list);
      if (list.length > 0 && !activeConvId) {
        // Select newest session by default
        attachToSession(list[0].id);
      }
    } catch (err) {
      console.error("Failed to list sessions:", err);
    }
  };

  const attachToSession = async (convId: string) => {
    if (!window.dracoAPI?.attachTelemetry) return;
    try {
      setActiveConvId(convId);
      const res = await window.dracoAPI.attachTelemetry(convId, 200);
      if (res.success && res.history) {
        setEvents(res.history);
      }
    } catch (err) {
      console.error("Failed to attach to telemetry session:", err);
    }
  };

  useEffect(() => {
    refreshSessions();
  }, []);

  // Listen to live push events from Electron backend
  useEffect(() => {
    if (!window.dracoAPI?.receive) return;

    const handleStream = (newEvents: TelemetryEvent[]) => {
      if (!Array.isArray(newEvents) || newEvents.length === 0) return;
      setEvents((prev) => {
        // Deduplicate events by id
        const existingIds = new Set(prev.map((e) => e.id));
        const toAdd = newEvents.filter((e) => !existingIds.has(e.id));
        if (toAdd.length === 0) return prev;
        return [...prev, ...toAdd];
      });
    };

    window.dracoAPI.receive("telemetry:stream", handleStream);
  }, []);

  // Handle auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  const togglePause = async () => {
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    if (window.dracoAPI?.pauseTelemetry) {
      await window.dracoAPI.pauseTelemetry(nextPaused);
    }
  };

  const toggleThinking = (id: string) => {
    setExpandedThinking((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(id);
    setTimeout(() => setCopiedStep(null), 1500);
  };

  // Filter and search events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // 1. Category Filter
      if (activeFilter === "RUN_COMMAND") {
        if (!ev.toolCalls.some((tc) => tc.name === "run_command")) return false;
      } else if (activeFilter === "EDIT_FILE") {
        if (!ev.toolCalls.some((tc) => tc.name === "edit_file")) return false;
      } else if (activeFilter === "WRITE_FILE") {
        if (!ev.toolCalls.some((tc) => tc.name === "write_file")) return false;
      } else if (activeFilter === "THINKING") {
        if (!ev.modelThinking) return false;
      } else if (activeFilter === "USER_INPUT") {
        if (ev.type !== "USER_INPUT") return false;
      } else if (activeFilter === "ERRORS") {
        if (ev.status !== "ERROR" && !ev.toolCalls.some((tc) => tc.status === "ERROR")) return false;
      }

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const inPrompt = ev.userPrompt?.toLowerCase().includes(query);
        const inThinking = ev.modelThinking?.toLowerCase().includes(query);
        const inResponse = ev.modelResponse?.toLowerCase().includes(query);
        const inTools = ev.toolCalls.some(
          (tc) =>
            tc.name.toLowerCase().includes(query) ||
            tc.command?.toLowerCase().includes(query) ||
            tc.toolSummary?.toLowerCase().includes(query) ||
            tc.diff?.path.toLowerCase().includes(query)
        );

        if (!inPrompt && !inThinking && !inResponse && !inTools) return false;
      }

      return true;
    });
  }, [events, activeFilter, searchQuery]);

  // Statistics calculation
  const stats = useMemo(() => {
    let toolCount = 0;
    let diffCount = 0;
    let tokenTotal = 0;

    for (const ev of events) {
      toolCount += ev.toolCalls.length;
      tokenTotal += (ev.tokens.input || 0) + (ev.tokens.output || 0);
      for (const tc of ev.toolCalls) {
        if (tc.name === "edit_file" || tc.name === "write_file") {
          diffCount++;
        }
      }
    }

    return {
      totalSteps: events.length,
      toolCount,
      diffCount,
      tokenTotal,
    };
  }, [events]);

  const activeSessionItem = sessions.find((s) => s.id === activeConvId);

  return (
    <div className="h-full bg-[#0b0813] flex flex-col font-mono text-xs overflow-hidden select-none">
      {/* 1. Master Control Strip */}
      <div className="h-9 bg-[#120c1f] border-b border-[#261d38] px-3 flex items-center justify-between text-[11px]">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[#00e5ff]">
            <Radio className={`w-3.5 h-3.5 ${isPaused ? "text-[#ffea00]" : "text-[#ff007f] animate-pulse"}`} />
            <span className="font-bold uppercase tracking-wider text-[#e2e8f0]">
              Antigravity Telemetry Hub
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px]">
            {isPaused ? (
              <span className="text-[#ffea00] bg-[#ffea00]/10 px-1.5 py-0.5 border border-[#ffea00]/30 font-semibold flex items-center gap-1">
                <Pause className="w-2.5 h-2.5" /> PAUSED
              </span>
            ) : (
              <span className="text-[#00e676] bg-[#00e676]/10 px-1.5 py-0.5 border border-[#00e676]/30 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-ping" />
                LIVE STREAMING
              </span>
            )}
            <span className="text-[#64748b] hidden md:inline">FILE_SHARE_READ</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Conversation Selector Dropdown */}
          <div className="relative">
            <select
              value={activeConvId}
              onChange={(e) => attachToSession(e.target.value)}
              className="bg-[#161026] text-[#cbd5e1] border border-[#261d38] px-2 py-1 text-[10.5px] rounded-xs font-mono focus:outline-hidden focus:border-[#00e5ff] cursor-pointer max-w-[210px] truncate"
            >
              {sessions.map((s, idx) => (
                <option key={s.id} value={s.id}>
                  {idx === 0 ? "★ [ACTIVE] " : ""}{s.id.slice(0, 8)}... ({new Date(s.mtime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Sessions */}
          <button
            onClick={refreshSessions}
            title="Scan Brain Sessions"
            className="p-1 text-[#7a7194] hover:text-[#00e5ff] hover:bg-[#161026] border border-transparent hover:border-[#261d38] transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Pause / Resume Button */}
          <button
            onClick={togglePause}
            title={isPaused ? "Resume Live Tailer" : "Pause Live Tailer"}
            className={`px-2 py-0.5 border text-[10px] font-semibold flex items-center gap-1 transition-colors ${
              isPaused
                ? "bg-[#00e676]/10 border-[#00e676]/40 text-[#00e676] hover:bg-[#00e676]/20"
                : "bg-[#ffea00]/10 border-[#ffea00]/40 text-[#ffea00] hover:bg-[#ffea00]/20"
            }`}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span className="hidden sm:inline">{isPaused ? "Resume" : "Pause"}</span>
          </button>

          {/* Auto Scroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title="Auto-scroll on new events"
            className={`px-1.5 py-0.5 border text-[10px] flex items-center gap-1 transition-colors ${
              autoScroll
                ? "bg-[#00e5ff]/20 border-[#00e5ff]/50 text-[#00e5ff]"
                : "bg-[#161026] border-[#261d38] text-[#7a7194] hover:text-[#cbd5e1]"
            }`}
          >
            <ArrowDownCircle className="w-3 h-3" />
            <span className="hidden sm:inline">Auto-Scroll</span>
          </button>

          {/* Clear View */}
          <button
            onClick={() => setEvents([])}
            title="Clear Event Timeline View"
            className="p-1 text-[#7a7194] hover:text-[#ff1744] hover:bg-[#161026] border border-transparent hover:border-[#261d38] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Target Path & Filter Subbar */}
      <div className="bg-[#0e0a19] px-3 py-1.5 border-b border-[#261d38] flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          {(
            [
              { id: "ALL", label: "ALL" },
              { id: "RUN_COMMAND", label: "RUN_CMD" },
              { id: "EDIT_FILE", label: "EDIT_FILE" },
              { id: "WRITE_FILE", label: "WRITE_FILE" },
              { id: "THINKING", label: "THINKING" },
              { id: "USER_INPUT", label: "PROMPTS" },
              { id: "ERRORS", label: "ERRORS" },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-2 py-0.5 rounded-xs transition-colors flex items-center gap-1.5 border ${
                activeFilter === filter.id
                  ? "bg-[#00e5ff]/20 text-[#00e5ff] border-[#00e5ff]/60 font-semibold"
                  : "bg-[#161026] text-[#7a7194] border-[#261d38] hover:text-[#cbd5e1]"
              }`}
            >
              <span>{filter.label}</span>
              <span className="text-[9px] opacity-75 font-mono">
                {filter.id === "ALL"
                  ? events.length
                  : filter.id === "RUN_COMMAND"
                  ? events.filter((e) => e.toolCalls.some((t) => t.name === "run_command")).length
                  : filter.id === "EDIT_FILE"
                  ? events.filter((e) => e.toolCalls.some((t) => t.name === "edit_file")).length
                  : filter.id === "WRITE_FILE"
                  ? events.filter((e) => e.toolCalls.some((t) => t.name === "write_file")).length
                  : filter.id === "THINKING"
                  ? events.filter((e) => Boolean(e.modelThinking)).length
                  : filter.id === "USER_INPUT"
                  ? events.filter((e) => e.type === "USER_INPUT").length
                  : events.filter((e) => e.status === "ERROR").length}
              </span>
            </button>
          ))}
        </div>

        {/* Real-Time Search Bar */}
        <div className="relative flex items-center">
          <Search className="w-3 h-3 text-[#7a7194] absolute left-2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search command, prompt, file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#120c1f] text-[#cbd5e1] border border-[#261d38] pl-7 pr-6 py-0.5 text-[10px] w-48 sm:w-64 focus:outline-hidden focus:border-[#00e5ff] font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-1.5 text-[#7a7194] hover:text-[#cbd5e1]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Event Timeline Stream */}
      <div
        ref={scrollContainerRef}
        className="flex-1 p-3 overflow-y-auto space-y-3 font-mono text-[11px] select-text"
      >
        {filteredEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#7a7194] space-y-2 select-none">
            <Layers className="w-8 h-8 text-[#261d38]" />
            <p className="text-xs font-semibold text-[#cbd5e1]">NO TELEMETRY EVENTS RECORDED</p>
            <p className="text-[10px] max-w-sm text-[#64748b]">
              Waiting for agent activity in active session{" "}
              <span className="text-[#00e5ff]">{activeConvId ? activeConvId.slice(0, 16) + "..." : "none"}</span>.
              Run tasks or trigger commands to see live events.
            </p>
          </div>
        ) : (
          filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className={`border rounded-xs transition-colors ${
                ev.status === "ERROR"
                  ? "border-[#ff1744]/40 bg-[#160b13]"
                  : ev.type === "USER_INPUT"
                  ? "border-[#00e5ff]/30 bg-[#0e1622]"
                  : "border-[#261d38] bg-[#161026]"
              }`}
            >
              {/* Event Card Header */}
              <div className="bg-[#120c1f] px-3 py-1.5 border-b border-[#261d38]/80 flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <span className="text-[#00e5ff] font-bold text-[10px] bg-[#00e5ff]/10 px-1 py-0.5 border border-[#00e5ff]/20">
                    Step #{ev.stepIndex}
                  </span>
                  <span className="text-[#7a7194] text-[10px]">
                    {new Date(ev.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <span className="text-[#64748b] text-[10px] uppercase font-semibold">
                    {ev.source}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px]">
                  {/* Status Indicator */}
                  {ev.status === "ERROR" ? (
                    <span className="text-[#ff1744] flex items-center gap-1 font-bold">
                      <AlertTriangle className="w-3 h-3" /> ERROR
                    </span>
                  ) : (
                    <span className="text-[#00e676] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> DONE
                    </span>
                  )}

                  {/* Token counter badge */}
                  {(ev.tokens.input > 0 || ev.tokens.output > 0) && (
                    <span className="text-[#7a7194] border-l border-[#261d38] pl-2 hidden sm:inline">
                      {ev.tokens.input}in / {ev.tokens.output}out tokens
                    </span>
                  )}
                </div>
              </div>

              {/* Event Body Content */}
              <div className="p-3 space-y-2.5">
                {/* 1. User Prompt (if USER_INPUT) */}
                {ev.type === "USER_INPUT" && ev.userPrompt && (
                  <div className="flex items-start gap-2 bg-[#0b131e] p-2.5 border border-[#00e5ff]/30 rounded-xs">
                    <User className="w-4 h-4 text-[#00e5ff] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <div className="text-[10px] text-[#00e5ff] font-bold tracking-wider uppercase">
                        User Instruction
                      </div>
                      <p className="text-[#e2e8f0] leading-relaxed whitespace-pre-wrap text-[11px]">
                        {ev.userPrompt}
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. Cognitive Flow Accordion (Model Thinking) */}
                {ev.modelThinking && (
                  <div className="border border-[#ffea00]/30 bg-[#120e06] rounded-xs overflow-hidden">
                    <button
                      onClick={() => toggleThinking(ev.id)}
                      className="w-full px-2.5 py-1.5 flex items-center justify-between text-[#ffea00] hover:bg-[#ffea00]/10 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Cpu className="w-3.5 h-3.5 text-[#ffea00]" />
                        <span className="font-bold text-[10.5px]">
                          Cognitive Flow (Model Reasoning)
                        </span>
                        {!expandedThinking[ev.id] && (
                          <span className="text-[#7a7194] text-[10px] truncate max-w-md hidden md:inline">
                            - {ev.modelThinking.slice(0, 75)}...
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#ffea00]/70">
                          {Math.round(ev.modelThinking.length / 4)} tokens
                        </span>
                        {expandedThinking[ev.id] ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </button>

                    {expandedThinking[ev.id] && (
                      <div className="p-3 bg-[#080602] border-t border-[#ffea00]/20 text-[#cbd5e1] text-[10px] leading-relaxed whitespace-pre-wrap select-text font-mono max-h-72 overflow-y-auto">
                        {ev.modelThinking}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Tool Calls Stream */}
                {ev.toolCalls.map((tc) => (
                  <div
                    key={tc.id}
                    className="bg-[#0b0813] border border-[#261d38] rounded-xs overflow-hidden"
                  >
                    {/* Tool Bar */}
                    <div className="bg-[#120c1f] px-2.5 py-1 flex items-center justify-between border-b border-[#261d38]">
                      <div className="flex items-center gap-2">
                        {tc.name === "run_command" ? (
                          <Terminal className="w-3.5 h-3.5 text-[#00e5ff]" />
                        ) : tc.name === "edit_file" ? (
                          <FileCode className="w-3.5 h-3.5 text-[#00e676]" />
                        ) : tc.name === "write_file" ? (
                          <FilePlus className="w-3.5 h-3.5 text-[#ff8800]" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-[#cbd5e1]" />
                        )}
                        <span
                          className={`font-bold ${
                            tc.name === "run_command"
                              ? "text-[#00e5ff]"
                              : tc.name === "edit_file"
                              ? "text-[#00e676]"
                              : tc.name === "write_file"
                              ? "text-[#ff8800]"
                              : "text-[#cbd5e1]"
                          }`}
                        >
                          {tc.name}
                        </span>
                        {tc.toolSummary && (
                          <span className="text-[#7a7194] text-[10px] hidden sm:inline">
                            ({tc.toolSummary})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px]">
                        {tc.durationMs && (
                          <span className="text-[#64748b]">{(tc.durationMs / 1000).toFixed(1)}s</span>
                        )}
                        <button
                          onClick={() =>
                            copyToClipboard(
                              tc.command || tc.diff?.path || JSON.stringify(tc.args, null, 2),
                              tc.id
                            )
                          }
                          title="Copy Tool Payload"
                          className="text-[#7a7194] hover:text-[#00e5ff] p-0.5"
                        >
                          {copiedStep === tc.id ? (
                            <Check className="w-3 h-3 text-[#00e676]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Tool Payload Rendering */}
                    <div className="p-2 space-y-2">
                      {/* Command Line Preview */}
                      {tc.name === "run_command" && tc.command && (
                        <div className="bg-[#120c1f] p-2 border border-[#261d38] font-mono text-[11px] text-[#00e5ff] overflow-x-auto whitespace-pre">
                          $ {tc.command}
                        </div>
                      )}

                      {/* Diff Inspector for edit_file / write_file */}
                      {tc.diff && <DiffViewer diff={tc.diff} />}

                      {/* File Read Preview */}
                      {tc.name === "read_file" && tc.filePath && (
                        <div className="text-[10px] text-[#cbd5e1] font-mono">
                          Target Path: <span className="text-[#00e5ff]">{tc.filePath}</span>
                        </div>
                      )}

                      {/* Generic Tool Payload if not run/edit/write */}
                      {tc.name !== "run_command" && !tc.diff && tc.name !== "read_file" && (
                        <pre className="text-[10px] text-[#94a3b8] overflow-x-auto p-1 bg-[#120c1f]">
                          {JSON.stringify(tc.args, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}

                {/* 4. Model Response Text (if any) */}
                {ev.modelResponse && (
                  <div className="bg-[#120c1f] p-2.5 border border-[#261d38] text-[#cbd5e1] text-[11px] leading-relaxed whitespace-pre-wrap select-text">
                    {ev.modelResponse}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. Bottom Diagnostic Status Strip */}
      <div className="h-7 bg-[#120c1f] border-t border-[#261d38] px-3 flex items-center justify-between text-[10px] text-[#7a7194] select-none">
        <div className="flex items-center gap-4">
          <span>
            STEPS: <strong className="text-[#00e5ff]">{stats.totalSteps}</strong>
          </span>
          <span>
            TOOLS INVOKED: <strong className="text-[#00e676]">{stats.toolCount}</strong>
          </span>
          <span>
            DIFFS APPLIED: <strong className="text-[#ff8800]">{stats.diffCount}</strong>
          </span>
          <span className="hidden sm:inline">
            TOKENS: <strong className="text-[#ffea00]">{stats.tokenTotal.toLocaleString()}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 truncate max-w-sm">
          <span className="truncate">
            BRAIN:{" "}
            <span className="text-[#cbd5e1]">
              {activeSessionItem?.path
                ? activeSessionItem.path.split(/[/\\]/).slice(-2).join("/")
                : "auto-detecting"}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

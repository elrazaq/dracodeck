import React, { useState, useEffect, useCallback } from "react";
import {
  GitBranch,
  GitCommit,
  RefreshCw,
  Plus,
  Minus,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Zap,
  Check,
  Copy,
  FileText,
  Trash2,
  Kanban,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  Save,
  Shield,
  FolderGit2,
} from "lucide-react";
import { DracoTooltip } from "../common/DracoTooltip";
import {
  GitStatusResult,
  GitBranchesResult,
  GitCommitLog,
  DracoNoteItem,
  KanbanTask,
  KanbanColumn,
  KanbanPriority,
  KanbanTag,
} from "../../vite-env";

interface GitMemoryWorkstationProps {
  workspacePath: string;
}

type M5Tab = "git" | "kanban" | "notes";

const KANBAN_COLUMNS: { id: KanbanColumn; label: string; accent: string }[] = [
  { id: "BACKLOG", label: "01 // BACKLOG", accent: "border-[#7a7194]" },
  { id: "IN_PROGRESS", label: "02 // IN PROGRESS", accent: "border-[#00e5ff]" },
  { id: "REVIEW", label: "03 // SECURITY REVIEW", accent: "border-[#ff8800]" },
  { id: "DONE", label: "04 // COMPLETED", accent: "border-[#00e676]" },
];

export const GitMemoryWorkstation: React.FC<GitMemoryWorkstationProps> = ({
  workspacePath,
}) => {
  const [activeTab, setActiveTab] = useState<M5Tab>("git");

  // GitOps States
  const [gitStatus, setGitStatus] = useState<GitStatusResult | null>(null);
  const [branches, setBranches] = useState<GitBranchesResult>({
    current: "main",
    local: ["main"],
    remote: [],
  });
  const [commits, setCommits] = useState<GitCommitLog[]>([]);
  const [selectedDiffFile, setSelectedDiffFile] = useState<{
    path: string;
    staged: boolean;
  } | null>(null);
  const [diffContent, setDiffContent] = useState<string>("");
  const [commitMessage, setCommitMessage] = useState<string>("");
  const [newBranchName, setNewBranchName] = useState<string>("");
  const [showNewBranchInput, setShowNewBranchInput] = useState<boolean>(false);
  const [isGitBusy, setIsGitBusy] = useState<boolean>(false);
  const [gitFeedback, setGitFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [copiedDiff, setCopiedDiff] = useState<boolean>(false);

  // Kanban States
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [filterTag, setFilterTag] = useState<KanbanTag | "ALL">("ALL");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<KanbanPriority>("HIGH");
  const [newTaskTag, setNewTaskTag] = useState<KanbanTag>("SECURITY");
  const [newTaskDue, setNewTaskDue] = useState("");

  // DracoMemory Notes States
  const [notes, setNotes] = useState<DracoNoteItem[]>([]);
  const [activeNoteName, setActiveNoteName] = useState<string>("");
  const [noteContent, setNoteContent] = useState<string>("");
  const [newNoteName, setNewNoteName] = useState<string>("");
  const [noteSaveStatus, setNoteSaveStatus] = useState<string | null>(null);
  const [noteViewMode, setNoteViewMode] = useState<"split" | "raw" | "preview">("split");

  // Load Git Data
  const refreshGitAll = useCallback(async () => {
    if (!window.dracoAPI?.gitStatus) return;
    setIsGitBusy(true);
    try {
      const [statusRes, branchRes, logRes] = await Promise.all([
        window.dracoAPI.gitStatus(workspacePath),
        window.dracoAPI.gitBranches(workspacePath),
        window.dracoAPI.gitLog(workspacePath, 25),
      ]);
      setGitStatus(statusRes);
      setBranches(branchRes);
      setCommits(logRes);

      // Auto-select first modified/staged file for diff if none selected
      const allChanged = [
        ...statusRes.staged.map((f) => ({ path: f.path, staged: true })),
        ...statusRes.unstaged.map((f) => ({ path: f.path, staged: false })),
        ...statusRes.untracked.map((f) => ({ path: f.path, staged: false })),
      ];

      if (allChanged.length > 0) {
        const target =
          selectedDiffFile &&
          allChanged.some(
            (c) => c.path === selectedDiffFile.path && c.staged === selectedDiffFile.staged
          )
            ? selectedDiffFile
            : allChanged[0];
        setSelectedDiffFile(target);
        const diffRes = await window.dracoAPI.gitDiff(
          workspacePath,
          target.path,
          target.staged
        );
        setDiffContent(diffRes.diff);
      } else {
        setSelectedDiffFile(null);
        setDiffContent("Working tree clean. Zero uncommitted modifications.");
      }
    } finally {
      setIsGitBusy(false);
    }
  }, [workspacePath, selectedDiffFile]);

  // Load Kanban & Notes
  const refreshMemoryAll = useCallback(async () => {
    if (!window.dracoAPI?.memoryGetTasks) return;
    const [loadedTasks, loadedNotes] = await Promise.all([
      window.dracoAPI.memoryGetTasks(workspacePath),
      window.dracoAPI.memoryListNotes(workspacePath),
    ]);
    setTasks(loadedTasks);
    setNotes(loadedNotes);

    if (loadedNotes.length > 0 && !activeNoteName) {
      const first = loadedNotes[0].name;
      setActiveNoteName(first);
      const readRes = await window.dracoAPI.memoryReadNote(workspacePath, first);
      if (readRes.ok) {
        setNoteContent(readRes.content);
      }
    }
  }, [workspacePath, activeNoteName]);

  useEffect(() => {
    refreshGitAll();
    refreshMemoryAll();
  }, [workspacePath]);

  // Inspect Diff for a specific file
  const handleSelectDiff = async (filePath: string, staged: boolean) => {
    setSelectedDiffFile({ path: filePath, staged });
    if (window.dracoAPI?.gitDiff) {
      const res = await window.dracoAPI.gitDiff(workspacePath, filePath, staged);
      setDiffContent(res.diff);
    }
  };

  // Stage / Unstage / Discard Handlers
  const handleStage = async (filePath: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.dracoAPI?.gitStage) return;
    const res = await window.dracoAPI.gitStage(workspacePath, filePath);
    if (!res.ok && res.error) {
      setGitFeedback({ ok: false, text: res.error });
    }
    await refreshGitAll();
  };

  const handleUnstage = async (filePath: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.dracoAPI?.gitUnstage) return;
    const res = await window.dracoAPI.gitUnstage(workspacePath, filePath);
    if (!res.ok && res.error) {
      setGitFeedback({ ok: false, text: res.error });
    }
    await refreshGitAll();
  };

  const handleDiscard = async (filePath: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.dracoAPI?.gitDiscard) return;
    const res = await window.dracoAPI.gitDiscard(workspacePath, filePath);
    if (!res.ok && res.error) {
      setGitFeedback({ ok: false, text: res.error });
    } else {
      setGitFeedback({ ok: true, text: `Discarded changes in ${filePath}` });
    }
    await refreshGitAll();
  };

  // Branch Switch / Create
  const handleSwitchBranch = async (branchName: string, createNew = false) => {
    if (!window.dracoAPI?.gitCheckout || !branchName.trim()) return;
    setIsGitBusy(true);
    try {
      const res = await window.dracoAPI.gitCheckout(
        workspacePath,
        branchName.trim(),
        createNew
      );
      if (res.ok) {
        setGitFeedback({
          ok: true,
          text: `Switched to branch '${branchName.trim()}'`,
        });
        setNewBranchName("");
        setShowNewBranchInput(false);
      } else {
        setGitFeedback({
          ok: false,
          text: res.error || "Failed to switch branch.",
        });
      }
      await refreshGitAll();
    } finally {
      setIsGitBusy(false);
    }
  };

  // Commit / Push / Pull
  const handleGitSync = async (
    action: "commit" | "commit-push" | "push" | "pull"
  ) => {
    if (!window.dracoAPI?.gitSync || isGitBusy) return;
    if ((action === "commit" || action === "commit-push") && !commitMessage.trim()) {
      setGitFeedback({
        ok: false,
        text: "Enter a commit message before committing.",
      });
      return;
    }

    setIsGitBusy(true);
    setGitFeedback(null);
    try {
      const res = await window.dracoAPI.gitSync(workspacePath, {
        message: commitMessage.trim(),
        action,
      });
      if (res.ok) {
        if (action === "commit" || action === "commit-push") {
          setCommitMessage("");
        }
        setGitFeedback({
          ok: true,
          text: res.output || `Git ${action.toUpperCase()} completed.`,
        });
      } else {
        setGitFeedback({
          ok: false,
          text: res.error || `Git ${action} failed.`,
        });
      }
      await refreshGitAll();
    } finally {
      setIsGitBusy(false);
    }
  };

  // Kanban Handlers
  const persistTasks = async (updated: KanbanTask[]) => {
    setTasks(updated);
    if (window.dracoAPI?.memorySaveTasks) {
      await window.dracoAPI.memorySaveTasks(workspacePath, updated);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const item: KanbanTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || "No description provided.",
      column: "BACKLOG",
      priority: newTaskPriority,
      tag: newTaskTag,
      createdAt: new Date().toISOString(),
      dueDate: newTaskDue || undefined,
    };
    await persistTasks([item, ...tasks]);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewTaskDue("");
  };

  const handleMoveTask = async (taskId: string, dir: -1 | 1) => {
    const colOrder: KanbanColumn[] = ["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"];
    const updated = tasks.map((t) => {
      if (t.id !== taskId) return t;
      const idx = colOrder.indexOf(t.column);
      const nextIdx = Math.min(Math.max(idx + dir, 0), colOrder.length - 1);
      return { ...t, column: colOrder[nextIdx] };
    });
    await persistTasks(updated);
  };

  const handleDeleteTask = async (taskId: string) => {
    await persistTasks(tasks.filter((t) => t.id !== taskId));
  };

  // DracoMemory Note Handlers
  const handleOpenNote = async (filename: string) => {
    setActiveNoteName(filename);
    if (window.dracoAPI?.memoryReadNote) {
      const res = await window.dracoAPI.memoryReadNote(workspacePath, filename);
      if (res.ok) {
        setNoteContent(res.content);
      }
    }
  };

  const handleSaveActiveNote = async () => {
    if (!activeNoteName || !window.dracoAPI?.memorySaveNote) return;
    const res = await window.dracoAPI.memorySaveNote(
      workspacePath,
      activeNoteName,
      noteContent
    );
    if (res.ok) {
      setNoteSaveStatus("SAVED TO DISK ✓");
      setTimeout(() => setNoteSaveStatus(null), 1800);
      const list = await window.dracoAPI.memoryListNotes(workspacePath);
      setNotes(list);
    }
  };

  const handleCreateNote = async (customName?: string, templateBody?: string) => {
    const rawName = customName || newNoteName.trim();
    if (!rawName || !window.dracoAPI?.memorySaveNote) return;
    const body =
      templateBody ??
      `# ${rawName.replace(/\.md$/i, "").toUpperCase()}\n**Created**: ${new Date().toUTCString()}\n\n---\n\n`;
    const res = await window.dracoAPI.memorySaveNote(workspacePath, rawName, body);
    if (res.ok) {
      setNewNoteName("");
      const list = await window.dracoAPI.memoryListNotes(workspacePath);
      setNotes(list);
      setActiveNoteName(res.name);
      setNoteContent(body);
    }
  };

  const handleDeleteNote = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.dracoAPI?.memoryDeleteNote) return;
    await window.dracoAPI.memoryDeleteNote(workspacePath, filename);
    const list = await window.dracoAPI.memoryListNotes(workspacePath);
    setNotes(list);
    if (activeNoteName === filename) {
      if (list.length > 0) {
        handleOpenNote(list[0].name);
      } else {
        setActiveNoteName("");
        setNoteContent("");
      }
    }
  };

  // Diff line statistics
  const diffLines = diffContent.split(/\r?\n/);
  const addedCount = diffLines.filter((l) => l.startsWith("+") && !l.startsWith("+++")).length;
  const removedCount = diffLines.filter((l) => l.startsWith("-") && !l.startsWith("---")).length;

  return (
    <div className="h-full w-full bg-[#0b0813] flex flex-col font-mono text-xs overflow-hidden select-none">
      {/* Top Workstation Header */}
      <div className="h-10 bg-[#120c1f] border-b border-[#261d38] px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[#00e676]">
            <FolderGit2 className="w-4 h-4 text-[#00e676]" />
            <span className="font-bold tracking-wider text-[#e2e8f0] text-sm">
              DRACOOPS // 1-CLICK GIT WORKSTATION & MEMORY MATRIX
            </span>
          </div>
          <span className="text-[#261d38]">|</span>
          <span className="text-[10px] text-[#7a7194] truncate max-w-xs">
            SCOPE: <strong className="text-[#00e5ff]">{workspacePath}</strong>
          </span>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-1 bg-[#0b0813] p-0.5 border border-[#261d38]">
          <button
            onClick={() => setActiveTab("git")}
            className={`px-3 py-1 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "git"
                ? "bg-[#161026] text-[#00e676] border-b-2 border-[#00e676]"
                : "text-[#7a7194] hover:text-[#e2e8f0]"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>01. 1-CLICK GIT OPS & DIFF</span>
            {gitStatus && gitStatus.totalDirty > 0 && (
              <span className="px-1.5 py-0.2 bg-[#ff007f] text-white text-[9px] font-bold">
                {gitStatus.totalDirty}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("kanban")}
            className={`px-3 py-1 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "kanban"
                ? "bg-[#161026] text-[#00e5ff] border-b-2 border-[#00e5ff]"
                : "text-[#7a7194] hover:text-[#e2e8f0]"
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>02. KANBAN PROJECT MATRIX</span>
            <span className="px-1.5 py-0.2 bg-[#161026] border border-[#261d38] text-[#00e5ff] text-[9px]">
              {tasks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("notes")}
            className={`px-3 py-1 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "notes"
                ? "bg-[#161026] text-[#ff007f] border-b-2 border-[#ff007f]"
                : "text-[#7a7194] hover:text-[#e2e8f0]"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>03. DRACOMEMORY NOTES (.draco/)</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {gitFeedback && activeTab === "git" && (
        <div
          className={`px-4 py-1.5 border-b flex items-center justify-between text-[11px] flex-shrink-0 ${
            gitFeedback.ok
              ? "bg-[#00e676]/10 border-[#00e676]/40 text-[#00e676]"
              : "bg-[#ff1744]/15 border-[#ff1744]/40 text-[#ff1744]"
          }`}
        >
          <span className="truncate font-mono">{gitFeedback.text}</span>
          <button
            onClick={() => setGitFeedback(null)}
            className="text-[#7a7194] hover:text-white ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: 1-CLICK GIT OPS & LIVE UNIFIED DIFF */}
      {activeTab === "git" && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Branch Switcher, Commit Box & Working Tree (350px) */}
          <div className="w-[350px] border-r border-[#261d38] bg-[#0e0a19] flex flex-col overflow-hidden flex-shrink-0">
            {/* Branch Bar */}
            <div className="p-2.5 border-b border-[#261d38] bg-[#120c1f] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <GitBranch className="w-3.5 h-3.5 text-[#ff007f] flex-shrink-0" />
                  <select
                    value={gitStatus?.branch || branches.current}
                    onChange={(e) => handleSwitchBranch(e.target.value, false)}
                    className="bg-[#0b0813] border border-[#261d38] text-[#00e5ff] font-bold text-xs px-2 py-1 outline-none flex-1 truncate cursor-pointer"
                  >
                    {branches.local.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <DracoTooltip content="Create & Checkout New Branch" position="bottom" accent="cyan">
                  <button
                    onClick={() => setShowNewBranchInput(!showNewBranchInput)}
                    className="px-2 py-1 bg-[#161026] hover:bg-[#281b3d] text-[#00e5ff] border border-[#261d38] text-[10px] font-bold cursor-pointer"
                  >
                    + BRANCH
                  </button>
                </DracoTooltip>

                <DracoTooltip content="Refresh Git Status & Log" position="bottom" accent="green">
                  <button
                    onClick={refreshGitAll}
                    className="p-1 bg-[#161026] hover:bg-[#281b3d] text-[#00e676] border border-[#261d38] cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGitBusy ? "animate-spin" : ""}`} />
                  </button>
                </DracoTooltip>
              </div>

              {showNewBranchInput && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleSwitchBranch(newBranchName, true)
                    }
                    placeholder="feat/new-branch-name"
                    className="flex-1 bg-[#0b0813] border border-[#00e5ff]/60 px-2 py-1 text-[11px] text-[#e2e8f0] outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSwitchBranch(newBranchName, true)}
                    className="px-2.5 py-1 bg-[#00e5ff] text-[#0b0813] font-bold text-[10px] cursor-pointer"
                  >
                    CREATE
                  </button>
                </div>
              )}
            </div>

            {/* 1-Click Lightning Commit & Sync Box */}
            <div className="p-2.5 border-b border-[#261d38] bg-[#140e24] space-y-2">
              <textarea
                rows={2}
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.ctrlKey && e.key === "Enter") {
                    handleGitSync("commit-push");
                  }
                }}
                placeholder="Commit message (Ctrl+Enter for 1-Click Commit & Push)..."
                className="w-full bg-[#0b0813] border border-[#261d38] focus:border-[#ff007f] p-2 text-[11px] text-[#e2e8f0] outline-none resize-none font-mono"
              />

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleGitSync("commit")}
                  disabled={isGitBusy}
                  className="py-1.5 px-2 bg-[#161026] hover:bg-[#281b3d] text-[#00e5ff] border border-[#00e5ff]/40 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Check className="w-3 h-3" />
                  <span>STAGE & COMMIT</span>
                </button>

                <button
                  onClick={() => handleGitSync("commit-push")}
                  disabled={isGitBusy}
                  className="py-1.5 px-2 bg-[#ff007f] hover:bg-[#d5006d] text-white font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-[0_0_10px_rgba(255,0,127,0.3)]"
                >
                  <Zap className="w-3 h-3" />
                  <span>1-CLICK PUSH</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <button
                  onClick={() => handleGitSync("pull")}
                  disabled={isGitBusy}
                  className="py-1 px-2 bg-[#0b0813] hover:bg-[#161026] text-[#cbd5e1] border border-[#261d38] text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ArrowDown className="w-3 h-3 text-[#00e5ff]" />
                  <span>PULL REBASE ({gitStatus?.behind ?? 0})</span>
                </button>

                <button
                  onClick={() => handleGitSync("push")}
                  disabled={isGitBusy}
                  className="py-1 px-2 bg-[#0b0813] hover:bg-[#161026] text-[#cbd5e1] border border-[#261d38] text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ArrowUp className="w-3 h-3 text-[#00e676]" />
                  <span>PUSH ORIGIN ({gitStatus?.ahead ?? 0})</span>
                </button>
              </div>
            </div>

            {/* Staged & Working Tree Lists */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#261d38]">
              {/* Staged Section */}
              <div className="p-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-[#00e676] mb-1.5 px-1">
                  <span>STAGED CHANGES ({gitStatus?.staged.length ?? 0})</span>
                  {(gitStatus?.staged.length ?? 0) > 0 && (
                    <button
                      onClick={() => handleUnstage("__ALL__")}
                      className="text-[#7a7194] hover:text-[#ff1744] text-[9px] cursor-pointer"
                    >
                      UNSTAGE ALL
                    </button>
                  )}
                </div>

                <div className="space-y-0.5">
                  {gitStatus?.staged.map((f) => {
                    const isSelected =
                      selectedDiffFile?.path === f.path && selectedDiffFile?.staged;
                    return (
                      <div
                        key={`staged-${f.path}`}
                        onClick={() => handleSelectDiff(f.path, true)}
                        className={`px-2 py-1 flex items-center justify-between text-[11px] cursor-pointer rounded-xs ${
                          isSelected
                            ? "bg-[#281b3d] text-[#e2e8f0] border-l-2 border-[#00e676]"
                            : "text-[#cbd5e1] hover:bg-[#161026]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-[9px] font-bold px-1 bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/40">
                            {f.code}
                          </span>
                          <span className="truncate">{f.path}</span>
                        </div>
                        <button
                          onClick={(e) => handleUnstage(f.path, e)}
                          title="Unstage File"
                          className="p-0.5 text-[#7a7194] hover:text-[#ff8800] cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  {(gitStatus?.staged.length ?? 0) === 0 && (
                    <p className="text-[10px] text-[#443a57] px-1 py-1">No staged files.</p>
                  )}
                </div>
              </div>

              {/* Working Tree & Untracked Section */}
              <div className="p-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-[#ff8800] mb-1.5 px-1">
                  <span>
                    WORKING TREE (
                    {(gitStatus?.unstaged.length ?? 0) + (gitStatus?.untracked.length ?? 0)})
                  </span>
                  {(gitStatus?.unstaged.length ?? 0) + (gitStatus?.untracked.length ?? 0) >
                    0 && (
                    <button
                      onClick={() => handleStage("__ALL__")}
                      className="text-[#00e5ff] hover:underline text-[9px] cursor-pointer"
                    >
                      + STAGE ALL
                    </button>
                  )}
                </div>

                <div className="space-y-0.5">
                  {[...(gitStatus?.unstaged || []), ...(gitStatus?.untracked || [])].map(
                    (f) => {
                      const isSelected =
                        selectedDiffFile?.path === f.path && !selectedDiffFile?.staged;
                      return (
                        <div
                          key={`work-${f.path}`}
                          onClick={() => handleSelectDiff(f.path, false)}
                          className={`px-2 py-1 flex items-center justify-between text-[11px] cursor-pointer rounded-xs ${
                            isSelected
                              ? "bg-[#281b3d] text-[#e2e8f0] border-l-2 border-[#ff8800]"
                              : "text-[#cbd5e1] hover:bg-[#161026]"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span
                              className={`text-[9px] font-bold px-1 border ${
                                f.code === "??"
                                  ? "bg-[#00e5ff]/15 text-[#00e5ff] border-[#00e5ff]/40"
                                  : "bg-[#ff8800]/15 text-[#ff8800] border-[#ff8800]/40"
                              }`}
                            >
                              {f.code}
                            </span>
                            <span className="truncate">{f.path}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => handleStage(f.path, e)}
                              title="Stage File"
                              className="p-0.5 text-[#7a7194] hover:text-[#00e676] cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleDiscard(f.path, e)}
                              title="Discard File Changes"
                              className="p-0.5 text-[#7a7194] hover:text-[#ff1744] cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    }
                  )}
                  {(gitStatus?.unstaged.length ?? 0) + (gitStatus?.untracked.length ?? 0) ===
                    0 && (
                    <p className="text-[10px] text-[#443a57] px-1 py-1">
                      Working tree is clean.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Center Column: Live Unified Diff Viewer */}
          <div className="flex-1 bg-[#0b0813] flex flex-col overflow-hidden">
            <div className="h-8 bg-[#120c1f] border-b border-[#261d38] px-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-3.5 h-3.5 text-[#00e5ff]" />
                <span className="font-bold text-[#e2e8f0] truncate">
                  {selectedDiffFile ? selectedDiffFile.path : "UNIFIED DIFF INSPECTOR"}
                </span>
                {selectedDiffFile && (
                  <span
                    className={`px-1.5 py-0.2 text-[9px] font-bold border ${
                      selectedDiffFile.staged
                        ? "bg-[#00e676]/15 border-[#00e676] text-[#00e676]"
                        : "bg-[#ff8800]/15 border-[#ff8800] text-[#ff8800]"
                    }`}
                  >
                    {selectedDiffFile.staged ? "STAGED DIFF" : "WORKING DIFF"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-[#00e676] font-bold">+{addedCount}</span>
                <span className="text-[#ff1744] font-bold">-{removedCount}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(diffContent);
                    setCopiedDiff(true);
                    setTimeout(() => setCopiedDiff(false), 1800);
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 bg-[#161026] hover:bg-[#281b3d] text-[#00e5ff] border border-[#261d38] text-[9.5px] font-bold cursor-pointer"
                >
                  {copiedDiff ? (
                    <Check className="w-3 h-3 text-[#00e676]" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedDiff ? "COPIED" : "COPY DIFF"}</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-3 font-mono text-[11px] select-text">
              {diffLines.map((line, idx) => {
                let rowStyle = "text-[#94a3b8]";
                if (line.startsWith("+++") || line.startsWith("---")) {
                  rowStyle = "text-[#e2e8f0] font-bold bg-[#161026] px-2 py-0.5";
                } else if (line.startsWith("@@")) {
                  rowStyle = "text-[#00e5ff] bg-[#00e5ff]/10 px-2 py-0.5 font-bold my-1";
                } else if (line.startsWith("+")) {
                  rowStyle = "text-[#00e676] bg-[#00e676]/10 px-2";
                } else if (line.startsWith("-")) {
                  rowStyle = "text-[#ff1744] bg-[#ff1744]/10 px-2";
                }
                return (
                  <div key={idx} className={`whitespace-pre leading-5 ${rowStyle}`}>
                    {line || " "}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Commit History Graph (310px) */}
          <div className="w-[310px] border-l border-[#261d38] bg-[#0c0817] flex flex-col overflow-hidden flex-shrink-0">
            <div className="h-8 bg-[#120c1f] border-b border-[#261d38] px-3 flex items-center justify-between">
              <span className="font-bold text-[#e2e8f0] text-[11px] flex items-center gap-1.5">
                <GitCommit className="w-3.5 h-3.5 text-[#ff007f]" />
                <span>COMMIT GRAPH (LAST 25)</span>
              </span>
              <span className="text-[9px] text-[#7a7194]">{commits.length} commits</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#261d38]/50">
              {commits.map((c) => (
                <div key={c.hash} className="p-2.5 hover:bg-[#161026] transition-colors space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="px-1.5 py-0.2 bg-[#161026] border border-[#00e5ff]/40 text-[#00e5ff] text-[9.5px] font-bold">
                      {c.hash}
                    </span>
                    <span className="text-[9.5px] text-[#7a7194]">{c.date}</span>
                  </div>
                  <p className="text-[11px] text-[#e2e8f0] font-semibold leading-snug break-words">
                    {c.message}
                  </p>
                  <div className="flex items-center justify-between text-[9.5px] text-[#7a7194] pt-0.5">
                    <span>by {c.author}</span>
                    {c.refs.length > 0 && (
                      <span className="px-1 bg-[#ff007f]/15 border border-[#ff007f]/40 text-[#ff007f] font-bold truncate max-w-[140px]">
                        {c.refs[0]}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KANBAN PROJECT MATRIX */}
      {activeTab === "kanban" && (
        <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
          {/* Quick Task Creator & Tag Filter Bar */}
          <form
            onSubmit={handleAddTask}
            className="bg-[#120c1f] border border-[#261d38] p-3 flex flex-wrap items-center gap-2"
          >
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="New task title (e.g. Audit JWT token rotation)..."
              className="w-64 bg-[#0b0813] border border-[#261d38] focus:border-[#00e5ff] px-2.5 py-1 text-xs text-[#e2e8f0] outline-none"
            />
            <input
              type="text"
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              placeholder="Technical notes / acceptance criteria..."
              className="flex-1 min-w-[200px] bg-[#0b0813] border border-[#261d38] focus:border-[#00e5ff] px-2.5 py-1 text-xs text-[#cbd5e1] outline-none"
            />
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as KanbanPriority)}
              className="bg-[#0b0813] border border-[#261d38] px-2 py-1 text-xs text-[#ff8800] font-bold outline-none"
            >
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
            <select
              value={newTaskTag}
              onChange={(e) => setNewTaskTag(e.target.value as KanbanTag)}
              className="bg-[#0b0813] border border-[#261d38] px-2 py-1 text-xs text-[#00e5ff] font-bold outline-none"
            >
              <option value="SECURITY">SECURITY</option>
              <option value="BUG">BUG</option>
              <option value="FEATURE">FEATURE</option>
              <option value="REFACTOR">REFACTOR</option>
            </select>
            <input
              type="date"
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
              className="bg-[#0b0813] border border-[#261d38] px-2 py-1 text-xs text-[#7a7194] outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-[#00e5ff] hover:bg-[#00b4d8] text-[#0b0813] font-bold text-xs cursor-pointer"
            >
              + ADD TASK
            </button>

            <div className="ml-auto flex items-center gap-1">
              {(["ALL", "SECURITY", "BUG", "FEATURE", "REFACTOR"] as const).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setFilterTag(tag)}
                  className={`px-2 py-0.5 text-[10px] font-bold border cursor-pointer ${
                    filterTag === tag
                      ? "bg-[#ff007f] text-white border-[#ff007f]"
                      : "bg-[#0b0813] text-[#7a7194] border-[#261d38]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </form>

          {/* 4-Column Kanban Matrix */}
          <div className="flex-1 grid grid-cols-4 gap-3 overflow-hidden">
            {KANBAN_COLUMNS.map((col) => {
              const colTasks = tasks.filter(
                (t) =>
                  t.column === col.id &&
                  (filterTag === "ALL" || t.tag === filterTag)
              );
              return (
                <div
                  key={col.id}
                  className={`bg-[#0e0a19] border border-[#261d38] border-t-2 ${col.accent} flex flex-col overflow-hidden`}
                >
                  <div className="p-2.5 bg-[#120c1f] border-b border-[#261d38] flex items-center justify-between">
                    <span className="font-bold text-xs text-[#e2e8f0]">
                      {col.label}
                    </span>
                    <span className="px-1.5 py-0.2 bg-[#161026] border border-[#261d38] text-[#00e5ff] text-[10px] font-bold">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                    {colTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 bg-[#140e24] border border-[#261d38] hover:border-[#00e5ff]/50 space-y-2 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            <span
                              className={`px-1.5 py-0.2 text-[9px] font-bold border ${
                                t.priority === "CRITICAL"
                                  ? "bg-[#ff1744]/15 border-[#ff1744] text-[#ff1744]"
                                  : t.priority === "HIGH"
                                  ? "bg-[#ff8800]/15 border-[#ff8800] text-[#ff8800]"
                                  : "bg-[#00e5ff]/15 border-[#00e5ff] text-[#00e5ff]"
                              }`}
                            >
                              {t.priority}
                            </span>
                            <span className="px-1.5 py-0.2 bg-[#161026] border border-[#261d38] text-[#cbd5e1] text-[9px] font-bold">
                              {t.tag}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteTask(t.id)}
                            className="text-[#7a7194] hover:text-[#ff1744] cursor-pointer"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        <h4 className="font-bold text-xs text-[#e2e8f0] leading-snug">
                          {t.title}
                        </h4>
                        <p className="text-[10.5px] text-[#94a3b8] leading-relaxed">
                          {t.description}
                        </p>

                        <div className="pt-2 border-t border-[#261d38] flex items-center justify-between text-[9.5px] text-[#7a7194]">
                          <span>{t.dueDate ? `DUE: ${t.dueDate}` : "PERSISTED (.draco)"}</span>
                          <div className="flex items-center gap-1">
                            {col.id !== "BACKLOG" && (
                              <button
                                onClick={() => handleMoveTask(t.id, -1)}
                                className="px-1.5 py-0.5 bg-[#0b0813] hover:bg-[#281b3d] text-[#cbd5e1] border border-[#261d38] cursor-pointer"
                                title="Move Left"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {col.id !== "DONE" && (
                              <button
                                onClick={() => handleMoveTask(t.id, 1)}
                                className="px-1.5 py-0.5 bg-[#0b0813] hover:bg-[#281b3d] text-[#00e676] border border-[#261d38] cursor-pointer"
                                title="Move Right"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: DRACOMEMORY SCRATCHPADS (.draco/notes/*.md) */}
      {activeTab === "notes" && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Notes Sidebar (270px) */}
          <div className="w-[270px] border-r border-[#261d38] bg-[#0e0a19] flex flex-col overflow-hidden flex-shrink-0">
            <div className="p-2.5 border-b border-[#261d38] bg-[#120c1f] space-y-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newNoteName}
                  onChange={(e) => setNewNoteName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateNote()}
                  placeholder="new-note-name.md"
                  className="flex-1 bg-[#0b0813] border border-[#261d38] focus:border-[#ff007f] px-2 py-1 text-[11px] text-[#e2e8f0] outline-none"
                />
                <button
                  onClick={() => handleCreateNote()}
                  className="px-2.5 py-1 bg-[#ff007f] text-white font-bold text-[10px] cursor-pointer"
                >
                  + NEW
                </button>
              </div>

              {/* Quick Templates */}
              <div className="grid grid-cols-2 gap-1 text-[9.5px]">
                <button
                  onClick={() =>
                    handleCreateNote(
                      `pentest-log-${Date.now().toString().slice(-4)}.md`,
                      `# PENTEST ENGAGEMENT LOG\n**Target**: \n**Scope**: \n\n## Verified PoV Findings\n1. \n\n## Reproducible cURL\n\`\`\`bash\ncurl -i -s -k ""\n\`\`\`\n`
                    )
                  }
                  className="py-1 px-1.5 bg-[#161026] hover:bg-[#281b3d] text-[#00e5ff] border border-[#261d38] font-bold cursor-pointer truncate"
                >
                  + PENTEST LOG
                </button>
                <button
                  onClick={() =>
                    handleCreateNote(
                      `architecture-adr-${Date.now().toString().slice(-4)}.md`,
                      `# ARCHITECTURE DECISION RECORD\n**Status**: APPROVED\n\n## Context\n\n## Decision\n\n## Consequences\n`
                    )
                  }
                  className="py-1 px-1.5 bg-[#161026] hover:bg-[#281b3d] text-[#00e676] border border-[#261d38] font-bold cursor-pointer truncate"
                >
                  + ARCH ADR
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#261d38]/40">
              {notes.map((n) => (
                <div
                  key={n.name}
                  onClick={() => handleOpenNote(n.name)}
                  className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                    activeNoteName === n.name
                      ? "bg-[#1f1435] border-l-2 border-[#ff007f] text-[#e2e8f0]"
                      : "text-[#cbd5e1] hover:bg-[#161026]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs truncate">{n.name}</p>
                    <p className="text-[9.5px] text-[#7a7194]">
                      {n.size} bytes // .draco/notes/
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteNote(n.name, e)}
                    className="text-[#7a7194] hover:text-[#ff1744] p-1 cursor-pointer"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-2 border-t border-[#261d38] bg-[#120c1f] text-[9.5px] text-[#00e676] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Silent Guard: .draco/ excluded from Git</span>
            </div>
          </div>

          {/* Right Markdown Editor & Preview */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0b0813]">
            <div className="h-9 bg-[#120c1f] border-b border-[#261d38] px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-[#00e5ff]">
                  {activeNoteName || "No note selected"}
                </span>
                {noteSaveStatus && (
                  <span className="text-[10px] text-[#00e676] font-bold">
                    {noteSaveStatus}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#0b0813] border border-[#261d38] p-0.5 text-[10px]">
                  {(["split", "raw", "preview"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setNoteViewMode(m)}
                      className={`px-2 py-0.5 font-bold uppercase cursor-pointer ${
                        noteViewMode === m
                          ? "bg-[#281b3d] text-[#00e5ff]"
                          : "text-[#7a7194]"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleSaveActiveNote}
                  className="px-3 py-1 bg-[#ff007f] hover:bg-[#d5006d] text-white font-bold text-[10.5px] flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3 h-3" />
                  <span>SAVE NOTE</span>
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {(noteViewMode === "split" || noteViewMode === "raw") && (
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === "s") {
                      e.preventDefault();
                      handleSaveActiveNote();
                    }
                  }}
                  placeholder="Write markdown scratchpad notes here..."
                  className="flex-1 bg-[#0b0813] text-[#e2e8f0] p-4 font-mono text-xs leading-6 outline-none resize-none border-r border-[#261d38]"
                />
              )}

              {(noteViewMode === "split" || noteViewMode === "preview") && (
                <div className="flex-1 bg-[#0e0a19] p-4 overflow-y-auto space-y-2 select-text">
                  {noteContent.split(/\r?\n/).map((line, i) => {
                    if (line.startsWith("# ")) {
                      return (
                        <h1
                          key={i}
                          className="text-base font-bold text-[#ff007f] border-b border-[#261d38] pb-1"
                        >
                          {line.slice(2)}
                        </h1>
                      );
                    }
                    if (line.startsWith("## ")) {
                      return (
                        <h2 key={i} className="text-sm font-bold text-[#00e5ff] pt-2">
                          {line.slice(3)}
                        </h2>
                      );
                    }
                    if (line.startsWith("- [ ] ")) {
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs text-[#cbd5e1]">
                          <span className="w-3 h-3 border border-[#ff007f] inline-block" />
                          <span>{line.slice(6)}</span>
                        </div>
                      );
                    }
                    if (line.startsWith("- [x] ")) {
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs text-[#00e676] line-through">
                          <span className="w-3 h-3 bg-[#00e676] inline-block" />
                          <span>{line.slice(6)}</span>
                        </div>
                      );
                    }
                    return (
                      <p key={i} className="text-xs text-[#cbd5e1] leading-5 whitespace-pre-wrap">
                        {line || "\u00A0"}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useCallback } from "react";
import {
  FolderTree,
  GitBranch,
  Cpu,
  RefreshCw,
  Plus,
  Minus,
  RotateCcw,
  Send,
  UploadCloud,
  DownloadCloud,
  Check,
  Terminal,
  FileCode,
  Sparkles,
  Activity,
  Globe,
  HardDrive,
  FileDiff,
  X,
} from "lucide-react";
import { ExplorerView } from "../explorer/ExplorerView";
import { DracodeLogo } from "../common/DracodeLogo";
import { DracoTooltip } from "../common/DracoTooltip";
import {
  GitStatusResult,
  GitBranchesResult,
  GitCommitLog,
  TelemetrySessionItem,
  TelemetryEvent,
} from "../../vite-env";

export type DracodeSidebarMode = "explorer" | "git" | "agent";

interface DracodeSidebarProps {
  workspacePath: string;
  selectedFile?: string;
  onOpenFile: (filePath: string, fileName: string, isPreview?: boolean) => void;
  onOpenScope?: (folderPath: string, folderName: string) => void;
}

export const DracodeSidebar: React.FC<DracodeSidebarProps> = ({
  workspacePath,
  selectedFile,
  onOpenFile,
  onOpenScope,
}) => {
  const [mode, setMode] = useState<DracodeSidebarMode>("explorer");

  // Real DracoOps Git State (from electron/gitOps.cjs)
  const [gitStatus, setGitStatus] = useState<GitStatusResult | null>(null);
  const [gitBranches, setGitBranches] = useState<GitBranchesResult | null>(null);
  const [gitLogs, setGitLogs] = useState<GitCommitLog[]>([]);
  const [commitMsg, setCommitMsg] = useState("");
  const [isGitBusy, setIsGitBusy] = useState(false);
  const [gitFeedback, setGitFeedback] = useState<string | null>(null);

  // Branch Creation & Inline Working Tree Diff State
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [activeDiff, setActiveDiff] = useState<{
    path: string;
    staged: boolean;
    diff: string;
  } | null>(null);

  // Real Agent Telemetry State (from electron/tailerService.cjs)
  const [agentSessions, setAgentSessions] = useState<TelemetrySessionItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>("");
  const [agentEvents, setAgentEvents] = useState<TelemetryEvent[]>([]);
  const [isAgentLoading, setIsAgentLoading] = useState(false);

  // Refresh Real Git Telemetry (Status + Branches + Commit Log)
  const refreshGit = useCallback(async () => {
    if (!workspacePath || !window.dracoAPI?.gitStatus) return;
    try {
      const [st, br, lg] = await Promise.all([
        window.dracoAPI.gitStatus(workspacePath),
        window.dracoAPI.gitBranches
          ? window.dracoAPI.gitBranches(workspacePath)
          : Promise.resolve(null),
        window.dracoAPI.gitLog
          ? window.dracoAPI.gitLog(workspacePath, 8)
          : Promise.resolve([]),
      ]);
      setGitStatus(st);
      if (br) setGitBranches(br);
      setGitLogs(lg || []);
    } catch {}
  }, [workspacePath]);

  useEffect(() => {
    refreshGit();
    const timer = setInterval(refreshGit, 6000);
    return () => clearInterval(timer);
  }, [refreshGit]);

  // Refresh Real Agent Telemetry Sessions
  const refreshAgentSessions = useCallback(async () => {
    if (!window.dracoAPI?.listTelemetrySessions) return;
    setIsAgentLoading(true);
    try {
      const list = await window.dracoAPI.listTelemetrySessions();
      const withLogs = (list || []).filter((s) => s.hasLogs);
      setAgentSessions(withLogs);

      if (withLogs.length > 0 && window.dracoAPI.attachTelemetry) {
        const targetId = activeConvId || withLogs[0].id;
        const attached = await window.dracoAPI.attachTelemetry(targetId, 40);
        if (attached.success) {
          setActiveConvId(attached.convId || targetId);
          setAgentEvents(attached.history || []);
        }
      }
    } catch {} finally {
      setIsAgentLoading(false);
    }
  }, [activeConvId]);

  useEffect(() => {
    if (mode === "agent") {
      refreshAgentSessions();
    }
  }, [mode, refreshAgentSessions]);

  // Subscribe to live streaming telemetry-event from Main Process
  useEffect(() => {
    if (!window.dracoAPI?.receive) return;
    const cleanup = window.dracoAPI.receive("telemetry-event", (ev: TelemetryEvent) => {
      setAgentEvents((prev) => {
        if (prev.some((e) => e.id === ev.id)) return prev;
        return [...prev.slice(-49), ev];
      });
    });
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, []);

  // Git Action Handlers
  const handleStage = async (filePath: string) => {
    if (!window.dracoAPI?.gitStage) return;
    setIsGitBusy(true);
    await window.dracoAPI.gitStage(workspacePath, filePath);
    await refreshGit();
    setIsGitBusy(false);
  };

  const handleUnstage = async (filePath: string) => {
    if (!window.dracoAPI?.gitUnstage) return;
    setIsGitBusy(true);
    await window.dracoAPI.gitUnstage(workspacePath, filePath);
    await refreshGit();
    setIsGitBusy(false);
  };

  const handleDiscard = async (filePath: string) => {
    if (!window.dracoAPI?.gitDiscard) return;
    setIsGitBusy(true);
    await window.dracoAPI.gitDiscard(workspacePath, filePath);
    if (activeDiff?.path === filePath) setActiveDiff(null);
    await refreshGit();
    setIsGitBusy(false);
  };

  const handleCheckoutBranch = async (branchName: string, createNew: boolean = false) => {
    if (!window.dracoAPI?.gitCheckout || !branchName.trim()) return;
    setIsGitBusy(true);
    setGitFeedback(`${createNew ? "Creating" : "Switching to"} ${branchName.trim()}...`);
    try {
      const res = await window.dracoAPI.gitCheckout(workspacePath, branchName.trim(), createNew);
      if (res.ok) {
        setGitFeedback(`Switched to ${res.branch || branchName.trim()}`);
        setIsCreatingBranch(false);
        setNewBranchName("");
      } else {
        setGitFeedback(res.error || "Branch checkout failed");
      }
      await refreshGit();
    } catch (err: any) {
      setGitFeedback(err.message || "Checkout error");
    } finally {
      setIsGitBusy(false);
      setTimeout(() => setGitFeedback(null), 3000);
    }
  };

  const handleInspectDiff = async (filePath: string, staged: boolean) => {
    if (!window.dracoAPI?.gitDiff) return;
    if (activeDiff && activeDiff.path === filePath && activeDiff.staged === staged) {
      setActiveDiff(null);
      return;
    }
    const res = await window.dracoAPI.gitDiff(workspacePath, filePath, staged);
    setActiveDiff({
      path: filePath,
      staged,
      diff: res.diff || "// No textual diff output (untracked or binary file)",
    });
  };

  const handleGitSync = async (
    action: "commit" | "commit-push" | "push" | "pull" | "fetch"
  ) => {
    if (!window.dracoAPI?.gitSync) return;
    if ((action === "commit" || action === "commit-push") && !commitMsg.trim()) {
      setGitFeedback("Enter commit message first.");
      setTimeout(() => setGitFeedback(null), 2500);
      return;
    }
    setIsGitBusy(true);
    setGitFeedback(`Running ${action.toUpperCase()}...`);
    try {
      const res = await window.dracoAPI.gitSync(workspacePath, {
        message: commitMsg.trim(),
        action,
      });
      if (res.ok) {
        if (action === "commit" || action === "commit-push") setCommitMsg("");
        setGitFeedback(`${action.toUpperCase()} OK`);
      } else {
        setGitFeedback(res.error || "Git operation failed");
      }
      await refreshGit();
    } catch (err: any) {
      setGitFeedback(err.message || "Error");
    } finally {
      setIsGitBusy(false);
      setTimeout(() => setGitFeedback(null), 3500);
    }
  };

  const openRelativeRepoFile = (relPath: string, isPreview: boolean = true) => {
    const cleanRel = relPath.replace(/^[/\\]+/, "");
    const fullPath = workspacePath
      ? `${workspacePath.replace(/[/\\]+$/, "")}/${cleanRel}`
      : cleanRel;
    const baseName = cleanRel.split(/[/\\]/).pop() || cleanRel;
    onOpenFile(fullPath, baseName, isPreview);
  };

  // Compute real token totals from live agent telemetry events
  const totalTokens = agentEvents.reduce(
    (acc, ev) => ({
      input: acc.input + (ev.tokens?.input || 0),
      output: acc.output + (ev.tokens?.output || 0),
    }),
    { input: 0, output: 0 }
  );

  return (
    <div className="h-full bg-[#161026] flex flex-col select-none overflow-hidden border-r border-[#261d38] font-mono text-xs">
      {/* Top Brand Header for Dracode Multi-Sidebar */}
      <div className="h-8 min-h-[32px] bg-[#100b1c] border-b border-[#261d38] px-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <DracodeLogo size={17} />
          <span className="font-bold tracking-wider text-[#e2e8f0] text-[11px]">
            DRACODE
          </span>
          <span className="text-[9px] px-1.5 py-0.2 bg-[#281b3d] border border-[#ff007f]/40 text-[#00e5ff] font-bold uppercase">
            {mode === "explorer" ? "EXPLORER" : mode === "git" ? "DRACOOPS GIT" : "AI AGENT"}
          </span>
        </div>

        {mode === "git" && (
          <button
            onClick={refreshGit}
            className="text-[#7a7194] hover:text-[#00e5ff] p-1 cursor-pointer"
            title="Refresh DracoOps Git Telemetry"
          >
            <RefreshCw className={`w-3 h-3 ${isGitBusy ? "animate-spin text-[#00e5ff]" : ""}`} />
          </button>
        )}

        {mode === "agent" && (
          <button
            onClick={refreshAgentSessions}
            className="text-[#7a7194] hover:text-[#ff007f] p-1 cursor-pointer"
            title="Refresh Agent Stream"
          >
            <RefreshCw className={`w-3 h-3 ${isAgentLoading ? "animate-spin text-[#ff007f]" : ""}`} />
          </button>
        )}
      </div>

      {/* Main Dynamic Sidebar Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* 01. EXPLORER MODE */}
        {mode === "explorer" && (
          <div className="flex-1 overflow-hidden">
            <ExplorerView
              workspacePath={workspacePath}
              selectedFile={selectedFile}
              onOpenFile={onOpenFile}
              onOpenScope={onOpenScope}
            />
          </div>
        )}

        {/* 02. DRACOOPS GIT MODE (100% Real Git CLI Engine) */}
        {mode === "git" && (
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
            {!gitStatus?.isRepo ? (
              <div className="p-4 bg-[#120c1f] border border-[#261d38] text-center text-[#7a7194] space-y-1">
                <GitBranch className="w-6 h-6 mx-auto text-[#443a57]" />
                <p className="text-[11px] text-[#e2e8f0] font-bold">No Git Repository</p>
                <p className="text-[10px]">Active scope is not initialized with Git.</p>
              </div>
            ) : (
              <>
                {/* 1. Online vs Local-Only Repository Connection Status Card */}
                <div className="bg-[#120c1f] border border-[#261d38] p-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    {gitStatus.hasRemote ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#00e676] truncate">
                        <span className="w-2 h-2 rounded-full bg-[#00e676] animate-pulse shrink-0" />
                        <Globe className="w-3 h-3 text-[#00e5ff] shrink-0" />
                        <span className="truncate">
                          ONLINE // {gitStatus.upstream || "origin"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#ff8800] truncate">
                        <span className="w-2 h-2 rounded-full bg-[#ff8800] shrink-0" />
                        <HardDrive className="w-3 h-3 text-[#ff8800] shrink-0" />
                        <span>LOCAL REPO ONLY</span>
                      </div>
                    )}

                    {gitStatus.hasRemote && (
                      <button
                        onClick={() => handleGitSync("fetch")}
                        disabled={isGitBusy}
                        className="px-1.5 py-0.5 bg-[#161026] hover:bg-[#281b3d] text-[#00e5ff] border border-[#261d38] text-[9px] font-bold cursor-pointer shrink-0"
                        title="Fetch all remotes (git fetch --all --prune)"
                      >
                        FETCH
                      </button>
                    )}
                  </div>

                  <div
                    className="text-[9.5px] text-[#7a7194] bg-[#0b0813] px-1.5 py-1 border border-[#261d38] truncate"
                    title={gitStatus.remoteUrl || "No remote origin URL configured"}
                  >
                    {gitStatus.hasRemote
                      ? gitStatus.remoteUrl
                      : "No remote origin configured (local repository)"}
                  </div>
                </div>

                {/* 2. Active Branch Switcher & Creator + Sync Controls */}
                <div className="bg-[#120c1f] border border-[#261d38] p-2 space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 text-[#00e676] font-bold text-[10px]">
                      <GitBranch className="w-3.5 h-3.5 shrink-0" />
                      <span>BRANCH</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-[#00e5ff]" title="Commits Ahead / Behind Remote">
                        ↑{gitStatus.ahead} ↓{gitStatus.behind}
                      </span>
                      <button
                        onClick={() => setIsCreatingBranch(!isCreatingBranch)}
                        className="px-1.5 py-0.5 bg-[#161026] hover:bg-[#281b3d] text-[#ff007f] border border-[#ff007f]/40 text-[9px] font-bold cursor-pointer"
                        title="Create & Checkout New Branch"
                      >
                        + NEW
                      </button>
                    </div>
                  </div>

                  {/* Branch Selector Dropdown */}
                  <select
                    value={gitStatus.branch}
                    onChange={(e) => handleCheckoutBranch(e.target.value, false)}
                    disabled={isGitBusy}
                    className="w-full bg-[#0b0813] border border-[#261d38] focus:border-[#00e5ff] text-[#e2e8f0] text-[10px] p-1 outline-none font-mono cursor-pointer"
                  >
                    <option value={gitStatus.branch}>● {gitStatus.branch} (active)</option>
                    {(gitBranches?.local || [])
                      .filter((b) => b !== gitStatus.branch)
                      .map((b) => (
                        <option key={`loc-${b}`} value={b}>
                          ├─ {b}
                        </option>
                      ))}
                  </select>

                  {/* Inline New Branch Creator */}
                  {isCreatingBranch && (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newBranchName}
                        onChange={(e) => setNewBranchName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCheckoutBranch(newBranchName, true);
                          if (e.key === "Escape") setIsCreatingBranch(false);
                        }}
                        placeholder="feat/new-branch..."
                        className="flex-1 bg-[#0b0813] border border-[#ff007f] px-1.5 py-1 text-[10px] text-[#e2e8f0] outline-none font-mono"
                      />
                      <button
                        onClick={() => handleCheckoutBranch(newBranchName, true)}
                        className="px-2 py-1 bg-[#ff007f] text-white text-[9px] font-bold cursor-pointer"
                      >
                        CREATE
                      </button>
                    </div>
                  )}

                  {/* Pull & Push Buttons */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleGitSync("pull")}
                      disabled={isGitBusy || !gitStatus.hasRemote}
                      className="flex items-center justify-center gap-1 py-1 bg-[#161026] hover:bg-[#281b3d] disabled:opacity-40 text-[#00e5ff] border border-[#261d38] text-[10px] font-bold cursor-pointer"
                      title={
                        gitStatus.hasRemote
                          ? "Pull latest from remote"
                          : "No online remote configured"
                      }
                    >
                      <DownloadCloud className="w-3 h-3" />
                      <span>PULL</span>
                    </button>
                    <button
                      onClick={() => handleGitSync("push")}
                      disabled={isGitBusy || !gitStatus.hasRemote}
                      className="flex items-center justify-center gap-1 py-1 bg-[#161026] hover:bg-[#281b3d] disabled:opacity-40 text-[#ff007f] border border-[#261d38] text-[10px] font-bold cursor-pointer"
                      title={
                        gitStatus.hasRemote
                          ? "Push commits to remote"
                          : "No online remote configured"
                      }
                    >
                      <UploadCloud className="w-3 h-3" />
                      <span>PUSH</span>
                    </button>
                  </div>
                </div>

                {/* 3. Stage & Commit Box */}
                <div className="bg-[#120c1f] border border-[#261d38] p-2 space-y-2">
                  <textarea
                    value={commitMsg}
                    onChange={(e) => setCommitMsg(e.target.value)}
                    placeholder="Commit message (e.g. feat: update module)..."
                    rows={2}
                    className="w-full bg-[#0b0813] border border-[#261d38] focus:border-[#ff007f] p-1.5 text-[11px] text-[#e2e8f0] outline-none resize-none font-mono select-text"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleGitSync("commit")}
                      disabled={isGitBusy}
                      className="py-1 bg-[#281b3d] hover:bg-[#382654] text-[#e2e8f0] border border-[#ff007f]/40 text-[10px] font-bold cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Check className="w-3 h-3 text-[#00e676]" />
                      <span>COMMIT</span>
                    </button>
                    <button
                      onClick={() => handleGitSync("commit-push")}
                      disabled={isGitBusy}
                      className="py-1 bg-[#ff007f] hover:bg-[#d5006d] text-white text-[10px] font-bold cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>COMMIT+PUSH</span>
                    </button>
                  </div>
                  {gitFeedback && (
                    <div className="text-[10px] text-[#00e5ff] bg-[#0b0813] px-2 py-1 border border-[#261d38] truncate">
                      {gitFeedback}
                    </div>
                  )}
                </div>

                {/* 4. Working Tree Inspector */}
                <div className="bg-[#120c1f] border border-[#261d38] p-2 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#261d38] pb-1.5">
                    <span className="text-[10px] font-bold text-[#e2e8f0] uppercase tracking-wider">
                      WORKING TREE
                    </span>
                    {gitStatus.totalDirty === 0 ? (
                      <span className="text-[9px] px-1.5 py-0.2 bg-[#00e676]/15 border border-[#00e676]/50 text-[#00e676] font-bold">
                        CLEAN
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.2 bg-[#ff007f]/15 border border-[#ff007f]/50 text-[#ff007f] font-bold">
                        {gitStatus.totalDirty} MODIFIED
                      </span>
                    )}
                  </div>

                  {/* Staged Section */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-[#00e676] font-bold uppercase">
                      <span>Staged ({gitStatus.staged.length})</span>
                      {gitStatus.staged.length > 0 && (
                        <button
                          onClick={() => handleUnstage("__ALL__")}
                          className="text-[9px] text-[#7a7194] hover:text-[#ff1744] cursor-pointer"
                        >
                          UNSTAGE ALL
                        </button>
                      )}
                    </div>
                    {gitStatus.staged.map((f) => (
                      <div
                        key={`st-${f.path}`}
                        className="flex items-center justify-between gap-1 bg-[#0b0813] hover:bg-[#281b3d]/60 px-2 py-1 border border-[#261d38]"
                      >
                        <span className="text-[9px] font-bold px-1 bg-[#00e676]/20 text-[#00e676]">
                          {f.code || "S"}
                        </span>
                        <span
                          onClick={() => openRelativeRepoFile(f.path, true)}
                          onDoubleClick={() => openRelativeRepoFile(f.path, false)}
                          className="text-[11px] text-[#00e676] truncate cursor-pointer flex-1"
                          title={`${f.path} (Single-click: Preview | Double-click: Pin)`}
                        >
                          {f.path.split(/[/\\]/).pop()}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleInspectDiff(f.path, true)}
                            className="text-[#7a7194] hover:text-[#00e5ff] p-0.5 cursor-pointer"
                            title="Inspect Staged Diff"
                          >
                            <FileDiff className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleUnstage(f.path)}
                            className="text-[#7a7194] hover:text-[#ff8800] p-0.5 cursor-pointer"
                            title="Unstage"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Unstaged & Untracked Section */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[10px] text-[#ff8800] font-bold uppercase">
                      <span>
                        Unstaged ({gitStatus.unstaged.length + gitStatus.untracked.length})
                      </span>
                      {gitStatus.unstaged.length + gitStatus.untracked.length > 0 && (
                        <button
                          onClick={() => handleStage("__ALL__")}
                          className="text-[9px] text-[#00e5ff] hover:underline cursor-pointer"
                        >
                          + STAGE ALL
                        </button>
                      )}
                    </div>
                    {[...gitStatus.unstaged, ...gitStatus.untracked].map((f) => {
                      const isUntracked = f.code === "?" || f.status === "untracked";
                      return (
                        <div
                          key={`un-${f.path}`}
                          className="flex items-center justify-between gap-1 bg-[#0b0813] hover:bg-[#281b3d]/60 px-2 py-1 border border-[#261d38]"
                        >
                          <span
                            className={`text-[9px] font-bold px-1 ${
                              isUntracked
                                ? "bg-[#ff007f]/20 text-[#ff007f]"
                                : "bg-[#ff8800]/20 text-[#ff8800]"
                            }`}
                          >
                            {isUntracked ? "U" : f.code || "M"}
                          </span>
                          <span
                            onClick={() => openRelativeRepoFile(f.path, true)}
                            onDoubleClick={() => openRelativeRepoFile(f.path, false)}
                            className="text-[11px] text-[#cbd5e1] hover:text-[#00e5ff] truncate cursor-pointer flex-1"
                            title={`${f.path} (Single-click: Preview | Double-click: Pin)`}
                          >
                            {f.path.split(/[/\\]/).pop()}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {!isUntracked && (
                              <button
                                onClick={() => handleInspectDiff(f.path, false)}
                                className="text-[#7a7194] hover:text-[#00e5ff] p-0.5 cursor-pointer"
                                title="Inspect Working Tree Diff"
                              >
                                <FileDiff className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDiscard(f.path)}
                              className="text-[#7a7194] hover:text-[#ff1744] p-0.5 cursor-pointer"
                              title="Discard Changes"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleStage(f.path)}
                              className="text-[#7a7194] hover:text-[#00e676] p-0.5 cursor-pointer"
                              title="Stage File"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Inline Unified Diff Preview Drawer */}
                  {activeDiff && (
                    <div className="mt-2 bg-[#090610] border border-[#00e5ff]/50 p-2 space-y-1.5">
                      <div className="flex items-center justify-between border-b border-[#261d38] pb-1">
                        <span className="text-[10px] font-bold text-[#00e5ff] truncate">
                          DIFF // {activeDiff.path.split(/[/\\]/).pop()}
                        </span>
                        <button
                          onClick={() => setActiveDiff(null)}
                          className="text-[#7a7194] hover:text-[#ff1744] cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <pre className="max-h-40 overflow-auto text-[9.5px] leading-4 font-mono whitespace-pre select-text">
                        {activeDiff.diff
                          .split("\n")
                          .slice(0, 80)
                          .map((line, idx) => (
                            <div
                              key={idx}
                              className={
                                line.startsWith("+") && !line.startsWith("+++")
                                  ? "text-[#00e676] bg-[#00e676]/10 px-1"
                                  : line.startsWith("-") && !line.startsWith("---")
                                  ? "text-[#ff1744] bg-[#ff1744]/10 px-1"
                                  : line.startsWith("@@")
                                  ? "text-[#00e5ff]"
                                  : "text-[#94a3b8]"
                              }
                            >
                              {line}
                            </div>
                          ))}
                      </pre>
                    </div>
                  )}
                </div>

                {/* 5. Recent Commits */}
                {gitLogs.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] text-[#7a7194] font-bold uppercase">
                      Recent Commits
                    </span>
                    {gitLogs.slice(0, 5).map((log) => (
                      <div
                        key={log.hash}
                        className="bg-[#120c1f] p-1.5 border border-[#261d38] text-[10px]"
                      >
                        <div className="flex items-center justify-between text-[#00e5ff]">
                          <span className="font-bold">{log.hash}</span>
                          <span className="text-[9px] text-[#7a7194]">{log.date}</span>
                        </div>
                        <p className="text-[#cbd5e1] truncate mt-0.5">{log.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 03. AGENT MODE (100% Real Antigravity JSONL Telemetry Stream) */}
        {mode === "agent" && (
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
            {/* Session Selector & Live Token HUD */}
            <div className="bg-[#120c1f] border border-[#261d38] p-2 space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#ff007f] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>LIVE AGENT STREAM</span>
                </span>
                <span className="text-[#00e676] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-ping" />
                  <span>{agentSessions.length} SESSIONS</span>
                </span>
              </div>

              {agentSessions.length > 0 && (
                <select
                  value={activeConvId}
                  onChange={async (e) => {
                    const id = e.target.value;
                    setActiveConvId(id);
                    if (window.dracoAPI?.attachTelemetry) {
                      const res = await window.dracoAPI.attachTelemetry(id, 40);
                      if (res.success && res.history) {
                        setAgentEvents(res.history);
                      }
                    }
                  }}
                  className="w-full bg-[#0b0813] border border-[#261d38] text-[#00e5ff] text-[10px] p-1 outline-none font-mono"
                >
                  {agentSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id.slice(0, 8)}... ({s.lineEstimate} steps)
                    </option>
                  ))}
                </select>
              )}

              <div className="grid grid-cols-2 gap-1 text-[9.5px] bg-[#0b0813] p-1.5 border border-[#261d38]">
                <div>
                  <span className="text-[#7a7194]">IN TOKENS:</span>{" "}
                  <span className="text-[#00e5ff] font-bold">
                    {totalTokens.input.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[#7a7194]">OUT TOKENS:</span>{" "}
                  <span className="text-[#ff007f] font-bold">
                    {totalTokens.output.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Cognitive Steps & Tool Call Feed */}
            <div className="space-y-1.5">
              {agentEvents.length === 0 ? (
                <div className="p-4 text-center text-[#7a7194] bg-[#120c1f] border border-[#261d38]">
                  <Activity className="w-5 h-5 mx-auto mb-1 text-[#443a57]" />
                  <p className="text-[10px]">No telemetry events recorded yet.</p>
                </div>
              ) : (
                agentEvents
                  .slice()
                  .reverse()
                  .slice(0, 20)
                  .map((ev) => (
                    <div
                      key={ev.id}
                      className="bg-[#120c1f] border border-[#261d38] p-2 space-y-1 text-[10px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[#00e5ff] font-bold">
                          STEP #{ev.stepIndex}
                        </span>
                        <span className="text-[9px] text-[#7a7194]">
                          {ev.type.replace("_", " ")}
                        </span>
                      </div>

                      {ev.userPrompt && (
                        <p className="text-[#ff007f] line-clamp-2 bg-[#0b0813] p-1 border-l-2 border-[#ff007f]">
                          {ev.userPrompt}
                        </p>
                      )}

                      {ev.modelThinking && (
                        <p className="text-[#94a3b8] italic line-clamp-2">
                          {ev.modelThinking}
                        </p>
                      )}

                      {ev.toolCalls && ev.toolCalls.length > 0 && (
                        <div className="space-y-1 pt-0.5">
                          {ev.toolCalls.map((tc) => (
                            <div
                              key={tc.id}
                              onClick={() => {
                                if (tc.filePath) {
                                  const name = tc.filePath.split(/[/\\]/).pop() || tc.filePath;
                                  onOpenFile(tc.filePath, name, true);
                                }
                              }}
                              onDoubleClick={() => {
                                if (tc.filePath) {
                                  const name = tc.filePath.split(/[/\\]/).pop() || tc.filePath;
                                  onOpenFile(tc.filePath, name, false);
                                }
                              }}
                              className={`flex items-center gap-1.5 px-1.5 py-1 bg-[#0b0813] border border-[#261d38] ${
                                tc.filePath ? "hover:border-[#00e5ff] cursor-pointer" : ""
                              }`}
                            >
                              {tc.command ? (
                                <Terminal className="w-3 h-3 text-[#ff8800] shrink-0" />
                              ) : (
                                <FileCode className="w-3 h-3 text-[#00e676] shrink-0" />
                              )}
                              <span className="text-[#e2e8f0] font-bold truncate">
                                {tc.name}
                              </span>
                              {tc.filePath && (
                                <span className="text-[#00e5ff] truncate ml-auto">
                                  {tc.filePath.split(/[/\\]/).pop()}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Icon Mode Switcher Bar (Explorer | Git | Agent) */}
      <div className="h-10 min-h-[40px] bg-[#0e0918] border-t border-[#261d38] grid grid-cols-3 divide-x divide-[#261d38]">
        <DracoTooltip content="Dracode File Explorer" position="top" accent="cyan">
          <button
            onClick={() => setMode("explorer")}
            className={`h-full w-full flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer relative ${
              mode === "explorer"
                ? "bg-[#281b3d] text-[#00e5ff]"
                : "text-[#7a7194] hover:text-[#e2e8f0] hover:bg-[#161026]"
            }`}
          >
            {mode === "explorer" && (
              <span className="absolute top-0 left-0 right-0 h-0.5 bg-[#00e5ff]" />
            )}
            <FolderTree className="w-3.5 h-3.5" />
            <span className="text-[9px] font-bold tracking-wider">EXPLORER</span>
          </button>
        </DracoTooltip>

        <DracoTooltip content="DracoOps Git Workstation" position="top" accent="green">
          <button
            onClick={() => setMode("git")}
            className={`h-full w-full flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer relative ${
              mode === "git"
                ? "bg-[#281b3d] text-[#00e676]"
                : "text-[#7a7194] hover:text-[#e2e8f0] hover:bg-[#161026]"
            }`}
          >
            {mode === "git" && (
              <span className="absolute top-0 left-0 right-0 h-0.5 bg-[#00e676]" />
            )}
            <div className="relative">
              <GitBranch className="w-3.5 h-3.5" />
              {gitStatus && gitStatus.totalDirty > 0 && (
                <span className="absolute -top-1.5 -right-3 px-1 bg-[#ff007f] text-white text-[8px] font-bold rounded-xs">
                  {gitStatus.totalDirty}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold tracking-wider">GIT</span>
          </button>
        </DracoTooltip>

        <DracoTooltip content="Dracode AI Agent Stream" position="top" accent="pink">
          <button
            onClick={() => setMode("agent")}
            className={`h-full w-full flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer relative ${
              mode === "agent"
                ? "bg-[#281b3d] text-[#ff007f]"
                : "text-[#7a7194] hover:text-[#e2e8f0] hover:bg-[#161026]"
            }`}
          >
            {mode === "agent" && (
              <span className="absolute top-0 left-0 right-0 h-0.5 bg-[#ff007f]" />
            )}
            <div className="relative">
              <Cpu className="w-3.5 h-3.5" />
              <span className="absolute -top-0.5 -right-1.5 w-1.5 h-1.5 rounded-full bg-[#00e676]" />
            </div>
            <span className="text-[9px] font-bold tracking-wider">AGENT</span>
          </button>
        </DracoTooltip>
      </div>
    </div>
  );
};

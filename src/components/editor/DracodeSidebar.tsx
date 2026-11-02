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
  UserCheck,
  Link2,
  FolderGit2,
} from "lucide-react";
import { ExplorerView } from "../explorer/ExplorerView";
import { DracodeLogo } from "../common/DracodeLogo";
import { DracoTooltip } from "../common/DracoTooltip";
import {
  GitStatusResult,
  GitBranchesResult,
  GitCommitLog,
  GitUserConfig,
  GitResolvedRepo,
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
  const [userConfig, setUserConfig] = useState<GitUserConfig | null>(null);
  const [commitMsg, setCommitMsg] = useState("");
  const [isGitBusy, setIsGitBusy] = useState(false);
  // Milestone M6.1: Adaptive Scope Resolution & Sub-Repo Overrides
  const [resolvedRepo, setResolvedRepo] = useState<GitResolvedRepo | null>(null);
  const [manualRepoOverride, setManualRepoOverride] = useState<string | null>(null);

  const effectiveGitCwd =
    (resolvedRepo?.isRepo
      ? resolvedRepo.repoPath
      : manualRepoOverride || workspacePath) || workspacePath;

  const [gitFeedback, setGitFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  // Branch Creation & Inline Working Tree Diff State
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [activeDiff, setActiveDiff] = useState<{
    path: string;
    staged: boolean;
    diff: string;
  } | null>(null);

  // Milestone M6: Identity Modal & Remote Origin Config State
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [isGlobalIdentity, setIsGlobalIdentity] = useState(true);
  const [pendingActionAfterIdentity, setPendingActionAfterIdentity] = useState<
    "commit" | "commit-push" | "push" | "pull" | "fetch" | null
  >(null);

  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [remoteUrlInput, setRemoteUrlInput] = useState("");

  // Real Agent Telemetry State (from electron/tailerService.cjs)
  const [agentSessions, setAgentSessions] = useState<TelemetrySessionItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>("");
  const [agentEvents, setAgentEvents] = useState<TelemetryEvent[]>([]);
  const [isAgentLoading, setIsAgentLoading] = useState(false);

  // Refresh Real Git Telemetry (Adaptive Resolution + Branches + Logs + Identity)
  const refreshGit = useCallback(async () => {
    if (!workspacePath) return;
    try {
      let resolved: GitResolvedRepo | null = null;
      if (window.dracoAPI?.gitResolveRepo) {
        resolved = await window.dracoAPI.gitResolveRepo(
          workspacePath,
          selectedFile,
          manualRepoOverride
        );
        setResolvedRepo(resolved);
      }

      const targetCwd =
        (resolved?.isRepo
          ? resolved.repoPath
          : manualRepoOverride || workspacePath) || workspacePath;

      if (!resolved || resolved.isRepo) {
        const [st, br, lg, uc] = await Promise.all([
          window.dracoAPI?.gitStatus
            ? window.dracoAPI.gitStatus(targetCwd)
            : Promise.resolve(null),
          window.dracoAPI?.gitBranches
            ? window.dracoAPI.gitBranches(targetCwd)
            : Promise.resolve(null),
          window.dracoAPI?.gitLog
            ? window.dracoAPI.gitLog(targetCwd, 8)
            : Promise.resolve([]),
          window.dracoAPI?.gitUserConfig
            ? window.dracoAPI.gitUserConfig(targetCwd)
            : Promise.resolve(null),
        ]);
        if (st) setGitStatus(st);
        if (br) setGitBranches(br);
        setGitLogs(lg || []);
        if (uc) {
          setUserConfig(uc);
          if (uc.name) setAuthorName(uc.name);
          if (uc.email) setAuthorEmail(uc.email);
        }
      } else {
        setGitStatus({
          isRepo: false,
          branch: "no-repo",
          staged: [],
          unstaged: [],
          untracked: [],
          ahead: 0,
          behind: 0,
          hasRemote: false,
          remoteUrl: "",
          upstream: "",
          totalDirty: 0,
        });
        setGitBranches(null);
        setGitLogs([]);
      }
    } catch {}
  }, [workspacePath, selectedFile, manualRepoOverride]);

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
    await window.dracoAPI.gitStage(effectiveGitCwd, filePath);
    await refreshGit();
    setIsGitBusy(false);
  };

  const handleUnstage = async (filePath: string) => {
    if (!window.dracoAPI?.gitUnstage) return;
    setIsGitBusy(true);
    await window.dracoAPI.gitUnstage(effectiveGitCwd, filePath);
    await refreshGit();
    setIsGitBusy(false);
  };

  const handleDiscard = async (filePath: string) => {
    if (!window.dracoAPI?.gitDiscard) return;
    setIsGitBusy(true);
    await window.dracoAPI.gitDiscard(effectiveGitCwd, filePath);
    if (activeDiff?.path === filePath) setActiveDiff(null);
    await refreshGit();
    setIsGitBusy(false);
  };

  const handleCheckoutBranch = async (branchName: string, createNew: boolean = false) => {
    if (!window.dracoAPI?.gitCheckout || !branchName.trim()) return;
    setIsGitBusy(true);
    setGitFeedback({ message: `${createNew ? "Creating" : "Switching to"} ${branchName.trim()}...` });
    try {
      const res = await window.dracoAPI.gitCheckout(effectiveGitCwd, branchName.trim(), createNew);
      if (res.ok) {
        setGitFeedback({ message: `Switched to ${res.branch || branchName.trim()}` });
        setIsCreatingBranch(false);
        setNewBranchName("");
      } else {
        setGitFeedback({ message: res.error || "Branch checkout failed", isError: true });
      }
      await refreshGit();
    } catch (err: any) {
      setGitFeedback({ message: err.message || "Checkout error", isError: true });
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
    const res = await window.dracoAPI.gitDiff(effectiveGitCwd, filePath, staged);
    setActiveDiff({
      path: filePath,
      staged,
      diff: res.diff || "// No textual diff output (untracked or binary file)",
    });
  };

  // Milestone M6: Handle Git Author Identity Save
  const handleSaveIdentity = async () => {
    if (!authorName.trim() || !authorEmail.trim() || !window.dracoAPI?.gitSetUserConfig) return;
    setIsGitBusy(true);
    const res = await window.dracoAPI.gitSetUserConfig(effectiveGitCwd, {
      name: authorName.trim(),
      email: authorEmail.trim(),
      isGlobal: isGlobalIdentity,
    });
    setIsGitBusy(false);
    if (res.ok) {
      setShowIdentityModal(false);
      setUserConfig({
        hasIdentity: true,
        name: authorName.trim(),
        email: authorEmail.trim(),
        isGlobal: isGlobalIdentity,
      });
      setGitFeedback({ message: "Git author identity configured." });
      setTimeout(() => setGitFeedback(null), 3000);
      if (pendingActionAfterIdentity) {
        const nextAction = pendingActionAfterIdentity;
        setPendingActionAfterIdentity(null);
        setTimeout(() => handleGitSync(nextAction), 200);
      }
    } else {
      setGitFeedback({ message: res.error || "Failed to set identity", isError: true });
    }
  };

  // Milestone M6: Handle Add Remote Origin
  const handleSaveRemote = async () => {
    if (!remoteUrlInput.trim() || !window.dracoAPI?.gitAddRemote) return;
    setIsGitBusy(true);
    const res = await window.dracoAPI.gitAddRemote(effectiveGitCwd, remoteUrlInput.trim());
    setIsGitBusy(false);
    if (res.ok) {
      setShowRemoteModal(false);
      setRemoteUrlInput("");
      setGitFeedback({ message: "Remote origin URL connected." });
      await refreshGit();
    } else {
      setGitFeedback({ message: res.error || "Failed to configure remote URL", isError: true });
    }
    setTimeout(() => setGitFeedback(null), 3500);
  };

  const handleGitSync = async (
    action: "commit" | "commit-push" | "push" | "pull" | "fetch"
  ) => {
    if (!window.dracoAPI?.gitSync) return;

    // Milestone M6 Guard 1: Verify Git Author Identity before Commit
    if (action === "commit" || action === "commit-push") {
      if (!commitMsg.trim()) {
        setGitFeedback({ message: "Enter commit message first.", isError: true });
        setTimeout(() => setGitFeedback(null), 2500);
        return;
      }

      if (userConfig && !userConfig.hasIdentity) {
        setPendingActionAfterIdentity(action);
        setShowIdentityModal(true);
        return;
      }
    }

    // Milestone M6 Guard 2: Guard Push / Commit+Push on Local-Only Repos
    if ((action === "push" || action === "commit-push") && gitStatus && !gitStatus.hasRemote) {
      setGitFeedback({
        message: "LOCAL REPO ONLY: Configure remote origin URL to push.",
        isError: true,
      });
      setShowRemoteModal(true);
      return;
    }

    setIsGitBusy(true);
    setGitFeedback({ message: `Running ${action.toUpperCase()}...` });
    try {
      const res = await window.dracoAPI.gitSync(effectiveGitCwd, {
        message: commitMsg.trim(),
        action,
      });
      if (res.ok) {
        if (action === "commit" || action === "commit-push") setCommitMsg("");
        setGitFeedback({ message: `${action.toUpperCase()} OK` });
      } else {
        const errMsg = res.error || "Git operation failed";
        // Auto-detect identity unknown error from git output if config check missed
        if (errMsg.toLowerCase().includes("author identity unknown") || errMsg.toLowerCase().includes("tell me who you are")) {
          setPendingActionAfterIdentity(action);
          setShowIdentityModal(true);
        }
        setGitFeedback({ message: errMsg, isError: true });
      }
      await refreshGit();
    } catch (err: any) {
      setGitFeedback({ message: err.message || "Error", isError: true });
    } finally {
      setIsGitBusy(false);
      setTimeout(() => setGitFeedback(null), 4000);
    }
  };

  // Milestone M6.1: 1-Click Git Repository Initialization
  const handleGitInit = async () => {
    if (!window.dracoAPI?.gitInit) return;
    setIsGitBusy(true);
    setGitFeedback({ message: "Initializing Git repository (git init -b main)..." });
    try {
      const target = effectiveGitCwd || workspacePath;
      const res = await window.dracoAPI.gitInit(target);
      if (res.ok) {
        setGitFeedback({ message: `✓ Initialized Git repository in ${target}` });
        await refreshGit();
      } else {
        setGitFeedback({ message: res.error || "Failed to initialize Git repository", isError: true });
      }
    } catch (err: any) {
      setGitFeedback({ message: err.message || "Git init error", isError: true });
    } finally {
      setIsGitBusy(false);
      setTimeout(() => setGitFeedback(null), 3500);
    }
  };

  // Milestone M6.1: Auto-generate Local Fallback Identity (Offline OK)
  const handleAutoGenerateIdentity = async (autoSaveAndProceed = false) => {
    let name = "Dracode Operator";
    let email = "operator@dracodeck.local";
    try {
      if (window.dracoAPI?.gitDefaultIdentity) {
        const def = await window.dracoAPI.gitDefaultIdentity();
        if (def?.name) name = def.name;
        if (def?.email) email = def.email;
      }
    } catch {}

    setAuthorName(name);
    setAuthorEmail(email);
    setIsGlobalIdentity(true);

    if (autoSaveAndProceed && window.dracoAPI?.gitSetUserConfig) {
      setIsGitBusy(true);
      try {
        const res = await window.dracoAPI.gitSetUserConfig(effectiveGitCwd, {
          name,
          email,
          isGlobal: true,
        });
        if (res.ok) {
          setUserConfig({
            hasIdentity: true,
            name,
            email,
            isGlobal: true,
          });
          setShowIdentityModal(false);
          setGitFeedback({ message: `✓ Local author identity configured (${name} <${email}>). Ready!` });
          setTimeout(() => setGitFeedback(null), 3000);

          if (pendingActionAfterIdentity) {
            const nextAction = pendingActionAfterIdentity;
            setPendingActionAfterIdentity(null);
            setTimeout(() => handleGitSync(nextAction), 200);
          }
        } else {
          setGitFeedback({ message: res.error || "Failed to save identity", isError: true });
        }
      } catch (err: any) {
        setGitFeedback({ message: err.message, isError: true });
      } finally {
        setIsGitBusy(false);
      }
    }
  };

  const openRelativeRepoFile = (relPath: string, isPreview: boolean = true) => {
    const cleanRel = relPath.replace(/^[/\\]+/, "");
    const baseDir = effectiveGitCwd || workspacePath;
    const fullPath = baseDir
      ? `${baseDir.replace(/[/\\]+$/, "")}/${cleanRel}`
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
    <div className="h-full bg-[#161026] flex flex-col select-none overflow-hidden border-r border-[#261d38] font-mono text-xs relative">
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowIdentityModal(true)}
              className="text-[#7a7194] hover:text-[#00e676] p-1 cursor-pointer"
              title={
                userConfig?.hasIdentity
                  ? `Git Author: ${userConfig.name} <${userConfig.email}>`
                  : "Setup Git Author Identity"
              }
            >
              <UserCheck className={`w-3.5 h-3.5 ${userConfig?.hasIdentity ? "text-[#00e676]" : "text-[#ff8800]"}`} />
            </button>
            <button
              onClick={refreshGit}
              className="text-[#7a7194] hover:text-[#00e5ff] p-1 cursor-pointer"
              title="Refresh DracoOps Git Telemetry"
            >
              <RefreshCw className={`w-3 h-3 ${isGitBusy ? "animate-spin text-[#00e5ff]" : ""}`} />
            </button>
          </div>
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
              <div className="space-y-2.5 font-mono">
                {/* Milestone M6.1 Sub-Repositories Card */}
                {resolvedRepo?.subRepos && resolvedRepo.subRepos.length > 0 && (
                  <div className="p-2.5 bg-[#120c1f] border border-[#261d38] space-y-2">
                    <div className="flex items-center gap-1.5 text-[#00e5ff] text-[10px] font-bold tracking-wider">
                      <FolderGit2 className="w-3.5 h-3.5 text-[#00e5ff] shrink-0" />
                      <span>DETECTED SUB-REPOSITORIES ({resolvedRepo.subRepos.length})</span>
                    </div>
                    <p className="text-[9.5px] text-[#94a3b8] leading-tight">
                      Scope <span className="text-[#e2e8f0] font-bold">{workspacePath}</span> is a root container. Select a project repository:
                    </p>
                    <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                      {resolvedRepo.subRepos.map((sub) => (
                        <button
                          key={sub.path}
                          onClick={() => setManualRepoOverride(sub.path)}
                          className="w-full flex items-center justify-between p-1.5 bg-[#0b0813] hover:bg-[#1a132e] border border-[#261d38] hover:border-[#00e5ff] text-left transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <GitBranch className="w-3 h-3 text-[#ff007f] group-hover:text-[#00e5ff] shrink-0" />
                            <span className="text-[10px] text-[#e2e8f0] font-bold truncate">
                              {sub.name}
                            </span>
                          </div>
                          <span className="text-[8.5px] text-[#7a7194] group-hover:text-[#00e5ff] font-bold shrink-0">
                            SELECT ➔
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Milestone M6.1 1-Click git init Box */}
                <div className="p-4 bg-[#120c1f] border border-[#261d38] text-center space-y-2.5">
                  <div className="w-8 h-8 mx-auto rounded-full bg-[#1b122c] border border-[#3b2a59] flex items-center justify-center">
                    <GitBranch className="w-4 h-4 text-[#7a7194]" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-[#e2e8f0] font-bold uppercase tracking-wider">
                      No Git Repository
                    </p>
                    <p className="text-[10px] text-[#94a3b8] leading-tight">
                      Current scope <span className="text-[#00e5ff] break-all">{effectiveGitCwd || workspacePath}</span> is not initialized with Git.
                    </p>
                  </div>
                  <button
                    onClick={handleGitInit}
                    disabled={isGitBusy}
                    className="w-full py-2 px-3 bg-[#ff007f] hover:bg-[#d5006d] disabled:opacity-40 text-white text-[10px] font-bold tracking-wider cursor-pointer shadow-[0_0_15px_rgba(255,0,127,0.25)] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>⚡ INITIALIZE GIT REPOSITORY (git init)</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Milestone M6.1: Active Repo Boundary & Quick Switcher */}
                <div className="bg-[#120c1f] border border-[#261d38] p-1.5 flex items-center justify-between gap-1 text-[9.5px]">
                  <div className="flex items-center gap-1.5 truncate">
                    <FolderGit2 className="w-3.5 h-3.5 text-[#00e5ff] shrink-0" />
                    <span className="text-[9px] text-[#7a7194] uppercase font-bold shrink-0">REPO:</span>
                    <span className="text-[10px] text-[#e2e8f0] font-bold truncate" title={effectiveGitCwd}>
                      {resolvedRepo?.repoName || effectiveGitCwd.split(/[/\\]/).pop() || effectiveGitCwd}
                    </span>
                    {resolvedRepo?.source === "file" && (
                      <span className="text-[8px] px-1 py-0.2 bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/30 font-bold shrink-0">
                        AUTO-FILE
                      </span>
                    )}
                  </div>
                  {resolvedRepo?.subRepos && resolvedRepo.subRepos.length > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      <select
                        value={effectiveGitCwd}
                        onChange={(e) => setManualRepoOverride(e.target.value)}
                        className="bg-[#0b0813] border border-[#261d38] text-[#00e5ff] text-[9px] px-1 py-0.5 outline-none font-mono cursor-pointer"
                        title="Switch active Git repository"
                      >
                        <option value={effectiveGitCwd}>
                          {resolvedRepo?.repoName || "Select Repo"}
                        </option>
                        {resolvedRepo.subRepos
                          .filter((sub) => sub.path !== effectiveGitCwd)
                          .map((sub) => (
                            <option key={sub.path} value={sub.path}>
                              {sub.name}
                            </option>
                          ))}
                      </select>
                      {manualRepoOverride && (
                        <button
                          onClick={() => setManualRepoOverride(null)}
                          title="Reset to automatic file/workspace resolution"
                          className="text-[#7a7194] hover:text-[#ff1744] text-[9px] px-1 cursor-pointer font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>
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

                    <div className="flex items-center gap-1">
                      {!gitStatus.hasRemote && (
                        <button
                          onClick={() => setShowRemoteModal(true)}
                          className="px-1.5 py-0.5 bg-[#161026] hover:bg-[#281b3d] text-[#ff8800] border border-[#ff8800]/40 text-[9px] font-bold cursor-pointer shrink-0"
                          title="Connect Remote Origin URL"
                        >
                          + REMOTE
                        </button>
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
                  </div>

                  <div
                    className="text-[9.5px] text-[#7a7194] bg-[#0b0813] px-1.5 py-1 border border-[#261d38] truncate flex items-center justify-between"
                    title={gitStatus.remoteUrl || "No remote origin configured"}
                  >
                    <span className="truncate">
                      {gitStatus.hasRemote
                        ? gitStatus.remoteUrl
                        : "No remote origin (local repository only)"}
                    </span>
                    {gitStatus.hasRemote && (
                      <button
                        onClick={() => {
                          setRemoteUrlInput(gitStatus.remoteUrl || "");
                          setShowRemoteModal(true);
                        }}
                        className="text-[9px] text-[#00e5ff] hover:underline ml-1 shrink-0"
                      >
                        Edit
                      </button>
                    )}
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

                  {/* Pull & Push Buttons with Local-Only Protection */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleGitSync("pull")}
                      disabled={isGitBusy || !gitStatus.hasRemote}
                      className="flex items-center justify-center gap-1 py-1 bg-[#161026] hover:bg-[#281b3d] disabled:opacity-40 text-[#00e5ff] border border-[#261d38] text-[10px] font-bold cursor-pointer"
                      title={
                        gitStatus.hasRemote
                          ? "Pull latest from remote"
                          : "No remote origin configured"
                      }
                    >
                      <DownloadCloud className="w-3 h-3" />
                      <span>PULL</span>
                    </button>
                    <button
                      onClick={() => handleGitSync("push")}
                      disabled={isGitBusy}
                      className={`flex items-center justify-center gap-1 py-1 border text-[10px] font-bold cursor-pointer ${
                        gitStatus.hasRemote
                          ? "bg-[#161026] hover:bg-[#281b3d] text-[#ff007f] border-[#261d38]"
                          : "bg-[#161026] text-[#7a7194] border-[#261d38] hover:border-[#ff8800]/50"
                      }`}
                      title={
                        gitStatus.hasRemote
                          ? "Push commits to remote"
                          : "Local repository only (Click to configure remote)"
                      }
                    >
                      <UploadCloud className="w-3 h-3" />
                      <span>{gitStatus.hasRemote ? "PUSH" : "PUSH (LOCAL)"}</span>
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

                  {/* Expanded Diagnostic Feedback Drawer */}
                  {gitFeedback && (
                    <div
                      className={`text-[10px] p-2 border space-y-1 ${
                        gitFeedback.isError
                          ? "bg-[#1f0a14] border-[#ff1744] text-[#ff80ab]"
                          : "bg-[#0b0813] border-[#00e5ff] text-[#00e5ff]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold leading-tight break-all">
                          {gitFeedback.message}
                        </span>
                        <button
                          onClick={() => setGitFeedback(null)}
                          className="text-[#7a7194] hover:text-[#e2e8f0] shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      {gitFeedback.isError &&
                        (gitFeedback.message.toLowerCase().includes("author") ||
                          gitFeedback.message.toLowerCase().includes("tell me who you are")) && (
                          <button
                            onClick={() => setShowIdentityModal(true)}
                            className="mt-1 px-2 py-0.5 bg-[#ff007f] text-white text-[9.5px] font-bold cursor-pointer"
                          >
                            Set Author Identity Now
                          </button>
                        )}

                      {gitFeedback.isError &&
                        gitFeedback.message.toLowerCase().includes("local repo only") && (
                          <button
                            onClick={() => setShowRemoteModal(true)}
                            className="mt-1 px-2 py-0.5 bg-[#00e5ff] text-[#0b0813] text-[9.5px] font-bold cursor-pointer"
                          >
                            Connect Remote URL Now
                          </button>
                        )}
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

      {/* Milestone M6 Modal 1: Git Author Identity Setup Modal */}
      {showIdentityModal && (
        <div
          onClick={() => setShowIdentityModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-mono select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#120c1f] border border-[#ff007f] shadow-[0_20px_60px_rgba(0,0,0,0.95)] p-4 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#261d38] pb-2">
              <div className="flex items-center gap-2 text-[#e2e8f0] font-bold">
                <UserCheck className="w-4 h-4 text-[#ff007f]" />
                <span>GIT AUTHOR IDENTITY</span>
              </div>
              <button
                onClick={() => setShowIdentityModal(false)}
                className="text-[#7a7194] hover:text-[#ff1744] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#0b0813] border border-[#261d38] p-2 space-y-1">
              <div className="flex items-center gap-1.5 text-[#00e5ff] text-[10px] font-bold">
                <Sparkles className="w-3.5 h-3.5 text-[#00e5ff]" />
                <span>OFFLINE LOCAL IDENTITY OK</span>
              </div>
              <p className="text-[10px] text-[#94a3b8] leading-tight">
                Git requires any name & email string to sign commits offline on your laptop. You do <b>NOT</b> need a real GitHub account or password.
              </p>
            </div>

            <button
              onClick={() => handleAutoGenerateIdentity(false)}
              type="button"
              className="w-full py-1.5 px-2 bg-[#1b122c] hover:bg-[#261d38] border border-[#00e5ff]/50 text-[#00e5ff] text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Sparkles className="w-3 h-3 text-[#00e5ff]" />
              <span>⚡ AUTO-POPULATE LOCAL IDENTITY</span>
            </button>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-[#7a7194] block uppercase font-bold mb-1">
                  Author Name / Handle
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. elrazaq"
                  className="w-full bg-[#0b0813] border border-[#261d38] focus:border-[#00e5ff] text-[#e2e8f0] p-1.5 outline-none font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#7a7194] block uppercase font-bold mb-1">
                  Author Email Address
                </label>
                <input
                  type="email"
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  placeholder="e.g. elrazaq@users.noreply.github.com"
                  className="w-full bg-[#0b0813] border border-[#261d38] focus:border-[#00e5ff] text-[#e2e8f0] p-1.5 outline-none font-mono text-[11px]"
                />
              </div>

              <label className="flex items-center gap-2 text-[10px] text-[#cbd5e1] cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isGlobalIdentity}
                  onChange={(e) => setIsGlobalIdentity(e.target.checked)}
                  className="accent-[#ff007f]"
                />
                <span>Save globally for all repositories (--global)</span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#261d38]">
              <button
                onClick={() => handleAutoGenerateIdentity(true)}
                disabled={isGitBusy}
                title="Auto-fill identity, save, and proceed immediately"
                className="px-2.5 py-1 bg-[#00e5ff]/20 hover:bg-[#00e5ff]/30 text-[#00e5ff] border border-[#00e5ff]/50 text-[10px] font-bold cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>1-CLICK AUTO-SAVE</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowIdentityModal(false)}
                  className="px-2 py-1 text-[#7a7194] hover:text-[#cbd5e1] text-[10px] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveIdentity}
                  disabled={!authorName.trim() || !authorEmail.trim() || isGitBusy}
                  className="px-3 py-1 bg-[#ff007f] hover:bg-[#d5006d] disabled:opacity-40 text-white text-[10px] font-bold cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>SAVE</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Milestone M6 Modal 2: Add Remote Origin URL Modal */}
      {showRemoteModal && (
        <div
          onClick={() => setShowRemoteModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-mono select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#120c1f] border border-[#00e5ff] shadow-[0_20px_60px_rgba(0,0,0,0.95)] p-4 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#261d38] pb-2">
              <div className="flex items-center gap-2 text-[#e2e8f0] font-bold">
                <Link2 className="w-4 h-4 text-[#00e5ff]" />
                <span>CONNECT REMOTE ORIGIN</span>
              </div>
              <button
                onClick={() => setShowRemoteModal(false)}
                className="text-[#7a7194] hover:text-[#ff1744] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-[#94a3b8]">
              This workspace is currently local-only. Enter a remote Git repository URL (e.g. GitHub, GitLab) to enable push and sync.
            </p>

            <div>
              <label className="text-[10px] text-[#7a7194] block uppercase font-bold mb-1">
                Remote Origin URL
              </label>
              <input
                type="text"
                value={remoteUrlInput}
                onChange={(e) => setRemoteUrlInput(e.target.value)}
                placeholder="https://github.com/username/repository.git"
                className="w-full bg-[#0b0813] border border-[#261d38] focus:border-[#00e5ff] text-[#e2e8f0] p-1.5 outline-none font-mono text-[11px]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#261d38]">
              <button
                onClick={() => setShowRemoteModal(false)}
                className="px-2.5 py-1 text-[#7a7194] hover:text-[#cbd5e1] text-[10px] font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRemote}
                disabled={!remoteUrlInput.trim() || isGitBusy}
                className="px-3 py-1 bg-[#00e5ff] hover:bg-[#00b4cc] text-[#0b0813] font-bold text-[10px] cursor-pointer flex items-center gap-1 disabled:opacity-40"
              >
                <Check className="w-3.5 h-3.5" />
                <span>CONNECT REPO</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

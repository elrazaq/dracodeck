import React, { useState, useEffect, useCallback, useRef } from "react";
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
  ChevronRight,
  MoreHorizontal,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Search,
  MoreVertical,
  Columns,
  PanelLeft,
  ArrowUp,
  ArrowRight,
  Code2,
  Paperclip,
  Folder,
  AtSign,
  Gauge,
  Trash2,
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

  // Milestone M8: Multi-Agent Provider Selector & Official Antigravity Live Bridge
  type AgentProviderId = "antigravity" | "copilot" | "codex" | "claude" | "cursor";
  const [selectedProvider, setSelectedProvider] = useState<AgentProviderId>("antigravity");
  const [agentSubView, setAgentSubView] = useState<"chat" | "telemetry">("chat");
  const [agyState, setAgyState] = useState<{
    connected: boolean;
    agyBinaryPath: string;
    workspacePath: string;
    projectName: string;
    projectId: string;
    projectExisted: boolean;
    autoCreatedProject: boolean;
    sessions: Array<{
      id: string;
      title: string;
      stepCount: number;
      status: string;
      lastModified: string;
      projectId: string;
      isNew?: boolean;
    }>;
    activeSessionId: string;
    messages: Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      thinking?: string;
      tools?: Array<{ name: string; summary: string }>;
      timestamp: string;
      stepIndex?: number;
      durationText?: string;
      stepCount?: number;
    }>;
  } | null>(null);
  const [isAgyConnecting, setIsAgyConnecting] = useState(false);
  const [isAgySending, setIsAgySending] = useState(false);
  const [agyPromptInput, setAgyPromptInput] = useState("");
  const [agyStatusNotice, setAgyStatusNotice] = useState<string | null>(null);
  const [connectedScopeRef, setConnectedScopeRef] = useState<string>("");

  // Antigravity UI State (Matching Official Antigravity Chat Layout)
  const [isProviderMenuOpen, setIsProviderMenuOpen] = useState(false);
  const [isSessionMenuOpen, setIsSessionMenuOpen] = useState(false);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState("gemini-3.8-flash-medium");
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  // Real Antigravity Skills & Actions
  const [availableSkills, setAvailableSkills] = useState<Array<{ name: string; command: string; description: string }>>([
    { name: "caveman", command: "/caveman", description: "Terse caveman voice: answer first, fluff gone, technical facts kept." },
    { name: "design-taste-frontend", command: "/design-taste-frontend", description: "Anti-slop frontend art direction and typography." },
    { name: "hallmark", command: "/hallmark", description: "Authentic design tokens and evidence-based presentation." },
    { name: "ponytail", command: "/ponytail", description: "Lazy senior dev mode: simplest minimal solution, extreme YAGNI." },
    { name: "ponytail-audit", command: "/ponytail-audit", description: "Quality audit of codebase for bugs, bloat and bottlenecks." },
    { name: "ponytail-review", command: "/ponytail-review", description: "Quality code review line by line." },
  ]);
  const [isSkillPickerOpen, setIsSkillPickerOpen] = useState(false);
  const [slashSearch, setSlashSearch] = useState("");

  // Context Menu (+) and Usage Modal States
  const [isAddContextOpen, setIsAddContextOpen] = useState(false);
  const [selectedFamilyForFlyout, setSelectedFamilyForFlyout] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState<any>(null);

  // Active Model Selection with Families & Efforts
  const [selectedFamily, setSelectedFamily] = useState("Gemini 3.8 Flash");
  const [selectedEffort, setSelectedEffort] = useState<"Low" | "Medium" | "High">("Medium");

  // Active Skill Badges in Prompt Composer
  const [activePromptSkills, setActivePromptSkills] = useState<string[]>([]);

  // Collapsible 'Worked for Xm / steps' state per assistant message
  const [openWorkedMap, setOpenWorkedMap] = useState<Record<string, boolean>>({});
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isUsageInlineOpen, setIsUsageInlineOpen] = useState(false);

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

  // Universal Antigravity Bridge Caller (Electron IPC with automatic Vite Dev Server fallback)
  const callAntigravityBridge = useCallback(async (action: string, payload: any) => {
    try {
      if (action === "connect-scope" && window.dracoAPI?.antigravityConnectScope) {
        const res = await window.dracoAPI.antigravityConnectScope(
          payload.workspacePath,
          payload.options
        );
        if (res && !String(res.error || "").includes("No handler registered")) return res;
      } else if (action === "send-prompt" && window.dracoAPI?.antigravitySendPrompt) {
        const res = await window.dracoAPI.antigravitySendPrompt(payload);
        if (res && !String(res.error || "").includes("No handler registered")) return res;
      } else if (action === "get-messages" && window.dracoAPI?.antigravityGetMessages) {
        const res = await window.dracoAPI.antigravityGetMessages(payload.conversationId);
        if (res && !String(res.error || "").includes("No handler registered")) return res;
      } else if (action === "get-models" && window.dracoAPI?.antigravityGetModels) {
        const res = await window.dracoAPI.antigravityGetModels();
        if (res && !String(res.error || "").includes("No handler registered")) return res;
      } else if (action === "get-skills" && window.dracoAPI?.antigravityGetSkills) {
        const res = await window.dracoAPI.antigravityGetSkills(payload?.workspacePath);
        if (res && !String(res.error || "").includes("No handler registered")) return res;
      } else if (action === "get-usage" && window.dracoAPI?.antigravityGetUsage) {
        const res = await window.dracoAPI.antigravityGetUsage();
        if (res && !String(res.error || "").includes("No handler registered")) return res;
      } else if (action === "delete-session" && window.dracoAPI?.antigravityDeleteSession) {
        const res = await window.dracoAPI.antigravityDeleteSession(
          payload.conversationId,
          payload.workspacePath
        );
        if (res && !String(res.error || "").includes("No handler registered")) return res;
      }
    } catch {}

    try {
      const resp = await fetch(`/__draco_antigravity/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      });
      return await resp.json();
    } catch (err: any) {
      return { ok: false, error: err?.message || "Bridge unreachable" };
    }
  }, []);

  const connectAntigravityScope = useCallback(
    async (
      targetWorkspace: string,
      opts: { createNewSession?: boolean; preferredSessionId?: string; showBanner?: boolean } = {}
    ) => {
      if (!targetWorkspace) return;
      setIsAgyConnecting(true);
      try {
        const res = await callAntigravityBridge("connect-scope", {
          workspacePath: targetWorkspace,
          options: {
            createNewSession: Boolean(opts.createNewSession),
            preferredSessionId: opts.preferredSessionId,
          },
        });
        if (res && res.ok) {
          setAgyState(res);
          setConnectedScopeRef(targetWorkspace);

          // Fetch real available skills
          callAntigravityBridge("get-skills", { workspacePath: targetWorkspace }).then((sRes) => {
            if (sRes && sRes.ok && Array.isArray(sRes.skills) && sRes.skills.length > 0) {
              setAvailableSkills(sRes.skills);
            }
          });

          // Fetch real usage stats from local db & quota
          callAntigravityBridge("get-usage", {}).then((uRes) => {
            if (uRes && uRes.ok) {
              setUsageStats(uRes);
            }
          });
          if (opts.showBanner) {
            if (res.autoCreatedProject) {
              setAgyStatusNotice(
                `NEW PROJECT CREATED: "${res.projectName}" + New Conversation Session Initialized`
              );
            } else if (opts.createNewSession) {
              setAgyStatusNotice(
                `CONNECTED PROJECT: "${res.projectName}" // New Session Created`
              );
            } else {
              setAgyStatusNotice(
                `CONNECTED PROJECT: "${res.projectName}" (${res.sessions?.length || 1} Sessions)`
              );
            }
          }
        }
      } finally {
        setIsAgyConnecting(false);
      }
    },
    [callAntigravityBridge]
  );

  const handleSelectAgySession = async (sessionId: string) => {
    if (!agyState) return;
    setAgyState((prev) => (prev ? { ...prev, activeSessionId: sessionId } : prev));
    const res = await callAntigravityBridge("get-messages", { conversationId: sessionId });
    if (res && res.ok) {
      setAgyState((prev) =>
        prev ? { ...prev, activeSessionId: sessionId, messages: res.messages || [] } : prev
      );
    }
    if (window.dracoAPI?.attachTelemetry) {
      const attached = await window.dracoAPI.attachTelemetry(sessionId, 40);
      if (attached.success && attached.history) {
        setActiveConvId(sessionId);
        setAgentEvents(attached.history);
      }
    }
  };

  const handleDeleteAgySession = async (sessionId: string) => {
    if (!sessionId) return;
    const res = await callAntigravityBridge("delete-session", {
      conversationId: sessionId,
      workspacePath,
    });
    if (res && res.ok) {
      setAgyState((prev) => {
        if (!prev) return prev;
        const filtered = prev.sessions.filter((s) => s.id !== sessionId);
        const isCurrent = prev.activeSessionId === sessionId;
        const nextId = isCurrent ? (filtered[0]?.id || "") : prev.activeSessionId;
        return {
          ...prev,
          sessions: filtered,
          activeSessionId: nextId,
          messages: isCurrent ? [] : prev.messages,
        };
      });
      const remaining = agyState?.sessions.filter((s) => s.id !== sessionId) || [];
      if (agyState?.activeSessionId === sessionId && remaining.length > 0) {
        handleSelectAgySession(remaining[0].id);
      }
      setAgyStatusNotice("Session deleted.");
      setTimeout(() => setAgyStatusNotice(null), 3000);
    }
  };

  const handleSendAgyPrompt = async () => {
    const cleanPrompt = agyPromptInput.trim();
    if (!cleanPrompt || isAgySending) return;
    setAgyPromptInput("");
    setIsAgySending(true);

    const activeId = agyState?.activeSessionId || "";
    
    // Combine active skill badges into the outgoing prompt
    const skillPrefix = activePromptSkills.length > 0 
      ? activePromptSkills.map(s => `/${s}`).join(" ") + "\n"
      : "";
    const finalPromptToSend = skillPrefix + cleanPrompt;

    const optimisticUserMsg = {
      id: `optimistic-${Date.now()}`,
      role: "user" as const,
      content: finalPromptToSend,
      timestamp: new Date().toISOString(),
    };

    // Reset composer skills
    setActivePromptSkills([]);

    setAgyState((prev) =>
      prev
        ? {
            ...prev,
            messages: [...prev.messages, optimisticUserMsg],
          }
        : prev
    );

    try {
      const res = await callAntigravityBridge("send-prompt", {
        workspacePath,
        projectId: agyState?.projectId || "",
        projectName: agyState?.projectName || "workspace",
        conversationId: activeId,
        prompt: cleanPrompt,
        model: selectedModelId,
        effort: selectedEffort.toLowerCase(),
      });

      if (res && Array.isArray(res.messages) && res.messages.length > 0) {
        setAgyState((prev) => (prev ? { ...prev, messages: res.messages } : prev));
      } else if (res && res.reply) {
        setAgyState((prev) =>
          prev
            ? {
                ...prev,
                messages: [
                  ...prev.messages,
                  {
                    id: `reply-${Date.now()}`,
                    role: "assistant",
                    content: res.reply,
                    timestamp: new Date().toISOString(),
                  },
                ],
              }
            : prev
        );
      }
    } finally {
      setIsAgySending(false);
    }
  };

  useEffect(() => {
    if (mode === "agent") {
      refreshAgentSessions();
      if (selectedProvider === "antigravity" && workspacePath) {
        const isFirstConnectForScope = connectedScopeRef !== workspacePath;
        connectAntigravityScope(workspacePath, {
          createNewSession: isFirstConnectForScope,
          showBanner: isFirstConnectForScope,
        });
      }
    }
  }, [mode, workspacePath, selectedProvider, connectedScopeRef, refreshAgentSessions, connectAntigravityScope]);

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

  // Auto-scroll chat stream strictly to latest bottom message on updates / streaming
  useEffect(() => {
    if (!chatScrollRef.current) return;
    const el = chatScrollRef.current;
    const scrollTask = () => {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: "smooth",
      });
    };
    const animId = requestAnimationFrame(scrollTask);
    const timeoutId = setTimeout(scrollTask, 60);
    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(timeoutId);
    };
  }, [agyState?.messages, isAgySending]);

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

  // Milestone M6.1 / M6.2: 1-Click Git Repository Initialization
  const handleGitInit = async () => {
    if (!window.dracoAPI?.gitInit) {
      setGitFeedback({
        message: "Git Bridge unavailable: Please restart DracoDeck to bind native Git CLI runtime.",
        isError: true,
      });
      return;
    }
    setIsGitBusy(true);
    setGitFeedback({ message: "Initializing Git repository (git init -b main)..." });
    try {
      const target = effectiveGitCwd || workspacePath;
      const res = await window.dracoAPI.gitInit(target);
      if (res.ok) {
        setGitFeedback({ message: `[OK] Initialized Git repository in ${target}` });
        await refreshGit();
      } else {
        setGitFeedback({ message: res.error || "Failed to initialize Git repository", isError: true });
      }
    } catch (err: any) {
      const msg = err.message || "Git init error";
      if (
        msg.includes("No handler registered") ||
        msg.includes("remote method 'git-init'") ||
        msg.includes("git-init")
      ) {
        setGitFeedback({
          message:
            "DRACODECK RESTART REQUIRED: Native bridge handler 'git-init' requires restarting DracoDeck to take effect in background process.",
          isError: true,
        });
      } else {
        setGitFeedback({ message: msg, isError: true });
      }
    } finally {
      setIsGitBusy(false);
      setTimeout(() => setGitFeedback(null), 4000);
    }
  };

  // Milestone M6.1 / M6.2: Auto-generate Local Fallback Identity (Offline OK)
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
          setGitFeedback({ message: `[OK] Local author identity configured (${name} <${email}>). Ready!` });
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
      {/* Top Header: Dynamic between Explorer/Git and Sleek Antigravity Chat */}
      {mode === "agent" ? (
        <div className="h-9 min-h-[36px] bg-[#141021] border-b border-[#241c38] px-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-0.5 bg-[#251e38] text-slate-100 font-medium text-xs rounded-md shadow-xs select-none flex items-center gap-1.5">
              <span>Chat</span>
              {(isAgentLoading || isAgyConnecting) && (
                <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#00e5ff]" />
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 relative">
            <button
              onClick={() => setIsOptionsMenuOpen(!isOptionsMenuOpen)}
              className="hover:text-slate-200 p-1 cursor-pointer rounded hover:bg-[#201933]"
              title="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isOptionsMenuOpen && (
              <div
                onClick={() => setIsOptionsMenuOpen(false)}
                className="absolute right-8 top-full mt-1 w-48 bg-[#1b152d] border border-[#372b54] shadow-2xl rounded-lg py-1 z-50 text-[11px] font-sans"
              >
                <button
                  onClick={() => {
                    setAgentSubView(agentSubView === "chat" ? "telemetry" : "chat");
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#291f42] text-slate-200 flex items-center justify-between"
                >
                  <span>View: {agentSubView === "chat" ? "Telemetry Stream" : "Live Chat"}</span>
                  <Activity className="w-3 h-3 text-[#00e5ff]" />
                </button>
                <button
                  onClick={() => {
                    connectAntigravityScope(workspacePath, { createNewSession: true, showBanner: true });
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#291f42] text-slate-200 flex items-center justify-between"
                >
                  <span>+ New Session</span>
                  <Plus className="w-3 h-3 text-[#ff007f]" />
                </button>
                <button
                  onClick={() => {
                    refreshAgentSessions();
                    if (workspacePath) connectAntigravityScope(workspacePath, { createNewSession: false });
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#291f42] text-slate-200 flex items-center justify-between"
                >
                  <span>Refresh Connection</span>
                  <RefreshCw className="w-3 h-3 text-[#00e676]" />
                </button>
                {agyState?.activeSessionId && (
                  <button
                    onClick={() => {
                      if (agyState.activeSessionId) {
                        handleDeleteAgySession(agyState.activeSessionId);
                      }
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#3d182b] text-[#ff5252] flex items-center justify-between border-t border-[#372b54]/50"
                  >
                    <span>Delete Current Session</span>
                    <Trash2 className="w-3 h-3 text-[#ff5252]" />
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => {}}
              className="hover:text-slate-200 p-1 cursor-pointer rounded hover:bg-[#201933]"
              title="Maximize"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setMode("explorer")}
              className="hover:text-slate-200 p-1 cursor-pointer rounded hover:bg-[#201933]"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Top Brand Header for Dracode Multi-Sidebar in Explorer / Git */
        <div className="h-8 min-h-[32px] bg-[#100b1c] border-b border-[#261d38] px-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <DracodeLogo size={17} />
            <span className="font-bold tracking-wider text-[#e2e8f0] text-[11px]">
              DRACODE
            </span>
            <span className="text-[9px] px-1.5 py-0.2 bg-[#281b3d] border border-[#ff007f]/40 text-[#00e5ff] font-bold uppercase">
              {mode === "explorer" ? "EXPLORER" : "DRACOOPS GIT"}
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
        </div>
      )}

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
            {/* Universal Diagnostic Feedback Drawer (M6.2: Global Visibility) */}
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
                    className="text-[#7a7194] hover:text-[#e2e8f0] shrink-0 cursor-pointer"
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

                {gitFeedback.isError &&
                  (gitFeedback.message.toLowerCase().includes("restart") ||
                    gitFeedback.message.toLowerCase().includes("no handler registered")) && (
                    <div className="pt-1">
                      <button
                        onClick={() => {
                          if (window.dracoAPI?.relaunchApp) {
                            window.dracoAPI.relaunchApp();
                          } else if (window.dracoAPI?.quitApp) {
                            window.dracoAPI.quitApp();
                          }
                        }}
                        className="px-2.5 py-1 bg-[#ff007f] hover:bg-[#d5006d] text-white text-[9.5px] font-bold cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,0,127,0.35)] transition-colors"
                      >
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>RESTART DRACODECK NOW</span>
                      </button>
                    </div>
                  )}
              </div>
            )}

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
                          <span className="text-[8.5px] text-[#7a7194] group-hover:text-[#00e5ff] font-bold shrink-0 flex items-center gap-0.5">
                            <span>SELECT</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Milestone M6.1 / M6.2 1-Click git init Box */}
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
                    className="w-full py-2 px-3 bg-[#ff007f] hover:bg-[#d5006d] disabled:opacity-50 text-white text-[10px] font-bold tracking-wider cursor-pointer shadow-[0_0_15px_rgba(255,0,127,0.25)] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {isGitBusy ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <GitBranch className="w-3.5 h-3.5 text-white" />
                    )}
                    <span>
                      {isGitBusy
                        ? "INITIALIZING REPOSITORY (git init)..."
                        : "INITIALIZE GIT REPOSITORY (git init)"}
                    </span>
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
                          className="text-[#7a7194] hover:text-[#ff1744] p-0.5 cursor-pointer flex items-center"
                        >
                          <X className="w-3 h-3" />
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

        {/* 03. AGENT MODE: Pixel-Perfect Antigravity Chat Experience */}
        {mode === "agent" && (
          <div className="flex-1 overflow-hidden flex flex-col bg-[#141021] text-xs font-sans relative">
            {/* 1. Provider Picker Row (⌄ Antigravity Dropdown) */}
            <div className="relative px-3 pt-2 pb-1 bg-[#141021]">
              <button
                onClick={() => setIsProviderMenuOpen(!isProviderMenuOpen)}
                className="flex items-center gap-1.5 text-slate-100 font-bold text-[13px] hover:text-white cursor-pointer select-none"
              >
                <ChevronDown className="w-4 h-4 text-slate-300" />
                <span>
                  {selectedProvider === "antigravity"
                    ? "Antigravity"
                    : selectedProvider === "copilot"
                    ? "GitHub Copilot"
                    : selectedProvider === "codex"
                    ? "OpenAI Codex"
                    : selectedProvider === "claude"
                    ? "Anthropic Claude"
                    : "Cursor"}
                </span>
              </button>

              {isProviderMenuOpen && (
                <div
                  onClick={() => setIsProviderMenuOpen(false)}
                  className="absolute left-3 top-full mt-1 w-52 bg-[#1b152d] border border-[#372b54] shadow-2xl rounded-lg py-1.5 z-50 text-[11px] font-sans"
                >
                  <div className="px-3 py-1 text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                    Select AI Provider
                  </div>
                  {[
                    { id: "antigravity", name: "Google Antigravity", badge: "Live CLI" },
                    { id: "copilot", name: "GitHub Copilot", badge: "Standby" },
                    { id: "codex", name: "OpenAI Codex", badge: "Standby" },
                    { id: "claude", name: "Anthropic Claude", badge: "Standby" },
                    { id: "cursor", name: "Cursor Composer", badge: "Standby" },
                  ].map((prov) => (
                    <button
                      key={prov.id}
                      onClick={() => {
                        setSelectedProvider(prov.id as any);
                        setIsProviderMenuOpen(false);
                        if (prov.id === "antigravity" && workspacePath) {
                          connectAntigravityScope(workspacePath, {
                            createNewSession: true,
                            showBanner: true,
                          });
                        }
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-[#291f42] flex items-center justify-between cursor-pointer ${
                        selectedProvider === prov.id ? "bg-[#251b3d] text-[#00e5ff]" : "text-slate-300"
                      }`}
                    >
                      <span className="font-medium">{prov.name}</span>
                      <span className="text-[9px] text-slate-500">{prov.badge}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Sub-Toolbar: PanelLeft, Search, / Session Title, Plus, More, Columns */}
            <div className="px-3 py-1.5 flex items-center gap-2 border-b border-[#241c38] bg-[#141021] text-slate-400">
              <button
                className="hover:text-slate-200 cursor-pointer p-0.5 rounded hover:bg-[#201933]"
                title="Sidebar layout"
              >
                <PanelLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsSessionMenuOpen(!isSessionMenuOpen)}
                className="hover:text-slate-200 cursor-pointer p-0.5 rounded hover:bg-[#201933]"
                title="Search or switch session"
              >
                <Search className="w-3.5 h-3.5" />
              </button>

              {/* Breadcrumb / Session Pill */}
              <div className="relative flex-1 min-w-0">
                <button
                  onClick={() => setIsSessionMenuOpen(!isSessionMenuOpen)}
                  className="w-full text-left truncate text-[11px] text-slate-300 hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[#201933] cursor-pointer"
                  title={
                    agyState?.sessions?.find((s) => s.id === agyState.activeSessionId)?.title ||
                    "Current Session"
                  }
                >
                  <span className="text-slate-500 font-mono">/</span>
                  <span className="truncate">
                    {agyState?.sessions?.find((s) => s.id === agyState.activeSessionId)?.title ||
                      (agyState?.projectName ? `${agyState.projectName} // Live Session` : "Session")}
                  </span>
                </button>

                {isSessionMenuOpen && (
                  <div
                    onClick={() => setIsSessionMenuOpen(false)}
                    className="absolute left-0 top-full mt-1 w-64 max-h-72 overflow-y-auto bg-[#1b152d] border border-[#372b54] shadow-2xl rounded-lg py-1 z-50 text-[11px] font-sans"
                  >
                    <div className="px-3 py-1.5 text-[9.5px] font-bold text-slate-500 border-b border-[#291f42] flex items-center justify-between">
                      <span>PROJECT SESSIONS ({agyState?.sessions?.length || 0})</span>
                      <button
                        onClick={() => {
                          setIsSessionMenuOpen(false);
                          connectAntigravityScope(workspacePath, {
                            createNewSession: true,
                            showBanner: true,
                          });
                        }}
                        className="text-[#ff007f] hover:underline cursor-pointer"
                      >
                        + New
                      </button>
                    </div>

                    {!agyState?.sessions || agyState.sessions.length === 0 ? (
                      <div className="px-3 py-2 text-slate-500 text-center">No sessions found</div>
                    ) : (
                      agyState.sessions.map((s) => (
                        <div
                          key={s.id}
                          className={`group w-full text-left px-3 py-1.5 hover:bg-[#291f42] flex items-center justify-between cursor-pointer border-b border-[#231a38]/40 ${
                            agyState.activeSessionId === s.id
                              ? "bg-[#251b3d] text-[#00e5ff]"
                              : "text-slate-300"
                          }`}
                        >
                          <div
                            className="flex flex-col truncate flex-1 pr-2"
                            onClick={() => {
                              setIsSessionMenuOpen(false);
                              handleSelectAgySession(s.id);
                            }}
                          >
                            <span className="truncate font-medium">{s.title}</span>
                            <span className="text-[9.5px] text-slate-500">
                              {s.stepCount} steps •{" "}
                              {s.lastModified ? new Date(s.lastModified).toLocaleDateString() : ""}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAgySession(s.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 rounded transition-opacity shrink-0"
                            title="Delete session"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-red-400" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() =>
                  connectAntigravityScope(workspacePath, {
                    createNewSession: true,
                    showBanner: true,
                  })
                }
                className="hover:text-slate-200 cursor-pointer p-0.5 rounded hover:bg-[#201933]"
                title="New Session"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsOptionsMenuOpen(!isOptionsMenuOpen)}
                className="hover:text-slate-200 cursor-pointer p-0.5 rounded hover:bg-[#201933]"
                title="Session options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              <button
                className="hover:text-slate-200 cursor-pointer p-0.5 rounded hover:bg-[#201933]"
                title="Layout toggle"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Status Notice Banner */}
            {agyStatusNotice && (
              <div className="mx-3 mt-1.5 px-2.5 py-1 rounded-md bg-[#201933] border border-[#00e5ff]/40 text-[#00e5ff] text-[10px] flex items-center justify-between select-none">
                <span className="truncate">{agyStatusNotice}</span>
                <button
                  onClick={() => setAgyStatusNotice(null)}
                  className="text-slate-400 hover:text-white ml-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* 3. Messages Stream */}
            <div
              ref={chatScrollRef}
              onScroll={(e) => {
                const t = e.currentTarget;
                const canScroll = t.scrollHeight > t.clientHeight + 40;
                setShowScrollTop(canScroll && t.scrollTop > 80);
              }}
              className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-3 space-y-4 relative w-full max-w-full"
            >
              {agentSubView === "telemetry" ? (
                /* Raw Telemetry View */
                <div className="space-y-2 font-mono">
                  <div className="flex items-center justify-between pb-1 text-[10px] text-slate-400">
                    <span>COGNITIVE TELEMETRY STREAM</span>
                    <button
                      onClick={() => setAgentSubView("chat")}
                      className="text-[#00e5ff] hover:underline cursor-pointer"
                    >
                      Back to Chat
                    </button>
                  </div>

                  {agentSessions.length > 0 && (
                    <select
                      value={activeConvId}
                      onChange={async (e) => {
                        const id = e.target.value;
                        setActiveConvId(id);
                        if (window.dracoAPI?.attachTelemetry) {
                          const res = await window.dracoAPI.attachTelemetry(id, 40);
                          if (res.success && res.history) setAgentEvents(res.history);
                        }
                      }}
                      className="w-full bg-[#1b152d] border border-[#2b2144] text-[#00e5ff] text-[10px] p-1 rounded font-mono"
                    >
                      {agentSessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.id.slice(0, 8)}... ({s.lineEstimate} steps)
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="grid grid-cols-2 gap-1 text-[9.5px] bg-[#141021] p-1.5 rounded border border-[#2b2144]">
                    <div>
                      <span className="text-slate-500">IN TOKENS:</span>{" "}
                      <span className="text-[#00e5ff] font-bold">{totalTokens.input.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">OUT TOKENS:</span>{" "}
                      <span className="text-[#ff007f] font-bold">{totalTokens.output.toLocaleString()}</span>
                    </div>
                  </div>
                  {agentEvents.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 bg-[#19132b] rounded-xl border border-[#2b2144]">
                      No telemetry recorded
                    </div>
                  ) : (
                    agentEvents.slice().reverse().slice(0, 25).map((ev) => (
                      <div
                        key={ev.id}
                        className="bg-[#19132b] border border-[#2b2144] rounded-lg p-2.5 space-y-1 text-[10.5px]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[#00e5ff] font-mono font-bold">STEP #{ev.stepIndex}</span>
                          <span className="text-[9px] text-slate-500">{ev.type}</span>
                        </div>
                        {ev.userPrompt && (
                          <p className="text-[#ff007f] font-mono">{ev.userPrompt}</p>
                        )}
                        {ev.modelThinking && (
                          <p className="text-slate-400 italic line-clamp-2">{ev.modelThinking}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* Live Antigravity Chat Stream */
                <>
                  {!agyState?.messages || agyState.messages.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 bg-[#1a142c] rounded-2xl border border-[#2d2448] space-y-2 mt-4">
                      <Sparkles className="w-6 h-6 mx-auto text-[#ff007f]" />
                      <p className="text-xs text-slate-200 font-semibold">
                        Antigravity Session Ready
                      </p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Scope linked to <span className="text-[#00e5ff] font-mono">{workspacePath}</span>.
                        Ask anything below to chat live with Google Antigravity.
                      </p>
                    </div>
                  ) : (
                    agyState.messages.map((msg, idx) => {
                      if (msg.role === "user") {
                        // Extract prompt text and slash command badges
                        const lines = msg.content.split("\n");
                        const tags: string[] = [];
                        const textLines: string[] = [];

                        for (const l of lines) {
                          const m = l.match(/\/([a-zA-Z0-9_-]+)/g);
                          if (m) {
                            m.forEach((t) => tags.push(t.replace("/", "")));
                            const rest = l.replace(/\/([a-zA-Z0-9_-]+)/g, "").trim();
                            if (rest) textLines.push(rest);
                          } else {
                            textLines.push(l);
                          }
                        }

                        const cleanText = textLines.join("\n").trim() || msg.content;
                        const uniqueTags = Array.from(new Set(tags));

                        return (
                          <div
                            key={msg.id}
                            className="bg-[#201a33] border border-[#2e2648] rounded-2xl p-3 shadow-md space-y-2 select-text"
                          >
                            <div className="text-slate-100 text-xs leading-relaxed whitespace-pre-wrap font-medium">
                              {cleanText}
                            </div>

                            {uniqueTags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {uniqueTags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#181328] border border-[#342b52] text-[10.5px] text-slate-300 font-sans select-none"
                                  >
                                    <Code2 className="w-3 h-3 text-slate-400" />
                                    <span>{tag}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Assistant message: Clean Antigravity formatting
                      const renderBlocks = (raw: string) => {
                        const mLines = raw.split("\n");
                        const nodes: React.ReactNode[] = [];
                        let inCode = false;
                        let codeBuf: string[] = [];

                        for (let i = 0; i < mLines.length; i++) {
                          const line = mLines[i];
                          const tr = line.trim();

                          if (tr.startsWith("```")) {
                            if (inCode) {
                              nodes.push(
                                <pre
                                  key={`cb-${i}`}
                                  className="p-2.5 rounded-lg bg-[#0e0a19] border border-[#261d38] font-mono text-[10.5px] text-[#00e5ff] overflow-x-auto my-1.5 leading-relaxed"
                                >
                                  <code>{codeBuf.join("\n")}</code>
                                </pre>
                              );
                              codeBuf = [];
                              inCode = false;
                            } else {
                              inCode = true;
                            }
                            continue;
                          }

                          if (inCode) {
                            codeBuf.push(line);
                            continue;
                          }

                          if (!tr) {
                            nodes.push(<div key={`sp-${i}`} className="h-1.5" />);
                            continue;
                          }

                          // Helper for inline styles
                          const formatLine = (txt: string) => {
                            const segs = txt.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
                            return segs.map((s, idx) => {
                              if (s.startsWith("`") && s.endsWith("`")) {
                                return (
                                  <code
                                    key={idx}
                                    className="px-1.5 py-0.5 rounded bg-[#1e1732] border border-[#392d57] text-[#ffb86c] text-[10.5px] font-mono inline-block mx-0.5"
                                  >
                                    {s.slice(1, -1)}
                                  </code>
                                );
                              }
                              if (s.startsWith("**") && s.endsWith("**")) {
                                return (
                                  <strong key={idx} className="font-semibold text-slate-100">
                                    {s.slice(2, -2)}
                                  </strong>
                                );
                              }
                              return <span key={idx}>{s}</span>;
                            });
                          };

                          // Numbered List (e.g. 1. Multi-Agent Provider Selector ...)
                          const numM = tr.match(/^(\d+)\.\s+(.*)/);
                          if (numM) {
                            nodes.push(
                              <div
                                key={`num-${i}`}
                                className="flex items-start gap-1.5 my-1 text-slate-200 leading-relaxed text-xs"
                              >
                                <span className="font-bold text-slate-300 shrink-0">{numM[1]}.</span>
                                <div className="flex-1">{formatLine(numM[2])}</div>
                              </div>
                            );
                            continue;
                          }

                          // Bullet List (e.g. • or - or *)
                          const bulM = tr.match(/^[-*•]\s+(.*)/);
                          if (bulM) {
                            nodes.push(
                              <div
                                key={`bul-${i}`}
                                className="flex items-start gap-2 my-0.5 ml-3 text-slate-300 leading-relaxed text-xs"
                              >
                                <span className="text-slate-400 select-none text-[10px] leading-5">•</span>
                                <div className="flex-1">{formatLine(bulM[1])}</div>
                              </div>
                            );
                            continue;
                          }

                          // Heading-like line (e.g. Ringkasan Implementasi:)
                          const isHeading = tr.endsWith(":") && tr.length < 60;
                          nodes.push(
                            <p
                              key={`p-${i}`}
                              className={`leading-relaxed text-xs my-0.5 ${
                                isHeading ? "font-semibold text-slate-100 mt-2 mb-1" : "text-slate-200"
                              }`}
                            >
                              {formatLine(tr)}
                            </p>
                          );
                        }

                        return nodes;
                      };

                      const hasThinking = Boolean(
                        typeof msg.thinking === "string" && msg.thinking.trim().length > 0
                      );
                      const hasTools = Boolean(Array.isArray(msg.tools) && msg.tools.length > 0);
                      const hasInternalSteps = hasThinking || hasTools;
                      const msgKey = msg.id || `msg-${idx}`;
                      const isWorkedOpen = openWorkedMap[msgKey] ?? false;
                      const workedLabel = msg.durationText
                        ? `Worked for ${msg.durationText}`
                        : msg.stepCount && msg.stepCount > 1
                        ? `Worked for ${msg.stepCount} steps`
                        : "Worked for a few seconds";

                      return (
                        <div key={msgKey} className="space-y-2 select-text font-sans">
                          {/* Single Collapsible Worked Header per Turn */}
                          {hasInternalSteps && (
                            <div>
                              <button
                                onClick={() =>
                                  setOpenWorkedMap((prev) => ({
                                    ...prev,
                                    [msgKey]: !isWorkedOpen,
                                  }))
                                }
                                className="text-[11.5px] text-[#4ea8de] hover:underline flex items-center gap-1 cursor-pointer font-sans font-medium select-none"
                              >
                                <span>{workedLabel}</span>
                                <ChevronRight
                                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                    isWorkedOpen ? "rotate-90" : ""
                                  }`}
                                />
                              </button>

                              {isWorkedOpen && (hasThinking || hasTools) && (
                                <div className="mt-1.5 bg-[#171226] border border-[#2d2448] p-2.5 rounded-lg space-y-2 text-xs font-mono">
                                  {hasThinking && (
                                    <div className="text-[10.5px] text-slate-400 italic bg-[#100b1c] p-2 rounded border-l-2 border-[#5b468c] whitespace-pre-wrap leading-relaxed">
                                      {msg.thinking}
                                    </div>
                                  )}

                                  {hasTools && msg.tools && (
                                    <div className="space-y-1">
                                      {msg.tools.map((t, tIdx) => (
                                        <div
                                          key={`${msgKey}-t-${tIdx}`}
                                          className="flex items-center gap-1.5 px-2 py-1 bg-[#100b1c] border border-[#2d2448] rounded text-[10px]"
                                        >
                                          {t.name.includes("file") ||
                                          t.name.includes("read") ||
                                          t.name.includes("edit") ? (
                                            <FileCode className="w-3 h-3 text-[#00e676] shrink-0" />
                                          ) : (
                                            <Terminal className="w-3 h-3 text-[#ff8800] shrink-0" />
                                          )}
                                          <span className="text-[#00e5ff] font-bold shrink-0">
                                            {t.name}
                                          </span>
                                          {t.summary && (
                                            <span className="text-slate-400 truncate">
                                              {t.summary}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Concise Summary / Outcome Report */}
                          <div className="text-slate-200 leading-relaxed text-xs">
                            {renderBlocks(msg.content)}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {isAgySending && (
                    <div className="p-3 bg-[#1a142c] border border-[#372b54] rounded-xl text-xs flex items-center gap-2.5 text-[#00e5ff]">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#ff007f] shrink-0" />
                      <span>Antigravity is thinking and executing...</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Floating Scroll-to-Top Button (Only appears when scrolled down) */}
            {showScrollTop && (
              <button
                onClick={() => {
                  chatScrollRef.current?.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }}
                className="absolute top-12 right-3 z-30 w-7 h-7 rounded-full bg-[#201838]/90 hover:bg-[#2e234e] border border-[#3f2e5e] text-slate-300 hover:text-white flex items-center justify-center shadow-xl transition-all cursor-pointer backdrop-blur-xs hover:scale-110"
                title="Scroll to top"
              >
                <ArrowUp className="w-3.5 h-3.5 text-[#00e5ff]" />
              </button>
            )}

            {/* 4. Bottom Capsule Composer (Matching Antigravity Floating Pill) */}
            <div className="m-2.5 p-3 rounded-2xl bg-[#1b152d] border border-[#2f254b] shadow-2xl space-y-2 shrink-0 relative">
              {/* Active Skill Badges in Composer */}
              {activePromptSkills.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-[#291f42]">
                  {activePromptSkills.map((skName) => (
                    <span
                      key={skName}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#251b3d] border border-[#ff007f]/50 text-[#00e5ff] text-[11px] font-sans font-bold shadow-xs select-none"
                    >
                      <Code2 className="w-3 h-3 text-[#ff007f]" />
                      <span>{skName}</span>
                      <button
                        onClick={() =>
                          setActivePromptSkills((prev) => prev.filter((s) => s !== skName))
                        }
                        className="text-slate-400 hover:text-white cursor-pointer ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Sleek Minimalist Slash Command Autocomplete */}
              {isSkillPickerOpen && (
                <div className="absolute left-2 right-2 bottom-full mb-1.5 max-h-48 overflow-y-auto bg-[#161124] border border-[#2d2246] shadow-2xl rounded-lg py-1 z-50 text-[11px] font-sans">
                  {availableSkills
                    .filter((sk) =>
                      slashSearch ? sk.name.toLowerCase().includes(slashSearch.toLowerCase()) : true
                    )
                    .map((sk) => (
                      <button
                        key={sk.name}
                        onClick={() => {
                          if (!activePromptSkills.includes(sk.name)) {
                            setActivePromptSkills((prev) => [...prev, sk.name]);
                          }
                          setAgyPromptInput((prev) => prev.replace(/\/[a-zA-Z0-9_-]*$/, "").trim());
                          setIsSkillPickerOpen(false);
                          setSlashSearch("");
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#261d3d] flex items-center justify-between cursor-pointer border-b border-[#231a38]/20 group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[#00e5ff] font-mono font-bold text-xs">/</span>
                          <span className="font-bold text-slate-100 group-hover:text-[#00e5ff] text-xs">
                            {sk.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {sk.description}
                        </span>
                      </button>
                    ))}
                </div>
              )}

              <textarea
                value={agyPromptInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setAgyPromptInput(val);

                  // Detect slash command typing
                  const match = val.match(/\/([a-zA-Z0-9_-]*)$/);
                  if (match) {
                    setIsSkillPickerOpen(true);
                    setSlashSearch(match[1]);
                  } else {
                    if (isSkillPickerOpen) setIsSkillPickerOpen(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (isSkillPickerOpen) {
                      setIsSkillPickerOpen(false);
                      return;
                    }
                    handleSendAgyPrompt();
                  }
                }}
                placeholder="Ask anything, @ to mention, / for actions"
                rows={2}
                disabled={isAgySending}
                className="w-full bg-transparent border-none outline-none text-xs text-slate-100 placeholder:text-slate-500 resize-none font-sans min-h-[42px] leading-relaxed select-text"
              />

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  {/* Context Menu Popover Button (+) */}
                  <div className="relative">
                    <button
                      onClick={() => setIsAddContextOpen(!isAddContextOpen)}
                      className="w-6 h-6 rounded-full hover:bg-[#281f3e] flex items-center justify-center text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
                      title="Add Context"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    {/* Add Context Menu (Image 2) */}
                    {isAddContextOpen && (
                      <div
                        onClick={() => setIsAddContextOpen(false)}
                        className="absolute left-0 bottom-full mb-2 w-44 bg-[#1b152d] border border-[#372b54] shadow-2xl rounded-xl py-1.5 z-50 text-[11.5px] font-sans"
                      >
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-500">
                          Add Context
                        </div>

                        <button
                          onClick={() => {
                            if (selectedFile) {
                              setAgyPromptInput((prev) =>
                                prev ? `${prev} @${selectedFile}` : `@${selectedFile}`
                              );
                            }
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#291f42] text-slate-200 flex items-center gap-2.5 cursor-pointer"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                          <span>Files</span>
                        </button>

                        <button
                          onClick={() => {
                            setAgyPromptInput((prev) =>
                              prev ? `${prev} @${workspacePath}` : `@${workspacePath}`
                            );
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#291f42] text-slate-200 flex items-center gap-2.5 cursor-pointer"
                        >
                          <Folder className="w-3.5 h-3.5 text-slate-400" />
                          <span>Folder</span>
                        </button>

                        <button
                          onClick={() => {
                            setAgyPromptInput((prev) => (prev ? `${prev} @` : "@"));
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#291f42] text-slate-200 flex items-center gap-2.5 cursor-pointer"
                        >
                          <AtSign className="w-3.5 h-3.5 text-slate-400" />
                          <span>Mentions</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsSkillPickerOpen(true);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#291f42] text-slate-200 flex items-center gap-2.5 cursor-pointer"
                        >
                          <Code2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>Actions</span>
                        </button>

                        <button
                          onClick={() => {
                            setAgyPromptInput((prev) =>
                              prev ? `${prev} [browse]` : "[browse]"
                            );
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#291f42] text-slate-200 flex items-center gap-2.5 cursor-pointer"
                        >
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          <span>Browser</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Hierarchical Model Selector Pill (Image 3) */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setIsModelMenuOpen(!isModelMenuOpen);
                        setSelectedFamilyForFlyout(null);
                      }}
                      className="text-[10.5px] text-slate-300 bg-[#251e39] hover:bg-[#2e2547] px-2.5 py-1 rounded-full flex items-center gap-1.5 cursor-pointer border border-[#352a50] select-none font-sans transition-colors"
                    >
                      <span className="font-medium text-slate-200">{selectedFamily}</span>
                      <span className="text-slate-400">{selectedEffort}</span>
                      <ChevronUp className="w-3 h-3 text-slate-400 ml-0.5" />
                    </button>

                    {/* Responsive Model & Usage Dropdown (Zero Horizontal Scrollbar) */}
                    {isModelMenuOpen && (
                      <div className="absolute left-0 bottom-full mb-1.5 w-64 max-w-[calc(100vw-36px)] bg-[#1b152d] border border-[#372b54] shadow-2xl rounded-xl py-1.5 z-50 text-[11.5px] font-sans box-border overflow-hidden">
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Model
                        </div>

                        {[
                          { name: "Gemini 4 Argon", hasEffort: true, isNew: true },
                          { name: "Gemini 3.8 Flash", hasEffort: true, isNew: false },
                          { name: "Claude Opus 5.5", hasEffort: true, isNew: true },
                          { name: "Claude Sonnet 5.5", hasEffort: true, isNew: true },
                          { name: "GPT-OSS 120B", hasEffort: false, isNew: false },
                        ].map((fam) => {
                          const isCurrentFamily = selectedFamily === fam.name;
                          const isExpanded = selectedFamilyForFlyout === fam.name;

                          return (
                            <div key={fam.name} className="border-b border-[#231a38]/30 last:border-b-0">
                              <button
                                onClick={() => {
                                  if (!fam.hasEffort) {
                                    setSelectedFamily(fam.name);
                                    setSelectedModelId("gpt-oss-120b-medium");
                                    setIsModelMenuOpen(false);
                                  } else {
                                    setSelectedFamilyForFlyout(isExpanded ? null : fam.name);
                                  }
                                }}
                                onMouseEnter={() => {
                                  if (fam.hasEffort) setSelectedFamilyForFlyout(fam.name);
                                }}
                                className={`w-full text-left px-3 py-1.5 hover:bg-[#291f42] flex items-center justify-between cursor-pointer ${
                                  isCurrentFamily ? "text-slate-100 font-semibold" : "text-slate-300"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <span>{fam.name}</span>
                                  {fam.hasEffort && (
                                    <span className="text-[10px] text-slate-400 font-normal">
                                      {isCurrentFamily ? selectedEffort : "Medium"}
                                    </span>
                                  )}
                                  {fam.isNew && (
                                    <span className="text-[9px] px-1 py-0.2 bg-[#281b3d] border border-[#ff007f]/40 text-[#ff007f] font-bold rounded">
                                      New
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {isCurrentFamily && !fam.hasEffort && (
                                    <Check className="w-3.5 h-3.5 text-slate-200" />
                                  )}
                                  {fam.hasEffort && (
                                    <ChevronRight
                                      className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                        isExpanded ? "rotate-90" : ""
                                      }`}
                                    />
                                  )}
                                </div>
                              </button>

                              {/* Inline Effort Segmented Selector (Responsive, Zero Overflow) */}
                              {fam.hasEffort && isExpanded && (
                                <div className="px-3 py-1 bg-[#140f24] border-t border-[#291f42] flex items-center gap-1">
                                  {(["Low", "Medium", "High"] as const).map((eff) => {
                                    const isEffortActive =
                                      isCurrentFamily && selectedEffort === eff;

                                    return (
                                      <button
                                        key={eff}
                                        onClick={() => {
                                          setSelectedFamily(fam.name);
                                          setSelectedEffort(eff);

                                          let cliId = "gemini-3.8-flash-medium";
                                          if (fam.name.includes("Argon")) {
                                            cliId = `gemini-4-argon-${eff.toLowerCase()}`;
                                          } else if (fam.name.includes("Flash")) {
                                            cliId = `gemini-3.8-flash-${eff.toLowerCase()}`;
                                          } else if (fam.name.includes("Opus")) {
                                            cliId = `claude-opus-5-5-${eff.toLowerCase()}`;
                                          } else if (fam.name.includes("Sonnet")) {
                                            cliId = `claude-sonnet-5-5-${eff.toLowerCase()}`;
                                          }

                                          setSelectedModelId(cliId);
                                          setIsModelMenuOpen(false);
                                          setSelectedFamilyForFlyout(null);
                                        }}
                                        className={`flex-1 py-1 text-center rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                          isEffortActive
                                            ? "bg-[#251b3d] text-[#00e5ff] border border-[#ff007f]/40"
                                            : "text-slate-400 hover:text-white hover:bg-[#201836]"
                                        }`}
                                      >
                                        {eff}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* View Usage Hover / Toggle Row (Responsive Inside Dropdown) */}
                        <div
                          className="pt-1 mt-1 border-t border-[#291f42]"
                          onMouseEnter={() => {
                            setIsUsageInlineOpen(true);
                            callAntigravityBridge("get-usage", {}).then((r) => {
                              if (r && r.ok) setUsageStats(r);
                            });
                          }}
                        >
                          <button
                            onClick={() => {
                              setIsUsageInlineOpen(!isUsageInlineOpen);
                              callAntigravityBridge("get-usage", {}).then((r) => {
                                if (r && r.ok) setUsageStats(r);
                              });
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#291f42] text-slate-300 hover:text-white flex items-center justify-between cursor-pointer font-medium"
                          >
                            <div className="flex items-center gap-2">
                              <Gauge className="w-3.5 h-3.5 text-slate-400" />
                              <span>View Usage</span>
                            </div>
                            <ChevronRight
                              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                isUsageInlineOpen ? "rotate-90" : ""
                              }`}
                            />
                          </button>

                          {/* Inline Responsive Usage HUD (Image 4) */}
                          {isUsageInlineOpen && (
                            <div className="mx-2 mb-1.5 p-2.5 rounded-lg bg-[#140f24] border border-[#2d2246] space-y-2 text-[10.5px]">
                              {/* Gemini Models */}
                              <div>
                                <div className="font-bold text-slate-200">Gemini Models</div>
                                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                                  <span>Weekly limit</span>
                                  <div className="flex items-center gap-1 font-bold text-slate-200">
                                    <span>{usageStats?.quotas?.[0]?.weekly?.percentLeft || 58}% left</span>
                                    <span className="w-2 h-2 rounded-full border border-[#00e676]" />
                                  </div>
                                </div>
                                <div className="text-[9px] text-slate-500 text-right">
                                  {usageStats?.quotas?.[0]?.weekly?.resetText || "Resets in 3d 18h"}
                                </div>
                              </div>

                              {/* Claude and GPT models */}
                              <div className="pt-1 border-t border-[#231a38]">
                                <div className="font-bold text-slate-200">Claude and GPT models</div>
                                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                                  <span>Weekly limit</span>
                                  <div className="flex items-center gap-1 font-bold text-slate-200">
                                    <span>{usageStats?.quotas?.[1]?.weekly?.percentLeft || 100}% left</span>
                                    <span className="w-2 h-2 rounded-full border border-[#00e676]" />
                                  </div>
                                </div>
                              </div>

                              {/* Gemini 4 Argon */}
                              <div className="pt-1 border-t border-[#231a38]">
                                <div className="font-bold text-slate-200">Gemini 4 Argon</div>
                                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                                  <span>Weekly limit</span>
                                  <div className="flex items-center gap-1 font-bold text-[#ff80ab]">
                                    <span>{usageStats?.quotas?.[2]?.weekly?.percentLeft || 9}% left</span>
                                    <span className="w-2 h-2 rounded-full border border-[#ff1744]" />
                                  </div>
                                </div>
                              </div>

                              {/* Total DB Turns */}
                              <div className="pt-1 border-t border-[#231a38] text-[9.5px] text-slate-400 flex items-center justify-between">
                                <span>DB Turns:</span>
                                <span className="font-mono text-[#00e5ff] font-bold">
                                  {usageStats?.totalSteps?.toLocaleString() || "89,506"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Circular Send Arrow Button */}
                <button
                  onClick={handleSendAgyPrompt}
                  disabled={isAgySending || (!agyPromptInput.trim() && activePromptSkills.length === 0)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    (agyPromptInput.trim() || activePromptSkills.length > 0) && !isAgySending
                      ? "bg-[#3e2f5e] hover:bg-[#584185] text-white shadow-md cursor-pointer hover:scale-105"
                      : "bg-[#221a34] text-slate-600 cursor-not-allowed"
                  }`}
                  title="Send prompt to Antigravity (Enter)"
                >
                  {isAgySending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-300" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
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
              <span>AUTO-POPULATE LOCAL IDENTITY</span>
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

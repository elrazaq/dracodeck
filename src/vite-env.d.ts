/// <reference types="vite/client" />

export interface FileItem {
  name: string;
  isDirectory: boolean;
  path: string;
}

export interface FileStat {
  size: number;
  mtime: string;
  isDirectory: boolean;
  isFile: boolean;
}

export interface DriveItem {
  name: string;
  path: string;
  isDrive: boolean;
}

export interface SysInfo {
  cpus: number;
  cpuModel: string;
  totalMem: number;
  freeMem: number;
  uptime: number;
  platform: string;
  release: string;
  arch: string;
  hostname: string;
}

export interface UpdateInfo {
  commit: string;
  message: string;
  date: string;
  status: string;
}

export interface TelemetryDiff {
  path: string;
  target: string;
  replacement: string;
  isNewFile?: boolean;
}

export interface TelemetryToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
  toolSummary?: string | null;
  durationMs?: number;
  command?: string;
  diff?: TelemetryDiff;
  filePath?: string;
  status?: string;
}

export interface TelemetryTokens {
  input: number;
  output: number;
  cache: number;
}

export interface TelemetryEvent {
  id: string;
  stepIndex: number;
  conversationId: string;
  source: string;
  type: string;
  status: string;
  timestamp: string;
  userPrompt?: string | null;
  modelThinking?: string | null;
  modelResponse?: string | null;
  toolCalls: TelemetryToolCall[];
  tokens: TelemetryTokens;
}

export interface TelemetrySessionItem {
  id: string;
  path: string;
  logPath: string | null;
  hasLogs: boolean;
  logSize: number;
  lineEstimate: number;
  mtime: string;
  lastActiveMs: number;
}

export interface AttachTelemetryResult {
  success: boolean;
  convId?: string;
  history?: TelemetryEvent[];
  error?: string;
}

export interface ActiveTelemetrySession {
  active: boolean;
  convId?: string;
  isPaused?: boolean;
  logPath?: string;
}

declare global {
  interface Window {
    dracoAPI?: {
      platform: string;
      version: string;
      selectFolder: () => Promise<string | null>;
      readDir: (dirPath: string) => Promise<FileItem[]>;
      readFile: (filePath: string) => Promise<string>;
      writeFile: (filePath: string, content: string) => Promise<boolean>;
      deleteFile: (targetPath: string) => Promise<boolean>;
      renameFile: (oldPath: string, newPath: string) => Promise<boolean>;
      statFile: (targetPath: string) => Promise<FileStat | null>;
      quitApp: () => Promise<void>;
      terminalInit: (cwd?: string) => Promise<boolean>;
      terminalKill: () => Promise<boolean>;
      getNetInterfaces: () => Promise<Record<string, any[]>>;
      getSysInfo: () => Promise<SysInfo>;
      checkUpdate: () => Promise<UpdateInfo>;
      getDrives: () => Promise<{ drives: DriveItem[]; places: DriveItem[] }>;
      windowMinimize: () => Promise<void>;
      windowMaximize: () => Promise<void>;
      windowClose: () => Promise<void>;
      listTelemetrySessions: () => Promise<TelemetrySessionItem[]>;
      attachTelemetry: (convId?: string, maxHistory?: number) => Promise<AttachTelemetryResult>;
      pauseTelemetry: (paused: boolean) => Promise<boolean>;
      getActiveTelemetrySession: () => Promise<ActiveTelemetrySession>;
      send: (channel: string, data: any) => void;
      receive: (channel: string, func: (...args: any[]) => void) => void;
    };
  }
}

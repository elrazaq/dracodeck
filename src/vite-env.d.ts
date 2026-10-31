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

export interface VerifiedFinding {
  type: string;
  title: string;
  certainty: 'VERIFIED' | 'HEURISTIC';
  certaintyScore: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  targetParam?: string;
  canaryToken?: string;
  contextType?: string;
  evidenceExcerpt: string;
  reproducibleCurl: string;
  testedUrl?: string;
  statusCode?: number;
  remediation: string;
  reflectedOrigin?: string;
  credentialsAllowed?: boolean;
  baselineLength?: number;
  trueProbeLength?: number;
  falseProbeLength?: number;
  framework?: string;
}

export interface PoVScanResult {
  targetUrl: string;
  timestamp: string;
  durationMs: number;
  verifiedFindings: VerifiedFinding[];
  totalVerified: number;
  error?: string;
}

export interface ShadowEndpointItem {
  path: string;
  fullUrl: string;
  statusCode: number;
  statusMessage: string;
  contentLength: number;
  isAccessible: boolean;
  isProtected: boolean;
}

export interface ShadowApiScanResult {
  targetUrl: string;
  scannedScripts: number;
  timestamp: string;
  durationMs: number;
  shadowEndpoints: ShadowEndpointItem[];
  hiddenParameters: string[];
  leakedSecrets: Array<{ type: string; value: string; script: string }>;
  error?: string;
}

export interface TimingDiscrepancyResult {
  endpoint: string;
  testUser: string;
  nonExistentUser?: string;
  nonExistentTimings?: number[];
  targetTimings?: number[];
  avgNonExistentMs?: number;
  avgTargetMs?: number;
  timingDeltaMs?: number;
  isVulnerable: boolean;
  verdict: string;
  error?: string;
}

export interface ConcurrencyRaceResult {
  targetEndpoint: string;
  burstCount: number;
  totalWindowMs: number;
  statusCodes: number[];
  latencies: number[];
  uniformity?: string;
  summary: string;
  error?: string;
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
      terminalSetCwd: (cwd: string) => Promise<boolean>;
      terminalGetCwd: () => Promise<string>;
      terminalGetHistory: () => Promise<string[]>;
      terminalClearHistory: () => Promise<boolean>;
      slayerScanPorts: () => Promise<any[]>;
      slayerKillProcess: (pid: number, forceTree?: boolean) => Promise<{ success: boolean; pid?: number; error?: string; output?: string }>;
      slayerKillPort: (port: number) => Promise<{ success: boolean; port?: number; error?: string; processName?: string }>;
      slayerProbePort: (host: string, port: number) => Promise<{ open: boolean; latencyMs: number; banner?: string; error?: string }>;
      vulnScan: (targetUrl: string) => Promise<any>;
      vulnCertInspect: (host: string, port?: number) => Promise<any>;
      sentinelRunPoV: (targetUrl: string) => Promise<PoVScanResult>;
      sentinelCrawlShadow: (targetUrl: string) => Promise<ShadowApiScanResult>;
      sentinelTestTiming: (targetUrl: string, endpointPath?: string, testUser?: string) => Promise<TimingDiscrepancyResult>;
      sentinelTestConcurrency: (targetUrl: string, endpointPath?: string) => Promise<ConcurrencyRaceResult>;
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
      setDNS: (dnsServer: string) => Promise<{ success: boolean; mode?: string; error?: string }>;
      setProxy: (proxyRules: string) => Promise<{ success: boolean; proxy?: string; error?: string }>;
      setUserAgent: (ua: string) => Promise<{ success: boolean; userAgent?: string; error?: string }>;
      checkPublicIP: () => Promise<{ ip: string; status: string }>;
      openWebviewDevTools: (options?: { mode?: 'right' | 'bottom' | 'undocked' }) => Promise<{ opened: boolean } | boolean>;
      checkWSL: () => Promise<{ hasWSL: boolean; isKali: boolean }>;
      send: (channel: string, data: any) => void;
      receive: (channel: string, func: (...args: any[]) => void) => (() => void) | void;
      off: (channel: string, func: (...args: any[]) => void) => void;
    };
  }
}

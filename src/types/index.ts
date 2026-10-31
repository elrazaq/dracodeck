export type ActiveView = 'desktop' | 'explorer' | 'editor' | 'terminal' | 'telemetry' | 'slayer' | 'browser' | 'settings' | 'offensive';

export interface PortInfo {
  port: number;
  protocol: 'TCP';
  localAddress: string;
  state: 'LISTENING' | 'ESTABLISHED' | string;
  pid: number;
  processName: string;
  label: string;
  isDevPort: boolean;
  isProtected: boolean;
  isSelf: boolean;
  latencyMs?: number;
  banner?: string;
}

export interface CertInfo {
  valid: boolean;
  subject?: string;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
  daysRemaining?: number;
  protocol?: string;
  cipher?: string;
  serialNumber?: string;
  san?: string;
  error?: string;
}

export interface VulnFinding {
  id: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'PASS' | 'INFO';
  cwe?: string;
  title: string;
  evidence: string;
  description: string;
  remediation: string;
}

export interface VulnAuditResult {
  targetUrl: string;
  timestamp: string;
  durationMs: number;
  certInfo?: CertInfo | null;
  findings: VulnFinding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    pass: number;
  };
}

export interface FileEntry {
  name: string;
  isDirectory: boolean;
  path: string;
  size?: number;
}

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  isDirty?: boolean;
}

/**
 * Strict Folder-First Ascending Sorting Algorithm:
 * 1. Folders are always grouped at the top.
 * 2. Files are grouped below all folders.
 * 3. Inside each group, entries are sorted ascending A-Z naturally.
 */
export function sortEntries<T extends { isDirectory: boolean; name: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}

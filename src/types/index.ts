export type ActiveView = 'desktop' | 'explorer' | 'editor' | 'terminal' | 'telemetry' | 'slayer' | 'browser' | 'settings';

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

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
      send: (channel: string, data: any) => void;
      receive: (channel: string, func: (...args: any[]) => void) => void;
    };
  }
}

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
      send: (channel: string, data: any) => void;
      receive: (channel: string, func: (...args: any[]) => void) => void;
    };
  }
}

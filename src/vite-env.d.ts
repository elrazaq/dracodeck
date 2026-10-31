/// <reference types="vite/client" />

export interface FileItem {
  name: string;
  isDirectory: boolean;
  path: string;
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
      send: (channel: string, data: any) => void;
      receive: (channel: string, func: (...args: any[]) => void) => void;
    };
  }
}

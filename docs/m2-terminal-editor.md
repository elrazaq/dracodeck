# Milestone 2: ConPTY Terminal & Monaco Integration (M2)

Dokumen spesifikasi teknis untuk implementasi terminal interaktif native Windows dan code editor Monaco pada **DRACODECK** berbasis Electron.

---

## 1. Tujuan & Deliverables

1. **ConPTY Terminal Native Windows**: Terminal interaktif tanpa lag yang terhubung ke PowerShell / WSL2 via Node.js PTY bridge.
2. **Monaco Code Editor**: Editor kode resmi VS Code dengan syntax highlighting, multi-tab, minimap, dan tema Kali Dark.
3. **Local Filesystem Bridge**: IPC API aman untuk membaca dan menulis berkas workspace.

---

## 2. Arsitektur Terminal (Node.js PTY -> xterm.js)

```mermaid
flowchart LR
    Xterm["xterm.js Canvas\n(Renderer Process)"] <-->|IPC Send / On (UTF-8)| Preload["contextBridge\n(electron/preload.ts)"]
    Preload <-->|IPC Main Bridge| NodePTY["PTY Bridge\n(electron/pty.ts)"]
    NodePTY <--> PowerShell["powershell.exe / wsl.exe\n(Windows ConPTY)"]
```

### IPC API Contracts:
- `window.dracoAPI.terminal.send(data: string)`
- `window.dracoAPI.terminal.onData(callback: (data: string) => void)`
- `window.dracoAPI.terminal.resize(cols: number, rows: number)`

---

## 3. Monaco Editor Integration

- Package: `@monaco-editor/react`.
- Custom Theme: `dracodeck-dark` (#0a0e17 background, #00e5ff keywords, #00e676 strings).
- Filesystem IPC:
  - `window.dracoAPI.fs.readFile(path: string): Promise<string>`
  - `window.dracoAPI.fs.writeFile(path: string, content: string): Promise<void>`
  - `window.dracoAPI.fs.listDir(path: string): Promise<FileItem[]>`

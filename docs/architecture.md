# Architecture: Project DRACODECK (Comprehensive Edition)

## 1. System Overview

DRACODECK adalah desktop developer cockpit untuk Windows yang menggabungkan filosofi *offensive-grade* Kali Linux dengan alur kerja rekayasa perangkat lunak modern, orkestrasi AI, dan manajemen proyek.

```mermaid
flowchart TD
    subgraph UI_Renderer ["Electron Renderer (React 19 + Tailwind CSS v4)"]
        LeftDock["Kali Vertical Left Dock (56px)"]
        DesktopSpace["Kali OS Desktop & Built-in File Manager"]
        CodeEditor["VS Code Kali Dark Editor Engine"]
        TerminalCanvas["Xterm.js Canvas (PowerShell / WSL2)"]
        TelemetryPanel["Antigravity & Agent Telemetry Hub"]
        MemoryPanel["DracoMemory Notes & Kanban Project Tracker"]
        GitBar["Lightning Git Ops (1-Click Branch & Push)"]
        NetMatrix["DracoNet Kali Networking & Port Slayer"]
    end

    subgraph Bridge ["Secure IPC Layer (preload.cjs)"]
        ContextAPI["contextBridge: window.dracoAPI"]
    end

    subgraph Main_Process ["Electron Main Process (Node.js 22 Runtime)"]
        FsService["Filesystem Engine & .draco/ Vault"]
        PtyService["ConPTY Native Terminal Bridge"]
        TailerService["Agent Telemetry Streamer (JSONL non-blocking)"]
        GitService["Local Git CLI & GitHub REST Bridge"]
        NetService["Win32 TCP Socket Probe & Process Killer"]
    end

    UI_Renderer <-->|IPC invoke / on| ContextAPI <--> Main_Process
    FsService <--> LocalDisk["Workspace Filesystem"]
    PtyService <--> PowerShell["PowerShell / WSL2 Processes"]
    TailerService <---|Shared Read| BrainLogs["%USERPROFILE%/.gemini/antigravity/..."]
    GitService <--> GitHubAPI["GitHub REST API & Git Repo"]
    NetService <--> WinTCP["Windows TCP Socket Table"]
```

---

## 2. Component Specifications

### 2.1 DracoMemory & Project Management
- **Format Catatan**: Berkas Markdown (`.md`) disimpan di direktori `.draco/notes/`.
- **Manajemen Proyek**: Task list dan board Kanban bertipe JSON disimpan di `.draco/project/tasks.json`.
- **Jadwal & Tracking**: Indikator progres tanggal, deadline, dan badge prioritas (Critical, High, Medium, Low).

### 2.2 DracoGit Ops (1-Click Lightning Operations)
- **Branch Management**: Mengambil daftar branch aktif lokal & remote, switch branch via IPC command cepat (`git switch <branch>`).
- **One-Click Commit & Push**: Menggabungkan stage all, commit, dan push dalam satu aksi tombol di UI tanpa perlu menulis perintah git manual di terminal.

### 2.3 DracoAgent Multi-Bridge
- **Google Antigravity**: Tailing berkas `transcript.jsonl` non-blocking dengan Windows flag `FILE_SHARE_READ`.
- **GitHub Copilot & Codex**: Adapter untuk memantau status sesi, token penggunaan, dan alur sintesis kode.

### 2.4 DracoNet (Kali Linux Offensive Networking Suite)
- **Socket Probe**: Pemindai port listening lokal dan subnet berbasis soket murni Node.js.
- **HTTP / Header Inspector**: Debugger permintaan HTTP/API instan.
- **Zombie Port Slayer**: Scanner socket TCP Windows dengan terminasi proses 1-klik untuk port dev terkunci (`3000`, `5173`, `8080`, `5432`, `8000`).

---

## 3. Directory Map

```text
electron/
├── main.cjs          # Window lifecycle, native menu, IPC listeners
└── preload.cjs       # contextBridge API exposing safe dracoAPI

src/
├── components/
│   ├── layout/       # LeftDock, TopBar, SplitPane, Shell
│   ├── desktop/      # Kali OS Desktop & Built-in File Manager
│   ├── editor/       # VS Code Kali Dark Editor
│   ├── terminal/     # Xterm.js container & PTY IPC hook
│   ├── telemetry/    # Antigravity & Agent live debug cards
│   ├── memory/       # DracoMemory notes & Kanban project tracker
│   ├── git/          # 1-click Git Ops bar & branch switcher
│   └── slayer/       # DracoNet socket scanner & process killer
├── types/            # IPC payloads & telemetry interfaces
├── index.css         # Tailwind v4 Kali Dark design tokens
└── App.tsx           # Shell root orchestrator
```

<div align="center">

<img src="./public/dracodex-logo.jpg" alt="Dracodex Logo" width="380" />

# DRACODEX
### *The Offensive-Grade Developer Cockpit for Windows*

[![Windows](https://img.shields.io/badge/Platform-Windows%2011%20%7C%2010-00e5ff?style=flat-square&logo=windows)](https://microsoft.com)
[![Electron](https://img.shields.io/badge/Engine-Electron%2045-2979ff?style=flat-square&logo=electron)](https://electronjs.org)
[![React](https://img.shields.io/badge/Frontend-React%2019-61dafb?style=flat-square&logo=react)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-00e676?style=flat-square)](LICENSE)

</div>

---

## 1. Vision & Core Philosophy

**DRACODEX** bridges the gap between offensive cybersecurity aesthetics and modern software engineering.

In cybersecurity, **Kali Linux** is revered because it is self-contained, lethal, and equipped out-of-the-box with battle-tested tooling. **DRACODEX** transports that exact philosophy to Windows developer workstations:

* **Offensive-Grade Cyberdeck Ergonomics**: No rounded pastel cards or bloated UI fluff. Strict Kali dark slate surfaces (`#0a0e17`, `#111726`), precision 1px borders, high-contrast cyan accents (`#00e5ff`), and crisp monospace typography (`JetBrains Mono`).
* **Zero Compiler Overhead**: Engineered on Electron 45 and Node.js 22, eliminating gigabytes of MSVC C++ build tools and platform prerequisites.
* **One-Time Workspace Onboarding**: On first boot, choose your workspace directory. It persists permanently with instant switching available directly from the Kali top bar.
* **Real-Time AI Telemetry**: Directly stream and observe Google Antigravity reasoning loops and tool invocations (`run_command`, `edit_file`) without file-locking lag.
* **Zombie Port Slayer**: One-click termination for hung background processes locking development ports (`3000`, `5173`, `8080`, `5432`).

---

## 2. Core Architecture

```mermaid
flowchart TD
    subgraph UI_Renderer ["DRACODEX UI Shell (React 19 + Tailwind CSS v4)"]
        TopBar["Kali XFCE Top Bar (Live Status + Active Workspace + Port Monitor)"]
        ActivityBar["Activity Bar (Explorer, Terminal, Telemetry, Slayer, Config)"]
        EditorArea["VS Code Style Editor (Multi-tabs, Dirty Indicators, Syntax Styling)"]
        TerminalPanel["Interactive Terminal Canvas (ConPTY PowerShell / WSL2)"]
        TelemetryPanel["Antigravity Live Telemetry & Diff Inspector"]
        PortMatrix["Zombie Port Slayer Matrix"]
    end

    subgraph Core_Bridge ["Secure Preload IPC Bridge (preload.cjs)"]
        ContextAPI["contextBridge: window.dracoAPI"]
    end

    subgraph Main_Engine ["Electron Main Process (Node.js 22)"]
        FsService["Native Filesystem Service (Folder Dialog + Safe Async I/O)"]
        PTYBridge["Windows ConPTY Bridge (PowerShell 7 / WSL2)"]
        LogTailer["Antigravity Brain Tailer (Non-blocking transcript.jsonl watcher)"]
        PortKiller["Socket Enumeration & Process Terminator"]
    end

    UI_Renderer <-->|IPC invoke / on| ContextAPI <--> Main_Engine
    FsService <--> LocalDisk["Workspace Filesystem"]
    PTYBridge <--> LocalShell["PowerShell / WSL2"]
    LogTailer <---|Incremental Read| BrainLogs["%USERPROFILE%/.gemini/antigravity/..."]
```

---

## 3. Features & Pillars

### ⚡ Persistent Workspace Initializer
- Clean, Kali-styled boot screen featuring the official Dracodex Dragon insignia.
- Native folder dialog picker: select your workspace directory once, stored permanently in local storage.
- Easily change workspaces on the fly from the top bar or settings drawer.

### 📁 Real-Time File Explorer
- Live interactive filesystem directory tree.
- Expand and collapse folders on demand.
- File-type icons for TypeScript, React, JavaScript, JSON, Markdown, CSS, and Rust.

### 📝 VS Code-Inspired Kali Dark Editor
- Multi-tab management with active file highlighting and dirty state indicators.
- Live file reading and editing with `Ctrl+S` instant disk saving.
- Authentic line-number gutter and status footer (Ln/Col, Spaces: 2, UTF-8, LF).

### 🛰️ Antigravity AI Telemetry Window
- Observability module listening to `%USERPROFILE%\.gemini\antigravity\brain\...\transcript.jsonl`.
- Live cards displaying tool calls (`run_command`, `write_file`, `edit_file`) and execution metrics.
- Cognitive flow accordion for inspecting model reasoning and chain-of-thought traces.

### 🎯 Zombie Port & Process Slayer
- Monitors local TCP ports: `1420` (Tauri), `5173` (Vite), `3000` (Node/Next), `8080` (HTTP), `5432` (PostgreSQL), `8000` (Python).
- 1-click `KILL` action to immediately liberate locked ports from stubborn zombie processes.

---

## 4. Getting Started

### Prerequisites:
- **Operating System**: Windows 10 or Windows 11 (64-bit)
- **Node.js**: Version 20 LTS or 22+

### Installation & Launch:
```bash
# Clone the repository
git clone https://github.com/<YOUR_USER>/dracodex.git
cd dracodex

# Install dependencies (only takes ~15 seconds)
npm install

# Start the native Windows desktop app
npm run dev
```

---

## 5. Roadmap & Development Milestones

- [x] **Milestone 0**: Architecture blueprint, ADR records, and technical documentation.
- [x] **Milestone 1**: Kali Dark UI Shell, workspace folder onboarding, and live file explorer.
- [ ] **Milestone 2**: ConPTY native terminal integration (`node-pty`) & Monaco Editor core.
- [ ] **Milestone 3**: Antigravity Live Telemetry Streamer & diff visualizer.
- [ ] **Milestone 4**: Native socket port slayer & standalone Windows `.exe` installer.

---

## 6. License

Distributed under the **MIT License**. Built with pride for developers who operate on the edge.

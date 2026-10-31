# Project DRACODECK Roadmap (M0 - M5)

Roadmap resmi pengembangan **DRACODECK** (*The Offensive-Grade Developer Cockpit for Windows*).

---

## Milestone 0: Master Plan & Foundation Docs
- [x] Transisi arsitektur ke Electron & eliminasi compiler C++ (0 GB).
- [x] Blueprint 4 pilar besar (DracoMemory, DracoGit Ops, DracoAgent, DracoNet).
- [x] Pembaruan seluruh dokumen teknis & konvensi storage `.draco/`.

---

## Milestone 1: Kali Dark Shell & Electron Scaffold
- [x] Inisialisasi Electron main process (`electron/main.cjs`) & preload (`electron/preload.cjs`).
- [x] Setup Tailwind CSS v4 design tokens Kali Dark (`#0a0e17`, `#111726`, `#00e5ff`).
- [x] Pembuatan repository public GitHub & initial commit ([https://github.com/elrazaq/dracodeck](https://github.com/elrazaq/dracodeck)).

---

## Milestone 1.1: Kali Linux OS Desktop Experience & Native File Manager
> Dokumen Spesifikasi: [m1-1-kali-os-experience.md](m1-1-kali-os-experience.md)
- [x] Implementasi logo resmi **Dracodeck** (koreksi typo nama).
- [x] Layout Taskbar Vertikal Sisi Kiri (Kali Left Vertical Dock, launcher naga, app pins, vertical clock).
- [x] Kali Desktop Environment UI & Internal File Manager (Thunar / Dolphin style).
- [x] Algoritma Strict Folder-First Ascending (seluruh folder A-Z di atas, seluruh file A-Z di bawah).
- [x] Signature Status Bar Hot Magenta (#ff007f) selaras dengan VS Code pengguna.

---

## Milestone 1.2: Kali OS Desktop, Comprehensive Syntax Highlighting & Workspace Scoping
> Dokumen Spesifikasi: [m1-2-desktop-syntax-scoping.md](m1-2-desktop-syntax-scoping.md)
- [ ] Comprehensive syntax highlighting (html, css, js, ts, tsx, py, dart, rs, json, md, sh).
- [ ] Dedicated file-type icons (TS, JS, Py, Dart, Rust, HTML, CSS, JSON, Markdown).
- [ ] Fullscreen boot window & tombol shutdown sistem di dock kiri.
- [ ] Tampilan UI Desktop OS sejati (wallpaper cyberdeck + desktop app shortcuts).
- [ ] Right-click folder context menu: Copy, Cut, Paste, Properties, dan **Open Scope Here** (isolasi fokus folder).

---

## Milestone 2: ConPTY Terminal & Monaco Integration
> Dokumen Spesifikasi: [m2-terminal-editor.md](m2-terminal-editor.md)
- [ ] Main Process: ConPTY streaming bridge (`powershell.exe` / `wsl.exe`) via Electron IPC.
- [ ] Renderer: `@xterm/xterm` + `@xterm/addon-fit` terhubung ke stream terminal.
- [ ] Renderer: `@monaco-editor/react` terpasang dengan custom Kali Dark theme.
- [ ] Local filesystem read/write via IPC channel.

---

## Milestone 3: Antigravity & Multi-Agent Telemetry Hub
> Dokumen Spesifikasi: [m3-telemetry-engine.md](m3-telemetry-engine.md)
- [ ] Main Process: File watcher non-blocking (`fs.watch`) memantau `transcript.jsonl`.
- [ ] Main Process: Incremental byte-offset tailer streaming event ke renderer.
- [ ] Renderer: Live tool call cards (`run_command`, `edit_file`, dsb.).
- [ ] Renderer: Live diff viewer (visualisasi hijau/merah perubahan kode).
- [ ] Renderer: Cognitive flow accordion (penalaran alur pikir model).
- [ ] Multi-Agent Adapter: Interface untuk GitHub Copilot & OpenAI Codex.

---

## Milestone 4: DracoNet Kali Networking Suite & Zombie Port Slayer
> Dokumen Spesifikasi: [m4-port-slayer.md](m4-port-slayer.md)
- [ ] Main Process: Scanner port socket dev (`netstat` / TCP connection table).
- [ ] Main Process: 1-klik `kill_process(pid)` untuk mematikan proses zombie pengunci port (`3000`, `5173`, `8080`, `5432`, `8000`).
- [ ] Socket Probe & HTTP Header Inspector bergaya Kali Linux.
- [ ] Packaging: Build standalone Windows `.exe` installer via Electron Builder.

---

## Milestone 5: DracoMemory & 1-Click Lightning Git Ops
> Dokumen Spesifikasi: [m5-memory-gitops.md](m5-memory-gitops.md)
- [ ] DracoMemory: Editor catatan Markdown internal tersimpan di `.draco/notes/`.
- [ ] Project Management: Kanban Board & Milestone Issue Tracker di `.draco/project/tasks.json`.
- [ ] Scheduling & Tracking: Visual timeline, prioritas label, dan task checklist.
- [ ] 1-Click Git Ops: Fast Branch Switcher dropdown & 1-klik Commit + Push ke GitHub.

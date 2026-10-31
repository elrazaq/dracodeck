# Project DRACODECK Roadmap (M0 - M4) — Electron Edition

Roadmap resmi pengembangan **DRACODECK** (*The Offensive-Grade Developer Cockpit for Windows*).

---

## Milestone 0: Master Plan & Foundation Docs (CURRENT)
- [x] Transisi keputusan arsitektur ke Electron (ADR D-001).
- [x] Pembaruan seluruh dokumen: [m0-master-plan.md](m0-master-plan.md), [architecture.md](architecture.md), [decisions.md](decisions.md), [setup.md](setup.md).
- [x] Eliminasi overhead C++ / Visual Studio (0 GB).

---

## Milestone 1: Kali Dark Shell & Electron Scaffold
> Dokumen Spesifikasi: [m1-kali-shell.md](m1-kali-shell.md)
- [x] Inisialisasi Electron main process (`electron/main.cjs`) & preload (`electron/preload.cjs`).
- [x] Mount Kali Dark UI Shell di Electron BrowserWindow (1440x900).
- [x] Verifikasi window desktop native berjalan langsung via `npm run dev`.

---

## Milestone 1.1: Kali Linux OS Desktop Experience & Native File Manager
> Dokumen Spesifikasi: [m1-1-kali-os-experience.md](m1-1-kali-os-experience.md)
- [ ] Update logo resmi **Dracodeck** (koreksi typo nama dari Dracodex).
- [ ] Layout Taskbar Vertikal di Sisi Kiri (Kali Left Vertical Dock, launcher naga, app pins, vertical clock).
- [ ] Kali Desktop Environment UI & Internal File Manager (Thunar / Dolphin style) di dalam cockpit.
- [ ] Strict Folder-First Sorting Algorithm (folder alfabetis A-Z di atas, file alfabetis A-Z di bawah).
- [ ] Tampilan Editor VS Code bertema Kali Dark terhubung ke pembukaan file manager.

---

## Milestone 2: ConPTY Terminal & Monaco Integration
> Dokumen Spesifikasi: [m2-terminal-editor.md](m2-terminal-editor.md)
- [ ] Main Process: ConPTY streaming bridge (`powershell.exe` / `wsl.exe`) via Electron IPC.
- [ ] Renderer: `@xterm/xterm` + `@xterm/addon-fit` terhubung ke stream terminal.
- [ ] Renderer: `@monaco-editor/react` terpasang dengan custom Kali Dark theme.
- [ ] Local filesystem read/write via IPC channel.

---

## Milestone 3: Antigravity Live Telemetry Engine
> Dokumen Spesifikasi: [m3-telemetry-engine.md](m3-telemetry-engine.md)
- [ ] Main Process: File watcher non-blocking (`fs.watch`) memantau `transcript.jsonl`.
- [ ] Main Process: Incremental byte-offset tailer streaming event ke renderer.
- [ ] Renderer: Live tool call cards (`run_command`, `edit_file`, dsb.).
- [ ] Renderer: Live diff viewer (visualisasi hijau/merah perubahan kode).
- [ ] Renderer: Cognitive flow accordion (penalaran alur pikir model).

---

## Milestone 4: Zombie Port Slayer & Hardening
> Dokumen Spesifikasi: [m4-port-slayer.md](m4-port-slayer.md)
- [ ] Main Process: Scanner port socket dev (`netstat` / TCP connection table).
- [ ] Main Process: 1-klik `kill_process(pid)` untuk mematikan proses zombie pengunci port (`3000`, `5173`, `8080`, `5432`, `8000`).
- [ ] Renderer: Visual matrix dashboard port slayer.
- [ ] Packaging: Build standalone Windows `.exe` via Electron Builder.

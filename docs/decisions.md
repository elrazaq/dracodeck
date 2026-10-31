# Architecture Decision Records (ADR)

## D-001: Migrasi dari Tauri v2 ke Electron
- **Status**: Accepted
- **Context**: Tauri v2 di Windows membutuhkan compiler C++ Visual Studio Build Tools (MSVC) berukuran 6.7 GB dan hak akses Administrator UAC. Ini memberatkan ruang penyimpanan dan menghambat setup cepat.
- **Decision**: Menggunakan **Electron (Node.js 22 + Chromium)**.
- **Consequences**:
  - Ukuran dependensi turun drastis (~80 MB binary prebuilt).
  - Nol instalasi compiler C++ atau Visual Studio.
  - Setup instan dan eksekusi langsung jalan di Windows.
  - Konsumsi RAM sedikit lebih besar dari Tauri (~150MB vs ~60MB), namun sepenuhnya dapat diterima untuk workstation developer.

## D-002: React 19 dengan TypeScript dan Vite
- **Status**: Accepted
- **Context**: Membutuhkan performa rendering reaktif untuk terminal xterm dan diff viewer.
- **Decision**: Frontend menggunakan React 19, TypeScript strict mode, dan Vite sebagai build bundler.

## D-003: Kali Linux Cyberdeck Design Tokens di Tailwind v4
- **Status**: Accepted
- **Context**: UI harus memiliki estetika Kali Linux / offensive-grade workstation (dark slate, cyan accent, zero rounded fluff).
- **Decision**: Menggunakan Tailwind CSS v4 dengan token custom: `#0a0e17` (Void), `#111726` (Slate), `#00e5ff` (Cyan), `#ff1744` (Alert).

## D-004: Terminal Native via Electron IPC & ConPTY
- **Status**: Accepted
- **Context**: Terminal interaktif membutuhkan koneksi ke PowerShell Windows.
- **Decision**: Node.js child_process / PTY mengalirkan streaming I/O langsung ke `@xterm/xterm` via Electron IPC.

## D-005: Incremental Stream Tailer untuk Antigravity `transcript.jsonl`
- **Status**: Accepted
- **Context**: Antigravity engine secara kontinu menulis ke file log di Windows.
- **Decision**: Node.js `fs.watch` dengan byte-offset tracking membaca data baru tanpa me-re-read file dari awal.

## D-006: Port Slayer via Netstat & Process Kill
- **Status**: Accepted
- **Context**: Developer sering mengalami port bentrok saat server zombie menggantung.
- **Decision**: Main process memeriksa status socket TCP dan menyediakan endpoint 1-klik untuk menghentikan proses pengunci port.

## D-007: Pola Local-First Storage `.draco/` untuk Catatan & Task
- **Status**: Accepted
- **Context**: Aplikasi membutuhkan fitur memori internal (catatan developer) dan manajemen proyek (Kanban & scheduling) tanpa membebani repositori git atau memerlukan server eksternal berbayar.
- **Decision**: Menyimpan catatan di `.draco/notes/*.md` dan data task proyek di `.draco/project/tasks.json` di dalam root workspace pengguna.

## D-008: 1-Click Lightning Git Ops via Native CLI Bridge
- **Status**: Accepted
- **Context**: Developer menginginkan pergantian branch, commit, dan push secepat kilat dengan 1-klik tanpa perlu mengetik perintah git berulang di terminal.
- **Decision**: Mengintegrasikan jembatan Git CLI lokal di main process Electron untuk mengeksekusi `git switch`, `git checkout -b`, `git add .`, dan `git push` secara instan.

## D-009: Multi-Agent Adapter Interface (Antigravity, Copilot, Codex)
- **Status**: Accepted
- **Context**: Cockpit perlu mendukung observabilitas dan komunikasi tidak hanya untuk Antigravity, tetapi juga GitHub Copilot dan OpenAI Codex.
- **Decision**: Membangun unified telemetry HUD yang mengabstraksi sumber data agent ke dalam format unified stream event.

## D-010: DracoNet Offensive Networking Suite
- **Status**: Accepted
- **Context**: Mengadopsi persenjataan networking Kali Linux untuk kebutuhan rekayasa perangkat lunak developer.
- **Decision**: Menyediakan modul TCP socket probe cepat, inspeksi HTTP/header, dan analisis port dev langsung dari cockpit.

## D-011: Penyelarasan Tema Visual ke VS Code Cyberpunk Violet
- **Status**: Accepted
- **Context**: Tampilan visual harus seragam dengan lingkungan kerja VS Code harian pengguna agar transisi ergonomis dan otentik.
- **Decision**: Mengadopsi palet warna dari environment pengguna: Status Bar Hot Magenta (`#ff007f`), Ground Obsidian Violet (`#0b0813`), Sidebar Eggplant (`#161026`), Border Violet Gunmetal (`#261d38`), dan aksen sintaks Mint Green (`#00e676`) / Kali Cyan (`#00e5ff`).

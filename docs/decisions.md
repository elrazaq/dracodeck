# Architecture Decision Records (ADR)

## D-001: Migrasi dari Tauri v2 ke Electron
- **Status**: Accepted (Supercedes D-001 lama)
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

## D-007: YAGNI Scope Pruning pada MVP
- **Status**: Accepted
- **Context**: Menjaga lingkup tetap ramping dan cepat dirilis.
- **Decision**: Berfokus penuh pada 5 pilar inti: Shell Kali, Monaco Editor, Terminal, Antigravity Telemetry, dan Zombie Port Slayer.

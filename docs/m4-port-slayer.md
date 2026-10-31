# Milestone 4: Zombie Port Slayer & Hardening (M4)

Dokumen spesifikasi teknis untuk modul pemindaian port dan terminasi proses zombie pada **DRACODECK** berbasis Electron.

---

## 1. Tujuan & Deliverables

1. **Local Port Inspector**: Pemindai port listening Windows (`netstat -ano -p tcp` / TCP socket probe) tanpa library pihak ketiga yang membengkak.
2. **One-Click Zombie Slayer**: Fitur pembunuh proses yang membebaskan port development terkunci (`3000`, `5173`, `8080`, `5432`, `8000`).
3. **Packaging Windows Installer**: Konfigurasi Electron Builder untuk menghasilkan installer standalone `.exe`.

---

## 2. Arsitektur Port Slayer

- Pindai port aktif:
  ```ts
  // electron/slayer.ts
  export async function scanPorts() {
    // executes netstat or queries TCP socket table
  }
  ```
- Terminasi proses:
  ```ts
  export function killProcess(pid: number) {
    process.kill(pid, 'SIGKILL'); // or taskkill /F /PID <pid>
  }
  ```
- IPC Contract:
  - `window.dracoAPI.slayer.scanPorts(): Promise<PortInfo[]>`
  - `window.dracoAPI.slayer.killProcess(pid: number): Promise<boolean>`

# Milestone 1.1: Kali Linux OS Desktop Experience & Native File Manager

Dokumen spesifikasi revisi mendalam untuk **Milestone 1.1 (M1-1)** proyek **DRACODECK**.

---

## 1. Identitas & Koreksi Typo Logo

Berdasarkan referensi visual terbaru pengguna:
- **Nama Resmi**: **DRACODECK** (koreksi dari kesalahan nama *Dracodex*).
- **Aset Logo Baru**: Berkas logo `Dracodeck` dengan tipografi naga cyber dan aksen huruf `k` elektrik biru (`media_1793438146871_83e80c9d.jpg`).
- **Lokasi Target Aset**: `public/dracodeck-logo.jpg` dan `src/assets/dracodeck-logo.jpg`.

---

## 2. Arsitektur Layout: Kali Linux Left Vertical Taskbar

Berdasarkan screenshot referensi desktop Kali Linux XFCE/KDE:
- **Posisi Taskbar**: Di **sebelah kiri layar (Left Vertical Dock)** secara penuh dari atas ke bawah (`h-screen w-14` / ~56px).
- **Struktur Elemen Vertical Taskbar**:
  1. **Top Section**:
     - Tombol Launcher Utama: Logo Naga Kali Dracodeck (membuka Kali Application Whisker Menu).
     - Separator tipis gunmetal (`#1b253b`).
  2. **Middle Section (Pinned Launchers & Running Tasks)**:
     - `File Manager`: Membuka jendela / tampilan internal Kali File Explorer.
     - `ConPTY Terminal`: Membuka terminal interaktif PowerShell/WSL2 bergaya Kali dark.
     - `Antigravity Telemetry`: Observabilitas proses live agent AI.
     - `Port Slayer`: Pembasmi zombie port dev.
     - `Workspace Switcher`: Tombol 1-klik untuk mengganti direktori kerja.
  3. **Bottom Section (System Tray & Clock)**:
     - Indikator koneksi / status port.
     - Jam vertikal atau stacked digital clock (misal: `03:37` / `AM`).
     - Indikator status workspace aktif.

---

## 3. UI Tampilan Awal: Kali Linux Desktop & Built-in File Manager

Tampilan awal aplikasi tidak menggunakan kartu generic, melainkan menghadirkan **lingkungan desktop Kali Linux mandiri**:

```mermaid
flowchart LR
    subgraph Kali_OS_Shell ["DRACODECK Kali Desktop Shell"]
        LeftDock["Vertical Left Taskbar\n(Logo, Apps, Tray, Clock)"]
        subgraph Desktop_Area ["Kali Desktop Space"]
            FileManagerWin["Internal Kali File Manager\n(Thunar / Dolphin Styled UI)"]
            EditorWin["VS Code Dark Kali Editor\n(Opened File Tabs)"]
        end
    end
    LeftDock --> Desktop_Area
```

### 3.1 Spesifikasi Internal Kali File Manager (Thunar/Dolphin Style):
File explorer dibangun di dalam aplikasi itu sendiri (bukan mengandalkan file picker native Windows):
1. **Header & Navigation Bar**:
   - Tombol navigasi: Back (`<`), Forward (`>`), Up Directory (`^`), Refresh.
   - Breadcrumb path interaktif: `Home > Workspace > src > components`.
2. **Left Places Sidebar**:
   - Section *Places*: `Workspace Root`, `Documents`, `Recent`, `Trash`.
   - Section *Shortcuts*: Quick access ke folder-folder utama dalam workspace (`docs`, `src`, `electron`).
3. **Main Content Pane (Folder & File Matrix)**:
   - Tampilan grid / list dengan icon neon folder (Cyan `#00e5ff` / Blue `#2979ff`).
   - Double click / klik folder: masuk ke dalam folder.
   - Klik berkas file: membuka file ke dalam editor VS Code Kali Dark.
4. **Bottom Status Bar**:
   - Menampilkan ringkasan riil: `X Folders, Y Files (Z KB) | Free Space`.

---

## 4. Algoritma Sorting File Explorer (Folder-First Ascending)

Sesuai aturan ketat pengguna, isi direktori workspace **HARUS** diurutkan ascending dengan folder di urutan teratas, tanpa ada file yang berselang-seling:

```ts
export function sortWorkspaceEntries(entries: Array<{ name: string; isDirectory: boolean; path: string }>) {
  return entries.sort((a, b) => {
    // 1. Folders selalu ditempatkan sebelum file
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;

    // 2. Di dalam kelompok yang sama (folder vs folder, file vs file), urutkan ascending A-Z
    return a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });
}
```

### Contoh Hasil Urutan:
```text
[DIR]  .agents/
[DIR]  docs/
[DIR]  electron/
[DIR]  public/
[DIR]  src/
[FILE] .gitignore
[FILE] AGENTS.md
[FILE] GEMINI.md
[FILE] README.md
[FILE] index.html
[FILE] package.json
[FILE] tsconfig.json
[FILE] vite.config.ts
```
*(Seluruh direktori berkumpul di atas, diikuti seluruh berkas file).*

---

## 5. Tampilan Editor VS Code Bergaya Kali Linux

Ketika berkas di File Manager diklik:
- Terbuka panel editor VS Code bernuansa Kali Dark (`#0a0e17`).
- Multi-tabs di bagian atas dengan status file aktif dan tombol tutup tab.
- Line numbers gutter di sisi kiri.
- Status bar bawah khas VS Code (Ln/Col, UTF-8, LF, Jenis Bahasa pemrograman).
- Pintasan keyboard `Ctrl+S` untuk menyimpan langsung ke disk.

---

## 6. Verification & Acceptance Criteria (M1-1)

1. **Logo Verification**:
   - Memastikan logo menampilkan tulisan **Dracodeck** (bukan Dracodex).
2. **Layout Dock Verification**:
   - Taskbar berada vertikal di sebelah kiri (`left: 0`, full height), bukan di atas.
3. **Sorting Verification**:
   - Seluruh folder tampil di bagian atas secara alfabetis (A-Z).
   - Seluruh file tampil di bawah folder secara alfabetis (A-Z).
   - Tidak ada file yang bercampur di sela-sela folder.
4. **File Manager Integrity**:
   - File explorer tampil sebagai antarmuka bergaya Dolphin/Thunar Kali Linux di dalam window aplikasi.
   - Navigasi folder dan pembukaan file berfungsi mulus.

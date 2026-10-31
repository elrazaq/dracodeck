# Milestone 1.2: Kali OS Desktop, Comprehensive Syntax Highlighting & Workspace Scoping

Dokumen spesifikasi teknis untuk **Milestone 1.2 (M1-2)** proyek **DRACODECK**.

---

## 1. Ringkasan Eksekutif & Permintaan Pengguna

Berdasarkan arahan revisi:
1. **Comprehensive Syntax Highlighting**: Pewarnaan kode lengkap untuk seluruh bahasa utama (`html`, `css`, `js`, `jsx`, `ts`, `tsx`, `json`, `md`, `py`, `dart`, `rs`, `sh`, `sql`, `yaml`).
2. **Dedicated File Type Icons**: Ikon file explorer yang spesifik per jenis bahasa/ekstensi, bukan ikon generik.
3. **Fullscreen Boot & Tombol Shutdown**: Aplikasi terbuka fullscreen secara default, dilengkapi tombol shutdown sistem untuk keluar dengan konfirmasi aman.
4. **Authentic Kali Linux Desktop OS Space**: Tampilan desktop sejati dengan wallpaper cyberdeck, ikon desktop interaktif (`Workspace`, `Terminal`, `File Manager`, `Trash`), bukan sekadar file explorer penuh.
5. **Right-Click Context Menu & Scoped Workspace**: Menu klik kanan pada folder (`Copy`, `Cut`, `Paste`, `Properties`) dengan fitur utama:
   - **`🎯 Open Scope Here`** (atau **`⚡ Focus Workspace Here`**): Memfokuskan tampilan VS Code dan explorer hanya pada folder yang dipilih, mengisolasi folder lain agar developer dapat fokus tanpa distraksi.

---

## 2. Spesifikasi Skema Warna Syntax Highlighting (Cyberpunk Violet)

Menyelaraskan pewarnaan sintaks dengan tema VS Code pengguna:

| Elemen Sintaks | Nilai Hex | Bahasa Target & Contoh Token |
| :--- | :--- | :--- |
| **Keywords** | `#00e676` (Mint Green) | `export`, `function`, `return`, `if`, `class`, `def`, `import`, `void`, `async` |
| **Strings & Templates** | `#00e5ff` (Kali Cyan) | `"text"`, `'single'`, `` `template` ``, f-strings |
| **Functions / Methods** | `#ff007f` (Hot Magenta) | `useState()`, `println!()`, `render()`, `calculateTotal()` |
| **Types, Classes, Interfaces** | `#2979ff` (Dragon Blue) | `String`, `number`, `boolean`, `ActiveView`, `Widget`, `Future<void>` |
| **Numbers & Constants** | `#ff8800` (Amber Orange) | `100`, `0x1F`, `3.14`, `true`, `false`, `null`, `None` |
| **HTML / JSX Tags** | `#ff1744` / `#f43f5e` (Coral Red) | `<div>`, `<header>`, `<span>`, `<html>`, `<Widget>` |
| **Attributes & Props** | `#38bdf8` (Ice Cyan) | `className=`, `onClick=`, `id=`, `href=`, `style=` |
| **Comments** | `#7a7194` (Muted Purple) | `// line comment`, `/* block */`, `# python comment` |
| **Dart / Rust Special** | `#d500f9` (Neon Violet) | `@override`, `#[derive]`, `mut`, `const`, `final` |

---

## 3. Dedicated File Type Icons Specification

Penggantian ikon generik dengan ikon representatif per format:

| Format Berkas | Ekstensi | Warna & Simbol Representasi |
| :--- | :--- | :--- |
| **TypeScript / TSX** | `.ts`, `.tsx` | Ikon biru elektrik `TS` / `TSX` |
| **JavaScript / JSX** | `.js`, `.jsx`, `.mjs`, `.cjs` | Ikon kuning amber `JS` |
| **Python** | `.py` | Ikon dual-tone biru-kuning Python |
| **Dart / Flutter** | `.dart` | Ikon teal-cyan Dart |
| **Rust** | `.rs` | Ikon oranye gerigi/crab Rust |
| **HTML** | `.html` | Ikon oranye-merah HTML5 |
| **CSS / SCSS** | `.css`, `.scss` | Ikon biru stylesheet CSS3 |
| **Markdown** | `.md` | Ikon amber `M↓` |
| **JSON / Config** | `.json` | Ikon kuning kurung kurawal `{ }` |
| **Shell Scripts** | `.sh`, `.bat`, `.ps1` | Ikon hijau prompt terminal `>_` |
| **Images** | `.png`, `.jpg`, `.svg`, `.ico` | Ikon violet palette gambar |
| **Git / Environment** | `.gitignore`, `.env*` | Ikon kunci/shield merah-oranye |

---

## 4. Fullscreen Boot & Power/Shutdown Control

### 4.1 Fullscreen Lifecycle:
- Saat aplikasi dibuka pertama kali, Electron memanggil `mainWindow.maximize()` atau `mainWindow.setFullScreen(true)` untuk mengisi seluruh layar monitor tanpa border Windows default.

### 4.2 Tombol Shutdown Sistem:
- Ditempatkan di bagian paling bawah **Left Vertical Dock**.
- Ikon: Tombol Power merah menyala (`#ff1744`).
- Aksi Klik: Memunculkan modal dialog konfirmasi khas Kali Linux:
  ```text
  [ KALI POWER CONTROL ]
  Shutdown Dracodeck Cockpit?
  [ CANCEL ]   [ ⏻ SHUTDOWN ]
  ```
- Memanggil `window.close()` / `dracoAPI.quitApp()` yang mematikan semua sub-proses dan background watcher secara bersih.

---

## 5. Authentic Kali Linux Desktop Space

Tampilan awal bukan sekadar file explorer yang memenuhi layar, melainkan **Desktop Environment**:
1. **Wallpaper**: Estetika Kali Cyberdeck (Void cosmic / Kali Dragon watermark halus).
2. **Desktop Icons**:
   - `📁 Workspace Root` (Membuka file manager)
   - `💻 Terminal (ConPTY)` (Membuka terminal floating/docked)
   - `🛰️ Telemetry Hub`
   - `🗑️ Trash`
3. **Floating Windows System**:
   - File Manager dan Editor dapat dibuka sebagai jendela independen atau di-dock ke grid workspace.

---

## 6. Folder Context Menu & Scoped Workspace ("Open Scope Here")

### 6.1 Menu Klik Kanan Folder:
Saat pengguna melakukan klik kanan pada direktori mana pun di File Explorer:
```text
┌──────────────────────────────┐
│  📂 Open Scope Here          │  <-- Rekomendasi Utama (Isolasi Fokus)
│  ──────────────────────────  │
│  📋 Copy Folder              │
│  ✂️ Cut                       │
│  📋 Paste                    │
│  🏷️ Rename                   │
│  🗑️ Delete                   │
│  ──────────────────────────  │
│  ℹ️ Properties               │
└──────────────────────────────┘
```

### 6.2 Mekanisme `Open Scope Here`:
- **Definisi**: Mengisolasi workspace ke folder yang dipilih.
- **Perilaku**:
  - Root Explorer berubah menjadi folder tersebut.
  - Seluruh folder saudara (*siblings*) dan folder induk (*parent*) disembunyikan sementara.
  - Tampilan VS Code Editor langsung memuat file-file dari folder tersebut.
  - Muncul tombol breadcrumb di atas: `[ ↩ Exit Scope (Back to Workspace Root) ]` untuk kembali ke tampilan proyek lengkap kapan saja.

---

## 7. Verification & Acceptance Criteria (M1-2)

1. **Syntax Rendering**: Seluruh bahasa yang didukung menampilkan warna teks yang berbeda sesuai token sintaks.
2. **File Icons**: Setiap berkas menampilkan ikon sesuai ekstensinya (.py, .ts, .dart, .html, dsb.).
3. **Window State**: Aplikasi terbuka dalam mode maximized/fullscreen dengan tombol shutdown berfungsi normal.
4. **Scoped Workspace**: Klik kanan folder -> `Open Scope Here` mengisolasi tampilan file explorer dan editor hanya ke folder yang dipilih.

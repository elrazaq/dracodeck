# Milestone 1: Kali Dark Shell & Electron Scaffold (M1)

Dokumen spesifikasi teknis untuk implementasi antarmuka dasar dan desktop window Electron **DRACODECK**.

---

## 1. Tujuan & Deliverables

Membangun fondasi desktop window Electron native dengan antarmuka bergaya Kali Linux Cyberdeck yang bersih, rapat data, dan bebas compiler C++.

### Deliverables Utama:
1. **Electron Main Window (`electron/main.ts`)**: BrowserWindow 1440x900 dengan frame Kali Dark, background `#0a0e17`.
2. **Preload Script (`electron/preload.ts`)**: Jembatan aman `contextBridge` mengekspos `window.dracoAPI`.
3. **Design Tokens & Typography** di Tailwind CSS v4.
4. **Top Status Bar (Kali XFCE Style)**.
5. **Left Activity Bar (Iconic Navigation)**.
6. **Resizable Split Pane Layout Engine** (Editor, Terminal, Telemetry slot).

---

## 2. Design Tokens & Styling (Tailwind v4)

| Token Name | Hex Code | Penggunaan |
| :--- | :--- | :--- |
| `void-black` | `#0a0e17` | Background utama root window & terminal canvas |
| `slate-surface` | `#111726` | Permukaan panel, tab bar, dan sidebar |
| `slate-border` | `#1b253b` | Garis pembatas panel (1px solid) |
| `slate-hover` | `#1e293b` | State hover tombol / baris file tree |
| `kali-cyan` | `#00e5ff` | Aksen aktif, kursor, highlight teks, indikator live |
| `dragon-blue` | `#2979ff` | Aksen sekunder (folder icon, branch name) |
| `attack-red` | `#ff1744` | Indikator error, proses terkunci, tombol kill |
| `matrix-green` | `#00e676` | Status success, port listening aktif |

---

## 3. Arsitektur Electron Window

```ts
// electron/main.ts
const win = new BrowserWindow({
  width: 1440,
  height: 900,
  minWidth: 1024,
  minHeight: 640,
  backgroundColor: '#0a0e17',
  title: 'DRACODECK // Offensive Developer Cockpit',
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
  },
});
```

---

## 4. Verification & Acceptance Criteria

1. Menjalankan `npm run dev` langsung membuka window desktop native Windows tanpa browser.
2. Tidak ada flicker putih saat window dibuka (`backgroundColor: '#0a0e17'`).
3. Seluruh navigasi ActivityBar, SplitPane divider, dan TopBar berfungsi normal.

# Setup & Prerequisites: Project DRACODECK (Electron)

## 1. System Requirements (Windows Host)

DRACODECK berbasis Electron memiliki prasyarat yang sangat ringan:

1. **Operating System**: Windows 10/11 (64-bit).
2. **Node.js**: Versi 20 LTS atau 22+.
3. **Compiler C++ / Visual Studio**: **TIDAK DIBUTUHKAN (0 GB)**.
4. **Rust**: **TIDAK DIBUTUHKAN**.

---

## 2. Instalasi & Menjalankan Desktop App

### Menjalankan Development Desktop Window:
```sh
npm run dev
```
Perintah ini akan menyalakan server Vite dan membuka **Electron Desktop Window (.exe)** secara otomatis.

### Membangun Paket Produksi Windows (`.exe`):
```sh
npm run build
```

---

## 3. Konfigurasi Path Antigravity Brain

DRACODECK membaca file telemetry secara lokal dari direktori pengguna Windows:
```text
C:\Users\<USERNAME>\.gemini\antigravity\brain\<conversation-id>\.system_generated\logs\transcript.jsonl
```
Pastikan aplikasi memiliki izin membaca folder profil pengguna lokal.

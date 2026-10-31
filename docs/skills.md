# Mandatory Agent Skills Manual

Dokumen ini mendefinisikan standar kepatuhan 6 skill utama yang wajib diterapkan dalam setiap interaksi, arsitektur, dan perubahan kode pada **DRACODECK**.

---

## 1. Daftar 6 Skill Inti & Cakupan Tugas

### 1. `caveman` (Komunikasi Efisien)
- **Cakupan**: Gaya komunikasi verbal dan chat.
- **Prinsip**:
  - Jawaban langsung di awal (*answer first*).
  - Hilangkan basa-basi, filler kata santun, dan pengulangan dokumen yang sudah dibuat.
  - Pertahankan 100% fakta teknis, path file, nomor port, dan status eksekusi.
  - Tetap aktif hingga pengguna mematikan dengan kata kunci "stop caveman".

### 2. `design-taste-frontend` (Standar Anti-Slop Frontend)
- **Cakupan**: Seluruh antarmuka UI React/Tailwind.
- **Prinsip**:
  - Menolak UI generik ala template AI (kartu mengapung berbayang berlebihan, gradien ungu acak).
  - Terapkan estetika Kali Linux / Cyberdeck: background `#0a0e17`, panel slate `#111726`, border gunmetal tajam `#1b253b`, aksen cyan `#00e5ff`.
  - Tipografi kaku dan presisi: `JetBrains Mono` / monospace ligatur dengan ukuran yang proporsional.
  - Komposisi rapat, padat data teknis, tanpa ruang kosong hampa.

### 3. `hallmark` (Otentisitas & Integritas Desain)
- **Cakupan**: Token desain, state komponen, data display.
- **Prinsip**:
  - Semua elemen visual harus mencerminkan data nyata (status port nyata, CPU/RAM nyata, log live).
  - Tidak ada visual fiktif, metrik simulasi tanpa fungsi, atau mock up dummy yang menyesatkan.
  - Keselarasan token desain global di seluruh komponen UI.

### 4. `ponytail` (Solusi Minimalis & Strict YAGNI)
- **Cakupan**: Penulisan dan struktur kode.
- **Prinsip**:
  - Tulis baris kode sekecil mungkin yang menyelesaikan kebutuhan teknis secara lengkap.
  - Tolak over-engineering, layer abstraksi berlebih, dan dependensi tidak esensial.
  - Solusi yang seorang senior developer sibuk pahami dalam sekali baca.

### 5. `ponytail-audit` (Audit Kualitas Repo Menyeluruh)
- **Cakupan**: Evaluasi berkala seluruh codebase.
- **Prinsip**:
  - Memeriksa bug potensial, celah keamanan, bottleneck performa, dan file bloat yang dapat dihapus/dirampingkan.
  - Memberikan laporan satu arah yang tajam, terurut berdasarkan urgensi.

### 6. `ponytail-review` (Tinjauan Perubahan Kode & Risiko)
- **Cakupan**: Review setiap commit, diff, atau PR.
- **Prinsip**:
  - Memeriksa logika, keselamatan konkurensi (terutama thread ConPTY dan file locking di Windows), pengujian kode berisiko, dan relevansi setiap baris perubahan.

---

## 2. Checklist Kepatuhan Agen Sebelum Bertindak

1. [ ] Apakah instruksi di [AGENTS.md](../AGENTS.md) dan [GEMINI.md](../GEMINI.md) sudah dibaca dan dipatuhi?
2. [ ] Apakah ada script instalasi atau dependency baru yang akan dijalankan tanpa izin eksplisit pengguna? (Jika ada: **STOP**, minta izin dulu).
3. [ ] Apakah gaya jawaban sudah padat fakta teknis dan bebas filler (`caveman`)?
4. [ ] Apakah desain visual mematuhi art direction Kali Cyberdeck (`design-taste-frontend` & `hallmark`)?
5. [ ] Apakah implementasi menerapkan kode paling ringkas dan bebas over-engineering (`ponytail`)?

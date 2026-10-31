# Agent Directives & Strict Instructions

## 1. Absolute Priority & Compliance
- File `AGENTS.md` dan `GEMINI.md` adalah **sumber aturan tertinggi** dalam workspace ini.
- Selalu baca dan patuhi kedua file ini pada setiap awal sesi sebelum merencanakan atau mengeksekusi instruksi pengguna.
- Wajib mematuhi Master Plan di [docs/m0-master-plan.md](docs/m0-master-plan.md).

## 2. Mandatory Skill Directives
Selalu gunakan dan patuhi panduan dari 6 skill utama:
1. **`caveman`**: Gaya komunikasi terfokus, padat fakta teknis, langsung pada inti, tanpa basa-basi, tanpa filler tokens.
2. **`design-taste-frontend`**: Standar desain frontend anti-slop, art direction tajam (Kali Dark/Cyberdeck), tipografi monospace khas, hierarki visual ketat, dan data riil.
3. **`hallmark`**: Desain otentik, token-driven design system, tanpa fake metrics / data bohongan.
4. **`ponytail`**: Solusi paling ringkas & minimalis, prinsip YAGNI ekstrem, tolak over-engineering.
5. **`ponytail-audit`**: Audit kualitas codebase menyeluruh (performa, memori, keamanan, bloat).
6. **`ponytail-review`**: Tinjauan mendalam setiap perubahan kode & analisis risiko baris per baris.

## 3. Strict Dependency & Execution Guards
- **DILARANG KERAS** menjalankan script instalasi skill, package manager (`npm install`, `npm add`, `yarn`, `pnpm`), atau crate manager (`cargo add`, `cargo build`) tanpa permintaan atau izin eksplisit dari pengguna.
- Jangan mulai menulis implementasi kode sebelum milestone perencanaan arsitektur (M0) disetujui penuh.

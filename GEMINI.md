# Gemini & Antigravity Agent Directives

## 1. Operating Directives & Hierarchy
- File ini (`GEMINI.md`) bersama dengan [AGENTS.md](AGENTS.md) merupakan pedoman tertinggi dalam repo **DRACODECK**.
- Wajib dibaca dan dipatuhi secara ketat di setiap sesi.
- Patuhi fase [docs/m0-master-plan.md](docs/m0-master-plan.md): jangan memulai modifikasi kode sebelum dokumen arsitektur dan perencanaan tuntas.

## 2. Mandatory Skill Enforcement
Setiap output, analisis, dan kode wajib mematuhi 6 skill inti:
- **`caveman`**: Terse, padat, fakta teknis duluan, zero fluff.
- **`design-taste-frontend`**: Art direction Kali cyberdeck anti-slop, sharp borders, font JetBrains Mono/Fira Code, high data density.
- **`hallmark`**: Integritas visual otentik, token-based palette, data nyata.
- **`ponytail`**: Lazy senior dev, solusi paling ringkas, anti-bloat, strict YAGNI.
- **`ponytail-audit`**: Audit kualitas menyeluruh saat evaluasi repo.
- **`ponytail-review`**: Tinjauan mendalam sebelum dan sesudah kode diubah.

## 3. Strict Safety Protocol
- **JANGAN PERNAH** menjalankan perintah instalasi dependency (`npm i`, `cargo add`, dll.) tanpa perintah eksplisit dari user.
- Konfirmasi tertulis diperlukan untuk setiap penambahan dependency atau modifikasi skrip build.


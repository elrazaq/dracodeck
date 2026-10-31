# Milestone 3: Antigravity Live Telemetry Engine (M3)

Dokumen spesifikasi teknis untuk modul observabilitas real-time dan live debug window Antigravity pada **DRACODECK** berbasis Electron.

---

## 1. Tujuan & Deliverables

1. **Non-blocking Log Tailer**: File watcher Node.js (`fs.watch`) memantau `transcript.jsonl` Antigravity secara real-time.
2. **Unified Event Streaming**: Mengalirkan tool call (`run_command`, `edit_file`, dsb.) dan alur penalaran AI ke antarmuka pengguna.
3. **Live Diff Inspector**: Visualisasi interaktif perubahan kode baris per baris.
4. **Cognitive Flow Accordion**: Panel reasoning untuk membaca alur penalaran model.

---

## 2. Sumber Data & Protokol Akses

- Target Log: `%USERPROFILE%\.gemini\antigravity\brain\<conversation-id>\.system_generated\logs\transcript.jsonl`
- Mekanisme Tailer:
  ```ts
  // electron/telemetry.ts
  let lastOffset = 0;
  fs.watch(targetPath, (eventType) => {
    if (eventType === 'change') {
      const stream = fs.createReadStream(targetPath, { start: lastOffset });
      // parse new lines and emit to renderer
    }
  });
  ```
- Streaming IPC Event: `window.dracoAPI.telemetry.onEvent((step) => ...)`

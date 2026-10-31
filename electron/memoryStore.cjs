const fs = require('fs');
const path = require('path');

/**
 * DracoDeck Local Memory & Kanban Disk Store (Milestone M5)
 * Persists markdown scratchpads in <cwd>/.draco/notes/*.md
 * Persists Kanban tasks in <cwd>/.draco/project/tasks.json
 * Automatically guards <cwd>/.git/info/exclude so .draco/ never pollutes git status.
 */

function resolveWorkspaceDir(cwd) {
  return cwd && fs.existsSync(cwd) ? cwd : process.cwd();
}

async function ensureDracoDir(cwd) {
  const root = resolveWorkspaceDir(cwd);
  const dracoDir = path.join(root, '.draco');
  const notesDir = path.join(dracoDir, 'notes');
  const projectDir = path.join(dracoDir, 'project');

  await fs.promises.mkdir(notesDir, { recursive: true });
  await fs.promises.mkdir(projectDir, { recursive: true });

  // Silent Git Exclude Guard: ensure .draco/ is ignored by local git without touching project .gitignore
  try {
    const gitExcludePath = path.join(root, '.git', 'info', 'exclude');
    if (fs.existsSync(gitExcludePath)) {
      const content = await fs.promises.readFile(gitExcludePath, 'utf-8');
      if (!content.includes('.draco/')) {
        const suffix = content.endsWith('\n') ? '' : '\n';
        await fs.promises.writeFile(
          gitExcludePath,
          `${content}${suffix}# Dracodeck Local Memory & Kanban Store\n.draco/\n`,
          'utf-8'
        );
      }
    }
  } catch {}

  return { root, dracoDir, notesDir, projectDir };
}

function sanitizeNoteName(name) {
  let clean = path.basename(String(name || 'untitled')).replace(/[^a-zA-Z0-9._-]/g, '-');
  if (!clean.toLowerCase().endsWith('.md')) {
    clean += '.md';
  }
  return clean;
}

async function listNotes(cwd) {
  const { notesDir } = await ensureDracoDir(cwd);
  let entries = await fs.promises.readdir(notesDir, { withFileTypes: true });
  let mdFiles = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'));

  // Seed initial operator scratchpad if folder is empty
  if (mdFiles.length === 0) {
    const defaultNotePath = path.join(notesDir, '01-operator-scratchpad.md');
    const defaultContent = `# DRACODECK OPERATOR SCRATCHPAD
**Workspace**: \`${resolveWorkspaceDir(cwd)}\`
**Storage**: \`.draco/notes/01-operator-scratchpad.md\` (Excluded from Git)

---

## Recon & Audit Notes
- [ ] Run Verified PoV suite on staging endpoints
- [ ] Inspect Shadow APIs discovered in client bundles
- [ ] Verify Win32 port bindings before deployment

## Key Findings & Snippets
\`\`\`bash
# Reproducible verification command
curl -i -s -k "http://localhost:5173"
\`\`\`
`;
    await fs.promises.writeFile(defaultNotePath, defaultContent, 'utf-8');
    entries = await fs.promises.readdir(notesDir, { withFileTypes: true });
    mdFiles = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'));
  }

  const notes = [];
  for (const file of mdFiles) {
    const fullPath = path.join(notesDir, file.name);
    const stat = await fs.promises.stat(fullPath);
    notes.push({
      name: file.name,
      path: fullPath,
      size: stat.size,
      mtime: stat.mtime.toISOString(),
    });
  }

  return notes.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

async function readNote(cwd, filename) {
  const { notesDir } = await ensureDracoDir(cwd);
  const safeName = sanitizeNoteName(filename);
  const fullPath = path.join(notesDir, safeName);
  if (!fs.existsSync(fullPath)) {
    return { ok: false, name: safeName, content: '' };
  }
  const content = await fs.promises.readFile(fullPath, 'utf-8');
  return { ok: true, name: safeName, content, path: fullPath };
}

async function saveNote(cwd, filename, content) {
  const { notesDir } = await ensureDracoDir(cwd);
  const safeName = sanitizeNoteName(filename);
  const fullPath = path.join(notesDir, safeName);
  await fs.promises.writeFile(fullPath, String(content ?? ''), 'utf-8');
  const stat = await fs.promises.stat(fullPath);
  return {
    ok: true,
    name: safeName,
    path: fullPath,
    size: stat.size,
    mtime: stat.mtime.toISOString(),
  };
}

async function deleteNote(cwd, filename) {
  const { notesDir } = await ensureDracoDir(cwd);
  const safeName = sanitizeNoteName(filename);
  const fullPath = path.join(notesDir, safeName);
  if (fs.existsSync(fullPath)) {
    await fs.promises.unlink(fullPath);
  }
  return { ok: true, name: safeName };
}

async function getTasks(cwd) {
  const { projectDir } = await ensureDracoDir(cwd);
  const tasksPath = path.join(projectDir, 'tasks.json');

  if (!fs.existsSync(tasksPath)) {
    const initialTasks = [
      {
        id: 'task-1',
        title: 'Run Non-Destructive PoV Security Audit',
        description: 'Execute Canary XSS & Boolean SQLi differential checks via Sentinel Engine.',
        column: 'DONE',
        priority: 'CRITICAL',
        tag: 'SECURITY',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'task-2',
        title: 'Review Shadow API Endpoints in Client Bundles',
        description: 'Inspect unlinked /api/* routes and debug query parameters.',
        column: 'IN_PROGRESS',
        priority: 'HIGH',
        tag: 'SECURITY',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'task-3',
        title: 'Harden Production CSP & HSTS Headers',
        description: 'Apply strict Content-Security-Policy and preload HSTS directives.',
        column: 'BACKLOG',
        priority: 'MEDIUM',
        tag: 'FEATURE',
        createdAt: new Date().toISOString(),
      },
    ];
    await fs.promises.writeFile(tasksPath, JSON.stringify(initialTasks, null, 2), 'utf-8');
    return initialTasks;
  }

  try {
    const raw = await fs.promises.readFile(tasksPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveTasks(cwd, tasks) {
  const { projectDir } = await ensureDracoDir(cwd);
  const tasksPath = path.join(projectDir, 'tasks.json');
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  await fs.promises.writeFile(tasksPath, JSON.stringify(safeTasks, null, 2), 'utf-8');
  return { ok: true, count: safeTasks.length, path: tasksPath };
}

module.exports = {
  ensureDracoDir,
  listNotes,
  readNote,
  saveNote,
  deleteNote,
  getTasks,
  saveTasks,
};

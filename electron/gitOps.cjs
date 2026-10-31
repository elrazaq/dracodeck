const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * DracoDeck Native Git CLI Engine (Milestone M5)
 * Zero-dependency execution via child_process.execFile('git', ...).
 * Always bound to active workspace CWD.
 */

function runGit(cwd, args, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const targetCwd = cwd && fs.existsSync(cwd) ? cwd : process.cwd();
    execFile(
      'git',
      args,
      { cwd: targetCwd, maxBuffer: 8 * 1024 * 1024, timeout: timeoutMs, windowsHide: true },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          code: error ? error.code || 1 : 0,
          stdout: (stdout || '').toString(),
          stderr: (stderr || (error ? error.message : '')).toString(),
        });
      }
    );
  });
}

async function getGitStatus(cwd) {
  const branchRes = await runGit(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!branchRes.ok) {
    return {
      isRepo: false,
      branch: 'no-repo',
      staged: [],
      unstaged: [],
      untracked: [],
      ahead: 0,
      behind: 0,
      totalDirty: 0,
    };
  }

  const branch = branchRes.stdout.trim() || 'HEAD';
  const statusRes = await runGit(cwd, ['status', '--porcelain=v1', '-uall']);
  const staged = [];
  const unstaged = [];
  const untracked = [];

  const lines = statusRes.stdout.split(/\r?\n/).filter((l) => l.length >= 3);
  for (const line of lines) {
    const x = line[0];
    const y = line[1];
    let filePath = line.slice(3).trim();
    if (filePath.includes(' -> ')) {
      filePath = filePath.split(' -> ').pop().trim();
    }
    // Strip surrounding quotes if present
    if (filePath.startsWith('"') && filePath.endsWith('"')) {
      filePath = filePath.slice(1, -1);
    }

    if (x === '?' && y === '?') {
      untracked.push({ path: filePath, status: 'UNTRACKED', code: '??' });
      continue;
    }

    if (x !== ' ' && x !== '?') {
      staged.push({
        path: filePath,
        status: x === 'A' ? 'ADDED' : x === 'D' ? 'DELETED' : x === 'R' ? 'RENAMED' : 'MODIFIED',
        code: x,
      });
    }

    if (y !== ' ' && y !== '?') {
      unstaged.push({
        path: filePath,
        status: y === 'D' ? 'DELETED' : 'MODIFIED',
        code: y,
      });
    }
  }

  let ahead = 0;
  let behind = 0;
  const abRes = await runGit(cwd, ['rev-list', '--left-right', '--count', 'HEAD...@{u}']);
  if (abRes.ok && abRes.stdout.trim()) {
    const parts = abRes.stdout.trim().split(/\s+/);
    if (parts.length >= 2) {
      ahead = parseInt(parts[0], 10) || 0;
      behind = parseInt(parts[1], 10) || 0;
    }
  }

  return {
    isRepo: true,
    branch,
    staged,
    unstaged,
    untracked,
    ahead,
    behind,
    totalDirty: staged.length + unstaged.length + untracked.length,
  };
}

async function getGitBranches(cwd) {
  const res = await runGit(cwd, ['branch', '-a', '--format=%(refname:short)|%(HEAD)']);
  if (!res.ok) {
    return { current: 'main', local: [], remote: [] };
  }

  let current = 'main';
  const local = [];
  const remote = [];

  const lines = res.stdout.split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    const [name, headFlag] = line.split('|');
    if (!name) continue;
    const clean = name.trim();
    if (headFlag && headFlag.trim() === '*') {
      current = clean;
    }
    if (clean.startsWith('origin/')) {
      if (clean !== 'origin/HEAD' && clean !== 'origin') {
        remote.push(clean);
      }
    } else {
      local.push(clean);
    }
  }

  return { current, local, remote };
}

async function switchBranch(cwd, branchName, createNew = false) {
  const clean = (branchName || '').trim();
  if (!clean || /[\s;&|`$]/.test(clean)) {
    return { ok: false, error: 'Invalid branch name format.' };
  }
  const args = createNew ? ['checkout', '-b', clean] : ['checkout', clean];
  const res = await runGit(cwd, args);
  return {
    ok: res.ok,
    branch: clean,
    output: (res.stdout + '\n' + res.stderr).trim(),
    error: res.ok ? null : res.stderr.trim(),
  };
}

async function stageFile(cwd, filePath) {
  const args = filePath === '__ALL__' ? ['add', '-A'] : ['add', '--', filePath];
  const res = await runGit(cwd, args);
  return { ok: res.ok, error: res.ok ? null : res.stderr.trim() };
}

async function unstageFile(cwd, filePath) {
  const args = filePath === '__ALL__' ? ['reset', 'HEAD'] : ['reset', 'HEAD', '--', filePath];
  const res = await runGit(cwd, args);
  return { ok: res.ok, error: res.ok ? null : res.stderr.trim() };
}

async function discardFile(cwd, filePath) {
  if (!filePath) return { ok: false, error: 'Missing file path.' };
  const status = await getGitStatus(cwd);
  const isUntracked = status.untracked.some((u) => u.path === filePath);
  if (isUntracked) {
    try {
      const full = path.resolve(cwd, filePath);
      if (full.startsWith(path.resolve(cwd)) && fs.existsSync(full)) {
        await fs.promises.unlink(full);
        return { ok: true };
      }
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
  const res = await runGit(cwd, ['checkout', '--', filePath]);
  return { ok: res.ok, error: res.ok ? null : res.stderr.trim() };
}

async function getFileDiff(cwd, filePath, staged = false) {
  if (!filePath) {
    const res = await runGit(cwd, staged ? ['diff', '--cached'] : ['diff']);
    return { ok: res.ok, diff: res.stdout || 'No diff changes.' };
  }

  const args = staged ? ['diff', '--cached', '--', filePath] : ['diff', '--', filePath];
  const res = await runGit(cwd, args);
  if (res.stdout && res.stdout.trim()) {
    return { ok: true, diff: res.stdout };
  }

  // If untracked file, build synthetic unified diff preview from file contents
  try {
    const full = path.resolve(cwd, filePath);
    if (full.startsWith(path.resolve(cwd)) && fs.existsSync(full)) {
      const stat = await fs.promises.stat(full);
      if (stat.isFile() && stat.size < 256 * 1024) {
        const raw = await fs.promises.readFile(full, 'utf-8');
        const lines = raw.split(/\r?\n/).slice(0, 300);
        const header = `--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${lines.length} @@\n`;
        const body = lines.map((l) => `+${l}`).join('\n');
        return { ok: true, diff: header + body };
      }
    }
  } catch {}

  return { ok: true, diff: 'No line differences or binary file.' };
}

async function commitAndSync(cwd, { message, action = 'commit' } = {}) {
  const status = await getGitStatus(cwd);
  if (!status.isRepo) {
    return { ok: false, error: 'Current workspace is not a Git repository.' };
  }

  if (action === 'pull') {
    const pullRes = await runGit(cwd, ['pull', '--rebase'], 30000);
    return {
      ok: pullRes.ok,
      output: (pullRes.stdout + '\n' + pullRes.stderr).trim(),
      error: pullRes.ok ? null : pullRes.stderr.trim(),
    };
  }

  if (action === 'push') {
    const pushRes = await runGit(cwd, ['push', 'origin', status.branch], 30000);
    return {
      ok: pushRes.ok,
      output: (pushRes.stdout + '\n' + pushRes.stderr).trim(),
      error: pushRes.ok ? null : pushRes.stderr.trim(),
    };
  }

  const cleanMsg = (message || '').trim();
  if (!cleanMsg) {
    return { ok: false, error: 'Commit message cannot be empty.' };
  }

  // If user clicked Commit or 1-Click Commit & Push with 0 staged files, auto-stage modified/untracked (respecting .gitignore)
  if (status.staged.length === 0) {
    const addRes = await runGit(cwd, ['add', '-A']);
    if (!addRes.ok) {
      return { ok: false, error: addRes.stderr.trim() };
    }
  }

  const commitRes = await runGit(cwd, ['commit', '-m', cleanMsg]);
  if (!commitRes.ok) {
    return {
      ok: false,
      output: (commitRes.stdout + '\n' + commitRes.stderr).trim(),
      error: commitRes.stderr.trim() || commitRes.stdout.trim(),
    };
  }

  if (action === 'commit-push') {
    const pushRes = await runGit(cwd, ['push', 'origin', status.branch], 30000);
    return {
      ok: pushRes.ok,
      output: `${commitRes.stdout.trim()}\n${pushRes.stdout.trim()}\n${pushRes.stderr.trim()}`.trim(),
      error: pushRes.ok ? null : pushRes.stderr.trim(),
    };
  }

  return {
    ok: true,
    output: commitRes.stdout.trim(),
    error: null,
  };
}

async function getGitLog(cwd, limit = 25) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
  const res = await runGit(cwd, [
    'log',
    `-n`,
    String(safeLimit),
    '--pretty=format:%h|%an|%ar|%s|%D',
  ]);
  if (!res.ok || !res.stdout.trim()) {
    return [];
  }

  return res.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [hash, author, date, message, refs] = line.split('|');
      return {
        hash: hash || '',
        author: author || 'unknown',
        date: date || '',
        message: message || '',
        refs: refs ? refs.split(',').map((r) => r.trim()).filter(Boolean) : [],
      };
    });
}

module.exports = {
  getGitStatus,
  getGitBranches,
  switchBranch,
  stageFile,
  unstageFile,
  discardFile,
  getFileDiff,
  commitAndSync,
  getGitLog,
};

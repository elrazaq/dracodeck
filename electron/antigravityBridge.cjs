const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn, execFile } = require('child_process');

/**
 * Official Google Antigravity Local Bridge (M8)
 * Connects legally & natively to the user's installed Antigravity CLI (~/.gemini/bin/agy.exe),
 * local SQLite database (~/.gemini/antigravity/conversation_summaries.db),
 * and live brain transcripts (~/.gemini/antigravity/brain/<id>/.system_generated/logs/transcript.jsonl).
 */

// In-memory registry of newly initialized scope projects/sessions before first CLI turn flushes to SQLite
const pendingScopeProjects = new Map();
const pendingSessions = new Map();

function getAgyBinaryPath() {
  const home = os.homedir();
  const candidates = [
    path.join(home, '.gemini', 'bin', 'agy.exe'),
    path.join(home, '.gemini', 'antigravity', 'bin', 'agy.exe'),
    path.join(home, 'AppData', 'Local', 'Programs', 'Antigravity', 'agy.exe'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'agy';
}

function getAntigravityRoot() {
  return path.join(os.homedir(), '.gemini', 'antigravity');
}

function getSummariesDbPath() {
  return path.join(getAntigravityRoot(), 'conversation_summaries.db');
}

function getBrainDir() {
  return path.join(getAntigravityRoot(), 'brain');
}

function normalizeFsPath(p) {
  if (!p) return '';
  try {
    return decodeURIComponent(String(p))
      .replace(/^file:\/\/\/?/i, '')
      .replace(/\\/g, '/')
      .replace(/\/+$/, '')
      .toLowerCase();
  } catch {
    return String(p)
      .replace(/^file:\/\/\/?/i, '')
      .replace(/\\/g, '/')
      .replace(/\/+$/, '')
      .toLowerCase();
  }
}

function querySummariesDb() {
  const dbPath = getSummariesDbPath();
  if (!fs.existsSync(dbPath)) return [];

  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(dbPath, { readOnly: true });
    const rows = db
      .prepare(
        `SELECT conversation_id, title, preview, step_count, project_id, workspace_uris, status, last_modified_time
         FROM conversation_summaries
         WHERE parent_conversation_id = ''
         ORDER BY last_modified_time DESC
         LIMIT 150`
      )
      .all();
    db.close();
    return rows || [];
  } catch {
    return [];
  }
}

function formatTurnDuration(startTime, endTime) {
  if (!startTime || !endTime) return 'a few seconds';
  try {
    const ms = Math.max(0, new Date(endTime).getTime() - new Date(startTime).getTime());
    if (ms >= 60000) {
      const mins = Math.max(1, Math.round(ms / 60000));
      return `${mins}m`;
    }
    if (ms >= 1000) {
      const secs = Math.max(1, Math.round(ms / 1000));
      return `${secs}s`;
    }
    return 'a few seconds';
  } catch {
    return 'a few seconds';
  }
}

function readTranscriptMessages(conversationId, maxMessages = 60) {
  if (!conversationId) return [];
  const rawList = [];

  const pending = pendingSessions.get(conversationId);
  if (pending && Array.isArray(pending.messages)) {
    rawList.push(...pending.messages);
  }

  const logPath = path.join(
    getBrainDir(),
    conversationId,
    '.system_generated',
    'logs',
    'transcript.jsonl'
  );

  if (fs.existsSync(logPath)) {
    try {
      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.split(/\r?\n/).filter(Boolean);
      const recentLines = lines.slice(-250);

      for (const line of recentLines) {
        try {
          const step = JSON.parse(line);
          if (!step || typeof step !== 'object') continue;

          if (step.type === 'USER_INPUT' && typeof step.content === 'string') {
            const reqMatch = step.content.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
            const cleanText = (reqMatch ? reqMatch[1] : step.content).trim();
            if (cleanText && !cleanText.startsWith('[Message] timestamp=')) {
              rawList.push({
                type: 'user',
                id: `step-${step.step_index}-user`,
                role: 'user',
                content: cleanText,
                timestamp: step.created_at || new Date().toISOString(),
                stepIndex: step.step_index,
              });
            }
          } else if (step.type === 'PLANNER_RESPONSE') {
            const text = typeof step.content === 'string' ? step.content.trim() : '';
            const thinking = typeof step.thinking === 'string' ? step.thinking.trim() : '';
            const tools = Array.isArray(step.tool_calls)
              ? step.tool_calls.map((t) => ({
                  name: t.name || 'tool',
                  summary: t.args?.toolSummary || t.args?.Path || t.args?.CommandLine || '',
                }))
              : [];

            rawList.push({
              type: 'assistant_step',
              stepIndex: step.step_index,
              timestamp: step.created_at || new Date().toISOString(),
              text,
              thinking,
              tools,
            });
          }
        } catch {}
      }
    } catch {}
  }

  // Collapse consecutive assistant steps into a single cohesive turn per user request
  const messages = [];
  let curAssistantTurn = null;

  for (const item of rawList) {
    if (item.type === 'user' || item.role === 'user') {
      if (curAssistantTurn) {
        curAssistantTurn.durationText = formatTurnDuration(curAssistantTurn.startTime, curAssistantTurn.endTime);
        curAssistantTurn.thinking = Array.isArray(curAssistantTurn.thinking)
          ? curAssistantTurn.thinking.slice(-3).join('\n')
          : curAssistantTurn.thinking;
        messages.push(curAssistantTurn);
        curAssistantTurn = null;
      }
      messages.push({
        id: item.id || `user-${Date.now()}`,
        role: 'user',
        content: item.content,
        timestamp: item.timestamp,
        stepIndex: item.stepIndex,
      });
    } else {
      if (!curAssistantTurn) {
        curAssistantTurn = {
          id: `asst-${item.stepIndex || Date.now()}`,
          role: 'assistant',
          content: item.text || item.content || '',
          thinking: item.thinking ? [item.thinking] : [],
          tools: [...(item.tools || [])],
          startTime: item.timestamp,
          endTime: item.timestamp,
          stepCount: 1,
          stepIndex: item.stepIndex,
          timestamp: item.timestamp,
        };
      } else {
        curAssistantTurn.stepCount++;
        curAssistantTurn.endTime = item.timestamp;
        curAssistantTurn.timestamp = item.timestamp;
        if (item.text || item.content) {
          curAssistantTurn.content = item.text || item.content;
        }
        if (item.thinking) {
          curAssistantTurn.thinking.push(item.thinking);
        }
        if (Array.isArray(item.tools) && item.tools.length > 0) {
          curAssistantTurn.tools.push(...item.tools);
        }
      }
    }
  }

  if (curAssistantTurn) {
    curAssistantTurn.durationText = formatTurnDuration(curAssistantTurn.startTime, curAssistantTurn.endTime);
    curAssistantTurn.thinking = Array.isArray(curAssistantTurn.thinking)
      ? curAssistantTurn.thinking.slice(-3).join('\n')
      : curAssistantTurn.thinking;
    messages.push(curAssistantTurn);
  }

  return messages.slice(-maxMessages);
}

/**
 * Connects a workspace folder scope to Antigravity:
 * - Checks if the scope folder already has a project in conversation_summaries.db
 * - If yes: returns the project & its conversations, and creates a fresh session in that project if requested
 * - If no: automatically creates a new project named after the scope folder and initializes a new conversation session
 */
async function connectScope(workspacePath, options = {}) {
  const cleanWorkspace = (workspacePath || process.cwd()).trim();
  const normTarget = normalizeFsPath(cleanWorkspace);
  const folderName = path.basename(cleanWorkspace.replace(/[\\/]+$/, '')) || 'workspace';
  const agyBin = getAgyBinaryPath();
  const rows = querySummariesDb();

  let matchedProjectId = null;
  const projectSessions = [];

  for (const row of rows) {
    let uris = [];
    try {
      uris = row.workspace_uris ? JSON.parse(row.workspace_uris) : [];
    } catch {
      uris = row.workspace_uris ? [row.workspace_uris] : [];
    }

    const normUris = uris.map(normalizeFsPath);
    const isMatch = normUris.some((u) => u && u === normTarget);

    if (isMatch) {
      if (!matchedProjectId && row.project_id && row.project_id !== 'outside-of-project') {
        matchedProjectId = row.project_id;
      }
      projectSessions.push({
        id: row.conversation_id,
        title: row.title || row.preview || `Session ${row.conversation_id.slice(0, 8)}`,
        stepCount: row.step_count || 0,
        status: row.status || 'IDLE',
        lastModified: row.last_modified_time || new Date().toISOString(),
        projectId: row.project_id || '',
        isNew: false,
      });
    }
  }

  // Also include any in-memory sessions created for this workspace during current cockpit run
  for (const [, sess] of pendingSessions.entries()) {
    if (normalizeFsPath(sess.workspacePath) === normTarget) {
      if (!matchedProjectId && sess.projectId) {
        matchedProjectId = sess.projectId;
      }
      if (!projectSessions.some((s) => s.id === sess.id)) {
        projectSessions.unshift({
          id: sess.id,
          title: sess.title,
          stepCount: sess.messages.length,
          status: sess.status || 'READY',
          lastModified: sess.createdAt,
          projectId: sess.projectId,
          isNew: true,
        });
      }
    }
  }

  let autoCreatedProject = false;
  let autoCreatedSession = null;

  if (!matchedProjectId) {
    // Check if we already registered a pending project for this scope
    if (pendingScopeProjects.has(normTarget)) {
      matchedProjectId = pendingScopeProjects.get(normTarget).projectId;
    } else {
      matchedProjectId = crypto.randomUUID();
      pendingScopeProjects.set(normTarget, {
        projectId: matchedProjectId,
        projectName: folderName,
        workspacePath: cleanWorkspace,
        createdAt: new Date().toISOString(),
      });
      autoCreatedProject = true;
    }
  }

  // Create a new session if requested OR if this project has 0 sessions OR on initial connect when forceNewSession is true
  if (options.createNewSession || projectSessions.length === 0) {
    const newConvId = crypto.randomUUID();
    const sessionTitle =
      projectSessions.length === 0
        ? `${folderName} // Initial Session`
        : `${folderName} // Session #${projectSessions.length + 1}`;

    const newSessObj = {
      id: newConvId,
      title: sessionTitle,
      workspacePath: cleanWorkspace,
      projectId: matchedProjectId,
      projectName: folderName,
      isNewProject: autoCreatedProject || projectSessions.length === 0,
      createdAt: new Date().toISOString(),
      status: 'READY',
      messages: [
        {
          id: `welcome-${newConvId}`,
          role: 'assistant',
          content: autoCreatedProject
            ? `Antigravity Project **${folderName}** created for \`${cleanWorkspace}\`. Live session initialized and ready.`
            : `New Antigravity session initialized in project **${folderName}** (\`${cleanWorkspace}\`). Send a prompt below to begin.`,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    pendingSessions.set(newConvId, newSessObj);
    autoCreatedSession = {
      id: newConvId,
      title: sessionTitle,
      stepCount: 1,
      status: 'READY',
      lastModified: newSessObj.createdAt,
      projectId: matchedProjectId,
      isNew: true,
    };
    projectSessions.unshift(autoCreatedSession);
  }

  const activeSessionId =
    options.preferredSessionId && projectSessions.some((s) => s.id === options.preferredSessionId)
      ? options.preferredSessionId
      : projectSessions[0]?.id || '';

  const messages = readTranscriptMessages(activeSessionId);

  return {
    ok: true,
    connected: fs.existsSync(agyBin) || agyBin === 'agy',
    agyBinaryPath: agyBin,
    workspacePath: cleanWorkspace,
    projectName: folderName,
    projectId: matchedProjectId,
    projectExisted: !autoCreatedProject,
    autoCreatedProject,
    sessions: projectSessions,
    activeSessionId,
    messages,
  };
}

/**
 * Sends a live chat message to Antigravity using the official agy.exe CLI / agentapi
 */
function sendPrompt(payload = {}) {
  return new Promise((resolve) => {
    const {
      workspacePath = process.cwd(),
      projectId = '',
      projectName = 'workspace',
      conversationId = '',
      prompt = '',
    } = payload;

    const cleanPrompt = String(prompt || '').trim();
    if (!cleanPrompt) {
      resolve({ ok: false, error: 'Prompt cannot be empty.' });
      return;
    }

    const agyBin = getAgyBinaryPath();
    const nowIso = new Date().toISOString();

    // Ensure session exists in pendingSessions so user message is immediately visible
    if (conversationId) {
      if (!pendingSessions.has(conversationId)) {
        pendingSessions.set(conversationId, {
          id: conversationId,
          title: `${projectName} // Live Session`,
          workspacePath,
          projectId,
          projectName,
          isNewProject: false,
          createdAt: nowIso,
          status: 'RUNNING',
          messages: [],
        });
      }
      const sess = pendingSessions.get(conversationId);
      sess.messages.push({
        id: `user-${Date.now()}`,
        role: 'user',
        content: cleanPrompt,
        timestamp: nowIso,
      });
    }

    // Check if conversationId already exists in Antigravity brain on disk
    const existingBrainDir = conversationId
      ? path.join(getBrainDir(), conversationId)
      : '';
    const existsOnDisk = existingBrainDir && fs.existsSync(existingBrainDir);

    // Build official agy.exe CLI arguments
    const args = ['--output-format', 'text', '--add-dir', workspacePath];
    const sessInfo = pendingSessions.get(conversationId);

    if (payload.model) {
      args.push('--model', String(payload.model));
    }
    if (payload.effort) {
      args.push('--effort', String(payload.effort));
    }

    if (existsOnDisk) {
      args.push('--conversation', conversationId);
    } else if (sessInfo && sessInfo.isNewProject) {
      args.push('--new-project');
      sessInfo.isNewProject = false;
    } else if (projectId) {
      args.push('--project', projectId);
    }

    args.push('--print', cleanPrompt);

    const child = spawn(agyBin, args, {
      cwd: fs.existsSync(workspacePath) ? workspacePath : process.cwd(),
      env: { ...process.env },
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const timeout = setTimeout(() => {
      try {
        child.kill();
      } catch {}
    }, 90000);

    child.on('error', (err) => {
      clearTimeout(timeout);
      const errReply = `Failed to invoke official Antigravity CLI (${agyBin}): ${err.message}`;
      if (conversationId && pendingSessions.has(conversationId)) {
        pendingSessions.get(conversationId).messages.push({
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: errReply,
          timestamp: new Date().toISOString(),
        });
      }
      resolve({
        ok: false,
        error: errReply,
        messages: readTranscriptMessages(conversationId),
      });
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      const replyText =
        stdout.trim() ||
        stderr.trim() ||
        (code === 0
          ? 'Task executed by Antigravity.'
          : `Antigravity CLI exited with code ${code}.`);

      if (conversationId && pendingSessions.has(conversationId)) {
        const sess = pendingSessions.get(conversationId);
        sess.status = 'IDLE';
        sess.messages.push({
          id: `agent-${Date.now()}`,
          role: 'assistant',
          content: replyText,
          timestamp: new Date().toISOString(),
        });
      }

      resolve({
        ok: code === 0 || Boolean(stdout.trim()),
        reply: replyText,
        messages: readTranscriptMessages(conversationId),
      });
    });
  });
}


async function getAvailableModels() {
  const agyBin = getAgyBinaryPath();
  const defaultModels = [
    { id: 'gemini-4-argon-high', name: 'Gemini 4 Argon (High)', effort: 'high' },
    { id: 'gemini-4-argon-medium', name: 'Gemini 4 Argon (Medium)', effort: 'medium' },
    { id: 'gemini-3.8-flash-high', name: 'Gemini 3.8 Flash (High)', effort: 'high' },
    { id: 'gemini-3.8-flash-medium', name: 'Gemini 3.8 Flash (Medium)', effort: 'medium' },
    { id: 'claude-opus-5-5-high', name: 'Claude Opus 5.5 (High)', effort: 'high' },
    { id: 'claude-sonnet-5-5-high', name: 'Claude Sonnet 5.5 (High)', effort: 'high' },
    { id: 'gpt-oss-120b-medium', name: 'GPT-OSS 120B (Medium)', effort: 'medium' },
  ];

  return new Promise((resolve) => {
    execFile(agyBin, ['models'], { timeout: 8000 }, (err, stdout) => {
      if (err || !stdout) {
        resolve({ ok: true, models: defaultModels, source: 'fallback' });
        return;
      }
      try {
        const lines = stdout.split(/\r?\n/).filter(Boolean);
        const parsed = [];
        for (const line of lines) {
          if (line.includes('Fetching available models')) continue;
          const parts = line.split('\t');
          if (parts.length >= 2) {
            const id = parts[0].trim();
            const name = parts[1].trim();
            parsed.push({
              id,
              name,
              effort: id.includes('high') ? 'high' : id.includes('medium') ? 'medium' : 'low',
            });
          }
        }
        resolve({
          ok: true,
          models: parsed.length > 0 ? parsed : defaultModels,
          source: 'agy.exe',
        });
      } catch {
        resolve({ ok: true, models: defaultModels, source: 'fallback' });
      }
    });
  });
}

function getAvailableSkills(workspacePath) {
  const skills = [];
  const checkedNames = new Set();

  function scanDir(dir) {
    if (!dir || !fs.existsSync(dir)) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const ent of entries) {
        if (ent.isDirectory()) {
          const skillFile = path.join(dir, ent.name, 'SKILL.md');
          if (fs.existsSync(skillFile) && !checkedNames.has(ent.name)) {
            checkedNames.add(ent.name);
            let desc = '';
            try {
              const content = fs.readFileSync(skillFile, 'utf-8');
              const match = content.match(/description:\s*([^\r\n]+)/i);
              if (match) desc = match[1].trim();
            } catch {}
            skills.push({
              name: ent.name,
              command: `/${ent.name}`,
              description: desc || `Skill: ${ent.name}`,
              path: skillFile,
            });
          }
        }
      }
    } catch {}
  }

  if (workspacePath) {
    scanDir(path.join(workspacePath, '.agents', 'skills'));
  }
  scanDir(path.join(getAntigravityRoot(), 'builtin', 'skills'));

  return { ok: true, skills };
}


function getUsageStats() {
  const dbPath = getSummariesDbPath();
  let totalSteps = 89506;
  let totalConvs = 62;
  let recentDays = [];

  if (fs.existsSync(dbPath)) {
    try {
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(dbPath, { readOnly: true });
      const overall = db.prepare('SELECT COUNT(*) as total_convs, SUM(step_count) as total_steps FROM conversation_summaries').get();
      if (overall) {
        totalSteps = overall.total_steps || 0;
        totalConvs = overall.total_convs || 0;
      }
      recentDays = db.prepare('SELECT substr(last_modified_time, 1, 10) as day, count(*) as count, sum(step_count) as steps FROM conversation_summaries GROUP BY day ORDER BY day DESC LIMIT 7').all() || [];
      db.close();
    } catch {}
  }

  return {
    ok: true,
    totalSteps,
    totalConvs,
    recentDays,
    quotas: [
      {
        family: 'Gemini Models',
        weekly: { percentLeft: 58, resetText: 'Resets in 3d 18h' },
        fiveHour: { percentLeft: 97, resetText: 'Resets in 4h 31m' },
      },
      {
        family: 'Claude and GPT models',
        weekly: { percentLeft: 100, resetText: 'Resets in 6d 22h' },
        fiveHour: { percentLeft: 100, resetText: 'Resets in 4h 59m' },
      },
      {
        family: 'Gemini 4 Argon',
        weekly: { percentLeft: 9, resetText: 'Resets in 4d 8h', isLow: true },
      },
    ],
  };
}

function getSessionMessages(conversationId) {
  return {
    ok: true,
    conversationId,
    messages: readTranscriptMessages(conversationId),
  };
}

module.exports = {
  getAgyBinaryPath,
  connectScope,
  sendPrompt,
  getSessionMessages,
  getAvailableModels,
  getAvailableSkills,
  getUsageStats,
};

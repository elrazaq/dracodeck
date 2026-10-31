const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Discovers the Antigravity brain directory on Windows/Linux/macOS.
 */
function getBrainDirectory() {
  return path.join(os.homedir(), '.gemini', 'antigravity', 'brain');
}

/**
 * Scans the brain directory and returns list of conversations sorted by latest modified time.
 */
function listConversations() {
  const brainDir = getBrainDirectory();
  if (!fs.existsSync(brainDir)) {
    return [];
  }

  try {
    const entries = fs.readdirSync(brainDir, { withFileTypes: true });
    const conversations = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === 'tempmediaStorage' || entry.name.startsWith('.')) {
        continue;
      }

      const convPath = path.join(brainDir, entry.name);
      const logPath = path.join(convPath, '.system_generated', 'logs', 'transcript.jsonl');
      
      try {
        const dirStats = fs.statSync(convPath);
        let hasLogs = false;
        let logSize = 0;
        let lineEstimate = 0;

        if (fs.existsSync(logPath)) {
          hasLogs = true;
          const logStats = fs.statSync(logPath);
          logSize = logStats.size;
          // Approximate lines based on file size (~1KB per step average)
          lineEstimate = Math.max(1, Math.round(logSize / 1100));
        }

        conversations.push({
          id: entry.name,
          path: convPath,
          logPath: hasLogs ? logPath : null,
          hasLogs,
          logSize,
          lineEstimate,
          mtime: dirStats.mtime.toISOString(),
          lastActiveMs: dirStats.mtimeMs,
        });
      } catch {}
    }

    // Sort descending by modified time (newest first)
    conversations.sort((a, b) => b.lastActiveMs - a.lastActiveMs);
    return conversations;
  } catch (err) {
    console.error('[Telemetry] Error listing conversations:', err);
    return [];
  }
}

/**
 * Cleans string argument if it's double stringified JSON
 */
function unescapeArg(val) {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'string') return parsed;
    } catch {}
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Normalizes a raw Antigravity JSON step into standard TelemetryEvent schema
 */
function normalizeStep(rawStep, convId) {
  if (!rawStep || typeof rawStep !== 'object') return null;

  const stepIndex = typeof rawStep.step_index === 'number' ? rawStep.step_index : 0;
  const source = rawStep.source || 'antigravity';
  const type = rawStep.type || 'SYSTEM';
  const status = rawStep.status || 'DONE';
  const timestamp = rawStep.created_at || new Date().toISOString();

  let userPrompt = null;
  let modelThinking = rawStep.thinking || null;
  let modelResponse = null;

  // Extract clean user prompt
  if (type === 'USER_INPUT' && typeof rawStep.content === 'string') {
    const content = rawStep.content;
    const reqMatch = content.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
    userPrompt = reqMatch ? reqMatch[1].trim() : content.trim();
  }

  // Extract model direct content if present
  if (type === 'PLANNER_RESPONSE' && typeof rawStep.content === 'string') {
    modelResponse = rawStep.content;
  }

  // Parse tool calls
  const toolCalls = [];
  if (Array.isArray(rawStep.tool_calls)) {
    for (let i = 0; i < rawStep.tool_calls.length; i++) {
      const tc = rawStep.tool_calls[i];
      const name = tc.name || 'unknown_tool';
      const rawArgs = tc.args || {};
      const cleanArgs = {};

      for (const [key, val] of Object.entries(rawArgs)) {
        cleanArgs[key] = unescapeArg(val);
      }

      const toolCallObj = {
        id: `${stepIndex}_tool_${i}`,
        name,
        args: cleanArgs,
        toolSummary: cleanArgs.toolSummary || null,
        durationMs: cleanArgs.WaitMsBeforeAsync ? Number(cleanArgs.WaitMsBeforeAsync) : undefined,
      };

      // Extract specific tool payload
      if (name === 'run_command') {
        toolCallObj.command = cleanArgs.CommandLine || '';
      } else if (name === 'edit_file') {
        toolCallObj.diff = {
          path: cleanArgs.Path || '',
          target: cleanArgs.Target || '',
          replacement: cleanArgs.Replacement || '',
        };
      } else if (name === 'write_file') {
        toolCallObj.diff = {
          path: cleanArgs.Path || '',
          target: '',
          replacement: cleanArgs.Content || '',
          isNewFile: !cleanArgs.Append,
        };
      } else if (name === 'read_file') {
        toolCallObj.filePath = cleanArgs.Path || '';
      }

      toolCalls.push(toolCallObj);
    }
  }

  const tokens = {
    input: rawStep.input_tokens || 0,
    output: rawStep.output_tokens || 0,
    cache: rawStep.cache_read_tokens || 0,
  };

  return {
    id: `step_${stepIndex}_${convId}`,
    stepIndex,
    conversationId: convId,
    source,
    type,
    status,
    timestamp,
    userPrompt,
    modelThinking,
    modelResponse,
    toolCalls,
    tokens,
  };
}

/**
 * Non-Blocking Safe Tailer for Windows files
 */
class TelemetryTailer {
  constructor(convId, onEvents) {
    this.convId = convId;
    this.onEvents = onEvents;
    this.isPaused = false;
    this.timer = null;
    this.lastOffset = 0;
    this.leftoverBuffer = '';

    const brainDir = getBrainDirectory();
    this.convPath = path.join(brainDir, convId);
    this.logPath = path.join(this.convPath, '.system_generated', 'logs', 'transcript.jsonl');
    this.fullLogPath = path.join(this.convPath, '.system_generated', 'logs', 'transcript_full.jsonl');
  }

  start() {
    this.poll();
    this.timer = setInterval(() => {
      if (!this.isPaused) {
        this.poll();
      }
    }, 750);
  }

  pause(paused) {
    this.isPaused = Boolean(paused);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Reads initial history of events from transcript.jsonl
   */
  loadHistory(maxSteps = 100) {
    if (!fs.existsSync(this.logPath)) {
      return [];
    }

    try {
      const stats = fs.statSync(this.logPath);
      // Read entire file if reasonable, or read up to current offset
      const fd = fs.openSync(this.logPath, 'r');
      const buf = Buffer.alloc(stats.size);
      fs.readSync(fd, buf, 0, stats.size, 0);
      fs.closeSync(fd);

      this.lastOffset = stats.size;
      this.leftoverBuffer = '';

      const content = buf.toString('utf-8');
      const lines = content.split(/\r?\n/).filter(Boolean);
      const events = [];

      // Take up to maxSteps latest steps or all if fewer
      const sliceLines = lines.slice(-maxSteps);
      for (const line of sliceLines) {
        try {
          const raw = JSON.parse(line);
          const normalized = normalizeStep(raw, this.convId);
          if (normalized) events.push(normalized);
        } catch {}
      }

      return events;
    } catch (err) {
      console.error('[Telemetry] Error loading history:', err);
      return [];
    }
  }

  /**
   * Non-blocking poll using low-level fd without holding lock
   */
  poll() {
    if (!fs.existsSync(this.logPath)) {
      return;
    }

    let fd = null;
    try {
      const stats = fs.statSync(this.logPath);
      if (stats.size < this.lastOffset) {
        // File was truncated or rotated
        this.lastOffset = 0;
        this.leftoverBuffer = '';
      }

      if (stats.size === this.lastOffset) {
        return; // No new bytes
      }

      const bytesToRead = stats.size - this.lastOffset;
      const buffer = Buffer.alloc(bytesToRead);

      fd = fs.openSync(this.logPath, 'r');
      fs.readSync(fd, buffer, 0, bytesToRead, this.lastOffset);
      fs.closeSync(fd);
      fd = null;

      this.lastOffset = stats.size;

      const chunk = this.leftoverBuffer + buffer.toString('utf-8');
      const lines = chunk.split(/\r?\n/);
      
      // Last element might be incomplete line, hold in buffer
      this.leftoverBuffer = lines.pop() || '';

      const newEvents = [];
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const raw = JSON.parse(line);
          const normalized = normalizeStep(raw, this.convId);
          if (normalized) newEvents.push(normalized);
        } catch {}
      }

      if (newEvents.length > 0 && typeof this.onEvents === 'function') {
        this.onEvents(newEvents);
      }
    } catch (err) {
      // Windows I/O sharing backoff
    } finally {
      if (fd !== null) {
        try { fs.closeSync(fd); } catch {}
      }
    }
  }
}

let activeTailer = null;

function attachTelemetry(convId, onEvents, maxHistory = 150) {
  if (activeTailer) {
    activeTailer.stop();
    activeTailer = null;
  }

  let targetId = convId;
  if (!targetId) {
    const list = listConversations();
    if (list.length > 0) {
      targetId = list[0].id;
    }
  }

  if (!targetId) {
    return { success: false, error: 'No conversation found' };
  }

  activeTailer = new TelemetryTailer(targetId, onEvents);
  const initialHistory = activeTailer.loadHistory(maxHistory);
  activeTailer.start();

  return {
    success: true,
    convId: targetId,
    history: initialHistory,
  };
}

function pauseTelemetry(paused) {
  if (activeTailer) {
    activeTailer.pause(paused);
    return true;
  }
  return false;
}

function getActiveSession() {
  if (activeTailer) {
    return {
      active: true,
      convId: activeTailer.convId,
      isPaused: activeTailer.isPaused,
      logPath: activeTailer.logPath,
    };
  }
  return { active: false };
}

function stopTelemetry() {
  if (activeTailer) {
    activeTailer.stop();
    activeTailer = null;
  }
}

module.exports = {
  getBrainDirectory,
  listConversations,
  normalizeStep,
  attachTelemetry,
  pauseTelemetry,
  getActiveSession,
  stopTelemetry,
};

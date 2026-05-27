// src/storage/replay.js
//
// Rebuilds the SQLite cache from the JSONL log.
//
// Manta's storage model (backend ADR-001) treats the JSONL log as the
// source of truth and the SQLite cache as a pure projection of it.
// After a git pull — or any other event that could have added lines
// from teammates — the cache must be brought back into sync with the
// log on disk.
//
// This module implements the simplest possible sync strategy: on every
// CLI invocation, wipe the issues table and replay the full log in a
// single transaction. At our scale the cost is a few tens of
// milliseconds, and in exchange we get an unconditional guarantee that
// SQLite matches JSONL after sync. There is no checkpoint state that
// can drift, be corrupted, or be invalidated by a git merge.
//
// Consumers (cli/index.js) call syncFromLog() once at startup, before
// applyEvent runs for the current command, so update/delete commands
// see teammates' issues from the log instead of failing with
// "no issue with that ID exists".

import { readFileSync, existsSync } from 'fs';
import db from './db.js';
import { applyEvent } from './store.js';

const DEFAULT_LOG_PATH = '.manta/manta.jsonl';

/**
 * Wipe the issues table and replay every event in the JSONL log.
 *
 * No-op if the log file doesn't exist (first run) or is empty. The wipe
 * and replay run inside a single SQLite transaction, so the cache is
 * never observable in a half-rebuilt state.
 *
 * @param {string} [logPath] - Log path override (mainly for testing).
 */
export function syncFromLog(logPath = DEFAULT_LOG_PATH) {
  if (!existsSync(logPath)) return;

  const lines = readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
  if (lines.length === 0) return;

  const rebuild = db.transaction(() => {
    db.exec('DELETE FROM issues');
    for (const line of lines) {
      applyEvent(JSON.parse(line), { replay: true });
    }
  });
  rebuild();
}

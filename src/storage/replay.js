// src/storage/replay.js
//
// Manta's replay layer.
//
// SQLite (.manta/manta.db) is a local cache. The JSONL log
// (.manta/manta.jsonl) is the source of truth. Replay's job is to make
// SQLite reflect the current contents of the JSONL log.
//
// Per ADR-007, replay is gated by a checkpoint: a hash of the entire
// JSONL log, stored in SQLite. On each run we compare the current log's
// hash to the stored checkpoint:
//
//   - Hashes match  -> the log hasn't changed since we last built the
//                      cache, so we skip replay entirely.
//   - Hashes differ -> the log changed (new events, a git pull / merge,
//     (or no checkpoint)  etc.), so we wipe the issues table and replay
//                      the whole log from scratch, then store the new hash.
//
// We rebuild the entire table on any external change (rather than reading
// only new lines) because a git pull can interleave a teammate's events
// into the middle of the log, not just append at the end. See ADR-007.
//
// --- Rolling hash (the optimization) ---
//
// Re-hashing the whole log every time we append our own event would be
// O(n) per append. Instead we keep a live, running hasher in memory
// (`rollingHasher`) that has already consumed every byte currently in
// the log. There are exactly two ways it gets set:
//
//   1. syncFromLog() reads the whole file and rebuilds the running hasher
//      from scratch. This is the ONLY path that trusts the file on disk,
//      so it's where we recover after a git pull / external change.
//   2. recordAppend() feeds ONE new line into the running hasher. This is
//      O(line), not O(file). It is correct ONLY because the file is now
//      exactly "the bytes we already hashed + this one appended line" --
//      true for our own appends, never true after an external change.
//
// So the rule is: roll forward on our own appends; on any external change,
// throw the running hasher away and rebuild it from the full file. The
// caller is responsible for calling syncFromLog() after a git pull.
//
// replay does NOT call applyEvent. applyEvent
// generates fresh IDs and re-appends to the JSONL,
// since the log already has the real IDs and lines. Replay writes to
// SQLite only, reusing store.js's SQLite-write functions with the IDs
// already present in the log.

import { existsSync, readFileSync } from 'fs';
import db from './db.js';
import { insertIssue, updateIssue, deleteIssue } from './store.js';

const DEFAULT_LOG_PATH = '.manta/manta.jsonl';

// Key used to store the checkpoint hash in the meta table.
const CHECKPOINT_KEY = 'jsonl_checkpoint';

// The running hasher: a live CryptoHasher that has consumed every byte
// currently in the log. Null until syncFromLog() builds it. We never call
// digest() on this directly (that would finalize it); we copy() it first.
// See the module header for why this is the heart of the rolling hash.
let rollingHasher = null;

// ---- Public API ----------------------------------------------------

/**
 * Bring SQLite in sync with the JSONL log, if the log has changed.
 *
 * Reads the whole log, hashes it, and compares that hash to the stored
 * checkpoint. If they match, does nothing. If they differ (or there is no
 * stored checkpoint yet), wipes the issues table, replays the whole log,
 * and stores the new hash.
 *
 * Either way, this rebuilds the running hasher from the full file, so the
 * in-memory rolling state matches what's on disk. Call this on startup and
 * after anything that may have changed the log externally (e.g. git pull).
 *
 * @param {string} [logPath] - Log path override (mainly for testing).
 * @returns {boolean} True if a replay happened, false if it was skipped.
 */
export function syncFromLog(logPath = DEFAULT_LOG_PATH) {
  // No log file yet means there is nothing to replay. This happens on a
  // fresh workspace before the first event is ever written. Start the
  // running hasher empty so the first append rolls forward correctly.
  if (!existsSync(logPath)) {
    rollingHasher = newHasher();
    db.prepare(`DELETE FROM issues`).run(); // no log = no events = empty cache
    return false;
  }

  const contents = readFileSync(logPath, 'utf8');

  // Rebuild the running hasher from the full file. After this line, the
  // hasher reflects exactly what's on disk, which is what makes future
  // single-line appends correct.
  rollingHasher = newHasher();
  rollingHasher.update(contents);
  const currentHash = digestOf(rollingHasher);

  const storedHash = getCheckpoint();

  // The log is provably unchanged since we last built the cache.
  if (storedHash !== null && storedHash === currentHash) {
    return false;
  }

  replayLog(contents);
  setCheckpoint(currentHash);
  return true;
}

/**
 * Record a line that store.js just appended to the log, updating the
 * checkpoint by rolling the hash forward -- without re-reading the file.
 *
 * store.js calls this immediately after appendToLog(), passing the exact
 * same line it wrote (including the trailing '\n'). We feed that line into
 * the running hasher and store the new digest as the checkpoint, so the
 * next run sees a matching hash and skips replay.
 *
 * The line passed here MUST be byte-for-byte what was written to disk,
 * or the rolling hash will drift from the file and we'll trigger
 * unnecessary replays.
 *
 * If the running hasher hasn't been initialized yet (recordAppend called
 * before syncFromLog in this process), we fall back to a full re-hash so
 * the checkpoint is still correct.
 *
 * @param {string} line - The exact line written to the log, including '\n'.
 * @param {string} [logPath] - Log path override (mainly for testing).
 */
export function recordAppend(line, logPath = DEFAULT_LOG_PATH) {
  if (rollingHasher === null) {
    // We have no trusted running state, so we can't roll forward safely.
    // Rebuild from the full file instead.
    rebuildHasherFromFile(logPath);
  } else {
    // The file is now "everything we'd already hashed + this line", so
    // feeding just the line keeps the running hasher correct. O(line).
    rollingHasher.update(line);
  }

  setCheckpoint(digestOf(rollingHasher));
}

// ---- Replay --------------------------------------------------------

/**
 * Rebuild the issues table from the full contents of the log.
 *
 * Wipes the table first, then applies every event in order. Running the
 * whole thing in a single transaction means a half-applied log can never
 * be left behind if something throws partway through.
 *
 * @param {string} contents - The full text of the JSONL log.
 */
function replayLog(contents) {
  const events = parseLog(contents);

  const runReplay = db.transaction(() => {
    db.prepare(`DELETE FROM issues`).run();
    for (const event of events) {
      applyEventToCache(event);
    }
  });

  runReplay();
}

/**
 * Apply a single event to SQLite only (no JSONL write, no ID generation).
 *
 * This is the replay-time counterpart to store.js's applyEvent: it
 * dispatches by type, but uses the IDs already recorded in the log and
 * never touches the JSONL.
 *
 * @param {object} event - An event read from the log.
 * @throws {Error} If event.type is unrecognized.
 */
function applyEventToCache(event) {
  switch (event.type) {
    case 'issue.created':
      insertIssue(event);
      break;
    case 'issue.updated':
      updateIssue(event);
      break;
    case 'issue.deleted':
      deleteIssue(event);
      break;
    default:
      throw new Error(
        `Cannot replay event: unrecognized type "${event.type}".`,
      );
  }
}

/**
 * Parse the JSONL log text into an array of event objects.
 *
 * Splits on newlines and skips blank lines (e.g. a trailing newline at
 * the end of the file). Each remaining line is one JSON event.
 *
 * @param {string} contents - The full text of the JSONL log.
 * @returns {object[]} The events, in the order they appear in the log.
 * @throws {Error} If a non-blank line is not valid JSON.
 */
function parseLog(contents) {
  const events = [];
  const lines = contents.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') {
      continue; // Skip blank lines, including the trailing newline.
    }

    try {
      events.push(JSON.parse(line));
    } catch (err) {
      throw new Error(
        `Cannot replay log: line ${i + 1} is not valid JSON. ${err.message}`,
      );
    }
  }

  return events;
}

// ---- Checkpoint (stored in SQLite) ---------------------------------

/**
 * Read the stored checkpoint hash from the meta table.
 *
 * @returns {string|null} The stored hash, or null if none has been stored.
 */
function getCheckpoint() {
  const row = db
    .prepare(`SELECT Value FROM meta WHERE Key = ?`)
    .get(CHECKPOINT_KEY);
  return row ? row.Value : null;
}

/**
 * Write the checkpoint hash to the meta table, replacing any existing one.
 *
 * @param {string} hash - The hash of the current log.
 */
function setCheckpoint(hash) {
  db.prepare(
    `
    INSERT INTO meta (Key, Value) VALUES (?, ?)
    ON CONFLICT(Key) DO UPDATE SET Value = excluded.Value
  `,
  ).run(CHECKPOINT_KEY, hash);
}

// ---- Hashing -------------------------------------------------------
//
// Two hashing paths exist by design, and they MUST agree byte-for-byte on
// the same file state:
//
//   - Full path:    newHasher() + update(whole file)      -- in syncFromLog
//   - Rolling path: the running hasher + update(one line)  -- in recordAppend
//
// They agree because feeding the whole file in one update() and feeding it
// in line-sized pieces produce the same digest: a streaming hash only cares
// about the sequence of bytes, not how the updates are chunked. The thing
// to protect is that recordAppend() is given the exact bytes that were
// written to the file (including '\n'). See ADR-007.

/**
 * Create a fresh, empty hasher.
 *
 * @returns {Bun.CryptoHasher} A new SHA-256 hasher with no bytes consumed.
 */
function newHasher() {
  return new Bun.CryptoHasher('sha256');
}

/**
 * Get the current digest of a running hasher without finalizing it.
 *
 * digest() finalizes a hasher, after which it can't accept more bytes. We
 * need to keep feeding the running hasher after reading its value, so we
 * copy() it first and digest the copy, leaving the original untouched.
 *
 * @param {Bun.CryptoHasher} hasher - The running hasher to snapshot.
 * @returns {string} The hex-encoded digest of the bytes consumed so far.
 */
function digestOf(hasher) {
  return hasher.copy().digest('hex');
}

/**
 * Rebuild the running hasher from the full log file on disk.
 *
 * Used as a safety fallback in recordAppend when no running state exists
 * yet. Reads the whole file (O(n)), which is the price of recovering a
 * trustworthy running hasher.
 *
 * @param {string} logPath - Path to the JSONL log.
 */
function rebuildHasherFromFile(logPath) {
  rollingHasher = newHasher();
  if (existsSync(logPath)) {
    rollingHasher.update(readFileSync(logPath, 'utf8'));
  }
}

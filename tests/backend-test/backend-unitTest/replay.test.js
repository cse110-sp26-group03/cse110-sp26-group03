/**
 * Unit tests for the replay layer (`src/storage/replay.js`).
 *
 * Replay's job is to make the SQLite cache reflect the JSONL log:
 *   - syncFromLog(path)  rebuilds the issues table from the log when the
 *                        log's hash differs from the stored checkpoint, and
 *                        skips the rebuild when the hashes match (ADR-007).
 *   - recordAppend(line) rolls the checkpoint hash forward by one appended
 *                        line, without re-reading the whole file.
 *
 * Both functions accept a logPath override, so every test points them at a
 * throwaway file under the OS temp directory and never touches the real
 * `.manta/manta.jsonl`. They do, however, share the db.js SQLite singleton
 * (the issues and meta tables), so beforeEach resets that shared state: it
 * clears the issues table and removes the checkpoint row.
 */
import { test, expect, describe, beforeEach, afterAll } from 'bun:test';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync, appendFileSync, rmSync, existsSync } from 'fs';
import db from '../../../src/storage/db.js';
import { syncFromLog, recordAppend } from '../../../src/storage/replay.js';

/** The meta key replay.js uses to store the rolling-hash checkpoint. */
const CHECKPOINT_KEY = 'jsonl_checkpoint';

/** Temp log files created during the suite, removed in afterAll. */
const tempLogs = [];

/**
 * Allocate a unique temp log path. The file is not created here; tests write
 * to it as needed. Tracked so afterAll can clean every file up.
 *
 * @returns {string} An absolute path under the OS temp directory.
 */
function tempLogPath() {
  const path = join(
    tmpdir(),
    `manta-replay-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`,
  );
  tempLogs.push(path);
  return path;
}

/**
 * Build one JSONL line for an `issue.created` event in the shape store.js's
 * insertIssue expects (a populated event.issue plus a top-level issueId).
 *
 * @param {string} id - The issue ID to assign.
 * @param {object} [overrides] - Fields to override on the issue body.
 * @returns {string} A single JSON line terminated by '\n'.
 */
function createdLine(id, overrides = {}) {
  return (
    JSON.stringify({
      type: 'issue.created',
      issueId: id,
      issue: {
        title: `Title ${id}`,
        description: '',
        status: 'open',
        priority: 5,
        issueType: 'task',
        assignee: null,
        createdAt: '2026-01-01T00:00:00Z',
        createdBy: 'replay-test',
        updatedAt: '2026-01-01T00:00:00Z',
        updatedBy: 'replay-test',
        ...overrides,
      },
    }) + '\n'
  );
}

/**
 * Build one JSONL line for an `issue.updated` event.
 *
 * @param {string} id - The target issue ID.
 * @param {object} changes - The changed fields (camelCase column names).
 * @returns {string} A single JSON line terminated by '\n'.
 */
function updatedLine(id, changes) {
  return JSON.stringify({ type: 'issue.updated', issueId: id, changes }) + '\n';
}

/**
 * Build one JSONL line for an `issue.deleted` event.
 *
 * @param {string} id - The target issue ID.
 * @returns {string} A single JSON line terminated by '\n'.
 */
function deletedLine(id) {
  return JSON.stringify({ type: 'issue.deleted', issueId: id }) + '\n';
}

/** Count the rows currently in the issues table. */
function issueCount() {
  return db.prepare('SELECT COUNT(*) AS c FROM issues').get().c;
}

/** Read the stored checkpoint hash, or null if none is set. */
function storedCheckpoint() {
  const row = db
    .prepare('SELECT Value FROM meta WHERE Key = ?')
    .get(CHECKPOINT_KEY);
  return row ? row.Value : null;
}

beforeEach(() => {
  // The issues and meta tables are shared singleton state; start each test
  // from a clean cache with no checkpoint so replays are deterministic.
  db.prepare('DELETE FROM issues').run();
  db.prepare('DELETE FROM meta WHERE Key = ?').run(CHECKPOINT_KEY);
});

afterAll(() => {
  for (const path of tempLogs) {
    if (existsSync(path)) rmSync(path);
  }
});

// ---- syncFromLog: the basic replay decision ------------------------------

describe('syncFromLog()', () => {
  // No file on disk means there are no events to replay: report "skipped"
  // and leave the cache empty.
  test('returns false and empties the cache when the log is missing', () => {
    db.prepare('INSERT INTO issues (ID, Title) VALUES (?, ?)').run(
      'manta-stale',
      'stale',
    );

    const replayed = syncFromLog(tempLogPath()); // path never created

    expect(replayed).toBe(false);
    expect(issueCount()).toBe(0);
  });

  // A fresh log with no prior checkpoint is replayed in full.
  test('replays a new log into the issues table and returns true', () => {
    const path = tempLogPath();
    writeFileSync(path, createdLine('manta-r1') + createdLine('manta-r2'));

    const replayed = syncFromLog(path);

    expect(replayed).toBe(true);
    expect(issueCount()).toBe(2);
    expect(
      db.prepare('SELECT Title FROM issues WHERE ID = ?').get('manta-r1').Title,
    ).toBe('Title manta-r1');
  });

  // Storing the checkpoint lets the second call prove the log is unchanged
  // and skip the rebuild entirely.
  test('skips replay (returns false) when the log is unchanged', () => {
    const path = tempLogPath();
    writeFileSync(path, createdLine('manta-r1'));

    expect(syncFromLog(path)).toBe(true);
    expect(syncFromLog(path)).toBe(false);
    expect(storedCheckpoint()).not.toBeNull();
  });

  // Any change to the log content changes its hash, so the next sync rebuilds.
  test('re-replays (returns true) after the log content changes', () => {
    const path = tempLogPath();
    writeFileSync(path, createdLine('manta-r1'));
    expect(syncFromLog(path)).toBe(true);

    appendFileSync(path, createdLine('manta-r2'));
    expect(syncFromLog(path)).toBe(true);
    expect(issueCount()).toBe(2);
  });

  // An empty log file represents a workspace with no events: the cache is
  // cleared and the (empty) log is treated as a replay.
  test('clears the cache for an empty log file', () => {
    const path = tempLogPath();
    writeFileSync(path, '');

    const replayed = syncFromLog(path);

    expect(replayed).toBe(true);
    expect(issueCount()).toBe(0);
  });
});

// ---- syncFromLog: event application order --------------------------------

describe('syncFromLog() event application', () => {
  // Replay must apply created/updated/deleted events in order, so the final
  // cache reflects the cumulative effect of the whole log.
  test('applies create, update, and delete events in order', () => {
    const path = tempLogPath();
    writeFileSync(
      path,
      createdLine('manta-a', { title: 'original' }) +
        updatedLine('manta-a', { title: 'changed', priority: 1 }) +
        createdLine('manta-b') +
        deletedLine('manta-b'),
    );

    syncFromLog(path);

    const a = db
      .prepare('SELECT Title, Priority FROM issues WHERE ID = ?')
      .get('manta-a');
    expect(a.Title).toBe('changed');
    expect(a.Priority).toBe(1);
    // manta-b was created then deleted, so it must not survive replay.
    expect(
      db.prepare('SELECT COUNT(*) AS c FROM issues WHERE ID = ?').get('manta-b')
        .c,
    ).toBe(0);
  });

  // Blank lines (e.g. a trailing newline) are skipped, not treated as events.
  test('ignores blank lines in the log', () => {
    const path = tempLogPath();
    writeFileSync(path, '\n' + createdLine('manta-r1') + '\n\n');

    syncFromLog(path);

    expect(issueCount()).toBe(1);
  });
});

// ---- syncFromLog: error and atomicity edge cases -------------------------

describe('syncFromLog() error handling', () => {
  // A malformed line aborts replay with a message naming the bad line.
  test('throws when a log line is not valid JSON', () => {
    const path = tempLogPath();
    writeFileSync(path, createdLine('manta-r1') + 'this is not json\n');

    expect(() => syncFromLog(path)).toThrow(/not valid JSON/);
  });

  // An unknown event type is rejected during replay.
  test('throws on an unrecognized event type', () => {
    const path = tempLogPath();
    writeFileSync(
      path,
      JSON.stringify({ type: 'issue.exploded', issueId: 'manta-x' }) + '\n',
    );

    expect(() => syncFromLog(path)).toThrow(/unrecognized type/);
  });

  // Replay runs in a single transaction: if an event throws partway through,
  // the wipe-and-rebuild is rolled back, leaving the previous cache intact.
  test('rolls back the whole replay if an event fails', () => {
    const goodPath = tempLogPath();
    writeFileSync(goodPath, createdLine('manta-keep'));
    syncFromLog(goodPath);
    expect(issueCount()).toBe(1);

    const badPath = tempLogPath();
    writeFileSync(
      badPath,
      createdLine('manta-new') + JSON.stringify({ type: 'bogus.type' }) + '\n',
    );

    expect(() => syncFromLog(badPath)).toThrow();
    // The failed replay must not have deleted the previously cached issue,
    // and must not have inserted the partially-applied new one.
    expect(
      db
        .prepare('SELECT COUNT(*) AS c FROM issues WHERE ID = ?')
        .get('manta-keep').c,
    ).toBe(1);
    expect(
      db
        .prepare('SELECT COUNT(*) AS c FROM issues WHERE ID = ?')
        .get('manta-new').c,
    ).toBe(0);
  });
});

// ---- recordAppend: rolling the checkpoint forward ------------------------

describe('recordAppend()', () => {
  // recordAppend writes a checkpoint even when called as the first thing in
  // the process (it falls back to hashing the whole file).
  test('sets the checkpoint from the file when no prior sync ran', () => {
    const path = tempLogPath();
    writeFileSync(path, createdLine('manta-r1'));

    recordAppend(createdLine('manta-r1'), path);

    expect(storedCheckpoint()).not.toBeNull();
  });

  // The core contract: after syncFromLog establishes the checkpoint, feeding
  // the exact appended line to recordAppend rolls the hash forward so it
  // matches the file on disk, and the next syncFromLog skips the rebuild.
  test('rolls the hash forward so the next sync is skipped', () => {
    const path = tempLogPath();
    writeFileSync(path, createdLine('manta-r1'));
    syncFromLog(path);

    const line = createdLine('manta-r2');
    appendFileSync(path, line); // store.js writes the line ...
    recordAppend(line, path); // ... then records exactly that line.

    // The checkpoint now reflects the full file, so no replay is needed.
    expect(syncFromLog(path)).toBe(false);
  });

  // Multiple appends roll forward correctly one after another, keeping the
  // checkpoint in step with the growing file.
  test('rolls forward across several consecutive appends', () => {
    const path = tempLogPath();
    writeFileSync(path, createdLine('manta-r1'));
    syncFromLog(path);

    for (const id of ['manta-r2', 'manta-r3', 'manta-r4']) {
      const line = createdLine(id);
      appendFileSync(path, line);
      recordAppend(line, path);
    }

    expect(syncFromLog(path)).toBe(false);
  });

  // If the recorded line does NOT match what was written to disk, the rolling
  // hash drifts from the file and the next sync must rebuild.
  test('drifts (forces a replay) when the recorded line is wrong', () => {
    const path = tempLogPath();
    writeFileSync(path, createdLine('manta-r1'));
    syncFromLog(path);

    const realLine = createdLine('manta-r2');
    appendFileSync(path, realLine);
    recordAppend(createdLine('manta-different'), path); // wrong bytes

    expect(syncFromLog(path)).toBe(true);
  });
});

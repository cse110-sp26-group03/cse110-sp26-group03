/**
 * Unit tests for the storage layer (`src/storage/store.js`).
 *
 * store.js exports several functions, so the tests are grouped into one
 * describe() block per function, with three tests each:
 *   1. applyEvent()    — dispatches by event.type
 *   2. appendToLog()   — writes one JSON line per event to the JSONL log
 *   3. issueExists()   — reports whether a row with an ID is in SQLite
 *   4. insertIssue()   — inserts a new issue row into SQLite
 *   5. updateIssue()   — updates only the changed columns of a row
 *   6. deleteIssue()   — removes an issue row by ID
 *
 * The SQLite helpers (issueExists/insert/update/delete) run against the real
 * local cache, so every test uses sentinel IDs prefixed with
 * `manta-test-` and the beforeEach/afterAll hooks below erase those rows so
 * the developer's real `.manta` cache is clean. appendToLog takes a
 * path override, so it is tested against a throwaway temp file instead.
 */
import { test, expect, describe, beforeEach, afterEach, afterAll } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  applyEvent,
  appendToLog,
  issueExists,
  insertIssue,
  updateIssue,
  deleteIssue,
} from '../../../src/storage/store.js';
// The same store.js writes to — used here to assert and to clean up.
import db from '../../../src/storage/db.js';

/**
 * Prefix shared by every test row so the cleanup can easily target without hitting real data
 *
 * @type {string}
 */
const TEST_PREFIX = 'manta-test-';

/**
 * Sentinel issue ID for the applyEvent error-path tests. Chosen so it will
 * not collide with any real row in the local cache.
 *
 * @type {string}
 */
const MISSING_ID = `${TEST_PREFIX}missing-xyz`;

/**
 * Build a complete issue.created event for the SQLite helpers. Tests pass an
 * ID and optionally override individual issue fields.
 *
 * @param {string} id - The issue ID to insert under.
 * @param {object} [overrides] - Issue fields to override the defaults.
 * @returns {object} A create event with a fully-populated event.issue.
 */
function makeCreateEvent(id, overrides = {}) {
  return {
    type: 'issue.created',
    issueId: id,
    issue: {
      title: 'Test issue',
      description: 'A description',
      status: 'open',
      priority: 5,
      issueType: 'task',
      assignee: 'alice',
      createdAt: '2025-01-01T00:00:00Z',
      createdBy: 'tester',
      updatedAt: '2025-01-01T00:00:00Z',
      updatedBy: 'tester',
      ...overrides,
    },
  };
}

// Start every test from a clean slate, and leave the cache clean at the end,
// by removing any leftover sentinel rows 
beforeEach(() => {
  db.prepare(`DELETE FROM issues WHERE ID LIKE '${TEST_PREFIX}%'`).run();
});
afterAll(() => {
  db.prepare(`DELETE FROM issues WHERE ID LIKE '${TEST_PREFIX}%'`).run();
});

/**
 * applyEvent() tests. applyEvent dispatches on event.type; these cover the
 * three error paths it can take. (Success paths mutate JSONL + SQLite and are
 * tracked in db.test.js / replay.test.js.)
 * 1. First test checks that an unrecognized type throws a structured error
 *    with a null issueId
 * 2. Second test checks that an issue.updated for a missing issue throws and
 *    carries the issueId in the message, .issueId field, and .reason field
 * 3. Third test checks that an issue.deleted for a missing issue throws and
 *    carries the issueId in the message, .issueId field, and .reason field
 */
describe('applyEvent()', () => {
  // An event with no recognized type hits the default branch. We catch the
  // error manually to inspect .reason and .issueId
  test('throws a structured error on an unrecognized type', () => {
    try {
      applyEvent({ type: 'bogus.type' });
      // Reaching here means applyEvent didn't throw, very bad
      throw new Error('expected applyEvent to throw'); //fail the test
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.reason).toMatch(/unrecognized event type/);
      // No issue is involved in this error, so issueId is null.
      expect(err.issueId).toBeNull();
    }
  });

  // issue.updated for a missing issue should fail before any write.
  test('throws for an issue.updated whose issue does not exist', () => {
    try {
      applyEvent({
        type: 'issue.updated',
        issueId: MISSING_ID,
        changes: { title: 'New title' },
      });
      throw new Error('expected applyEvent to throw');  //fail the test if we get here
    } catch (err) {
      expect(err.message).toContain(MISSING_ID);
      expect(err.issueId).toBe(MISSING_ID);
      expect(err.reason).toMatch(/no issue with that ID exists/);
    }
  });

  // issue.deleted for a missing issue should fail the same way.
  test('throws for an issue.deleted whose issue does not exist', () => {
    try {
      applyEvent({ type: 'issue.deleted', issueId: MISSING_ID });
      throw new Error('expected applyEvent to throw'); //fail the test if we get here
    } catch (err) {
      expect(err.message).toContain(MISSING_ID);
      expect(err.issueId).toBe(MISSING_ID);
      expect(err.reason).toMatch(/no issue with that ID exists/);
    }
  });
});

/**
 * appendToLog() tests. appendToLog serializes an event to one JSON line and
 * appends it to the log file, creating the parent directory if needed. The
 * logPath are on a temp file.
 * 1. First test checks that the event is written as a single JSON line ending
 *    in a newline
 * 2. Second test checks that the return value is the exact line that was written
 * 3. Third test checks that a second call appends (not overwrites) and that a
 *    missing parent directory is created
 */
describe('appendToLog()', () => {
  let dir;
  // Each test gets its own unique temp directory, removed afterward. Runs for each test in appendtoLog
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'manta-log-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // The file should contain exactly the JSON of the event plus a trailing '\n'.
  test('writes the event as a single JSON line ending in a newline', () => {
    const logPath = join(dir, 'manta.jsonl');
    const event = { type: 'issue.updated', issueId: `${TEST_PREFIX}log1` };
    appendToLog(event, logPath);
    expect(readFileSync(logPath, 'utf8')).toBe(JSON.stringify(event) + '\n');
  });

  // The returned line should match what was written to the file
  // can reuse it without re-reading the file.
  test('returns the exact line string it wrote', () => {
    const logPath = join(dir, 'manta.jsonl');
    const event = { type: 'issue.deleted', issueId: `${TEST_PREFIX}log2` };
    const line = appendToLog(event, logPath);
    expect(line).toBe(JSON.stringify(event) + '\n');
    expect(readFileSync(logPath, 'utf8')).toBe(line);
  });

  // two calls should produce two lines rather than overwriting.
  test('appends additional events and creates a missing parent directory', () => {
    const logPath = join(dir, 'nested', 'manta.jsonl');
    const first = { type: 'issue.updated', issueId: `${TEST_PREFIX}log3` };
    const second = { type: 'issue.deleted', issueId: `${TEST_PREFIX}log3` };
    appendToLog(first, logPath);
    appendToLog(second, logPath);
    // .trim() drops the trailing newline so split('\n') yields exactly 2 lines.
    const lines = readFileSync(logPath, 'utf8').trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0])).toEqual(first);
    expect(JSON.parse(lines[1])).toEqual(second);
  });
});

/**
 * issueExists() tests. issueExists returns a boolean for whether a row with
 * the given ID is present in SQLite.
 * 1. First test checks that it returns false when no such ID exists
 * 2. Second test checks that it returns true once a row with that ID is inserted
 * 3. Third test checks that it returns false again after that row is deleted
 */
describe('issueExists()', () => {
  // Nothing inserted yet, so the sentinel ID is absent.
  test('returns false when no issue with that ID exists', () => {
    expect(issueExists(`${TEST_PREFIX}nope`)).toBe(false);
  });

  // After inserting a row, the same ID should be found.
  test('returns true after an issue with that ID is inserted', () => {
    insertIssue(makeCreateEvent(`${TEST_PREFIX}exist`));
    expect(issueExists(`${TEST_PREFIX}exist`)).toBe(true);
  });

  // After deleting the row, the ID should be gone again.
  test('returns false again after the issue is deleted', () => {
    insertIssue(makeCreateEvent(`${TEST_PREFIX}gone`));
    deleteIssue({ issueId: `${TEST_PREFIX}gone` });
    expect(issueExists(`${TEST_PREFIX}gone`)).toBe(false);
  });
});

/**
 * insertIssue() tests. insertIssue writes a new issue row using the fields in
 * event.issue and the top-level event.issueId.
 * 1. First test checks that the inserted row is then found by issueExists
 * 2. Second test checks that the field values from event.issue are stored
 * 3. Third test checks that inserting a duplicate ID throws a UNIQUE error
 *    (which applyCreate relies on to detect ID collisions)
 */
describe('insertIssue()', () => {
  // A successful insert should be visible via issueExists.
  test('inserts a row that issueExists then finds', () => {
    insertIssue(makeCreateEvent(`${TEST_PREFIX}ins1`));
    expect(issueExists(`${TEST_PREFIX}ins1`)).toBe(true);
  });

  // The values from event.issue should land in the matching columns.
  test('stores the field values from event.issue', () => {
    insertIssue(
      makeCreateEvent(`${TEST_PREFIX}ins2`, {
        title: 'Specific title',
        priority: 2,
        issueType: 'bug',
      }),
    );
    const row = db
      .prepare('SELECT Title, Priority, IssueType FROM issues WHERE ID = ?')
      .get(`${TEST_PREFIX}ins2`);
    expect(row).toEqual({
      Title: 'Specific title',
      Priority: 2,
      IssueType: 'bug',
    });
  });

  // ID is the primary key, so a second insert with the same ID must throw the
  // UNIQUE constraint error.
  test('throws a UNIQUE constraint error on a duplicate ID', () => {
    insertIssue(makeCreateEvent(`${TEST_PREFIX}ins3`));
    expect(() => insertIssue(makeCreateEvent(`${TEST_PREFIX}ins3`))).toThrow(
      /UNIQUE constraint failed/,
    );
  });
});

/**
 * updateIssue() tests. updateIssue writes only the columns named in
 * event.changes, mapping camelCase keys to PascalCase columns.
 * 1. First test checks that only the named field changes and others are left alone
 * 2. Second test checks that a camelCase change key maps to its PascalCase column
 * 3. Third test checks that an empty changes object is a no-op (no throw, no change)
 */
describe('updateIssue()', () => {
  // Only Title should change, status should keep its inserted value.
  test('updates only the fields named in event.changes', () => {
    insertIssue(
      makeCreateEvent(`${TEST_PREFIX}upd1`, { title: 'Old', status: 'open' }),
    );
    updateIssue({ issueId: `${TEST_PREFIX}upd1`, changes: { title: 'New' } });
    const row = db
      .prepare('SELECT Title, Status FROM issues WHERE ID = ?')
      .get(`${TEST_PREFIX}upd1`);
    expect(row.Title).toBe('New'); // changed
    expect(row.Status).toBe('open'); // untouched
  });

  // The change key issueType (camelCase) should map to the IssueType column.
  test('maps a camelCase change key to its PascalCase column', () => {
    insertIssue(makeCreateEvent(`${TEST_PREFIX}upd2`, { issueType: 'task' }));
    updateIssue({
      issueId: `${TEST_PREFIX}upd2`,
      changes: { issueType: 'feature' },
    });
    const row = db
      .prepare('SELECT IssueType FROM issues WHERE ID = ?')
      .get(`${TEST_PREFIX}upd2`);
    expect(row.IssueType).toBe('feature');
  });

  // With no fields to change, updateIssue returns early without touching the row.
  test('is a no-op when changes is empty', () => {
    insertIssue(makeCreateEvent(`${TEST_PREFIX}upd3`, { title: 'Unchanged' }));
    expect(() =>
      updateIssue({ issueId: `${TEST_PREFIX}upd3`, changes: {} }),
    ).not.toThrow();
    const row = db
      .prepare('SELECT Title FROM issues WHERE ID = ?')
      .get(`${TEST_PREFIX}upd3`);
    expect(row.Title).toBe('Unchanged');
  });
});

/**
 * deleteIssue() tests. deleteIssue removes the row whose ID matches
 * event.issueId.
 * 1. First test checks that the targeted row is removed
 * 2. Second test checks that deleting a non-existent ID is a no-op (no throw)
 * 3. Third test checks that only the targeted ID is removed, leaving others intact
 */
describe('deleteIssue()', () => {
  // After deletion the row should no longer exist.
  test('removes the targeted issue row', () => {
    insertIssue(makeCreateEvent(`${TEST_PREFIX}del1`));
    deleteIssue({ issueId: `${TEST_PREFIX}del1` });
    expect(issueExists(`${TEST_PREFIX}del1`)).toBe(false);
  });

  // Deleting an ID that isn't there should simply do nothing.
  test('is a no-op when the ID does not exist', () => {
    expect(() =>
      deleteIssue({ issueId: `${TEST_PREFIX}del-missing` }),
    ).not.toThrow();
  });

  // Only the named ID should be removed; a second row should survive.
  test('only deletes the targeted ID and leaves others intact', () => {
    insertIssue(makeCreateEvent(`${TEST_PREFIX}del2`));
    insertIssue(makeCreateEvent(`${TEST_PREFIX}del3`));
    deleteIssue({ issueId: `${TEST_PREFIX}del2` });
    expect(issueExists(`${TEST_PREFIX}del2`)).toBe(false);
    expect(issueExists(`${TEST_PREFIX}del3`)).toBe(true);
  });
});

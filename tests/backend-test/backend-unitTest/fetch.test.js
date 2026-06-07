/**
 * Unit tests for the read-only query layer (`src/storage/fetch.js`).
 *
 * FETCH has two modes, both driven by the parse object's flags:
 *   - Detail mode (flags.id set):  returns a single issue row.
 *   - List mode   (flags.id unset): returns a filtered, priority-sorted array.
 *
 * fetch.js opens its OWN read-only connection to `.manta/manta.db` at import
 * time, so these tests seed the shared cache through the db.js singleton and
 * then read it back through FETCH. We import db.js first so the database file
 * exists before fetch.js tries to open it read-only.
 *
 * Every fixture row uses the sentinel assignee `FETCH_ASSIGNEE` and IDs
 * prefixed `manta-ftest-`, so the suite filters and cleans up only its own
 * rows and never collides with anything else in the local cache.
 *
 * Note on sorting: the priority sort expression in fetch.js orders rows
 * lexically by their priority text, so these tests use single-digit
 * priorities, where lexical and numeric order agree, to keep the expected
 * ordering unambiguous.
 */
import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import db from '../../../src/storage/db.js';
import { FETCH } from '../../../src/storage/fetch.js';

/** Sentinel assignee shared by every fixture row in this suite. */
const FETCH_ASSIGNEE = 'fetch-test-suite';

/**
 * Fixture rows seeded before the suite runs. Four non-closed issues with
 * distinct single-digit priorities plus one closed issue, so we can exercise
 * filtering, the default closed-exclusion, the --all override, and sorting.
 *
 * @type {Array.<object>}
 */
const FIXTURES = [
  // id,            status,        priority, type,      createdBy
  ['manta-ftest-open1', 'open', 3, 'bug', 'ftest-alice'],
  ['manta-ftest-open2', 'open', 1, 'feature', 'ftest-bob'],
  ['manta-ftest-open3', 'open', 8, 'task', 'ftest-alice'],
  ['manta-ftest-prog1', 'in_progress', 5, 'chore', 'ftest-bob'],
  ['manta-ftest-closed1', 'closed', 0, 'bug', 'ftest-alice'],
];

beforeAll(() => {
  const insert = db.prepare(
    `INSERT OR REPLACE INTO issues
       (ID, Title, Status, Priority, IssueType, Assignee, CreatedBy)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const [id, status, priority, type, createdBy] of FIXTURES) {
    insert.run(
      id,
      `Title ${id}`,
      status,
      priority,
      type,
      FETCH_ASSIGNEE,
      createdBy,
    );
  }
});

afterAll(() => {
  const del = db.prepare('DELETE FROM issues WHERE ID = ?');
  for (const [id] of FIXTURES) {
    del.run(id);
  }
});

// ---- Detail mode (flags.id) ---------------------------------------------

describe('FETCH detail mode', () => {
  // A known ID returns exactly that issue as a single object.
  test('returns the single issue matching flags.id', () => {
    const issue = FETCH({ cmd: 'view', flags: { id: 'manta-ftest-open1' } });
    expect(Array.isArray(issue)).toBe(false);
    expect(issue.ID).toBe('manta-ftest-open1');
    expect(issue.Title).toBe('Title manta-ftest-open1');
    expect(issue.Status).toBe('open');
  });

  // A missing ID surfaces as the wrapped "Query failed" error from FETCH,
  // and the message names the ID that was not found.
  test('throws a wrapped error when the ID does not exist', () => {
    expect(() =>
      FETCH({ cmd: 'view', flags: { id: 'manta-ftest-missing' } }),
    ).toThrow(/Query failed/);
    expect(() =>
      FETCH({ cmd: 'view', flags: { id: 'manta-ftest-missing' } }),
    ).toThrow(/manta-ftest-missing/);
  });

  // flags.id wins over any list filters present on the same parse object:
  // the result is the single object, not a filtered array.
  test('detail mode takes precedence over list filters', () => {
    const issue = FETCH({
      cmd: 'view',
      flags: { id: 'manta-ftest-open2', assignee: FETCH_ASSIGNEE, all: true },
    });
    expect(Array.isArray(issue)).toBe(false);
    expect(issue.ID).toBe('manta-ftest-open2');
  });
});

// ---- List mode (no flags.id) --------------------------------------------

describe('FETCH list mode', () => {
  /**
   * Fetch this suite's rows by the sentinel assignee and return just the IDs,
   * preserving FETCH's ordering. Keeps every list assertion scoped to our
   * own fixtures regardless of anything else in the cache.
   *
   * @param {object} [extraFlags] - Additional flags merged onto the assignee.
   * @returns {string[]} The matching issue IDs, in FETCH's returned order.
   */
  function fetchIds(extraFlags = {}) {
    const rows = FETCH({
      cmd: 'view',
      flags: { assignee: FETCH_ASSIGNEE, ...extraFlags },
    });
    return rows.map((r) => r.ID);
  }

  // List mode always returns an array, even before any filtering logic.
  test('returns an array', () => {
    const rows = FETCH({ cmd: 'view', flags: { assignee: FETCH_ASSIGNEE } });
    expect(Array.isArray(rows)).toBe(true);
  });

  // With no status filter and no --all, closed issues are hidden.
  test('excludes closed issues by default', () => {
    const ids = fetchIds();
    expect(ids).not.toContain('manta-ftest-closed1');
    expect(ids).toContain('manta-ftest-open1');
  });

  // The --all flag opts back into seeing closed issues.
  test('includes closed issues when the all flag is set', () => {
    const ids = fetchIds({ all: true });
    expect(ids).toContain('manta-ftest-closed1');
  });

  // An explicit status filter overrides the default closed-exclusion and
  // returns only rows in that status.
  test('status filter returns only matching rows (including closed)', () => {
    const ids = fetchIds({ status: 'closed' });
    expect(ids).toEqual(['manta-ftest-closed1']);
  });

  // Filtering by type narrows to that issue type; the closed bug is still
  // excluded because no status filter was given.
  test('filters by issue type', () => {
    const ids = fetchIds({ type: 'feature' });
    expect(ids).toEqual(['manta-ftest-open2']);
  });

  // Priority is matched exactly against the stored value.
  test('filters by priority', () => {
    const ids = fetchIds({ priority: 3 });
    expect(ids).toEqual(['manta-ftest-open1']);
  });

  // createdBy maps onto the CreatedBy column.
  test('filters by createdBy', () => {
    const ids = fetchIds({ createdBy: 'ftest-bob' });
    // Both of bob's rows are non-closed; open2 (p1) sorts before prog1 (p5).
    expect(ids).toEqual(['manta-ftest-open2', 'manta-ftest-prog1']);
  });

  // Multiple filters combine with AND.
  test('combines multiple filters with AND', () => {
    const ids = fetchIds({ createdBy: 'ftest-alice' });
    // alice owns open1, open3 (non-closed) and closed1 (excluded by default).
    expect(ids).toEqual(['manta-ftest-open1', 'manta-ftest-open3']);
  });

  // Non-closed rows come back ordered by ascending priority.
  test('sorts non-closed issues by ascending priority', () => {
    const ids = fetchIds();
    expect(ids).toEqual([
      'manta-ftest-open2', // priority 1
      'manta-ftest-open1', // priority 3
      'manta-ftest-prog1', // priority 5
      'manta-ftest-open3', // priority 8
    ]);
  });

  // Closed issues are pushed to the bottom of the list under --all,
  // regardless of their priority value.
  test('sorts closed issues to the bottom with the all flag', () => {
    const ids = fetchIds({ all: true });
    expect(ids[ids.length - 1]).toBe('manta-ftest-closed1');
  });

  // A filter that matches nothing yields an empty array, not an error.
  test('returns an empty array when nothing matches', () => {
    const rows = FETCH({
      cmd: 'view',
      flags: { assignee: 'fetch-test-nobody' },
    });
    expect(rows).toEqual([]);
  });
});

// ---- Additional coverage (augments the suite above) ---------------------

describe('FETCH list mode: additional filters', () => {
  // Two different columns narrow with AND. open1 is the only non-closed bug
  // created by alice (closed1 is also a bug by alice, but excluded by the
  // default closed filter).
  test('combines two different columns with AND', () => {
    const rows = FETCH({
      cmd: 'view',
      flags: {
        assignee: FETCH_ASSIGNEE,
        type: 'bug',
        createdBy: 'ftest-alice',
      },
    });
    expect(rows.map((r) => r.ID)).toEqual(['manta-ftest-open1']);
  });

  // A status filter for a non-closed status returns only that status and
  // leaves the others (here in_progress) out.
  test('status filter for a non-closed status (open)', () => {
    const rows = FETCH({
      cmd: 'view',
      flags: { assignee: FETCH_ASSIGNEE, status: 'open' },
    });
    expect(rows.map((r) => r.ID).sort()).toEqual(
      ['manta-ftest-open1', 'manta-ftest-open2', 'manta-ftest-open3'].sort(),
    );
  });

  test('status filter returns the single in_progress row', () => {
    const rows = FETCH({
      cmd: 'view',
      flags: { assignee: FETCH_ASSIGNEE, status: 'in_progress' },
    });
    expect(rows.map((r) => r.ID)).toEqual(['manta-ftest-prog1']);
  });

  // --all opts closed rows back in and still respects an explicit filter:
  // both bugs (open and closed) come back, nothing else.
  test('the all flag combines with a type filter', () => {
    const rows = FETCH({
      cmd: 'view',
      flags: { assignee: FETCH_ASSIGNEE, all: '', type: 'bug' },
    });
    expect(rows.map((r) => r.ID).sort()).toEqual(
      ['manta-ftest-closed1', 'manta-ftest-open1'].sort(),
    );
  });

  // Filtering by assignee alone returns every non-closed row in the suite.
  test('filters by assignee', () => {
    const rows = FETCH({ cmd: 'view', flags: { assignee: FETCH_ASSIGNEE } });
    expect(rows.map((r) => r.ID).sort()).toEqual(
      [
        'manta-ftest-open1',
        'manta-ftest-open2',
        'manta-ftest-open3',
        'manta-ftest-prog1',
      ].sort(),
    );
  });
});

describe('FETCH detail mode: error chaining', () => {
  // FETCH wraps the underlying "not found" error, preserving it as .cause so
  // callers can inspect the original failure.
  test('wraps the not-found error and preserves its cause', () => {
    try {
      FETCH({ cmd: 'view', flags: { id: 'manta-ftest-absent' } });
      throw new Error('expected FETCH to throw');
    } catch (err) {
      expect(err.message).toMatch(/Query failed/);
      expect(err.cause).toBeInstanceOf(Error);
      expect(err.cause.message).toMatch(/manta-ftest-absent/);
    }
  });
});

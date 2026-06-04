/**
 * Unit tests for the SQLite initialization layer (`src/storage/db.js`).
 *
 */
import { test, expect, describe } from 'bun:test';
import { openDatabase } from '../../../src/storage/db.js';

/**
 * These tests verify that openDatabase() correctly sets up the SQLite database
 */
describe('openDatabase()', () => {
  test('returns a queryable Database for :memory:', () => {
    const db = openDatabase(':memory:');
    const row = db.query('SELECT 1 AS n').get();
    expect(row.n).toBe(1);
    db.close();
  });

  // schema.sql defines two tables; both must exist immediately after open.
  test('creates the issues and meta tables', () => {
    const db = openDatabase(':memory:');
    const names = db
      .query("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((r) => r.name);
    expect(names).toContain('issues');
    expect(names).toContain('meta');
    db.close();
  });

  // foreign_keys is turned ON for every database (file and in-memory).
  test('enables the foreign_keys PRAGMA', () => {
    const db = openDatabase(':memory:');
    const { foreign_keys } = db.query('PRAGMA foreign_keys').get();
    expect(foreign_keys).toBe(1);
    db.close();
  });

  // A fresh DB starts with no issue rows.
  test('starts with an empty issues table', () => {
    const db = openDatabase(':memory:');
    const { count } = db.query('SELECT COUNT(*) AS count FROM issues').get();
    expect(count).toBe(0);
    db.close();
  });
});

// The issues table has several columns with defaults and constraints
describe('issues table schema', () => {
  test('applies column defaults when only ID and Title are given', () => {
    const db = openDatabase(':memory:');
    db.run('INSERT INTO issues (ID, Title) VALUES (?, ?)', [
      'manta-ab12',
      'Hello',
    ]);

    const row = db.query('SELECT * FROM issues WHERE ID = ?').get('manta-ab12');
    expect(row.Status).toBe('open'); // DEFAULT open
    expect(row.Priority).toBe(5); // DEFAULT 5
    expect(row.IssueType).toBe('task'); // DEFAULT task
    expect(row.CreatedBy).toBe('local-user'); // DEFAULT local-user
    expect(row.UpdatedBy).toBe('local-user');
    expect(row.CreatedAt).toBeTruthy();
    db.close();
  });

  // ID is the primary key, so a duplicate insert must fail.
  test('rejects a duplicate primary key', () => {
    const db = openDatabase(':memory:');
    db.run('INSERT INTO issues (ID, Title) VALUES (?, ?)', [
      'manta-dup1',
      'First',
    ]);
    expect(() =>
      db.run('INSERT INTO issues (ID, Title) VALUES (?, ?)', [
        'manta-dup1',
        'Second',
      ]),
    ).toThrow();
    db.close();
  });

  // check that issue with NULL is rejected
  test('rejects an issue with a NULL Title', () => {
    const db = openDatabase(':memory:');
    expect(() =>
      db.run('INSERT INTO issues (ID) VALUES (?)', ['manta-notitle']),
    ).toThrow();
    db.close();
  });
});

// Check if constraints is only open, in_progress, closed for Status, and Priority is non-negative, and IssueType is from the fixed set.
describe('CHECK constraints', () => {
  // Status is constrained to open, in_progress, closed at the DB level.
  test('rejects an out-of-range Status', () => {
    const db = openDatabase(':memory:');
    expect(() =>
      db.run('INSERT INTO issues (ID, Title, Status) VALUES (?, ?, ?)', [
        'manta-bads',
        'x',
        'done',
      ]),
    ).toThrow();
    db.close();
  });

  // Priority must be a non-negative integer
  test('rejects a negative Priority', () => {
    const db = openDatabase(':memory:');
    expect(() =>
      db.run('INSERT INTO issues (ID, Title, Priority) VALUES (?, ?, ?)', [
        'manta-badp',
        'x',
        -1,
      ]),
    ).toThrow();
    db.close();
  });

  // IssueType is constrained to a fixed set in the schema.
  test('rejects an unknown IssueType', () => {
    const db = openDatabase(':memory:');
    expect(() =>
      db.run('INSERT INTO issues (ID, Title, IssueType) VALUES (?, ?, ?)', [
        'manta-badt',
        'x',
        'epic',
      ]),
    ).toThrow();
    db.close();
  });

  // A row that satisfies every check should insert cleanly.
  test('accepts values that satisfy all CHECK constraints', () => {
    const db = openDatabase(':memory:');
    db.run(
      'INSERT INTO issues (ID, Title, Status, Priority, IssueType) VALUES (?, ?, ?, ?, ?)',
      ['manta-good', 'x', 'in_progress', 0, 'feature'],
    );
    const row = db
      .query('SELECT Status, Priority, IssueType FROM issues WHERE ID = ?')
      .get('manta-good');
    expect(row).toEqual({
      Status: 'in_progress',
      Priority: 0,
      IssueType: 'feature',
    });
    db.close();
  });
});

describe('meta table', () => {
  // meta is a simple key/value store with Key as the primary key.
  test('stores and reads back a key/value pair', () => {
    const db = openDatabase(':memory:');
    db.run('INSERT INTO meta (Key, Value) VALUES (?, ?)', [
      'checkpoint',
      'abc123',
    ]);
    const row = db
      .query('SELECT Value FROM meta WHERE Key = ?')
      .get('checkpoint');
    expect(row.Value).toBe('abc123');
    db.close();
  });

  test('rejects a duplicate meta Key', () => {
    const db = openDatabase(':memory:');
    db.run('INSERT INTO meta (Key, Value) VALUES (?, ?)', ['k', 'v1']);
    expect(() =>
      db.run('INSERT INTO meta (Key, Value) VALUES (?, ?)', ['k', 'v2']),
    ).toThrow();
    db.close();
  });
});

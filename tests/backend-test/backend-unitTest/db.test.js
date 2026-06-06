/**
 * Unit tests for the SQLite initialization layer (`src/storage/db.js`).
 *
 * The only function under test is openDatabase(), but it has several
 * responsibilities, so the tests are grouped into one describe()
 * block per responsibility:
 *   1. openDatabase()        — the database opens and is queryable
 *   2. issues table schema   — column defaults + primary-ke
 *   3. CHECK constraints     — Status / Priority / IssueType
 *   4. meta table            — the key/value store behaves as a key/value store
 *
 * Every test uses openDatabase(':memory:') so each one gets a fresh,
 * throwaway database that disappears when db.close() is called.
 */
import { test, expect, describe } from 'bun:test';
import { openDatabase } from '../../../src/storage/db.js';


/**
 * openDatabase(), check that the database opens and is queryable,
 * 1. First test just checks valid SQL can run on DB
 * 2. Second test checks that the schema.sql file is applied and creates the expected tables
 * 3. Third test checks that the foreign_keys PRAGMA is turned on for the returned DB
 * 4. Fourth test checks that a fresh DB starts with no issue rows
 */
describe('openDatabase()', () => {
  // The returned object should be a live DB we can run SQL against.
  test('returns a queryable Database for :memory:', () => {
    const db = openDatabase(':memory:');
    // .get() runs the query and returns the first row as an object.
    const row = db.query('SELECT 1 AS n').get();
    expect(row.n).toBe(1);
    db.close();
  });

  // schema.sql defines two tables, both must exist
  test('creates the issues and meta tables', () => {
    const db = openDatabase(':memory:');
    // sqlite_master is SQLite's built-in catalog of every table/index.
    // .all() returns all rows; .map() pulls out just the name column.
    const names = db
      .query("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((r) => r.name);
    expect(names).toContain('issues');
    expect(names).toContain('meta');
    db.close();
  });

  // make sure PRAGMA is turned on for every database
  test('enables the foreign_keys PRAGMA', () => {
    const db = openDatabase(':memory:');
    // Destructure the foreign_keys field 
    const { foreign_keys } = db.query('PRAGMA foreign_keys').get();
    expect(foreign_keys).toBe(1);
    db.close();
  });

  // A fresh DB starts with no issue rows
  test('starts with an empty issues table', () => {
    const db = openDatabase(':memory:');
    const { count } = db.query('SELECT COUNT(*) AS count FROM issues').get();
    expect(count).toBe(0);
    db.close();
  });
});

/**
 * Unit tests for issues table schema, column defaults and required fields
 * 1. First test checks that inserting a row with only ID and Title fills in all the defaults correctly
 * 2. Second test checks that inserting a row with a duplicate ID (primary key) throws an error
 * 3. Third test checks that inserting a row without a Title (NOT NULL) throws an error
 */
describe('issues table schema', () => {
  // Inserting only ID and Title should let the schema fill in every default.
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
    expect(row.UpdatedBy).toBe('local-user'); // DEFAULT local-user
    expect(row.CreatedAt).toBeTruthy(); // filled in by the schema, not null
    db.close();
  });

  // ID is the primary key, so a duplicate insert must fail.
  test('rejects a duplicate primary key', () => {
    const db = openDatabase(':memory:');
    db.run('INSERT INTO issues (ID, Title) VALUES (?, ?)', [
      'manta-dup1',
      'First',
    ]);
    // Wrap the second insert in a function so expect(...).toThrow() can run it
    // and catch the error, rather than the error blowing up the test
    expect(() =>
      db.run('INSERT INTO issues (ID, Title) VALUES (?, ?)', [
        'manta-dup1',
        'Second',
      ]),
    ).toThrow();
    db.close();
  });

  // Title is NOT NULL, so inserting a row without one must fail.
  test('rejects an issue with a NULL Title', () => {
    const db = openDatabase(':memory:');
    expect(() =>
      db.run('INSERT INTO issues (ID) VALUES (?)', ['manta-notitle']),
    ).toThrow();
    db.close();
  });
});

/**
 * Check constrints on Status, Priority, and IssueType. Status must be one of {open, in_progress, blocked, closed}, 
 * Priority must be non-negative, and IssueType must be from the fixed set. 
 * Each constraint is tested with a case that violates it (expecting an error) and a case that satisfies it (expecting success).
 * 1. First test checks that an out-of-range Status value is rejected
 * 2. Second test checks that a negative Priority value is rejected
 * 3. Third test checks that an unknown IssueType value is rejected
 * 4. Fourth test checks that a row that satisfies all CHECK constraints inserts successfully
 */
describe('CHECK constraints', () => {
  // Status is constrained to open, in_progress, closed at the DB level.
  test('rejects an out-of-range Status', () => {
    const db = openDatabase(':memory:');
    expect(() =>
      db.run('INSERT INTO issues (ID, Title, Status) VALUES (?, ?, ?)', [
        'manta-bads',
        'x',
        'done', // not an allowed Status value
      ]),
    ).toThrow();
    db.close();
  });

  // Priority must be a non-negative integer.
  test('rejects a negative Priority', () => {
    const db = openDatabase(':memory:');
    expect(() =>
      db.run('INSERT INTO issues (ID, Title, Priority) VALUES (?, ?, ?)', [
        'manta-badp',
        'x',
        -1, // below the allowed range
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
        'boom', // not an allowed IssueType value
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

/**
 * Meta table tests. Simple key/value store keyed by Key.
 * 1. First test checks that a key/value pair can be stored and read back correctly
 * 2. Second test checks that inserting a duplicate Key throws an error (primary key constraint)
 */

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

  // Key is the primary key, so the same Key cannot be inserted twice.
  test('rejects a duplicate meta Key', () => {
    const db = openDatabase(':memory:');
    db.run('INSERT INTO meta (Key, Value) VALUES (?, ?)', ['k', 'v1']);
    expect(() =>
      db.run('INSERT INTO meta (Key, Value) VALUES (?, ?)', ['k', 'v2']),
    ).toThrow();
    db.close();
  });
});

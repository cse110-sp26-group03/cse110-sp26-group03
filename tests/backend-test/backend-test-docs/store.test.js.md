# Overview of store.test.js

The store.test.js file unit tests the functionality of the storage layer (`src/storage/store.js`), which exports several functions. Because the module has multiple distinct exports, we divide the tests into one individual test suite per function as denoted by the Describe() function, which wraps the tests.

The SQLite-backed helpers (`issueExists`, `insertIssue`, `updateIssue`, `deleteIssue`) run against the real local `.manta` cache, so every test row uses a sentinel ID prefixed with `manta-test-`, and after its done it erase those rows so the developer's real cache stays clean. `appendToLog` takes a path override, so it is tested against a throwaway temp file instead.

## Variables

```
const TEST_PREFIX = 'manta-test-';
```

The `TEST_PREFIX` variable is the shared prefix on every test row's ID, which lets the cleanup hooks target only test data without hitting real rows.

```
const MISSING_ID = `${TEST_PREFIX}missing-xyz`;
```

The `MISSING_ID` variable is a sentinel issue ID used by the `applyEvent()` error-path tests, chosen so it will not collide with any real row in the local cache.

## Helper Functions

```
function makeCreateEvent(id, overrides = {}) {
    ...
}
```

`makeCreateEvent()` builds a complete `issue.created` event with a fully populated `event.issue` body. Tests pass an ID and optionally override individual issue fields.

```
beforeEach(() => {
  db.prepare(`DELETE FROM issues WHERE ID LIKE '${TEST_PREFIX}%'`).run();
});
```

`beforeEach()` removes any leftover test rows before each test so every test starts from a clean slate.

```
afterAll(() => {
  db.prepare(`DELETE FROM issues WHERE ID LIKE '${TEST_PREFIX}%'`).run();
});
```

`afterAll()` performs a final cleanup of all test rows after the suite finishes so the real cache is left untouched.

## applyEvent() Tests

This test suite has three tests in this order:

1. Checks that an unrecognized event type throws a structured error with a `null` issueId.
2. Checks that an `issue.updated` for a missing issue throws and carries the issueId in the message, `.issueId`, and `.reason` fields.
3. Checks that an `issue.deleted` for a missing issue throws the same way.

## appendToLog() Tests

This test suite has its own `beforeEach`/`afterEach` hooks that create and remove a unique temp directory per test, and three tests in this order:

1. Checks that the event is written as a single JSON line ending in a newline.
2. Checks that the return value is the exact line string that was written.
3. Checks that a second call appends and that a missing parent directory is created.

## issueExists() Tests

This test suite has three tests in this order:

1. Checks that it returns `false` when no issue with that ID exists.
2. Checks that it returns `true` once a row with that ID is inserted.
3. Checks that it returns `false` again after that row is deleted.

## insertIssue() Tests

This test suite has three tests in this order:

1. Checks that the inserted row is then found by `issueExists()`.
2. Checks that the field values from `event.issue` are stored in the matching columns.
3. Checks that inserting a duplicate ID throws a UNIQUE constraint error.

## updateIssue() Tests

This test suite has three tests in this order:

1. Checks that only the named field changes and other columns are left untouched.
2. Checks that a camelCase change key maps to its PascalCase column.
3. Checks that an empty `changes` object doesn't throw or change

## deleteIssue() Tests

This test suite has three tests in this order:

1. Checks that the targeted row is removed.
2. Checks that deleting a non-existent ID doesn't throw
3. Checks that only the targeted ID is removed, leaving other rows intact.

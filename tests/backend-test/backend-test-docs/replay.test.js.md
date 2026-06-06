# Overview of fetch.test.js

The replay.test.js file unit tests the functionality of the Public API syncFromLog() function, which, holistically, brings the local SQLite in sync with the local JSONL log by comparing hashes. Because replay.js is a larger function with significant responsibilities and is important in the event of data loss, we divide all of the tests into four individual test suites as denoted by the Describe() function, which wraps the tests and houses them in a test suite and allows for better organization of several tests into certain test categories.

## Variables

```
const CHECKPOINT_KEY = 'jsonl_checkpoint';
```

The `CHECKPOINT_KEY` variable is a key that stores the rolling-hash checkpoint, which makes it easier to query and get data from the database.

```
const tempLogs = []
```

The `tempLogs` array keeps track of the logs that were created during the test suites to remember what to delete in `AfterAll()`.

## Helper Functions

```
function tempLogPath() {
  const path = join(
    tmpdir(),
    `manta-replay-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`,
  );
  tempLogs.push(path);
  return path;
}
```

`tempLogPath()` creates a unique temporary JSONL log path to which the tests write to when needed. Will be remembered and removed in AfterAll().

```
function createdLine(id, overrides = {}) {
    ...
}
```

`createdLine()` builds a JSONL line for an `issue.created` event with its fields filled out.

```
function updatedLine(id, changes) {
  return JSON.stringify({ type: 'issue.updated', issueId: id, changes }) + '\n';
}
```

`updatedLine()`, very similarly to `createdLine()`, builds a JSONL line with its fields filled out but for the `issue.updated` event.

```
function deletedLine(id) {
  return JSON.stringify({ type: 'issue.deleted', issueId: id }) + '\n';
}
```

`deletedLine()` builds a JSONL line for an `issue.deleted` event with its fields filled out.

```
function issueCount() {
  return db.prepare('SELECT COUNT(*) AS c FROM issues').get().c;
}
```

`issueCount()` counts the number of rows in the issues table.

```
function storedCheckpoint() {
  const row = db
    .prepare('SELECT Value FROM meta WHERE Key = ?')
    .get(CHECKPOINT_KEY);
  return row ? row.Value : null;
}
```

`storedCheckpoint()` retrieves the stored checkpoint hash, or null if none is set.

```
beforeEach(() => {
  // The issues and meta tables are shared singleton state; start each test
  // from a clean cache with no checkpoint so replays are deterministic.
  db.prepare('DELETE FROM issues').run();
  db.prepare('DELETE FROM meta WHERE Key = ?').run(CHECKPOINT_KEY);
});
```

`BeforeEach()` clears any issues in the JSONL log and any hashed checkpoint before the tests are run to ensure a clean and empty testing environment.

```
afterAll(() => {
  for (const path of tempLogs) {
    if (existsSync(path)) rmSync(path);
  }
});
```

`AfterAll()` removes any syncs that happens in the tests and removes any changes to the temporary log path.

## syncFromLog: the basic replay decision

This test suite has five tests in this order:

1. Checks that replay is skipped when there it creates a path that has not been created before
2. Checks that a log with no checkpoint is replayed in full
3. Checks that replay is skipped when the log is unchanged
4.

## List Mode Tests

This test suite has eleven tests in this order:

1. Checks if list mode returns an array, even before any filtering happens.
2. Checks if, normally, the closed issues are hidden from view
3. Checks if the --all flag shows all issues, including closed ones
4. Checks if filtering by the closed status will return closed issues
5. Checks if filtering by an arbitrary issue type will return the correct issues
6. Checks if filtering by a priority will return issues of that priority
7. Checks if the createdBy maps onto the createdBy column
8. Checks if filtering by an item that multiple issues have (i.e. two issues with the same createdBy name) will return those issues
9. Checks if the fetched issues are sorted by their priorities in ascending order
10. Checks if closed issues are put at the bottom of the list regardless of their priority
11. Checks if nothing is returned when nothing matches the filter

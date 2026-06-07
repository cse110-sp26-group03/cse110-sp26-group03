### Overview of Backend Tests

Unit tests for the backend live in `tests/backend-test/backend-unitTest/` and
run with `bun test`. Each test file targets one backend file

#### Shared structure

All of the test files follow the same layout so they read consistently:

- A file-level JSDoc header naming the module under test and listing the
  `describe()` blocks it contains.
- One `describe()` block per function, and with
  a numbered JSDoc block that summarizes itself and its test
  ("1. First test checks…", "2. Second test checks…").
- Inline `//` comments above individual tests and on any non obvious syntax

---

#### `db.test.js` — SQLite initialization (`src/storage/db.js`)

Tests `openDatabase()` and the schema it applies. Grouped by responsibility:

- **`openDatabase()`** — opens a queryable in-memory DB, creates the `issues`
  and `meta` tables, enables the `foreign_keys` PRAGMA, and starts with an
  empty `issues` table.
- **`issues table schema`** — applies column defaults, rejects a duplicate
  primary key, and rejects a NULL `Title`.
- **`CHECK constraints`** — rejects out-of-range `Status`, negative `Priority`,
  and unknown `IssueType`; accepts a row that satisfies every constraint.
- **`meta table`** — stores/reads a key/value pair and rejects a duplicate key.

Every test uses `openDatabase(':memory:')` so each gets a fresh, throwaway DB.

---

#### `store.test.js` — storage layer (`src/storage/store.js`)

One `describe()` per exported function, three tests each:

- **`applyEvent()`** — error paths, unrecognized type, and update/delete on a
  missing issue
- **`appendToLog()`** — writes one JSON line per event, returns the exact line,
  and appends + creates a missing parent directory.
- **`issueExists()`** — false when absent, true after insert, false after delete.
- **`insertIssue()`** — row becomes findable, stores `event.issue` values, and
  throws a UNIQUE error on a duplicate ID.
- **`updateIssue()`** — updates only the named field, maps camelCase keys to
  PascalCase columns, and is a no-op on empty `changes`.
- **`deleteIssue()`** — removes the target, no operations on a missing ID, and leaves
  other rows fine

The SQLite-backed helpers run against the real `.manta` cache singleton, so
they use sentinel `manta-test-` IDs with `beforeEach`/`afterAll` hooks that
clean, so cache is not affected

---

#### `validation.test.js` — validation layer (`src/validation/validation.js`)

`validate()` is the only exported function, One `describe()` per validate and helper function

- **`validate()`** — check logic, passes a valid create, skips commands with
  no validation rules, and reports the first failing flag in command order.
- **`check_id()`** — will update more after checking migrate, accepts an omitted id.
- **`check_title()` / `check_desc()`** — accept the length boundary (50 / 512),
  reject one over, accept empty.
- **`check_priority()` / `check_status()`** — accept valid values, reject
  invalid ones, enforce required values
- **`check_type()`** — accepts each allowed type, rejects unknown, allows omitted.
- **`check_assignee()`** — accepts alphabetic, rejects digits and symbols.
- **`check_createdBy()`** — accepts a valid username on view, rejects illegal
  characters on view, and is ignored for non-view commands.
- **`check_path()`** — accepts a non-empty path, rejects whitespace, and
  accepts an omitted path

---

#### `fetch.test.js` — read layer (`src/storage/fetch.js`)

Tests the public `FETCH()` function, which has two modes driven by the parse
object's flags. Grouped into four `describe()` blocks:

- **`FETCH detail mode`** — a known `flags.id` returns a single issue, a missing
  ID throws a wrapped `Query failed` error, and `flags.id` wins over any list
  filters on the same parse object.
- **`FETCH list mode`** — always returns an array; excludes closed issues by
  default, honors the `--all` override, filters by status/type/priority/
  createdBy/assignee with AND, sorts non-closed rows by ascending priority,
  pushes closed rows to the bottom, and returns `[]` when nothing matches.
- **`FETCH list mode: additional filters`** — extra coverage combining multiple
  columns, non-closed status filters, and `--all` with a type filter.
- **`FETCH detail mode: error chaining`** — the not-found error is wrapped and
  preserves the original as `.cause`.

Every test row uses `fetch-test-suite` and `manta-ftest-` IDs so the suite only ever
touches testing and not any real data.

---

#### `replay.test.js` — replay layer (`src/storage/replay.js`)

Tests `syncFromLog()` rebuilds the cache from the JSONL log when the hash
differs from the checkpoint)and `recordAppend()` rolls the checkpoint hash
forward by one appended line. Grouped into six `describe()` blocks:

- **`syncFromLog()`** — the basic replay decision, empties the cache for a
  missing log, replays a new log in full, skips when unchanged, re-replays
  after content changes, and clears the cache for an empty log.
- **`syncFromLog() event application`** — applies create/update/delete in order
  and ignores blank lines.
- **`syncFromLog() error handling`** — throws on invalid JSON and unknown event
  types, and rolls the whole replay back when an event fails.
- **`recordAppend()`** — sets a checkpoint with no prior sync, rolls the hash
  forward so the next sync is skipped, and
  force a replay when the recorded line is wrong.
- **`syncFromLog() external rewrites (ADR-007)`** — reflects a line removed from
  the log and parses CRLF line endings.
- **`syncFromLog() orphan and no-op events`** — tolerates updates/deletes for
  missing issues and leaves a row untouched on an empty update.

Both functions accept a `logPath` override, so tests use throwaway files under
the OS temp directory and never touch the real `.manta/manta.jsonl`. 

---

# Overview of cli.test.js

`cli.test.js` is the end-to-end test suite for the Manta CLI (`mt`). 


## Isolation

Every test runs the CLI with its working directory set to a fresh temporary
directory created under the OS temp folder. Because `store.js` and `db.js`
resolve the `.manta/` directory relative to the current working directory, each
test gets its own throwaway JSONL log and SQLite cache. The developer's real
`.manta/` is never touched. The temp directory is removed in `afterEach`.


## Helper Functions

```
function runMt(cwd, args) { ... }
```

`runMt()` runs the CLI once and returns `{ stdout, stderr, code }`. It uses
`Bun.spawnSync` with `process.execPath`. This creates a child like process that gives
us information that we can check when its done. CWD is the directory its ran, and args is
specified arguments passed in.

```
function createIssue(cwd, extraArgs = []) { ... }
```

`createIssue()` runs `mt create`, asserts it succeeded, and parses the generated
issue ID out of the `Created issue manta-xxxx: ...` line. Most tests need an
existing issue to act on, so this keeps their setup to a single line.

```
beforeEach(() => { ... });   // make a temp dir, then run `mt init`
afterEach(() => { ... });    // delete the temp dir
```

`beforeEach()` creates the isolated temp directory and runs `mt init` in it so
every test starts from a freshly initialized Manta repo. `afterEach()` deletes
the directory so no state leaks between tests.

## Journey Covered

The suite walks one issue through its entire lifecycle, grouped into `describe()`
blocks:

### `mt init`

1. Checks that `init` creates the `.manta/` directory and appends the
   `.manta/manta.jsonl merge=union` rule to `.gitattributes`.
2. Checks that running `init` again is safe and that reports the repo is
   already initialized.

### `mt create + view`

1. Checks that `create` prints a generated ID and that the detail view of that
   ID echoes back the title, priority, and assignee it was created with.
2. Checks that the new issue appears in the `view --all` list
3. Checks that creating without a required title fails with exit code `1` and an
   error on stderr.

### `mt update`

1. Checks that an updated field is persisted and shows up on the
   next `view`.
2. Checks that updating a non-existent issue ID fails with
   `no issue with that ID exists` and a nonzero exit code.

### `mt close + delete`

1. Checks that `close` reports success and that the detail view then shows a
   `closed` status.
2. Checks that `delete` removes the issue, so a later `view` of the same ID
   fails with exit code `1`.

### `persistence and replay`

These two test the storage ADRs directly, where the JSONL log is the 
source of truth, and the SQLite cache is a something that is rebuilt from the
log by replay.

1. Checks that each write command appends the expected event type to
   `.manta/manta.jsonl`, in order — `issue.created`, then `issue.updated`, then
   another `issue.updated` for `close` — all referring to the same issue ID.
2. Checks that deleting the SQLite cache files and re-running a command rebuilds the cache from the log alone, so
   the issue is still viewable with all its data intact. This simulates a fresh
   `git clone`, where the `.db` is gitignored and only the log is present.

## Running

```
bun test tests/e2e-test/
```

or, as part of the whole suite:

```
bun test tests/
```

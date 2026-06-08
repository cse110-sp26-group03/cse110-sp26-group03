# Overview of init.test.js

The init.test.js file unit tests the functionality of the CLI init command (`src/cli/init.js`). `init()` is the only exported function. It creates the `.manta/` directory, writes the `merge=union` rule to `.gitattributes`, and prints setup reminders. Parser coverage for `mt init` lives in parser.test.js.

Because `init()` has several distinct responsibilities (first-run bootstrap, `.gitattributes` handling, idempotency, and edge cases around partial initialization), we divide the tests into five individual test suites as denoted by the `describe()` function, which wraps the tests.

Every test runs in an isolated temp directory created in `beforeEach` and removed in `afterEach`, so `init()` never touches the real repository on disk.

## Variables

```
const MANTA_DIR = '.manta';
const GITATTRIBUTES_PATH = '.gitattributes';
const GITATTRIBUTES_LINE = '.manta/manta.jsonl merge=union';
const MANTA_LOG_PATH = join(MANTA_DIR, 'manta.jsonl');
const MANTA_DB_PATH = join(MANTA_DIR, 'manta.db');
```

`MANTA_DIR` is the directory Manta creates on first init.

`GITATTRIBUTES_PATH` is the Git attributes file written or updated by init.

`GITATTRIBUTES_LINE` is the exact merge rule init adds for the JSONL log. This string is also how init decides whether the repo is already initialized — not by checking whether `.manta/` exists.

`MANTA_LOG_PATH` and `MANTA_DB_PATH` are storage files created later by write commands and the SQLite layer, not by init itself.

```
let workDir;
let savedCwd;
```

`workDir` is the temp directory for the current test. `savedCwd` stores the original working directory so `afterEach` can restore it.

## Helper Functions

```
function captureConsoleLog(fn) {
  ...
}
```

`captureConsoleLog()` runs a callback while intercepting every `console.log` line. It restores the real `console.log` afterward so later tests are unaffected, and returns the captured lines in call order.

```
beforeEach(() => {
  savedCwd = process.cwd();
  workDir = mkdtempSync(join(tmpdir(), 'manta-init-'));
  process.chdir(workDir);
});
```

`beforeEach()` creates a fresh temp directory and changes into it before each test so init runs against an empty filesystem.

```
afterEach(() => {
  process.chdir(savedCwd);
  rmSync(workDir, { recursive: true, force: true });
});
```

`afterEach()` restores the original working directory and deletes the temp directory.

## init() — first run Tests

This test suite has three tests in this order:

1. Checks that `.manta/` does not exist before init and is created afterward.
2. Checks that a missing `.gitattributes` file is written with only the merge rule and a trailing newline.
3. Checks that init prints the initialization message and the `git config pull.rebase false` reminder.

## init() — gitattributes Tests

This test suite has eight tests in this order:

1. Checks that init appends the merge rule to an existing `.gitattributes` file without clobbering prior content.
2. Checks that a newline is inserted before the rule when the file lacks a trailing newline.
3. Checks that the merge rule is not duplicated when it is already present on its own line.
4. Checks that an empty `.gitattributes` file receives only the merge rule.
5. Checks that the rule is appended after trailing blank lines in the file.
6. Checks that a whitespace variant of the rule is not treated as a duplicate — init appends the canonical line.
7. Checks that the rule is not duplicated when it appears among other attribute lines.
8. Checks that a commented line containing the same text does not count as initialized — init still appends the real rule.

## init() — already init Tests

This test suite has its own `beforeEach` that writes the merge rule into `.gitattributes`, and three tests in this order:

1. Checks that init prints the already-initialized message and skips first-run output.
2. Checks that an existing `.gitattributes` file with other content plus the merge rule is left unchanged.
3. Checks that `.manta/` is not created when only the merge rule is present (init returns early).

## init() — idempotency & scope Tests

This test suite has three tests in this order:

1. Checks that a second `init()` call reports already initialized while leaving `.manta/` and `.gitattributes` intact.
2. Checks that `manta.jsonl` and `manta.db` are not created on first run — init only bootstraps the directory and Git attributes.
3. Checks that pre-existing files inside `.manta/` are left unchanged when init adds the missing merge rule.

## init() — partial & edges Tests

This test suite has two tests in this order:

1. Checks that init appends the merge rule when `.manta/` already exists but the rule is missing (e.g. from storage imports before the user runs `mt init`).
2. Checks that init throws when `.manta` exists as a file instead of a directory, and does not create `.gitattributes`.

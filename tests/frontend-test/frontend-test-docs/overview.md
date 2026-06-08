### Overview of Frontend Unit Tests

Unit tests for the frontend / CLI layer live in
`tests/frontend-test/frontend-unitTest/` and run with `bun test`. Each test file
targets one frontend file.

#### Shared structure

All of the test files follow the same layout so they read consistently:

- A file-level JSDoc header naming the module under test and listing the
  `describe()` blocks it contains.
- One `describe()` block per function or responsibility, with a numbered JSDoc
  block that summarizes itself and its tests ("1. First test checks…",
  "2. Second test checks…").
- Inline `//` comments above individual tests and on any non-obvious syntax.

---

#### `index.test.js` — CLI entry / command router (`src/cli/index.js`)

`index.js` is the orchestrator that wires the pipeline together
(`parse → validate → early-exit commands → syncFromLog → create_event →
applyEvent → print`) and decides which commands exit early. These tests target
that routing and error-handling logic, not the individual stages (parser,
validation, store, and replay each have their own suites, and `cli.test.js`
covers the full create/update/close/delete lifecycle end-to-end).

Grouped into six `describe()` blocks:

- **`parse + validate gate`** — bad input exits `1` before any work happens,
  no command, an unknown command, and a structurally-valid command whose flag
  value that is bad, fails.
- **`mt help`** — checks it prints the general help overview and exits `0`.
- **`mt version`** — checks that it prints the version straight
  from `package.json` (asserted against the real value) and exits `0`.
- **`mt sync`** — reports "already up to date" on a fresh repo, and rebuilds the
  cache from the log after the SQLite cache is deleted.
- **`mt delete gate`** — `index.js`'s own `issueExists` guard rejects an unknown
  ID with a clear message and exit `1`, and a real delete proceeds without
  prompting.
- **`read-only commands do not write to the log`** — `version` exits before the
  write stages, so it never creates or appends to `.manta/manta.jsonl`.

---

#### `init.test.js` — `mt init` (`src/cli/init.js`)

_Placeholder — real tests to be added._

#### `parser.test.js` — argv parser (`src/cli/parser.js`)

_Placeholder — real tests to be added._

#### `event.test.js` — event builder (`src/cli/event.js`)

_Placeholder — real tests to be added._

#### `display.test.js` — output rendering (`src/cli/display.js`)

_Placeholder — real tests to be added._

---

#### Running

```
bun test tests/frontend-test/
```

or, as part of the whole suite:

```
bun test tests/
```

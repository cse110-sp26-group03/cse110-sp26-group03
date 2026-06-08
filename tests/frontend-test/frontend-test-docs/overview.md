### Overview of Frontend Unit Tests

Unit tests for the frontend CLI layer live in `tests/frontend-test/frontend-unitTest/` and
run with `bun test`. Each test file targets one frontend module.

#### Shared structure

All of the test files follow the same layout so they read consistently:

- A file-level JSDoc header naming the module under test and listing the
  `describe()` blocks it contains.
- One `describe()` block per scenario, with a numbered JSDoc block that
  summarizes itself and its tests ("1. First test checks…", "2. Second test
  checks…").
- Inline `//` comments above individual tests and on any non-obvious syntax

Per-file detail docs live in `tests/frontend-test/frontend-test-docs/` alongside
this overview (e.g. `init.test.js.md` for `init.test.js`).

---

#### `init.test.js` — CLI init command (`src/cli/init.js`)

Tests `init()`, the only exported function. It bootstraps Manta in the current
directory by creating `.manta/`, writing the `merge=union` rule to
`.gitattributes`, and printing a one-time git config reminder. Parser coverage
for `mt init` lives in `parser.test.js`. Grouped into five `describe()` blocks:

- **`init() — first run`** — creates `.manta/`, writes `.gitattributes` when
  missing, and prints the initialization messages.
- **`init() — gitattributes`** — appends the merge rule without clobbering
  existing content, handles missing trailing newlines, avoids duplicates, and
  treats commented lines as non-matching.
- **`init() — already init`** — exits early when the canonical merge rule is
  already in `.gitattributes`; does not create `.manta/` or re-print setup
  output.
- **`init() — idempotency & scope`** — second run reports already initialized;
  does not create `manta.jsonl` or `manta.db`; leaves pre-existing `.manta/`
  files untouched.
- **`init() — partial & edges`** — adds the merge rule when `.manta/` exists
  but the rule is missing; throws when `.manta` is a file instead of a
  directory.

Each test runs in an isolated temp directory via `beforeEach`/`afterEach`, so
init never touches the real repo. See `init.test.js.md` for variables, helpers,
and a per-suite test list.

---

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

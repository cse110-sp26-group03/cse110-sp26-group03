# ADR-001: CLI Parser: In-House Parser (JavaScript)

## Status
Proposed | **Accepted** | Deprecated

**Date:** 2026-05-16
**Authors:** Scottin Pham

---

## Context

`manta` (binary: `mt`) is a CLI tool. The frontend needs to take a command from the terminal (e.g. `mt create "fix nav bug"`, `mt view`, `mt close <id>`), send it to the right handler, and print the result.

Backend ADR-002 commits us to Bun, so JS runs natively. We're writing the frontend in plain JavaScript to keep onboarding simple.


### Considered Options

1. **Ike's custom parser.** Already written. Zero dependencies. Owner is on the team, so changes are quick.
2. **Commander.js.** Standard Node.js CLI library. Auto `--help`. Would replace working code with a dependency.

## Decision

We adopt Option 1: Ike's custom parser, in plain JS.

- Parser handles argv splitting, flag resolution (including shorthands), and surface-level checks (empty input, unknown command, duplicate/missing flags).
- Deeper command-specific validation (required fields, enum values, formats) is handled by `src/validation/validation.js`; see ADR-002.
- The pipeline in `index.js` is: **parse → validate → create_event → applyEvent → print**. Each stage throws on failure; `index.js` catches and exits 1 with the error message.

### Actual Layout

```
src/
├── cli/
│   ├── index.js           entry point: runs the parse→validate→create_event→applyEvent→print pipeline
│   ├── parser.js          Ike's parser: argv → { cmd, flags }
│   └── event.js           builds typed event objects (issue.created / issue.updated / issue.deleted) from { cmd, flags }
├── storage/
│   ├── schema.sql
│   ├── db.js
│   └── store.js           applyEvent: writes events to SQLite and JSON stores
└── validation/
    └── validation.js      stage-2 validation: required fields, enum checks, ID format, etc.
```

Valid commands: `create`, `update`, `close`, `delete`.

No new dependencies.

---

## Consequences

### Positive

- No external dependencies for the CLI.
- Parser lives in the repo, so we can change it whenever we need to.
- Clear split: parser handles generic argv parsing, validation handles command-specific rules, event.js builds the storage payload.
- Throw-on-failure pattern makes each stage independently testable.

### Negative

- We own any parser bugs 
- No type checking on inputs since we're in plain JS. ADR-002's validation layer covers this.

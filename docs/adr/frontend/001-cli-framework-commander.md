# ADR-001: CLI Parser: In-House Parser (JavaScript)

## Status
**Proposed** | Accepted | Deprecated

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

- Parser handles argv splitting, command routing, and basic checks (empty input, unknown command).
- Each command function does its own checks (e.g. `mt close` needs an id, `mt view` doesn't); see ADR-002.
- Command functions return `{ ok, message }`. The parser prints the message and exits 0 or 1 accordingly.

### Proposed Layout (pending Ike's parser doc)

Names and paths below are a starting suggestion

```
frontend/src/cli/
├── parser.js          Ike's parser
├── index.js           entry point: calls the parser, dispatches, prints the result
├── usage.js           help text
└── commands/
    ├── create.js      one file per command
    ├── view.js
    ├── close.js
    ├── edit.js
    └── list.js
```

No new dependencies.

---

## Consequences

### Positive

- No external dependencies for the CLI.
- Parser lives in the repo, so we can change it whenever we need to.
- Clear split: parser handles the generic stuff, each command handles its own rules.
- `{ ok, message }` return type makes commands easy to test.

### Negative

- We own any parser bugs 
- No type checking on inputs since we're in plain JS. ADR-002's per-command checks cover this.

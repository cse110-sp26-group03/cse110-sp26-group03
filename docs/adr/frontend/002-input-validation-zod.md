# ADR-002: Input Validation: In-House Helpers

## Status
**Proposed** | Accepted | Deprecated

**Date:** 2026-05-16
**Authors:** Scottin Pham

---

## Context

Every command takes strings from the terminal and turns them into something the storage layer can use. Before any of that happens, we need to make sure the input makes sense.

Two kinds of checks need to happen at different points:

1. **Generic checks** that apply to every command: did the user type anything? Is the command name real? These belong in Ike's parser (ADR-001).
2. **Command-specific checks**: `mt close` needs an id, `mt create` needs a non-empty title and a valid priority. These belong in each command function.


### Considered Options

1. **Small in-house helpers.** A `validate.js` file with a few short functions. Each command calls the ones it needs. No dependencies.
2. **Zod.** TypeScript-first schema validation library

## Decision

We adopt Option 1: small helpers in `validate.js`.

- `validate.js` holds the shared check functions (required fields, enum values, string length, id format, etc.).
- The parser handles stage 1 (empty input, unknown command). Each command handles stage 2 (its own rules).
- A failed check returns `{ ok: false, message }`, using the same shape from ADR-001.

No new dependencies.

### Proposed Layout (pending team review)

Names and paths below are a starting suggestion, not a team decision.

```
frontend/src/validation/
└── validate.js        helpers used by command functions
```

---

## Consequences

### Positive

- Zero dependencies.
- Error messages bubble up to the user through the same `{ ok, message }` channel everything else uses.

### Negative

- We write the validation logic ourselves instead of getting it from a library.


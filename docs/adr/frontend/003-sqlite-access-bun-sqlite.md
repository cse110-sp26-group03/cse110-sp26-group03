# ADR-003: Storage Layer: `store.js`

## Status
Proposed | **Accepted** | Deprecated

**Date:** 2026-05-16
**Authors:** Scottin Pham

---

## Context

Backend ADR-001 makes JSONL the source of truth. SQLite is a local cache built by replaying the JSONL log. Backend ADR-002 commits us to Bun, which ships `bun:sqlite` as a built-in.

The storage layer needs to:

1. Own the SQLite connection in one place.
2. On every write, append to JSONL **and** update SQLite so the two stay in sync.
3. Stay out of the CLI's way: commands just call functions like `createIssue(...)` / `closeIssue(...)`.


### Considered Options

1. **`bun:sqlite` directly.** Built into Bun. Synchronous. No install.
2. **`better-sqlite3`.** What Beads uses. Same model as `bun:sqlite`. Adds a native dep we don't need.

## Decision

We adopt Option 1: `bun:sqlite` directly, with `store.js` as the only module that writes to SQLite or `.manta/issues.jsonl`. Connection management lives in `db.js`. Replay lives in `replay.js`.

- Every mutating command flows through `store.js`.
- Write order inside `store.js`: append the JSONL line first, then update SQLite
- `schema.sql` includes a small metadata row holding the JSONL offset already applied. `replay.js` reads it, applies only the new lines, then advances it.

Pipeline for any mutating command:

```
validate.js  >  events.js  >  store.js
```

### Files 

- `db.js`: opens .manta/manta.db, runs schema.sql (Tian)
- `store.js`: writes to JSONL and SQLite
- `schema.sql`: table definitions plus the replay-watermark row
- `replay.js`: reads the watermark, applies new JSONL lines
- `events.js`: builds event objects before they hit `store.js`
- `validate.js`: input checks (see ADR-002)

### Proposed Layout
The full directory layout, file paths, and the extra modules below are a starting suggestion

```
src/
├── storage/        
│   ├── db.js           opens .manta/manta.db
│   ├── schema.sql      table definitions
│   ├── store.js        writes to JSONL and SQLite
│   ├── repo.js         read-only helpers for `mt view` / `mt list`
│   └── replay.js       applies new JSONL lines
├── events/
│   └── events.js       builds event objects (pure functions)
└── validation/
    └── validate.js     input checks (see ADR-002)
```

---

## Consequences

### Positive

- Zero new dependencies.
- If the schema changes, we can rebuild from JSONL.

### Negative

- Locked into Bun for SQLite


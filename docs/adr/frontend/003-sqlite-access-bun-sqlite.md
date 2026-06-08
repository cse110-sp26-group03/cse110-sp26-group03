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

We adopt Option 1: `bun:sqlite` directly, with `store.js` as the only module that writes to SQLite or `.manta/manta.jsonl`. Connection management lives in `db.js`. Replay lives in `replay.js`.

- Every mutating command flows through `store.js`.
- Write order inside `store.js` (per ADR-006): create events write to **SQLite first** (to validate the generated ID), then JSONL; update and delete events append to **JSONL first** (durability before visibility), then SQLite.
- `schema.sql` includes a `meta` table holding a **checkpoint hash** of the JSONL log. On each run `replay.js` re-hashes the log; if the hash differs from the stored checkpoint it wipes the `issues` table and replays the whole log, then stores the new hash. See ADR-007 (this replaced the earlier "JSONL offset / apply only new lines" plan).

Pipeline for any mutating command:

```
validate.js  >  events.js  >  store.js
```

### Files 

- `db.js`: opens .manta/manta.db, runs schema.sql (Tian)
- `store.js`: writes to JSONL and SQLite
- `schema.sql`: table definitions plus the `meta` table holding the checkpoint hash
- `replay.js`: `syncFromLog` — rebuilds SQLite from the JSONL log when the checkpoint hash changes
- `cli/event.js`: builds event objects before they hit `store.js`
- `validation/validation.js`: input checks (see ADR-002)

### Proposed Layout
The full directory layout, file paths, and the extra modules below are a starting suggestion

```
src/
├── storage/        
│   ├── db.js           opens .manta/manta.db
│   ├── schema.sql      table definitions
│   ├── store.js        writes to JSONL and SQLite
│   ├── fetch.js        read-only queries for `mt view` (list + detail)
│   └── replay.js       syncs SQLite from JSONL (`syncFromLog`)
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


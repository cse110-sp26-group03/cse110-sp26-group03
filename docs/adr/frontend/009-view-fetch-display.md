# ADR-009: `mt view` — Fetch and Display

## Status
**Accepted** | Proposed | Deprecated

**Date:** 2026-05-27  
**Authors:** Ike Okoye  

---

## Context

`mt view` reads issues from the database and prints them. It works in two ways,
depending on what the parser gives it:

- **List** — `mt view` with no ID. Returns every issue, with optional filters.
  By default it hides closed issues (same as the old `list` command).
- **View** — `mt view <id>`. Returns the one issue with that ID, or errors if
  there isn't one.

The read path is three modules plus CLI wiring:

- `src/storage/fetch.js` — read-only SQLite queries; returns plain row objects.
- `src/cli/display.js` — formats rows for the terminal (list table or detail).
- `src/cli/index.js` — runs parse → validate → FETCH → DISPLAY, then exits.

JSONL remains the source of truth ([[001-storage-layer]]). Write commands call
`syncFromLog()` from `replay.js` before mutating ([[007-jsonl-checkpoints]]).
**`mt view` does not call `syncFromLog`** — it reads whatever is already in the
SQLite cache. After a `git pull` that changes `.manta/manta.jsonl`, the cache
refreshes on the next write command; until then, `mt view` may show stale data.

The steps for `view` are: `argv → parse → validate → FETCH → DISPLAY`. This
skips `event.js`, `replay.js`, and `store.js` — `view` never appends to the log
(see [[004-event-issue-object]] for the write path).

### What the parser already handles

These happen in `parser.js` before `FETCH` runs:

- **Short IDs.** A bare suffix gets `manta-` added in front, so `mt view h3kp`
  and `mt view manta-h3kp` are the same.
- **Filters.** `view` accepts `status`, `priority`, `type`, `assignee`, and
  `createdBy`. You can combine several at once.
- **`--createdBy` (short: `--cb`)** only works with `view`; the parser blocks it
  on other commands.
- **`--all`** is a `view`-only flag with no value. It includes closed issues in
  the list.
- `view` does not allow filtering by `--title` or `--desc`.

---

## Decision

### `FETCH(parse_obj)` — what the data looks like

`FETCH` takes the parse object and returns one of two shapes:

| Case | Input | Returns |
|---|---|---|
| View | `flags.id` is set | **one issue object** |
| List | no `flags.id` | **an array of issue objects**, sorted by priority |
| Missing ID | `flags.id` not found | **throws** an `Error` |

A single lookup returns the object by itself, **not** an array with one item in
it. Keeping the two shapes different is what lets `DISPLAY` pick a formatter.

**The object shape (from SQLite, PascalCase keys):**

```js
{
  ID: "manta-9fz0",
  Title: "My issue",
  Description: "",
  Status: "open",
  Priority: "p5",
  IssueType: "task",
  Assignee: null,
  CreatedAt: "2026-05-21T02:56:04.612Z",
  CreatedBy: "ikey",
  UpdatedAt: "2026-05-21T02:56:04.612Z",
  UpdatedBy: "ikey",
}
```

These keys come straight from the `issues` table columns, so they're PascalCase
here even though the event schema in [[004-event-issue-object]] uses camelCase.
`DISPLAY` reads whatever `FETCH` returns. `Assignee` can be `null`.

**Filtering.** `FETCH` builds the `WHERE` clause from a fixed list that maps
each filter (`status`, `priority`, `type`, `assignee`, `createdBy`) to its
column. Only those known filters reach SQL, and every value is passed as a `?`
parameter. If neither `--all` nor `--status` is given, it adds `status != 'closed'`.
Results come back ordered by priority.

`fetch.js` opens the database **read-only**, so `view` cannot change data through
this path.

### `DISPLAY(parse_obj, result)` — the formatting layer

`DISPLAY` in `display.js` consumes whatever `FETCH` returned:

```js
if (Array.isArray(result)) await display_list(result);
else                       await display_issue(result);
```

- **`display_list(issues)`** — paginated table (5 rows per page). Left/right
  arrows change pages.
- **`display_issue(issue)`** — full detail (title, description, metadata rows).

Both modes use the **alternate terminal screen buffer** when stdout is a TTY:
full clear-and-redraw on resize; **ESC** (or Ctrl+C) exits to the normal prompt.
Non-TTY output prints once with no interactivity.

`DISPLAY` should not throw during normal use. Errors from `FETCH` or validation
are caught in `index.js`.

### How `index.js` connects it

After global parse and validate, `index.js` handles `view`:

```js
const result = FETCH(parsed_command);
await DISPLAY(parsed_command, result);
process.exit(0);
```

Failures in `FETCH` or `DISPLAY` are caught, printed to stderr, and exit with
code 1. The command never reaches `syncFromLog`, `create_event`, or `applyEvent`.

Write commands use a separate path:

```js
syncFromLog();   // refresh SQLite from JSONL if the log hash changed
applyEvent(event);
```

---

## Consequences

### Positive
- **Clear split.** `fetch.js`, `display.js`, and `index.js` each have one job.
- **The return shape selects the formatter.** List vs detail needs no extra flag.
- **Safe queries.** Fixed filter→column mapping plus `?` parameters; read-only DB.
- **Alt screen.** Resize-stable list and detail without stacking output in scrollback.

### Negative
- **Linked to FETCH row shape.** PascalCase keys and object-vs-array dispatch must
  stay in sync between `fetch.js` and `display.js`.
- **Key casing differs** from the event schema ([[004-event-issue-object]]).
- **No replay on view.** Stale SQLite after a pull until a write command runs
  `syncFromLog` (or replay is wired into view in a future change).
- **Interactive exit via `process.exit`.** ESC is handled inside `display.js`.

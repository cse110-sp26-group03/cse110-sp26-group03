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

The read path is two files plus the CLI entry wiring:

- `src/storage/fetch.js` — reads from SQLite and returns plain data.
- `src/cli/display.js` — formats that data for the terminal.
- `src/cli/index.js` — runs parse → validate → FETCH → DISPLAY, then exits
  (skips the write path).

The steps for `view` are: `argv → parse → validate → FETCH → DISPLAY`. This
skips `event.js` / `store.js` — `view` only reads, so it never builds an event
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
it. Wrapping it would be pointless — display would just read `[0]`. Keeping the
two shapes different is what lets `display` know which formatter to use.

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
`display` reads whatever `FETCH` returns, so it has to use these PascalCase
keys. `Assignee` can be `null`.

**Filtering.** `FETCH` builds the `WHERE` clause from a fixed list that maps
each filter (`status`, `priority`, `type`, `assignee`, `createdBy`) to its
column. Only those known filters reach SQL, and every value is passed as a `?`
parameter — user input is never glued into the query string. If neither `--all`
nor `--status` is given, it adds `status != 'closed'`. Results come back
`ORDER BY priority`.

`fetch.js` opens the database **read-only**, so `view` can never change data.

### `DISPLAY(parse_obj, result)` — the formatting layer

`DISPLAY` in `display.js` consumes whatever `FETCH` returned and picks a
formatter from the shape of `result`:

```js
if (Array.isArray(result)) await display_list(result);
else                       await display_issue(result);
```

- **`display_list(issues)`** — paginated table (5 rows per page). Left/right
  arrows change pages.
- **`display_issue(issue)`** — full detail for one issue (title, description,
  priority/assignee/type/status, audit fields).

Both modes use the **alternate terminal screen buffer** when stdout is a TTY:
the view clears and redraws on resize; **ESC** (or Ctrl+C) exits and returns to
the normal prompt. Non-TTY output prints once with no interactivity.

`DISPLAY` should not throw during normal use — it prints data `FETCH` already
validated. Errors from `FETCH` or validation are caught in `index.js`.

### How `index.js` connects it

After global parse and validate, `index.js` handles `view`:

```js
const result = FETCH(parsed_command);
await DISPLAY(parsed_command, result);
process.exit(0);
```

Failures in `FETCH` or `DISPLAY` are caught, printed to stderr, and exit with
code 1. The command never reaches `create_event` or `applyEvent`.

---

## Consequences

### Positive
- **Clear split.** `fetch.js` handles data, `display.js` handles printing, and
  `index.js` wires the read-only path — each can be tested on its own.
- **The return tells you the shape.** Since view returns an object and list
  returns an array, `display` does not need an extra flag to know which formatter
  to use.
- **Safe queries.** The fixed filter→column list plus `?` parameters keep the
  list query safe from injection, and read-only mode means `view` cannot change
  anything.
- **Alt screen avoids resize glitches.** Full clear-and-redraw on the alternate
  buffer keeps list and detail views stable when the terminal is resized.

### Negative
- **The two files are linked.** `display` has to know `FETCH` returns either an
  object or an array, and has to use the PascalCase keys — changing either one
  breaks display.
- **Key casing differs.** DB rows are PascalCase but the event schema is
  camelCase ([[004-event-issue-object]]), which is easy to mix up.
- **Interactive views exit via `process.exit`.** ESC handling lives in
  `display.js`, so `index.js`'s `process.exit(0)` after `DISPLAY` mainly applies
  to non-interactive runs; TTY sessions end inside `DISPLAY`.

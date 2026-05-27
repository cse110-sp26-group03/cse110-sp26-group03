# ADR-009: `mt view` — Fetch and Display

## Status
Accepted | **Proposed** | Deprecated (bold selected)

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

The read path is two files:

- `src/storage/fetch.js` — reads from SQLite and returns plain data. **Done.**
- `src/cli/display.js` — formats that data for the terminal. **Not built yet.**
  This ADR writes down the plan so the display work can start on its own.

The steps for `view` are: `argv → parse → validate → FETCH → display`. This
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

### `display(data)` — the formatting layer

`display.js` isn't built yet, so this section describes the *idea* rather than a
fixed implementation. The point is the contract — `display` consumes whatever
`FETCH` returns and decides how to render it from the shape alone. The code
below is one illustrative way to do that, not a locked-in design.

The core idea: `display` picks a formatter by checking the input shape.

```js
// example, not final — illustrates shape-based dispatch
function display(data) {
  if (Array.isArray(data)) displayList(data);
  else                     displayIssue(data);
}
```

- **`displayIssue(issue)`** — gets one object. Prints the full detail of a
  single issue.
- **`displayList(issues)`** — gets an array. Prints the list of issues.

`display` shouldn't throw during normal use — it's just printing data that
`FETCH` already checked. Any error handling is a safety net, not the main path.

#### Paging through the list (one possible approach)

The list view is meant to be scrollable rather than one big dump. How that
scrolling actually works is open — the following is an *example* of what it
could look like, not a requirement:

- Use something like `readline` (works in both Bun and Node) to listen for key
  presses.
- Arrow keys move between pages; rewrite the current line in place instead of
  reprinting everything.
- Keep looping until the user presses **Esc** (or similar) to quit.
- On the **first** page, "prev" does nothing; on the **last** page, "next" does
  nothing — and **no error**. These buttons can be greyed out or hidden.

The takeaway is "scrollable, paged, doesn't error at the ends" — the exact
mechanism is an implementation detail to be decided when `display.js` is built.

### How `index.js` connects it

Right now `index.js` has a temporary block that prints the raw `FETCH` result
for `view` and exits. Once `display` exists, that block becomes
`display(FETCH(parsed_command))`. The temporary `console.log(FETCH(...))` is
just debug code and should be removed then.

---

## Consequences

### Positive
- **Clear split.** `fetch.js` handles data, `display.js` handles printing — each
  can be built and tested on its own.
- **The return tells you the shape.** Since view returns an object and list
  returns an array, `display` doesn't need an extra flag to know which one it
  got.
- **Safe queries.** The fixed filter→column list plus `?` parameters keep the
  list query safe from injection, and read-only mode means `view` can't change
  anything.

### Negative
- **The two files are linked.** `display` has to know `FETCH` returns either an
  object or an array, and has to use the PascalCase keys — changing either one
  breaks display.
- **Key casing differs.** DB rows are PascalCase but the event schema is
  camelCase ([[004-event-issue-object]]), which is easy to mix up.
- **Paging adds complexity.** A scrollable list needs interactive, stateful
  rendering (e.g. a key-press loop with line redraws) that the rest of the
  one-shot CLI doesn't have — whatever approach `display.js` lands on.

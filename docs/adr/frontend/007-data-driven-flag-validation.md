# ADR-00X: CLI Validation: Data-Driven Flag Validation

## Status
**Proposed** | Accepted | Deprecated
**Date:** 2026-05-20
**Authors:** Ike Okoye

---

## Context

After `parser.js` builds a parse object, `validate.js` checks that the flags present are valid (correct format, known values, etc.).

### Parse object format

The original format stored flags as an array of objects:

```js
// mt create "Hello world" --priority p2  (original)
{
  cmd: "create",
  args: [],
  flags: [
    { flag: "title", args: "Hello world" },
    { flag: "priority", args: "p2" }
  ]
}
```

This ADR changes `flags` to a plain keyed object and drops `args` entirely:

```js
// mt create "Hello world" --priority p2  (new)
{
  cmd: "create",
  flags: {
    title: "Hello world",
    priority: "p2"
  }
}
```

**Why the flat object.** The array format requires iterating to look up a flag. A keyed object allows direct access via `flags[flag]`, which is what the validator needs.

**Why remove `args`.** It was meant to hold positional values like bare IDs. But shorthand titles get converted to a `title` flag by the parser, and IDs are treated as an `id` flag — so `args` would always be empty. Removing it means everything the validator touches lives in `flags`.

`parser.js` also enforces argument counts before validation runs — `close` and `delete` will never arrive with more than one flag.

### Considered Options

1. **Data-driven validation.** One `validate()` function that uses two lookup tables — commands → allowed flags, flag names → check functions — to validate whatever flags are present.

2. **Per-command validate functions.** A `validate_create()`, `validate_update()`, etc., each calling the relevant check functions directly.

## Decision

We go with Option 1: a single `validate()` in `validate.js`.

```js
// which flags each command can have
const possible_flags = {
  create: ['title', 'desc', 'priority', 'status', 'type', 'assignee'],
  update: ['id', 'title', 'desc', 'priority', 'status', 'type', 'assignee'],
  close:  ['id'],
  delete: ['id'],
  view:   ['id', 'priority', 'status', 'type', 'assignee'],
}

// maps flag name to its check function
const validations = {
  id:       check_id,
  title:    check_title,
  desc:     check_desc,
  priority: check_priority,
  status:   check_status,
  type:     check_type,
  assignee: check_assignee,
}

export function validate(parse_obj) {
  const { cmd, flags } = parse_obj

  for (const flag of possible_flags[cmd]) {
    const error_msg = validations[flag](flags[flag])
    if (error_msg) throw new Error(error_msg)
  }

  return true
}
```

Check functions take the flag's value and return `null` on success or an error string on failure. If a flag isn't present, its value is `undefined` and the check is skipped — optional flags being absent is valid, and required flags will have already been filled in by the parser.

```js
function check_id(id) { }

function check_title(title) { }

function check_desc(desc) { }

function check_priority(priority) { }

function check_status(status) { }

function check_type(type) { }

function check_assignee(assignee) { }
```

---

## Consequences

### Positive

- **No redundancy.** Per-command validate functions would all just call the same check functions in slightly different combinations. The lookup table captures that without the repetition.
- **Easy to extend.** Adding a new flag means updating `possible_flags` and adding one check function. Nothing else changes.
- **Easy to test.** Each check function does one thing and has the same interface (`value → null | string`).
- **Consistent errors.** Everything throws from one place.

### Negative

- **Typos fail silently.** A misspelled flag name in `possible_flags` will just skip that check with no error. Tests will catch it, but it's not obvious.
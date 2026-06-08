# Overview of parser.test.js

The parser.test.js file unit tests the functionality of the CLI argv parser (`src/cli/parser.js`). `parse()` is the only exported function. It turns `process.argv` into a `{ cmd, flags }` object. These tests cover argv shape, flags, aliases, and structural errors only — semantic value checks live in validation.test.js.

Because `parse()` enforces different argv rules per command group, we divide the tests into five individual test suites as denoted by the `describe()` function, which wraps the tests. The no-arg and path-command suite uses nested `describe()` blocks, one per command.

## Variables

This file has no file-level constants. Tests build inputs through the `argv()` helper.

## Helper Functions

```
function argv(...tokens) {
  return ['bun', '/path/to/index.js', ...tokens];
}
```

`argv()` builds a fake `process.argv` with a runtime, script path, and command-line tokens. Individual tests pass only the tokens they care about.

## parse() — create Tests

This test suite has eleven tests in this order:

1. Checks positional title plus long-form flags (`--priority`, `--type`) with default `status: open`.
2. Checks default priority (`p5`) and status (`open`) when only a title is given.
3. Checks shorthand aliases (`--t`, `--d`, `--p`, `--s`, `--a`) map to the correct flag names.
4. Checks title from `--title` flag only (no positional title).
5. Checks multi-word positional title joining (`Fix login bug`).
6. Checks lowercasing of status, priority, and type flag values.
7. Checks case preservation on positional title, description, and assignee.
8. Checks rejection of `closed` status on create.
9. Checks that a title is required.
10. Checks that `--cb` is view-only and rejected on create.
11. Checks valueless `--all` stored as an empty string.

## parse() — update, close, delete Tests

This test suite has twenty-three tests grouped by command.

### Update tests (1–10)

1. Checks that short issue ids are prefixed with `manta-`.
2. Checks update with a full `manta-` id and one changed field.
3. Checks update with shorthand flags (`--t`, `--d`, `--p`, `--s`, `--a`).
4. Checks `--type` accepted as a change field.
5. Checks case preservation on update title and assignee.
6. Checks ids longer than four characters are still prefixed.
7. Checks rejection when update has only an id and no change fields.
8. Checks rejection when update has no id.
9. Checks `--all` accepted on update (stored as empty string).
10. Checks `--cb` rejected on update.

### Close tests (11–17)

11. Checks close with a short id only (`manta-hk3p`).
12. Checks close with a full `manta-` id unchanged.
13. Checks close with an id longer than four characters.
14. Checks that an id is required for close.
15. Checks rejection of extra flags on close.
16. Checks rejection of `--all` on close.
17. Checks rejection of `--cb` on close.

### Delete tests (18–23)

18. Checks delete with a short id (`manta-tzdb`).
19. Checks delete with an id longer than four characters.
20. Checks that an id is required for delete.
21. Checks rejection of extra flags on delete.
22. Checks rejection of `--all` on delete.
23. Checks rejection of `--cb` on delete.

## parse() — view Tests

This test suite has thirteen tests in this order:

1. Checks bare view with no args (`flags: {}`).
2. Checks short id prefixing on detail view.
3. Checks detail view with a full `manta-` id.
4. Checks ids longer than four characters on detail view.
5. Checks detail view with id plus a filter flag.
6. Checks `--type` and `--assignee` list filters.
7. Checks shorthand filter aliases (`--p`, `--s`, `--a`).
8. Checks `--all` alone on list view.
9. Checks list filters combined with `--all`.
10. Checks `--cb` (createdBy alias) on view.
11. Checks case preservation on assignee and createdBy.
12. Checks rejection of `--title` filter on view.
13. Checks rejection of `--desc` filter on view.

## parse() — no-arg and path commands Tests

Nested `describe()` blocks group one command each.

### version

This nested suite has two tests in this order:

1. Checks version with no arguments.
2. Checks rejection of extra arguments.

### sync

This nested suite has two tests in this order:

1. Checks sync with no arguments.
2. Checks rejection of extra arguments.

### init

This nested suite has two tests in this order:

1. Checks init with no arguments.
2. Checks rejection of extra arguments.

### migrate

This nested suite has five tests in this order:

1. Checks that a positional path to the Beads JSONL file is required.
2. Checks absolute positional path parsing.
3. Checks relative positional path parsing.
4. Checks paths containing spaces are preserved.
5. Checks rejection of flags.

### clear

This nested suite has four tests in this order:

1. Checks default path (`.manta/manta.jsonl`) when no arguments are given.
2. Checks explicit positional path.
3. Checks paths containing spaces are preserved.
4. Checks rejection of flags.

### help

This nested suite has six tests in this order:

1. Checks bare help with no arguments.
2. Checks optional help subcommand (`help_cmd` flag).
3. Checks rejection of wrong-casing subcommand.
4. Checks multiple positional args joined and treated as one unknown subcommand.
5. Checks unknown subcommand error message (includes `Run 'mt help'` hint).
6. Checks rejection of flags.

## parse() — structural errors Tests

This test suite has ten tests in this order:

1. Checks uppercase command names are lowercased (`CREATE` → `create`).
2. Checks empty argv (no command token) is rejected.
3. Checks unknown command is rejected.
4. Checks unknown flag is rejected.
5. Checks duplicate title from positional and `--title` is rejected.
6. Checks duplicate flags on create are rejected.
7. Checks duplicate flags on update are rejected.
8. Checks invalid single-dash flag syntax is rejected.
9. Checks flag with missing value is rejected.
10. Checks `--all` given a trailing value is rejected.

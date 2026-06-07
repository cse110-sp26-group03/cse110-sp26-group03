# Overview of validation.test.js

The validation.test.js file unit tests the functionality of the validation layer (`src/validation/validation.js`). `validate()` is the only exported function, but it delegates to a set of per-flag helper checks. Because each helper enforces a distinct rule, we divide the tests into one individual test suite per function as denoted by the Describe() function, which wraps the tests and houses them in a test suite. Helpers are reached through whichever command lists their flag (e.g. `check_id()` through `update`, `check_title()` through `create`).

## Variables

```
const VALID_CREATE = {
  cmd: 'create',
  flags: { title, desc, priority, status, type, assignee },
};
```

The `VALID_CREATE` variable is a fully valid `create` parse object. Many tests start from this baseline and override a single flag so they isolate the one check function under test.

## Helper Functions

```
function makeParse(cmd, flags = {}) {
  return { cmd, flags };
}
```

`makeParse()` builds a parse object from a command name and flags, letting individual tests pass only the pieces they care about instead of the full shape.

## validate() Tests

This test suite has three tests in this order:

1. Checks that a fully valid `create` passes and returns `true`.
2. Checks that a command with no validation rules is skipped and returns `true`.
3. Checks that the first failing flag in command order is the one reported, and that a real `Error` instance is thrown.

## check_id() Tests

This test suite currently has one active test:

Checks that an omitted id is accepted 


## check_title() Tests

This test suite has three tests in this order:

1. Checks that a title at the 50-character boundary is accepted.
2. Checks that a title longer than 50 characters is rejected.
3. Checks that an empty title is accepted.

## check_desc() Tests

This test suite has three tests in this order:

1. Checks that a description at the 512-character boundary is accepted.
2. Checks that a description longer than 512 characters is rejected.
3. Checks that an empty description is accepted.

## check_priority() Tests

This test suite has three tests in this order:

1. Checks that a valid `pN` priority is accepted.
2. Checks that a malformed priority is rejected.
3. Checks that priority is required on `create` but optional on `update`.

## check_status() Tests

This test suite has three tests in this order:

1. Checks that each allowed status value (`open`, `in_progress`, `blocked`, `closed`) is accepted.
2. Checks that an unknown status is rejected.
3. Checks that status is required on `create` but optional on `update`.

## check_type() Tests

This test suite has three tests in this order:

1. Checks that each allowed type value is accepted.
2. Checks that an unknown type is rejected.
3. Checks that an omitted type is accepted.

## check_assignee() Tests

This test suite has three tests in this order:

1. Checks that an alphabetic assignee is accepted.
2. Checks that an assignee containing digits or symbols is rejected.
3. Checks that an omitted assignee is accepted.

## check_createdBy() Tests

This test suite has three tests in this order:

1. Checks that an alphanumeric/underscore username is accepted on `view`.
2. Checks that a username with illegal characters is rejected on `view`.
3. Checks that `createdBy` is ignored for non view commands.

## check_path() Tests

This test suite has three tests in this order:

1. Checks that a non-empty path is accepted on both `migrate` and `clear`.
2. Checks that an empty or whitespace-only path is rejected on both.
3. Checks that an omitted path is accepted on both

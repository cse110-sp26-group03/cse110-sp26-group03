# Overview of event.test.js

The event.test.js file unit tests the functionality of the CLI event builder (`src/cli/event.js`). `create_event()` is the only exported function. It turns a validated parse object into a storage event (`issue.created`, `issue.updated`, or `issue.deleted`). Semantic value checks live in validation.test.js; argv shape lives in parser.test.js.

Because `create_event()` handles a distinct event shape per write command (create, update, close, delete), plus shared actor resolution and error handling, we divide the tests into six individual test suites as denoted by the `describe()` function, which wraps the tests.

Actor-related tests save and restore `process.env` in `beforeEach`/`afterEach` so the developer's shell environment is unchanged.

## Variables

```
const ENV_KEYS = ['USER', 'USERNAME'];
```

`ENV_KEYS` lists the environment variables touched by actor tests. Both are cleared before each test and restored afterward.

```
let savedEnv;
```

`savedEnv` stores the original `USER` and `USERNAME` values so `afterEach` can put them back.

## Helper Functions

```
function makeParse(cmd, flags = {}) {
  return { cmd, flags };
}
```

`makeParse()` builds a parse object from a command name and flags, letting individual tests pass only the pieces they care about instead of the full shape.

```
function expectIsoTimestamp(value) {
  ...
}
```

`expectIsoTimestamp()` asserts that a value is a string that parses as a valid ISO-8601 timestamp.

```
beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  delete process.env.USER;
  delete process.env.USERNAME;
});
```

`beforeEach()` clears `USER` and `USERNAME` before every test so actor resolution starts from a known baseline (`local-user` when neither is set).

```
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
});
```

`afterEach()` restores the developer's original environment variables.

## create_event() — create Tests

This test suite has seven tests in this order:

1. Checks the full `issue.created` envelope with parser defaults (`issueType: task`, empty description, null assignee, null `issueId`).
2. Checks create with only a title when status and priority are omitted — those fields stay `undefined` but timestamps and actor fields are still stamped.
3. Checks that `desc`, `type`, and `assignee` map into `description`, `issueType`, and `assignee` on the issue payload.
4. Checks that `createdAt` and `updatedAt` match the event `timestamp`.
5. Checks that `$USER` is used as `actor`, `createdBy`, and `updatedBy` when set.
6. Checks fallback to `$USERNAME` when `$USER` is unset.
7. Checks that `$USER` wins over `$USERNAME` when both are present.

## create_event() — update Tests

This test suite has eight tests in this order:

1. Checks that only provided change fields appear in `changes` (plus `updatedAt`/`updatedBy`).
2. Checks `desc`→`description` and `type`→`issueType` mapping — parser flag names are not left on the event.
3. Checks multiple change fields in one `issue.updated` event.
4. Checks that `updatedAt` and `updatedBy` are always stamped, even for a single-field update.
5. Checks that omitted fields are absent from `changes`.
6. Checks a status-only update — `changes` contains only `status`, `updatedAt`, and `updatedBy`.
7. Checks an assignee-only update — same three-key shape.
8. Checks all changeable fields combined in one event (title, description, status, priority, issueType, assignee).

## create_event() — close Tests

This test suite has one test:

Checks that close builds an `issue.updated` event with `status: closed`, matching `timestamp` and `changes.updatedAt`, and stamping `updatedBy` from the actor.

## create_event() — delete Tests

This test suite has one test:

Checks the `issue.deleted` envelope with `issueId` only — no `changes` or `issue` payload, and a parseable `timestamp`.

## create_event() — actor Tests

This test suite has one test:

Checks that `$USER` is used as `actor` and `updatedBy` on update, close, and delete (create actor cases are covered in the create suite).

## create_event() — errors Tests

This test suite has one test:

Checks that unrecognized commands (`notacommand`, `view`, `init`) throw with a descriptive `event creation error` message.

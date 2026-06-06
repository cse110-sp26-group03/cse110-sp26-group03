# Overview of fetch.test.js

The fetch.test.js file unit tests the functionality of the Public API FETCH() function. Because FETCH has two types of modes, detail and list, we divide the tests into two individual test suites as denoted by the Describe() function, which wraps the tests and houses them in a test suite.

## Variables

```
const FETCH_ASSIGNEE = 'fetch-test-suite';
```

The `FETCH_ASSIGNEE` variable represents a placeholder assignee for each issue that is created for the test suite. This allows tests to fill out empty fields to test more extensively.

```
const FIXTURES = [...]
```

The `FIXTURES` variable houses the test issues with predetermined fields for ID, Status, Priority, Type, and CreatedBy.

## Helper Functions

```
BeforeAll()
```

This function is used before the test suites are run, and helps us to prepare SQL queries to query the database to manually insert issues, and iteratively inserts the test FIXTURE issues.

```
AfterAll()
```

This function is used after the test suites are run by preparing SQL queries to delete all of the test FIXTURE issues from the database.

```
function fetchIds(extraFlags = {}) {
    const rows = FETCH({
      cmd: 'view',
      flags: { assignee: FETCH_ASSIGNEE, ...extraFlags },
    });
    return rows.map((r) => r.ID);
  }
```

This function is located at the top of the List mode test suite, and is used to fetch issue IDs using the prepared FETCH_ASSIGNEE variable and other flags used in the tests.

## Detail Mode Tests

This test suite has three tests in this order:

1. Checks if FETCH() returns an issue with the correct data and correct format.
2. Checks to see if FETCH() fails gracefully after fetching an issue with an invalid ID (non-existent issue).
3. Checks if, in `mt view`, searching by ID is prioritized over other flags.

## List Mode Tests

This test suite has eleven tests in this order:

1. Checks if list mode returns an array, even before any filtering happens.
2. Checks if, normally, the closed issues are hidden from view
3. Checks if the --all flag shows all issues, including closed ones
4. Checks if filtering by the closed status will return closed issues
5. Checks if filtering by an arbitrary issue type will return the correct issues
6. Checks if filtering by a priority will return issues of that priority
7. Checks if the createdBy maps onto the createdBy column
8. Checks if filtering by an item that multiple issues have (i.e. two issues with the same createdBy name) will return those issues
9. Checks if the fetched issues are sorted by their priorities in ascending order
10. Checks if closed issues are put at the bottom of the list regardless of their priority
11. Checks if nothing is returned when nothing matches the filter

## List Mode Tests: Additional Filters

This test suite has five tests in this order:

1. Checks if combining two different columns (issue type and createdBy) narrows the results with AND logic.
2. Checks if filtering by a non-closed status (open) returns only the open issues and excludes the others.
3. Checks if filtering by the in_progress status returns the single in_progress issue.
4. Checks if the --all flag combines with a type filter, returning both the open and closed issues of that type.
5. Checks if filtering by assignee alone returns every non-closed issue in the suite.

## Detail Mode Tests: Error Chaining

This test suite has one test in this order:

1. Checks if FETCH() wraps the not-found error while preserving the original error as its `.cause`.

# Overview of db.test.js

The db.test.js file unit tests the functionality of the SQLite initialization layer, whose only exported function is `openDatabase()`. Because `openDatabase()` has several distinct responsibilities (opening the database, applying the schema, enforcing constraints, and backing the meta key/value store), we divide the tests into four individual test suites as denoted by the Describe() function, which wraps the tests.

Every test calls `openDatabase(':memory:')` so each one gets a fresh, throwaway in-memory database that disappears as soon as `db.close()` is called. This keeps the tests fully isolated and never touches a real database file on disk.

## Variables

This file declares no shared variables. Each test creates and closes its own in-memory database inline.

## Helper Functions

This file declares no shared helper functions, since every database is a throwaway `:memory:` instance opened and closed within a single test, there is no shared state to set up in `beforeEach` or tear down in `afterAll`.

## openDatabase() Tests

This test suite has four tests in this order:

1. Checks that `openDatabase(':memory:')` returns a live, queryable Database by running a simple `SELECT 1` query.
2. Checks that the schema is applied by confirming both the `issues` and `meta` tables exist in `sqlite_master`.
3. Checks that the `foreign_keys` PRAGMA is enabled on the returned database.
4. Checks that a fresh database starts with an empty `issues` table

## issues table schema Tests

This test suite has three tests in this order:

1. Checks that inserting a row with only `ID` and `Title` fills in every column default correctly (`Status`, `Priority`, `IssueType`, `CreatedBy`, `UpdatedBy`, `CreatedAt`).
2. Checks that inserting a row with a duplicate primary key (`ID`) throws an error.
3. Checks that inserting a row without a `Title` (a NOT NULL column) throws an error.

## CHECK constraints Tests

This test suite has four tests in this order:

1. Checks that an out-of-range `Status` value is rejected.
2. Checks that a negative `Priority` value is rejected.
3. Checks that an unknown `IssueType` value is rejected.
4. Checks that a row satisfying every CHECK constraint inserts successfully and stores the given values.

## meta table Tests

This test suite has two tests in this order:

1. Checks that a key/value pair can be stored and read back correctly.
2. Checks that inserting a duplicate `Key` throws an error

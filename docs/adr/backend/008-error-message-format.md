# ADR-008: Backend Error Message Format

## Status

Proposed | **Accepted** | Deprecated

Date: 2026-05-20  Authors: David Tanioka

---

## Context

`src/storage/store.js` signals failures to its callers by throwing. Based on discussion, we care about getting an error's message from the backend, to print it gracefully in frontend. So now each error should be clear in why its being thrown. Furthermore, I also added fields to the message which can be accessible by err.issueId and err.reason that may be useful for future implementation/clearer errors with no downside.



## Considered Options

### 1. Throw the error message as a whole string 
Throw plain `new Error("Cannot update issue \"manta-abcd\": ...")`. This is ok, but not ideal as frontend needs to parse if they want specific fields like issue id or whatever the reason is that follows. If we only cared about getting the whole error message, this is ok.

### 2. Custom Error subclass (`class StoreError extends Error`)
Define a subclass with typed fields, throw instances of it. Cleanest structurally, but heavier than needed for a layer that throws a few distinct user-facing errors.

### 3. Make `applyEvent` return `{ok, message}` instead of throwing
Eliminate throws entirely. As part of the discussion on 5/19, this wouldn't be ideal as this would require more lines of code to parse and use on the frontend and could get messy really quick. Generally, its better to throw errors in the backend and catch in the frontend rather than doing lines of code with false statements.

## Decision

`store.js` uses a function helper that builds an `Error` with a standard message format and structured fields attached.

User facing errors take the format `Cannot <action> issue "<issueId>": <reason>`. 
If you just want just the whole string use error.message for print
Otherwise you can format it whatever shape you want to get issueId and

Also as explained in the function, when no `issueId` is available (e.g., create failed to create unique ID), the subject collapses to `the issue`:


## Consequences

**Positive:**

- Error messages across the backend read in a consistent shape — logs and dev output stay readable.
- The boundary reads `err.issueId` and `err.reason` directly. No string parsing, no risk of a `": "` in the reason breaking the parser.
- Still easy to print as full message, if needed
- Format changes are a single function, so its helpful for writing errors for future commands

**Negative:**

- Small indirection — readers of a throw site have to know what `buildStoreError` does to predict the resulting `err.message`.
- Still some inconsistency with the create function as that would have a missing issueId field, but is addressed in function

## References
- Meeting Discussion 5/19

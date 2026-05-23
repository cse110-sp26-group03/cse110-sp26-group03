# ADR-006: Store.js Responsibilities

## Status

Proposed | **Accepted** | Deprecated

Date: 2026-05-19 Authors: Ori Chason

---

## Context

Our architecture is broken into layers, and after a command gets parsed, validated, and constructed into an event, it needs to be dispatched into the storage containers. This storage layer needs to live between event.js and the JSONL and SQLite. With our event schema (frontend ADR-004) and issue ID format (backend ADR-005) settled, we can create the storage.js. 

## Considered Options

### 1. Many functions vs. one `applyEvent`
- **Many functions** (`createIssue()`, `updateIssue()`, `deleteIssue()`)
- **One** `applyEvent(event)` that dispatches on `event.type`
  
### 2. ID generation: store.js vs. events.js vs. CLI
- **CLI**: doesn't have storage access; it can't check uniqueness.
- **events.js**: also doesn't have storage access.
- **store.js**: has the SQLite connection, knows what IDs exist.

### 3. Write order: JSONL first vs. SQLite first
- **JSONL first**: the durable record exists before the cache. If SQLite write fails, replay can rebuild from the log.
- **SQLite first**: needed for create events specifically because we need to check for ID uniqueness before writing to JSONL.

### 4. Collision handling
- **Fail immediately**: simplest, but backend ADR-005 explicitly calls for retries.
- **Retry up to 5 times**: matches ADR-005's design.

### 5. Validation
- **In store.js**: defensive but redundant if events.js already validates.
- **In events.js**: matches ADR-004's design. Keeps store.js focused on persistence.

## Decision

- Store.js will have a public api that will be called from the frontends command script. The api will accept an event matching frontends ADR-004 schema (`issue.created`, `issue.updated`, or `issue.deleted`).
- For `issue.created` events, it will generate a 4-character Crockford base32 ID per backend ADR-005 and assign it to `event.issueId`.
- For `issue.created` events, writes to SQLite first; if SQLite raises a UNIQUE constraint error, generates a new ID and retries up to 5 times. After SQLite accepts the row, appends the event to JSONL.
- For `issue.updated` and `issue.deleted` events, appends to JSONL first, then applies the change to SQLite (durability before visibility).
- Maps camelCase event field names (e.g., `updatedAt`) to PascalCase SQLite column names (e.g., `UpdatedAt`) via a helper function.

store.js does **not** validate events. Store.js trusts that any event arriving here is well-formed.

## Consequences 

**Positive:**
- CLI commands, agents, and replay all dispatch the same way.
- JSONL and SQLite always get written to at the same time. So it can't happen where only one gets written to.
- ID generation connects to the db, so we can easily check for uniqueness.

**Negative:**
- Because store.js is relying on a well formed object that event.js creates, if it receives a not well formed object, it will look like the error is coming from storage. To fix this, we might add another check in storage to check for valid event, but as of now there will not be a double check.
- ID retry logic adds some complexity, but we think that it should rarely fire anyways, especially not 5 times.

## References
- docs/adr/frontend/004-event-issue-object.md
- docs/adr/backend/005-issue-id-format.md
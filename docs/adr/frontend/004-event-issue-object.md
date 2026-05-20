# ADR-004: Issue Event Object Schema

## Status
Accepted | **Proposed** | Deprecated (bold selected)

**Date:** 2026-05-18  
**Authors:** Angel

---

## Context
Decide the shape/fields of the object passed from event.js to store.js with the current proposed fields: 

ID | Title | Description | Status | Priority | Issue Type | Assignee | Created at | Created by | Updated at

---

## Decision
Issues will be passed to the backend with the following format, different depending on the type of action. All objects will be guaranteed to include a type of action, timestamp, and actor. 

For create issues, the entire issue will be populated with relevant data from CLI, defaults, etc. 

For update/close issues, the fields that need to be updated will be populated. 

For delete issues, no additional information beyond ID will be populated.

`event.js` is responsible for constructing event objects.

`store.js` is responsible for assigning issue IDs during issue creation and persisting events to JSONL/SQLite.

Flag content validation runs in `src/validation/validation.js` after parsing (see ADR-007) and before `event.js` builds events. `store.js` can optionally validate for redundancy.

### Create Issue

```js
{
  type: "issue.created",
  timestamp: "2026-05-18T20:55:00.000Z",
  actor: "local-user",
  issueId: null,
  issue: {
    title: "example title",
    description: "",
    status: "open",
    priority: "p5",
    issueType: "task",
    assignee: null,
    createdAt: "2026-05-18T20:55:00.000Z",
    createdBy: "local-user",
    updatedAt: "2026-05-18T20:55:00.000Z",
    updatedBy: "local-user"
  }
}
```

### Update/Close Issue

```js
{
  type: "issue.updated",
  timestamp: "2026-05-18T21:00:00.000Z",
  actor: "local-user",
  issueId: "manta-h3kp",
  changes: {
    priority: "p2",
    status: "in_progress",
    // additional changed fields as needed
    updatedAt: "2026-05-18T20:55:00.000Z",
    updatedBy: "local-user"
  }
}
```

As a note, "closing" an issue is a shortcut that will be translated into an "update" event where the updated field is `status: "closed"`.

### Delete Issue

```js
{
  type: "issue.deleted",
  timestamp: "2026-05-18T21:00:00.000Z",
  actor: "local-user",
  issueId: "manta-h3kp",
}
```

### CLI validation rules (`validation.js`)

These rules apply to parsed flag values before they are mapped into event objects. The parser fills defaults where noted so `validate()` always receives a value.

| CLI flag | Required | Default (parser) | Valid values / format |
|---|---|---|---|
| `id` | on `update`, `close`, `delete` | — | `manta-` + 4 Crockford base32 chars (see backend ADR-005) |
| `title` | on `create` (parser) | — | optional on `update`; if present, under 50 characters |
| `desc` | no | — | if present, under 512 characters |
| `priority` | yes (parser default) | `p5` | `p` + single digit `0`–`9` (e.g. `p2`, `p7`) |
| `status` | yes (parser default) | `open` | `open`, `in_progress`, `closed` |
| `type` | no | — | if present: `bug`, `feature`, `task`, `docs`, `store` |
| `assignee` | no | — | if present: letters only (`a`–`z`, `A`–`Z`), any length |

### Field breakdown:

Metadata:

| Field | Type | Source | Default | Notes |
|---|---|---|---|---|
|`type`| string | CLI input | required | Allowed: `issue.created`, `issue.updated`, `issue.deleted`|
|`timestamp`| string | `event.js` | generated | ISO timestamp (this action) |
|`actor`| string | config/default | `"local-user"` | username from config |
|`issueId`| string \| null | CLI input / generated | generated | `manta-` + 4-char Crockford suffix on update/delete; null on create (assigned by store.js) |

Depending on the type, there will be a final field called `changes`, `issue`, or none. 

| Field | Present On | Notes |
| --- | --- | --- |
| `issue` | `issue.created` | Entire issue data except ID |
| `changes` | `issue.updated` | Only modified fields |
| none | `issue.deleted` | Delete uses only issueId |

Issue Fields:

| Field | Type | Source | Default | Notes |
|---|---|---|---|---|
| `title` | string | CLI input | required on create | Under 50 characters when set (see validation table) |
| `description` | string | CLI input | `""` | Under 512 characters when set |
| `status` | string | parser / CLI | `"open"` | `open`, `in_progress`, `closed` |
| `priority` | string | parser / CLI | `"p5"` | `p0`–`p9`; parser default `p5` if omitted |
| `issueType` | string | CLI input | `"task"` | `bug`, `feature`, `task`, `docs`, `store` |
| `assignee` | string \| null | CLI input | `null` | Letters only when set; otherwise `null` |
| `createdAt` | string | `event.js` | generated | ISO timestamp |
| `createdBy` | string | config/default | `"local-user"` | Username from config |
| `updatedAt` | string | `event.js` | generated | Updated on modification |
| `updatedBy` | string | config/default | `"local-user"` | User making latest change |

---

## Consequences

### Positive
- Defines a clear contract between `event.js` and `store.js`.
- Lets CLI/frontend and backend/storage teams work independently.
- Keeps JSONL replay simple because every event has a type, timestamp, actor, and issueId.
- Allows create, update, close, and delete commands to share one event format.

### Negative
- Any schema changes require coordination between command, event, and storage code.
- Backend replay logic must handle partial `changes` objects for updates.
- ID generation is split from event construction because `store.js` assigns IDs on create.

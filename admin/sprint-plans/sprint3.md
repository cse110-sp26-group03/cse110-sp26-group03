# Sprint 3 Plan

**Sprint Duration:** May 17, 2026 - May 24, 2026

## Sprint Goal

Finalize responsibility boundaries between frontend and backend teams and begin implementation of core CLI architecture. Establish ownership of major project files so team members can work in parallel.

## Planned Deliverables

* [X] parser.js
* [X] validator.js
* [X] event.js
* [X] index.js
* [ ] replay.js
* [X] store.js
* [X] Update/delete validation logic

## Related Issues / Deliverables

| Issue / Deliverable  | Owner(s) | Status  |
| -------------------- | -------- | ------- |
| #61 index.js                | Scott     | Complete |
| #63 parser.js                  | Ike     | Complete |
| #65 event.js              | Katie, Nat     | Complete |
| validator.js | Ike, Humza     | Complete |
| #54 store.js | Ori    | Complete |
| validator.js | Ike, Humza     | Complete |
| #39 Prettier CI Setup | Nathan | Complete |
| Backend Storage ADRs | Backend team | Complete |
| replay.js | Backend team | In Progress. | 


## Risks / Concerns

* Unclear separation between frontend and backend responsibilities
* Potential overlap between team members working on related files
* Need for consistent validation and error handling across commands
* Backend exact function not yet determined

## Post Sprint Notes

parse, validate, index, event, store all completed for create, update, close, delete commands (!!). Backend still waiting on replay, but major ADR decisions have been made, replay will be completed next sprint.
# ADR-001: Log Architecture — JSONL Log

## Status
Proposed — 2026-05-07

Accepted — 2026-05-13 by Ori, Nathan, Ryan, David, and Powell

## Context

AIT and database needs to fetch and write data locally inside a workspace, in a way that:
1. Multiple developers on a team can sync via git without binary merge conflicts
2. Does operations instantaneously
3. The data survives across sessions and across machines
4. Both human and agent surfaces operate on the same consistent state

## Considered Options

1. **Mutable JSON file.**. Allows for cleaner, less chunky data storage. Using this would allow for data optimization: changes made to the same issue will edit the existing issue's data rather than create another object. 
2. **Appendable JSONL file.** Allows for quicker data storage. Though, will consume more space over time as file grows.

## Decision

We adopt Option 2: JSONL is better for user appeal and performance. We want to prioritize performance over space optimizations for improved user experience, especially for a project of our scale. 

- `.manta/issues.jsonl` is committed to git. Every change is one appended line.
- JSONL log builds data locally.
- On every write: the event is constructed, and auto-exported as a new line appended to the JSONL log.
- If our database is ever corrupted or out of sync, deleting it and replaying the JSONL log restores the exact same state. The JSONL is the durable record.
- Every command updates both stores immediately; thus, the JSONL is always current with the SQLite database 
- Performance > Space consumption: having slow response times will detract users from using our issue tracker. Powell has also iterated that space is not so much a problem as performance is (on our scale).

## Consequences

**Positive:**

- Append-only events are highly merge-friendly — same-line conflicts are rare, and even simultaneous edits to the same issue produce both events in the log (replay logic decides the final state via timestamps).
- Audit trail comes for free (every change is logged in the JSONL).
- Appending costs O(1) time, so logging user operations will be instantaneous.
  
**Negative:**
- The JSONL file grows unbounded. Compaction is a known v2 problem.

**Prior art:** Beads (https://github.com/gastownhall/beads) uses essentially
this architecture. Their experience suggests it's workable for small teams.

## References
- Meeting Notes w/ Powell ([here](https://docs.google.com/document/d/1axhw2A4LCODPwY0ERRAqc1e9RX2qtqe4P58aP3QN__E/edit?tab=t.0))

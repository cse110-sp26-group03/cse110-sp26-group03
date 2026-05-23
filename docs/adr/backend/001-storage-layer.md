# ADR-001: Storage Layer — JSONL Log + SQLite Cache

## Status

Proposed | **Accepted** | Deprecated

Date: 2026-05-13 Authors: Ori, Nathan, Ryan, David

## Context

AIT and database needs to fetch and write data locally inside a workspace, in a way that:
1. Multiple developers on a team can sync via git without binary merge conflicts
2. Does operations instantaneously
3. The data survives across sessions and across machines
4. Both human and agent surfaces operate on the same consistent state

We need both a **durable record** that teammates can share via git and a **fast query layer** for commands like `mt list` or `mt show`. These two needs pull in different directions — text files merge cleanly but query slowly, and databases query quickly but don't merge cleanly. We resolve this by using both, with clear roles for each.


## Considered Options

1. **Mutable JSON file.**. Allows for cleaner, less chunky data storage. Using this would allow for data optimization: changes made to the same issue will edit the existing issue's data rather than create another object. 
2. **Appendable JSONL file.** Allows for quicker data storage. Though, will consume more space over time as file grows.
3. **SQLite committed to git.** Single store, fast queries. Rejected because SQLite files are binary and don't merge cleanly across teammates.
4. **JSONL as source of truth + SQLite as local cache.** Two stores with distinct roles: JSONL gives us merge-safe sync, SQLite gives us fast queries. Slightly more complex than a single store, but solves both problems.

## Decision

We adopt Option 4: an appendable JSONL log as the source of truth, plus a SQLite cache for fast local queries. JSONL is better for user appeal and performance on the durability side. We want to prioritize performance over space optimizations for improved user experience, especially for a project of our scale.

- `.manta/issues.jsonl` is committed to git. Every change is one appended line.
- `.manta/manta.db` is the local SQLite cache, gitignored. Each developer has their own copy.
- On every write: the event is constructed, applied to SQLite, and auto-exported as a new line appended to the JSONL log. Both stores stay in sync after every command.
- On startup or after `git pull`, new events from the JSONL are replayed into SQLite so the local cache reflects teammates' changes.
- If our database is ever corrupted or out of sync, deleting it and replaying the JSONL log restores the exact same state. The JSONL is the durable record.
- Every command updates both stores immediately; thus, the JSONL is always current with the SQLite database 
- Performance > Space consumption: having slow response times will detract users from using our issue tracker. Powell has also iterated that space is not so much a problem as performance is (on our scale).

## Consequences

**Positive:**

- Append-only events are highly merge-friendly — same-line conflicts are rare, and even simultaneous edits to the same issue produce both events in the log (replay logic decides the final state via timestamps).
- Audit trail comes for free (every change is logged in the JSONL).
- Appending costs O(1) time, so logging user operations will be instantaneous.
- SQLite gives us fast indexed queries.

**Negative:**
- The JSONL file grows unbounded. Compaction is a known v2 problem.
- Two-store architecture is slightly more complex than a single store. Every write must touch both files; store.js is responsible for keeping them in sync.

**Prior art:** Beads (https://github.com/gastownhall/beads) uses essentially
this architecture. Their experience suggests it's workable for small teams.

## References
- Meeting Notes w/ Powell ([here](https://docs.google.com/document/d/1axhw2A4LCODPwY0ERRAqc1e9RX2qtqe4P58aP3QN__E/edit?tab=t.0))

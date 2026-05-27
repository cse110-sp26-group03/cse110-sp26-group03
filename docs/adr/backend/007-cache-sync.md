# ADR-007: Cache Sync

## Status

**Proposed** | Accepted | Deprecated

**Date**: 2026-05-27

**Authors**: Ryan Le, TianLin Zhao, Ori Chason

---

## Context

For our issue tracker, we update our local DB with the JSONL log. After `git pull`, the JSONL log may contain new lines from teammates that the local SQLite cache has not yet seen. We need a strategy that brings the cache in line with those new lines before each command runs.

## Considered Options

1. **Position checkpoint (byte offset or line count).** Track the last read position or line count on disk, and only read from that checkpoint onward on subsequent runs. This is a method which is easy to implement. However, after a git merge reorders the log, the recorded position points at the wrong line: previously-processed events get re-read and freshly merged-in teammate events get skipped entirely.

2. **Hash the whole log; skip if unchanged, full rebuild if changed.** Compute SHA-256 over the file each run; if the hash matches the stored value, no work; otherwise wipe and rebuild. The comparison of hashes saves some time. However, the time saved is very small compared to the time spent replaying the log, and the hash computation itself is a nontrivial cost. Also, we have to write complex codes to make it. 

3. **Always full replay.** On every CLI invocation, before applying the current command, wipe the `issues` table and replay every line in the JSONL inside a single transaction. The SQLite cache is a pure projection of the log, so wiping it costs nothing irrecoverable. The time cost is negligible and acceptable.

## Decision

We adopt Option 3: full replay on every CLI invocation.

Option 1 was ruled out on correctness — a sync strategy that drops events after a routine `git pull` is not acceptable for our durable record's read path. Option 2 is correct, but its only advantage over Option 3 is skipping the rebuild when the log has not changed, and this doesn't save enough time to justify the added complexity.
Option 3 trades a small predictable per-command cost for unconditional correctness and a simpler mental model: the SQLite cache is a pure function of the JSONL log at all times. Deleting it is always safe; every command sees whatever the merged log contains; there is no checkpoint that can drift or be corrupted by a future git operation.

## Consequences

**Positive:**

- **100% immune to Git merge reordering:** Replay simply processes whatever is currently on disk, in whatever order Git decided to leave it. There are no pointers or offsets to break.
- **Zero state to manage:** We don't have to worry about checkpoints drifting, getting corrupted, or falling out of sync. If the cache ever acts weird, deleting .manta/manta.db acts as a perfect reset—the very next command will cleanly rebuild it from scratch.
- **Faster development.** New tests, new bug fixes, schema tweaks — none need a "migrate the cache" step. Delete the DB, run any command, done.

**Negative:**

- **Replay cost on every command.** At our scale (single-digit MB of JSONL, low thousands of events) the cost is in the tens of milliseconds inside a transaction. Imperceptible interactively, but it is a real per-command tax for agents that hammer the CLI.
- **Cost grows linearly with log size.** A log that grows to tens of MB will start to feel slow.


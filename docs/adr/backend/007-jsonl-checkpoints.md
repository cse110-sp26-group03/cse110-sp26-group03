# ADR-007: JSONL Checkpoints

## Status

**Proposed** | Accepted | Deprecated

**Date**: 2026-05-23

**Authors**: Ryan Le, TianLin Zhao, Ori Chason

---

## Context

For our issue tracker, we update our local DB with the JSONL log. In the event that we do something like a git pull, we need to be able to read only the lines that have been added to the JSONL file, and nothing more, to optimize our reading performance. However, to do this, we would need to use some type of checkpoint to remember where we last read the JSONL log.

## Considered Options

**Store the checkpoint value in the SQLite cache.** The checkpoint value is a hash we compute ourselves over the entire JSONL log, stored in the SQLite cache. On each run we re-hash the current JSONL log and check it against the stored hash to determine whether the log has changed: if the hashes match, nothing changed and we skip replay; if they differ — new events, a merge, etc. — we replay the log. We do not git diff every time to save time and sources.

**Git Notes / refs.** Store the offset as a git note or a lightweight ref tied to the commit SHA. On git pull, we know exactly which commit was last processed and can use *diff* to find new lines in the JSONL log. This ties the checkpoint to git state naturally, so there is no need to manage a separate file. However, does require additional config setup in .git as notes are not fetched automatically on git pulls.

**Embed the cursor in the JSONL log.** Reserve a known first line or use a trailer/footer convention where the last line is a checkpoint record. This is self-contained, so no need for separate files, but this combines data with metadata. Also adds complexity.

## Decision

We should use Option 1: Store the checkpoint value in the SQLite cache.

The checkpoint value is a hash of the entire JSONL log. Replay depends on this checkpoint — on every run it hashes the current `.manta/manta.jsonl` and compares the result against the stored checkpoint:

- If the hashes match, the log has not changed since the cache was last built, so replay is skipped.
- If the hashes differ — or no checkpoint has been stored yet — replay wipes the `issues` table and replays the entire log from scratch.

After a successful replay, and after a command appends its own event to the log, the checkpoint is updated to the hash so the next run can skip.

The checkpoint is purely a fast path — it lets us skip the rebuild when, and only when, the file is provably unchanged. We use a hash so a collision (a changed file that merged by git and would be wrongly skipped) is not a practical concern.

## Consequences

**Positive:**
- Simple: replay reduces to one question — did the file change? — with a full rebuild on "yes" and a skip on "no". No git diff parsing.
- Merge-safe: a git pull that merges changes, triggering a full replay. Because the rebuild reads the whole file, line ordering can never cause a teammate's event to be missed.

**Negative:**
- Requires to write code to compute the hash, compare it, and make it run automatically.
- The whole log is read and hashed on every run, even when nothing changed.
- Requires reading/writing the SQLite database on every append and sync.

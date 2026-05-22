# ADR-007: JSONL Checkpoints

## Status

**Proposed** | Accepted | Deprecated

**Date**: 2026-05-20 

**Authors**: Ryan Le, TianLin Zhao

---

## Context

For our issue tracker, we update our local DB with the JSONL log. In the event that we do something like a git pull, we need to be able to read only the lines that have been added to the JSONL file, and nothing more, to optimize our reading performance. However, to do this, we would need to use some type of checkpoint to remember where we last read the JSONL log.

## Considered Options

**Store the checkpoint value in the SQLite cache.** This is a relatively simple approach where we store the checkpoint value of where we stopped the JSONL log in the SQLite cache. We would then read 40-character Git Commit SHA (git rev-parse HEAD) when the database was last successfully synced. 

**Git Notes / refs.** Store the offset as a git note or a lightweight ref tied to the commit SHA. On git pull, we know exactly which commit was last processed and can use *diff* to find new lines in the JSONL log. This ties the checkpoint to git state naturally, so there is no need to manage a separate file. However, does require additional config setup in .git as notes are not fetched automatically on git pulls.

**Embed the cursor in the JSONL log.** Reserve a known first line or use a trailer/footer convention where the last line is a checkpoint record. This is self-contained, so no need for separate files, but this combines data with metadata. Also adds complexity.

## Decision

We should use Option 1: Store the git commit SHA in a SQLite cache.

Write to/change the checkpoint value in the SQLite database when we append to the JSONL log. This way, we are constantly up-to-date.
On post-git pull, the synchronization layer will read the stored SHA. It will then use Git's diff to instantly filter out and stream only the newly added lines from the JSONL log, inserting or replacing them into the local database.
## Consequences 

**Positive:**
- Git-Native Robustness: By leveraging git diff, the implementation remains unaffected by platform-specific file tracking differences.
- Zero Desynchronization Risk: Co-locating the checkpoint inside the SQLite local database means they are safe to create or delete by different users. The checkpoint is dropped automatically, causing the next run to correctly replay.

**Negative:**
- Requires reading/writing the SQLite database on every append and sync.
- Git Dependency: The application tightly couples its sync state to the local environment's Git history. The tool will fail to sync if run outside of a valid Git repository clone.

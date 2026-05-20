# ADR-007: JSONL Checkpoints

## Status

**Proposed** | Accepted | Deprecated

**Date**: 2026-05-20 

**Authors**: Ryan Le

---

## Context

For our issue tracker, we update our local DB with the JSONL log. In the event that we do something like a git pull, we need to be able to read only the lines that have been added to the JSONL file, and nothing more, to optimize our reading performance. However, to do this, we would need to use some type of checkpoint to remember where we last read the JSONL log.

## Considered Options

**Store the byte offset in separate file.** This is a relatively simple approach where we store the byte offset of where we stopped the JSONL log in a separate file. We would then read the offset, and skip all logs in JSONL until we reach the offset, and continue as normal. Allows for persistent memory but requires management of another file.

**Git Notes / refs.** Store the offset as a git note or a lightweight ref tied to the commit SHA. On git pull, we know exactly which commit was last processed and can use *diff* to find new lines in the JSONL log. This ties the checkpoint to git state naturally, so there is no need to manage a separate file. However, does require additional config set up in .git as notes are not fetched automatically on git pulls.

**Embed the cursor in the JSONL log.** Reserve a known first line or use a trailer/footer convention where the last line is a checkpoint record. This is self-contained so no need for separate files but this combines data with metadata. Also adds complexity.

## Decision

We should use Option 1: Store the byte offset in a separate file.

- Store the file alongside the JSONL log as a mutable JSON.
- Write to/change the byte offset in the JSON file when we append to the JSONL log. This way, we are constantly up-to-date.
- On git pull, read the byte offset in the JSON file to skip to the right place in the JSONL log.
- JSON must be in .gitignore as to not push to git.

## Consequences 

**Positive:**
- Trivial to implement: read/write JSON, seek to the correct offset.
- Rather easy to debug in the case of failure
- Considers technically inexperienced users: everything is in repo and local; Less set up required.
- Seek is < O(n), most likely to be constant time.

**Negative:**
- Requires reading/writing JSON file.
- It is another file to manage, clean up, and explain.
- Can break everything if it is pushed to git.

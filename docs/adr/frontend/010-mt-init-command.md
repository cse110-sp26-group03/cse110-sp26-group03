# ADR-010: `mt init` Command

## Status

Proposed | **Accepted** | Deprecated

**Date:** 2026-06-01
**Authors:** Scottin Pham

---

## Context

When multiple teammates use Manta in the same repo, git can hit merge conflicts on `.manta/manta.jsonl` because JSONL is an append-only file and git doesn't know how to merge it, it just sees two versions with different lines and conflicts.

The fix is a `.gitattributes` file in the repo root with:

```
.manta/manta.jsonl merge=union
```

This tells git to union-merge the file (append both sides) instead of conflicting. The user also needs to run `git config pull.rebase false` once in their repo so git uses merging instead of rebasing, since `merge=union` doesn't work with rebase.

Rather than asking users to set this up manually, `mt init` handles it automatically. It also sets up the `.manta/` folder upfront so users don't have to wait until their first `mt create` to initialize it.

### Considered Options

1. **`mt init` command** — runs once per repo, creates `.manta/`, writes `.gitattributes`, and prints the `git config` instruction to the user.

## Decision

**Option 1.**

Option 1 makes the setup explicit. You run it once when setting up a new repo. It also gives us a clean place to do all first-time setup in one command.

---

## Consequences

### Positive

- Users get clear instructions on what `mt init` does and what they still need to do (`git config pull.rebase false`)
- `.manta/` folder and `.gitattributes` are set up before any issues are created


### Negative

- The `git config pull.rebase false` step still requires manual action from the user and can't be automated

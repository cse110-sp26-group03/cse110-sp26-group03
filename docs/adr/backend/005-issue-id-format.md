# ADR-005: Issue ID Format

## Status
Accepted — 2026-05-18 by Ori, Nathan

## Context

Every Manta issue needs a unique ID that:

1. Stays unique across teammates working offline (no central coordinator).
2. Reads unambiguously when an agent writes it to a log and a human or another agent reads it back.
3. Stays short enough to type and to fit cleanly on a terminal line.
4. Low collision risk.

## Considered Options

1. **Sequential `manta-0001`, `manta-0002`, …** Readable and orderable, but two teammates working offline both pick the next available number and collide on `git pull`. Breaks our parallel-agent pitch.
2. **Random short suffix, plain base36.** Sidesteps offline collisions, but characters like `0`/`o` and `1`/`l` are visually ambiguous — costly when agents read IDs out of logs and feed them back into commands.
3. **Random short suffix, Crockford base32.** Same offline-safety as option 2, but the alphabet excludes the visually confusable characters (`I`, `L`, `O`, `U` are dropped). Designed for exactly this readability case.
4. **Per-user prefix (e.g., `manta-o-h53k`).** Makes cross-machine collisions structurally impossible, but adds complexity and a stable per-user identifier we don't currently need at our team size.

## Decision

Issue IDs take the form `manta-<suffix>` where `<suffix>` is a **4-character random Crockford base32 string, lowercased for display**.

Example: `manta-h3kp`

- **Alphabet:** `0123456789abcdefghjkmnpqrstvwxyz` (Crockford base32, dropping `i`, `l`, `o`, `u`).
- **Length:** 4 characters
- **Generation:** random per issue, no coordination between teammates.
- **Local uniqueness:** the `issues.id` column has a `UNIQUE` constraint in SQLite. On `INSERT`, if SQLite raises a uniqueness violation, the CLI regenerates the ID and retries — up to 5 attempts before erroring out. At our namespace size the retry path will essentially never fire; the cap exists to fail loudly rather than loop forever.

## Consequences

**Positive:**
- IDs are short enough to type and read on a terminal line.
- Crockford alphabet means an ID copied from a log into a command can't be misread by an agent or a human.
- Random generation removes the offline-collision failure mode that sequential IDs would introduce, aligning with the parallel-agent positioning.

**Negative:**
- IDs are not memorable in order. There is no "issue 7" — you can't infer which issue came first from the ID alone. 
- Cross-machine collisions are theoretically possible.

## References
- Crockford base32 specification: https://www.crockford.com/base32.html
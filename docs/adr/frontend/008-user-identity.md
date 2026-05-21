# ADR-008: User Identity: createdBy and updatedBy Fields

## Status
**Proposed** | Accepted | Deprecated    
**Date:** 2026-05-21  
**Authors:** Katie Ngo

---

## Context

When a user runs a create or update command, the event object requires `createdBy` and `updatedBy` fields to identify who performed the action. These fields need to be auto-filled without prompting the user for their name every time. The solution must be zero setup, work across all operating systems, and be fast enough to not impact CLI response times.

### Considered Options

1. **OS username (`process.env.USER` / `process.env.USERNAME`)**: Reads the logged-in user's account name directly from memory. Zero setup, always available, works on Mac, Linux, and Windows. This is what Beads uses. Returns account name not full name.

2. **Git config (`git config user.name`)**: Reads the name configured in `~/.gitconfig`. Returns a real human-readable name. Since manta is git-based, everyone on the team already has this set. It spawns a subprocess on every command which adds overhead, and returns empty if git name was never configured.

3. **Auto-created config file (`.manta/config.json`)**: Similar to Angel's proposal of a locally stored config file. On first run, automatically reads OS username or git name and saves it to a local config file. Gives users the ability to override their display name later. Downside is it adds a new file to the `.manta/` folder that needs to be gitignored, and adds complexity for a problem that option 1 already solves simply.

---

## Decision

We adopt Option 1: reading the OS username via `process.env.USER` (Mac/Linux) or `process.env.USERNAME` (Windows), with a fallback to `"local-user"` if neither is set.

```js
function get_actor() {
  return process.env.USER || process.env.USERNAME || "local-user";
}
```

`event.js` is responsible for calling `get_actor()` and stamping
`createdBy`, `updatedBy`, and `actor` on every event. `store.js` simply
writes whatever it receives.

This is the same approach used by Beads.

---

## Consequences

### Positive
- Zero setup. Works on every machine out of the box.
- No system call or file read. Just a memory lookup which is instant.
- Works on Mac, Linux, and Windows.
- Consistent with how Beads identifies users.
- No extra dependencies or config files needed.

### Negative
- Returns the OS account name, not a full name.
- User has no way to override their display name without changing their OS account name. Can be addressed in a future ADR if needed.
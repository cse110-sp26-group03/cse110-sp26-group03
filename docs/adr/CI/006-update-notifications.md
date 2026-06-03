# ADR-006: In-CLI Update Notifications

## Status

Proposed | **Accepted** | Deprecated

Date: 2026-05-29 (implemented 2026-06-03)  Authors: TianLin Zhao

---

## Context

A user who installed `mt` has no way to know a new version exists. The user would have to manually run `bun outdated -g` or check the Releases page, which almost no one does. The result is that most users stay on whatever version they first installed.

We need to notify users of newer versions directly within the CLI.

## Considered Options

1. **`update-notifier` npm package.** A widely used Node-ecosystem package (~50M weekly downloads) that handles the whole flow: on CLI launch, asynchronously queries the npm registry for the latest version, and prints a one-time boxed banner on subsequent runs if the local version is behind.  Requires Manta to actually be published to npm (i.e. ADR-005 Accepted).

2. **In-house check against the GitHub Releases API.** On launch, asynchronously fetch `https://api.github.com/repos/cse110-sp26-group03/Manta/releases/latest`, compare `tag_name` to the local `package.json` version, and print a banner if behind. We write and maintain the caching ourselves. 


3. **Opt-in `mt update-check` subcommand.** A dedicated command (`mt update-check`) the user runs when curious. No automatic check on launch.

## Decision

**Option 1: `update-notifier`.**

This problem is solved well by an existing package; rolling our own (Option 2) is several hundred lines of code to reproduce what `update-notifier` already does correctly. Options 3 and 4 are equivalent to doing nothing in practice — the whole point of this ADR is that manual checks don't happen, so a solution that depends on the user manually checking misses the point.

The check is asynchronous and non-blocking, runs at most once per 24h, and is opt-out-able via the standard `NO_UPDATE_NOTIFIER=1` environment variable. The upgrade message points users at `bun update -g manta-it` rather than `npm update`, because per [ADR-005](./005-distribution-packaging.md) `npm install -g` does not work on Windows for Manta.

## Consequences

**Positive:**

- Users discover new versions without having to remember to check.
- Negligible implementation cost — one dependency, ~5 lines of glue code.
- No impact on `mt`'s startup latency (the check is async and the banner is deferred to the next run).
- Respects the user's network: at most one registry call per day per machine, with a documented opt-out.

**Negative:**

- Adds a dependency on `update-notifier` and its transitive deps, plus a once-per-day request from the user's machine to the npm registry.

## References

- `update-notifier` package: https://github.com/yeoman/update-notifier
- [ADR-004 (CI)](./004-changelog-pipeline.md): release automation that produces the versions this ADR checks for
- [ADR-005 (CI)](./005-distribution-packaging.md): npm publication, prerequisite for this ADR
- [ADR-001 (versioning)](../versioning/001-version-location.md): the `package.json` `version` field this ADR reads at runtime

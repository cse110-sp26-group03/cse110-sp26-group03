# ADR-001: Deployment Strategy

## Status

**Accepted** | Proposed | Deprecated

Date: 2026-05-24 (revised 2026-06-03)  Authors: TianLin Zhao

---

## Context

Our team has established a CI pipeline to validate code before it merges into main. However, we currently lack an automated system to handle post-merge deployment for our CLI application, manta. Because a CLI tool runs locally on the client's machine rather than on a centralized server, the primary challenge is determining how to automatically build, distribute, and trigger redeployments/updates for manta on the user side whenever changes are made to the software.

## Considered Options

1. **Automated GitHub Release on tag push.** Trigger a release workflow whenever a version tag (e.g., `vX.Y.Z`) is pushed. The pipeline creates a GitHub Release and uses the matching `CHANGELOG.md` section as the release notes. Keeps distribution entirely within GitHub. Downside: tags must be created and pushed manually, and users have to manually download/install.

2. **Publish to the npm registry.** Use the release workflow to publish the package to npm so users can install/upgrade via `bun install -g manta-it`. Introduces npm credentials and packaging requirements, but enables one-command install + a clean upgrade path. This option is the basis of [ADR-005 (CI): Distribution & Packaging](../CI/005-distribution-packaging.md).

3. **Fully automated semantic-release on push to main.** Use [`semantic-release`](https://github.com/semantic-release/semantic-release) to read [Conventional Commits](https://www.conventionalcommits.org/) on every push to `main`, automatically determine the next version, update `CHANGELOG.md`, commit/tag back to the repo, create the GitHub Release, and (optionally) publish to npm. No human bumps versions or pushes tags. Requires the team to write commits in Conventional Commits format and a GitHub App / PAT with permission to push back to a protected `main`.

## Decision

**Use Option 3, performing both Option 1 (GitHub Release) and Option 2 (npm publish) as part of the same pipeline.**

Option 1 alone requires a human to remember to bump `package.json`, edit `CHANGELOG.md`, tag the commit, and push the tag — every step a chance to forget or get wrong. Option 3 eliminates that manual work entirely: the commit messages on `main` are the only input, and the pipeline decides the rest. Adding Option 2 on top (the npm publish step) gives users the install/upgrade path required by [ADR-005](../CI/005-distribution-packaging.md), at the cost of one extra plugin in the same workflow.

## Consequences

**Positive:**

- Zero-touch releases: merging a Conventional-Commit PR to `main` produces a version bump, changelog entry, GitHub Release, and npm publish with no manual steps.
- Version numbers are derived from commit semantics, so they accurately reflect what changed.
- Users get a clean install path (`bun install -g manta-it`) and a stable place to read release notes (GitHub Releases).
- The same pipeline serves both audiences: humans reading the Releases page, and tooling pulling from npm.

**Negative:**

- The pipeline only works if commits follow Conventional Commits — a non-conforming commit on `main` will either be ignored or mis-categorized. This requires team discipline.

## References

- Issue #75: [CD] Set up CD Pipeline
- [ADR-005 (CI): Distribution & Packaging](../CI/005-distribution-packaging.md) — the npm-publish decision this ADR implements.
- [ADR-004 (CI): Changelog Pipeline](../CI/004-changelog-pipeline.md) — the changelog-automation decision this ADR implements.
- [ADR-006 (CI): In-CLI Update Notifications](../CI/006-update-notifications.md) — how users learn that a new release exists.
- [ADR-001 (versioning): Version Location](../versioning/001-version-location.md)
- `semantic-release`: https://github.com/semantic-release/semantic-release
- Conventional Commits: https://www.conventionalcommits.org/

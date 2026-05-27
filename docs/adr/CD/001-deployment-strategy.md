# ADR-001: Deployment Strategy

## Status

Accepted | **Proposed** | Deprecated

Date: 2026-05-24  Authors: TianLin Zhao

---

## Context

Our team has established a CI pipeline to validate code before it merges into main. However, we currently lack a automated system to handle post-merge deployment for our CLI application, manta.
Because a CLI tool runs locally on the client's machine rather than on a centralized server, the primary challenge is determining how to automatically build, distribute, and trigger redeployments/updates for manta on the user side whenever changes are made to the software.

## Considered Options

1. **Automated GitHub Release on tag push.** We can leverage GitHub Actions to trigger a release workflow whenever a version tag (e.g., vX.Y.Z) is pushed. The pipeline will push the new version to the GitHub Releases page. This approach fits perfectly into our current versioning setup and keeps our distribution entirely within GitHub without managing external registries. However, it requires users to manually download and install the new version.

2. **Publish to the npm registry.** This option uses the release workflow to publish the package to the npm registry using Bun's publishing tools, allowing users to install and upgrade via standard package manager commands (e.g., npm update). However, this approach introduces additional complexity in managing npm credentials and ensuring the package is correctly configured for public distribution.


## Decision

**Use Option 1: an automated GitHub Release on tag push.** We will create a `.github/workflows/release.yml` that triggers on `v*.*.*` tags. The pipeline will create a GitHub Release for the tag and use the matching section of `CHANGELOG.md` as the release notes.

**workflow**: bump `package.json` → add a `CHANGELOG.md` entry → tag the commit `vX.Y.Z` → **push the tag**

## Consequences

**Positive:**
- Zero friction: pushing the version tag automatically deploys the release.
- No need to manage npm registry credentials or worry about package configuration for public distribution.
- Users can easily access release notes and download, which is familiar to many developers.

**Negative:**
- The pipeline does not itself provide an update mechanism — updating means `git pull` (or re-downloading the source archive) and re-running `bun install`. A self-update command (`mt --update`) can be built on top of GitHub Releases later.

## References
- Issue #75: [CD] Set up CD Pipeline
- ADR versioning/001: [Version Location](../versioning/001-version-location.md)
- GitHub Actions — events that trigger workflows: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#push
- `softprops/action-gh-release` (community action for creating GitHub Releases): https://github.com/softprops/action-gh-release

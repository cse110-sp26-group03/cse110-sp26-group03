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

## Consequences

**Positive:**

**Negative:**

## References

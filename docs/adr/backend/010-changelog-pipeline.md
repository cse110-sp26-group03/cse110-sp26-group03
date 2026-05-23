# ADR-010: Integrating Changelog into our CI Pipeline

## Status

**Proposed** | Accepted | Deprecated

Date: 2026-05-22

Authors: Ryan Le, Nathan Lin

---

## Context

Our current changelog requires updating manually. As we are human, it cannot be guaranteed that everyone is able to edit the changelog every time.
Here arises the necessity of integrating the changelog into our CI pipeline, which automatically adds changes to the changelog and automatically 
decides the Semantic Version.


## Considered Options

### 1. Format w/ Conventional Commits + automated release tagging w/ Semantic Release + branching model (Git Flow)
- Conventional commits allows commit messages to follow a specific structured format, like `feat: add user login` or `fix: resolve null pointer`.
- Semantic-release fully automates the release: analyzes commits, determines the SemVer version, and generates a changelog
- Completely hands-free
- Git Flow is a framework for branch modeling, having dedicated long-lived branches specifically for development, fixes, and releases (so that it knows when to create/update the changelog and how to determine the version)

### 2. Format w/ Conventional Commits + automated release tagging w/ Semantic Release + trunk-based development
- Similar to option 1, but uses trunk-based development plus release branches
- `main` branch is always releasable; other branches are short-lived
- Ability to configure semantic-release to treat branches as a maintenance channel
- Prerelease channels like `beta` are supported natively by semantic-release

### 3. Format w/ Conventional Commits + automated release tagging w/ release-please
- Release-please, unlike semantic-release, gives some control back to the user/developer by allowing humans to decide when to cut a release.
- Still automatically updates changelog and determines semver version.
  
## Decision

## Consequences

**Positive:**

**Negative:**

## References

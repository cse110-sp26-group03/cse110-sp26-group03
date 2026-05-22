# ADR-001: Version Location

## Status
Proposed — 2026-05-22 by TianLin Zhao

## Context

Per spec from Helena, Manta needs to adopt versioning using [SemVer](https://semver.org/) — a `MAJOR.MINOR.PATCH` scheme that communicates the nature of changes between releases.

Before we can version releases, we need to decide **where the version number lives**. Right now Manta has two places that already carry a version, and they disagree:

- `package.json` declares `"version": "0.0.1"`.
- `CHANGELOG.md` states the project "follows Semantic Versioning" and already has a `[0.1.0]` entry.

This inconsistency is exactly the problem this ADR exists to fix: without a single agreed-upon source, no one can say what version Manta actually is. This ADR decides the fixed storage location for the version; other files (changelog, CLI output, ...) should get the version from it.

## Considered Options

1. **`package.json` `version` field.** The npm-standard location for a package's version. Manta is already an npm/Bun package with a `bin` entry (`mt`), so this field already exists. A `mt --version` command can read it at runtime. Crucially, the external toolchain assumes it: `npm version`, `bun`, and automated-release tools read and bump *this field* by default, and publishing to the npm registry or cutting GitHub Releases keys off the same field. 
2. **Dedicated `VERSION` file at repo root.** A plain-text file holding only the version string — trivial to read at runtime. But standard tooling is blind to it: `npm version`, `bun`, and release automation only ever modify `package.json`, so a `VERSION` file would have to be kept in sync by hand-written scripts. And since `package.json`'s `version` field exists regardless, every release means updating `VERSION` *and* remembering to also update `package.json` — two places to maintain instead of one.
3. **A `src/version.js` exported constant.** The version lives as code, so the CLI can import it directly. Like the `VERSION` file it is invisible to release tooling, but its failure mode is quieter: you bump the constant and `package.json`'s `version` is left stale, so the two silently drift apart over time.

## Decision

**`package.json`'s `version` field is the single source of truth for Manta's version.**

Supporting roles, all derived from that field:

- **CLI:** add a `mt --version` (and/or `mt version`) command that reads `version` from `package.json` at runtime and prints it. No hardcoded constant.
- **`CHANGELOG.md`:** continues to document every release with a `## [x.y.z] - YYYY-MM-DD` entry. It is human-maintained release notes; its latest version heading must match `package.json`.
- **Git tags:** each release is tagged `vX.Y.Z` on GitHub to mark the commit.

**Workflow for releasing a new version: update** `package.json` → add a `CHANGELOG.md` entry → tag the commit `vX.Y.Z`.

## Consequences

**Positive:**
- A fixed location; every other place either derives from it or is a documentation/tagging convention.
- `package.json` `version` is the ecosystem standard —  standard scripts can bump it.
- `mt --version` reflects the real shipped version because it reads the same field, with no constant to forget.

**Negative:**
- The changelog and git tag are still updated by hand, so a release can ship with a mismatched changelog entry or missing tag if the process is not followed. 
- Reading `package.json` at runtime means the CLI must resolve its own package root, which needs care across install locations.

## References
- SemVer specification: https://semver.org/
- npm `package.json` `version` field: https://docs.npmjs.com/cli/v10/configuring-npm/package-json#version
- Issue #74: [Docs] Add Versioning

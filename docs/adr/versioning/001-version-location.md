# ADR-001: Version Location

## Status

Proposed | **Accepted** | Deprecated

Date: 2026-05-23  Authors: TianLin Zhao

Revised: 2026-05-29 — release workflow now delegated to ADR-004 (semantic-release). The decision in this ADR (location of the version field) is unchanged; only the "how the field gets bumped" paragraph has been updated to reflect the automated pipeline now in place on `main`.

---

## Context

Manta has more than one location carrying a version number, and they currently disagree. Without a single agreed-upon source, no one can say what version Manta actually is. This ADR decides the fixed storage location for the version; other files (changelog, CLI output, ...) should derive from it.

## Considered Options

1. **`package.json` `version` field.** The npm-standard location for a package's version. Manta is already an npm/Bun package with a `bin` entry (`mt`), so this field already exists. A CLI subcommand (e.g. `mt version`) can read it at runtime. Crucially, the external toolchain assumes it: `npm version`, `bun`, and automated-release tools read and bump *this field* by default, and publishing to the npm registry or cutting GitHub Releases keys off the same field. 
2. **Dedicated `VERSION` file at repo root.** A plain-text file holding only the version string — trivial to read at runtime. But standard tooling is blind to it: `npm version`, `bun`, and release automation only ever modify `package.json`, so a `VERSION` file would have to be kept in sync by hand-written scripts. And since `package.json`'s `version` field exists regardless, every release means updating `VERSION` *and* remembering to also update `package.json` — two places to maintain instead of one.
3. **A `src/version.js` exported constant.** The version lives as code, so the CLI can import it directly. Like the `VERSION` file it is invisible to release tooling, but its failure mode is quieter: you bump the constant and `package.json`'s `version` is left stale, so the two silently drift apart over time.

## Decision

**`package.json`'s `version` field is the single source of truth for Manta's version.**

Supporting roles, all derived from that field:

- **CLI:** `mt version` reads `version` from `package.json` at runtime and prints it (no hardcoded constant). This is a **subcommand**, not a global flag — `mt --version` is intentionally unsupported.
- **`CHANGELOG.md`:** continues to document every release with a `## [x.y.z] - YYYY-MM-DD` entry. It is human-maintained release notes; its latest version heading must match `package.json`.
- **Git tags:** each release is tagged `vX.Y.Z` on GitHub to mark the commit.

**Workflow for releasing a new version:** delegated to [ADR-004](../CI/004-changelog-pipeline.md). On every push to `main`, `semantic-release` reads the new conventional commits, bumps `package.json`'s `version` field, appends a matching `## [x.y.z] - YYYY-MM-DD` entry to `CHANGELOG.md`, commits both files back to `main` with `chore(release): x.y.z [skip ci]`, and creates the `vX.Y.Z` git tag plus GitHub Release. All three locations (`package.json`, `CHANGELOG.md`, the tag) stay in sync because they are produced in one job from the same commits — which is exactly what this ADR's "single source of truth" choice was meant to enable.

## Consequences

**Positive:**
- A fixed location; every other place either derives from it or is a documentation/tagging convention.
- `package.json` `version` is the ecosystem standard —  standard scripts can bump it.
- `mt version` reflects the real shipped version because it reads the same field, with no constant to forget.

**Negative:**
- The failure mode shifts from the release step to the commit step: because `semantic-release` derives the version from commit messages, a mis-typed prefix (`feat:` vs `fix:` vs `chore:`) produces the wrong version bump or no release at all. Mistakes now happen at commit time, not release time, and are harder to spot in review.

## References
- SemVer specification: https://semver.org/
- npm `package.json` `version` field: https://docs.npmjs.com/cli/v10/configuring-npm/package-json#version
- [ADR-004 (CI)](../CI/004-changelog-pipeline.md): Changelog and release automation via `semantic-release` — the workflow this ADR delegates to.
- Issue #74: [Docs] Add Versioning

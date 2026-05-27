# Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to automate versioning and changelog generation via semantic-release.

## Format

```
<type>(<optional scope>): <description>

<optional body>

<optional footer>
```

## Types

| Type       | Description                          | Version Bump |
| ---------- | ------------------------------------ | ------------ |
| `feat`     | A new feature                        | Minor        |
| `fix`      | A bug fix                            | Patch        |
| `docs`     | Documentation only                   | None         |
| `style`    | Formatting, missing semicolons, etc. | None         |
| `refactor` | Code change that neither fixes a bug nor adds a feature | None |
| `perf`     | Performance improvement              | Patch        |
| `test`     | Adding or updating tests             | None         |
| `build`    | Changes to build system or dependencies | None      |
| `ci`       | Changes to CI configuration          | None         |
| `chore`    | Other changes that don't modify src or test files | None |

## Breaking Changes

To trigger a **major** version bump, add `BREAKING CHANGE:` in the commit footer:

```
feat: replace storage backend

BREAKING CHANGE: the storage API has been completely redesigned
```

Or use `!` after the type:

```
feat!: replace storage backend
```

## Examples

```
feat: add event filtering to CLI
```
```
fix: resolve null pointer in parser
```
```
feat(cli): support checkpoint exports
```
```
docs: update README with setup instructions
```
```
fix(storage): handle missing directory on first run
```
```
refactor: extract validation into separate module
```

## What Triggers a Release

Only commits with the following types generate a new version when merged to `main`:

- `feat` → minor bump (1.0.0 → 1.1.0)
- `fix` → patch bump (1.0.0 → 1.0.1)
- `perf` → patch bump (1.0.0 → 1.0.1)
- `BREAKING CHANGE` → major bump (1.0.0 → 2.0.0)

All other types (`docs`, `style`, `refactor`, `test`, `build`, `ci`, `chore`) do **not** trigger a release. They will still appear in the changelog of the next release that includes a version-bumping commit.

# How to format contributions to the repo:

## Branching 

**Always** work in your own branch. **DO NOT MAKE COMMITS TO MAIN!**

Only exception is *tiny* documentation changes. Bulk of all work should be made to a separate branch.

Most work should happen on a separate branch, then be merged through a pull request.

### Branch naming format

Use:

`type/short-description`

Examples:

- `feature/issue-card`
- `feature/filter-issues`
- `fix/local-storage-bug`
- `docs/sprint-planning`
- `test/issue-model-tests`
- `refactor/render-logic`

### Branch types

- `feature/` = new user-facing feature
- `fix/` = bug fix
- `docs/` = documentation or meeting notes
- `test/` = adding/updating tests
- `refactor/` = code cleanup without changing behavior
- `chore/` = tooling, config, repo setup

## Committing

Make commits to *your* working branch!

Please use **Conventional Commit formatting**:

```
type: short description
```

Examples:

```txt
feat: add issue creation modal
fix: resolve navbar overlap bug
docs: update sprint planning notes
test: add issue parser tests
style: adjust spacing on dashboard cards
refactor: simplify filter logic
chore: configure eslint
```

## Commit Types

| Type | Purpose |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `test` | Tests |
| `style` | Styling/UI-only changes |
| `refactor` | Code cleanup without behavior changes |
| `chore` | Tooling/configuration |


## GitHub Issues

All tasks should be tracked through GitHub Issues whenever possible.

### Issue Titles

Examples:

```
[Frontend] Add issue card component
[Backend] Create local storage service
[Docs] Add sprint retrospective
```

### Issue Template

```md
## Description
What needs to be done?

## Acceptance Criteria
- [ ]

## Notes
Optional details, blockers, or references
```

## Pull Requests

Pull Requests should include:

- clear description of changes
- linked issue
- testing notes if applicable

### PR Template

```md
## What changed?
-

## Related issue
-

## Testing done
-

## Checklist
- [ ] Tested locally
- [ ] Updated documentation if needed
- [ ] Linked related issue
```

## Changelog

Important project changes should be recorded in `CHANGELOG.md`.

The changelog does NOT need to be updated for every commit.

Update it for:
- major feature merges
- milestone completions
- important fixes
- sprint releases

Example:

```md
## [0.2.0] - 2026-05-15

### Added
- Issue filtering system
- Dashboard layout

### Fixed
- Local storage persistence bug
```

## Versioning

This project uses Semantic Versioning:

```
MAJOR.MINOR.PATCH
```

Examples:

```
v0.1.0
v0.2.0
v1.0.0
```

General guidelines:
- PATCH = bug fixes
- MINOR = new features
- MAJOR = breaking/large changes

## AI Usage

If GenAI tools are used for significant development work, document usage in:

```
genai-log.md
```

Include:
- tool used
- purpose
- what output was used
- human modifications/review

## Workflow

1. Pull the latest `main`.

```bash
git checkout main
git pull origin main
```

2. Create a new branch.

```
git checkout -b feature/short-description
```

3. Commit work using Conventional Commits.

```
git commit -m "feat: add issue card component"
 ```

4. Push the branch.
   
```
git push origin feature/short-description
```

5. Open a pull request into main.
6. Link the related GitHub Issue in the PR.
7. Wait for CI checks to pass.
8. Ask for review if the change is large, risky, or over 300 lines of code.
9. Merge after approval/checks
10. Update Changelog

# Documentation Guide

Quick reference for reviewers and teammates. Lists **all** project documentation in this repository and how the pieces relate.

## How documentation fits together

When sources disagree, use this priority:

1. **`specs/spec.md`** — course project requirements and deliverables
2. **`docs/adr/`** (status **Accepted**) — official architecture decisions
3. **`CONTRIBUTING.md`** — how the team works (branching, PRs, commits)
4. **`docs/design/`** — informal drafts (context only)
5. **In-code docs** — JSDoc in `src/` and `src/storage/schema.sql` (implementation detail)

---

## Repository documentation index

### Repo root

| File | Purpose |
|------|---------|
| [`README.md`](../README.md) | Project entry point — team page link and Agile status video |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Branching, PR workflow, commit conventions, team process |
| [`CHANGELOG.md`](../CHANGELOG.md) | SemVer release history (template + version entries) |
| [`genai-log.md`](../genai-log.md) | Transparency log for significant GenAI-assisted work |

### `specs/`

| File | Purpose |
|------|---------|
| [`specs/spec.md`](../specs/spec.md) | CSE 110 project spec — Agile/process requirements, tooling, grading context |

### `docs/` (this folder)

| Path | Purpose |
|------|---------|
| **`README.md`** | This guide |
| **`design/`** | Informal design artifacts (preferred location for new drafts) |
| **`adr/`** | Official Architecture Decision Records |

#### `docs/design/` (informal)

| File | Description |
|------|-------------|
| [`cli-input-output.md`](design/cli-input-output.md) | Rough CLI command and I/O reference |
| [`user-flow-diagram.drawio`](design/user-flow-diagram.drawio) | User flow diagram (Draw.io) |
| [`Frontend Web Design Plan.pdf`](design/Frontend%20Web%20Design%20Plan.pdf) | Frontend web UI plan (PDF) |

#### `docs/adr/` (official)

Grouped by area; each folder uses its own `001`, `002`, … numbering.

**`adr/frontend/`**

| File | Topic |
|------|--------|
| [`001-cli-parser-in-house.md`](adr/frontend/001-cli-parser-in-house.md) | In-house CLI parser |
| [`002-input-validation-in-house.md`](adr/frontend/002-input-validation-in-house.md) | In-house input validation helpers |
| [`003-sqlite-access-bun-sqlite.md`](adr/frontend/003-sqlite-access-bun-sqlite.md) | Storage layer / `store.js` (frontend view) |
| [`004-event-issue-object.md`](adr/frontend/004-event-issue-object.md) | Issue event object schema |
| [`005-parsed-issue-object.md`](adr/frontend/005-parsed-issue-object.md) | Parsed issue object schema |
| [`006-error-message-format.md`](adr/frontend/006-error-message-format.md) | Error message formatting |
| [`007-data-driven-flag-validation.md`](adr/frontend/007-data-driven-flag-validation.md) | Data-driven CLI flag validation |
| [`008-user-identity.md`](adr/frontend/008-user-identity.md) | `createdBy` / `updatedBy` fields |

**`adr/backend/`**

| File | Topic |
|------|--------|
| [`001-storage-layer.md`](adr/backend/001-storage-layer.md) | JSONL log + SQLite cache |
| [`002-using-bun.md`](adr/backend/002-using-bun.md) | Bun vs Node.js runtime |
| [`003-performance-optimization.md`](adr/backend/003-performance-optimization.md) | CLI performance |
| [`004-migrating-from-beads.md`](adr/backend/004-migrating-from-beads.md) | Migration from Beads |
| [`005-issue-id-format.md`](adr/backend/005-issue-id-format.md) | Issue ID format (`manta-…`) |
| [`006-store-js.md`](adr/backend/006-store-js.md) | `store.js` responsibilities |
| [`007-cache-sync.md`](adr/backend/007-cache-sync.md) | SQLite cache sync from the JSONL log |
| [`008-error-message-format.md`](adr/backend/008-error-message-format.md) | Backend error message format |

**`adr/CI/`**

| File | Topic |
|------|--------|
| [`001-eslint-linter.md`](adr/CI/001-eslint-linter.md) | ESLint |
| [`002-prettier-code-formatter.md`](adr/CI/002-prettier-code-formatter.md) | Prettier |

**ADR naming:** `NNN-topic-slug.md`; title inside: `# ADR-NNN: …` (number is **per folder**, not global).

**ADR status:** Each file has a **Status** section. **Bold** marks the current state:

| Status | Meaning |
|--------|---------|
| **Proposed** | Under discussion; not adopted yet |
| **Accepted** | Team decision — review and implement against this |
| **Deprecated** | Superseded or rejected — historical only; see newer ADRs |

Example: `Accepted \| **Proposed** \| Deprecated` → currently **Proposed**.

Ignore stray placeholder files in `adr/` folders (e.g. drafts marked for deletion).

---

### `admin/` (course & team process)

Not architecture docs; required for course process evidence.

| Path | Purpose |
|------|---------|
| [`admin/team.md`](../admin/team.md) | Team roster and roles |
| [`admin/misc/rules.md`](../admin/misc/rules.md) | Group contract (communication, accountability) |
| [`admin/misc/rules-*.pdf`](../admin/misc/) | Signed individual rule agreements (per member) |
| [`admin/meetings/`](../admin/meetings/) | Meeting notes (`meeting01`–`meeting13`, etc.) |
| [`admin/meetings/standups/`](../admin/meetings/standups/) | Standup logs (e.g. `sprint1.md`) |
| [`admin/meetings/sprint-review/`](../admin/meetings/sprint-review/) | Sprint review writeups (`review1.md`, `review2.md`) |
| [`admin/meetings/pre-meeting-plans/`](../admin/meetings/pre-meeting-plans/) | Pre-meeting agendas |
| [`admin/videos/`](../admin/videos/) | Team intro and Agile status videos |
| [`admin/photos/`](../admin/photos/) | Team photos |
| [`admin/branding/`](../admin/branding/) | Logo/color assets used in admin materials |

---

### Branding & assets

| Path | Purpose |
|------|---------|
| [`admin/branding/`](../admin/branding/) | Team logos and color assets; palette and font notes in [`admin/branding/details.txt`](../admin/branding/details.txt) |
| [`assets/images/`](../assets/images/) | Shared images (e.g. [`team_logo.jpg`](../assets/images/team_logo.jpg)) |

---

### `.github/` (templates & automation)

| Path | Purpose |
|------|---------|
| [`.github/ISSUE_TEMPLATE/standard-issue-template.md`](../.github/ISSUE_TEMPLATE/standard-issue-template.md) | Default GitHub issue template (description, acceptance criteria) |
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | CI pipeline (tests, quality checks) |
| [`.github/workflows/prettier.yml`](../.github/workflows/prettier.yml) | Prettier formatting workflow |

Work tracking lives in **GitHub Issues** (not checked into the repo as files).

---

### Source code documentation (`src/`)

Maintained alongside implementation (see also backend/frontend ADRs).

| Path | Purpose |
|------|---------|
| [`src/storage/schema.sql`](../src/storage/schema.sql) | SQLite schema |
| [`src/storage/store.js`](../src/storage/store.js) | Storage API (JSDoc) |
| [`src/storage/db.js`](../src/storage/db.js) | Database access (JSDoc) |
| [`src/cli/`](../src/cli/) | CLI parser and commands |
| [`src/validation/validation.js`](../src/validation/validation.js) | Validation helpers |

---

## For reviewers

1. Read this file (`docs/README.md`).
2. Skim [`specs/spec.md`](../specs/spec.md) for course expectations.
3. Review **Accepted** ADRs in [`docs/adr/`](adr/) for the area you are grading (`frontend`, `backend`, or `CI`).
4. Check [`CONTRIBUTING.md`](../CONTRIBUTING.md), [`CHANGELOG.md`](../CHANGELOG.md), and [`genai-log.md`](../genai-log.md) for process and transparency.
5. Use [`admin/`](../admin/) for meetings, standups, sprint reviews, and team contract evidence.
6. Treat [`docs/design/`](design/) as informal context only.

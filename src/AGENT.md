# Agent Guide for Manta

This file tells you everything you need to use Manta from the terminal. Manta is an issue tracker. You can create, update, close, delete, and view issues using the `mt` command. All data is stored locally in this repo under `.manta/`.

## Quick Reference

```
mt create "title" [flags]        create a new issue
mt update manta-xxxx [flags]     update fields on an existing issue
mt close manta-xxxx              close an issue (sets status to closed)
mt delete manta-xxxx             delete an issue permanently
mt view                          list all open issues
mt view manta-xxxx               view a specific issue in detail
mt view [flags]                  filter the issue list
mt version                       print the installed version of Manta
mt init                          set up Manta in the current repo (run once per repo)
mt sync                          rebuild local SQLite cache from the JSONL log
mt clear [path]                  erase all issues from the log
mt migrate <path>                import issues from a Beads JSONL export
```

## Rules

### For agents

- Always run `mt view` at the start of a session to get the current state of open issues before doing any work
- When picking up an issue, mark it in progress first: `mt update manta-xxxx --status in_progress`
- Only work on one issue at a time unless the user explicitly says otherwise
- When you finish an issue, close it: `mt close manta-xxxx`
- Do not delete issues unless the user prompts you to
- Do not create issues on your own. Wait for the user to create them, unless the user explicitly gives you permission to do so
- If you are blocked or unsure, update the issue status and leave a note in the description rather than proceeding with assumptions: `mt update manta-xxxx --status blocked --desc "blocked: need clarification on X"`

### For humans

- Create issues before asking an agent to work on them
- Assign a clear title, priority, and type so the agent has enough context to act without asking for clarification
- Review the agent's work before closing issues if the task involved significant code changes
- Use `mt view` to check the current state of issues before and after an agent session

## Issue IDs

Every issue has a unique ID in the format `manta-xxxx` where `xxxx` is a 4-character string using the Crockford base32 alphabet (e.g. `manta-h3kp`).

The ID is assigned automatically when an issue is created. You cannot choose or change it.

If you are migrating from Beads, issue IDs may have a different suffix length (e.g. `manta-h3k` with 3 characters). These are still valid Manta IDs and all commands work the same way with them.

When a command requires an ID, you can use either the full ID or just the suffix:

```
mt close manta-h3kp    full ID
mt close h3kp          short ID — Manta adds manta- automatically
```

## Commands

### `mt create`

Creates a new issue. Title is required, all other flags are optional.

```
mt create "title" [--desc <text>] [--priority <p0-p9>] [--status <status>] [--type <type>] [--assignee <name>]
```

| Flag         | Short | Description                                      | Default  |
| ------------ | ----- | ------------------------------------------------ | -------- |
| `--title`    | `-t`  | Issue title (max 50 chars)                       | required |
| `--desc`     | `-d`  | Longer description (max 512 chars)               | empty    |
| `--priority` | `-p`  | Priority level: `p0`–`p9` (p0 is highest)        | `p5`     |
| `--status`   | `-s`  | Initial status: `open`, `in_progress`, `blocked` | `open`   |
| `--type`     | —     | Type: `bug`, `feature`, `task`, `docs`, `store`  | `task`   |
| `--assignee` | `-a`  | Who is working on this issue (letters only)      | empty    |

> [!NOTE]
> `closed` is not a valid status on create. Use `mt close` to close an issue.

#### Examples

```bash
$ mt create "Mobile friendly screens"
$ mt create "Fix bug" --priority p1 --type bug
$ mt create "Add documentation" --desc "Description of pros and cons" --assignee Ryan
```

**Output:**

```
Created issue manta-h3kp: Mobile friendly screens
Created issue manta-ar10: Fix bug
Created issue manta-nmec: Add documentation
```

### `mt update`

Updates one or more fields on an existing issue. ID and at least one flag are required.

```
mt update manta-xxxx [--title <text>] [--desc <text>] [--priority <p>] [--status <s>] [--type <t>] [--assignee <name>]
```

| Flag         | Short | Description                                            |
| ------------ | ----- | ------------------------------------------------------ |
| `--title`    | `-t`  | New title                                              |
| `--desc`     | `-d`  | New description                                        |
| `--priority` | `-p`  | New priority: `p0`–`p9`                                |
| `--status`   | `-s`  | New status: `open`, `in_progress`, `blocked`, `closed` |
| `--type`     | —     | New type: `bug`, `feature`, `task`, `docs`, `store`    |
| `--assignee` | `-a`  | New assignee                                           |

#### Examples

```bash
$ mt update h3kp --status in_progress --priority p0
$ mt update manta-h3kp --status in_progress --priority p0
```

**Output:**

```
Updated issue manta-h3kp with priority=p0, status=in_progress, updatedAt=..., updatedBy=...
```

> [!NOTE]
> All commands requiring a Manta ID accept the full ID (`manta-xxxx`) or just the suffix (`xxxx`).

### `mt close`

Marks an issue as closed by setting its status to `closed`. Only the ID is required.

```
mt close manta-xxxx
```

#### Examples

```bash
$ mt close manta-h3kp
$ mt close h3kp
```

**Output:**

```
Closed issue manta-h3kp
```

### `mt delete`

Permanently deletes an issue. Only the ID is required. On an interactive terminal, Manta will ask for confirmation before deleting.

```
mt delete manta-xxxx
```

#### Examples

```bash
$ mt delete manta-h3kp
$ mt delete h3kp
```

**Output (confirmed):**

```
Delete issue manta-h3kp? [y/N] y
Deleted issue manta-h3kp
```

**Output (cancelled):**

```
Delete issue manta-h3kp? [y/N] N
Deletion cancelled.
```

> [!NOTE]
> Deletion is permanent and cannot be undone. Do not delete issues unless the user explicitly asks.

### `mt view`

Lists issues or shows the detail of a single issue.

#### List all open issues

```bash
$ mt view
```

Shows a paginated table. Use left/right arrow keys to navigate pages. Press ESC to exit.

**Output:**

```
ID      TITLE                                    STATUS      PRIORITY  TYPE    ASSIGNEE    CREATED BY
------------------------------------------------------------------------------------------------------
g1xy    issue 1                                  open        p0        task    -           katie
z1t9    issue 3                                  open        p1        bug     kngo        katie
n1vm    issue 2                                  open        p1        task    -           katie

< prev.    next >
Page 1 of 2

Press ESC to exit
```

#### View a single issue

```bash
$ mt view manta-t4pd
$ mt view t4pd
```

Shows the full detail of a single issue. Press ESC to exit.

**Output:**

```
issue 6                                                                manta-t4pd
----------------------------------------------------------------------------------
<no description>

----------------------------------------------------------------------------------
Priority: p5                                    Status: open
Assignee: -                                     Type: task
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Created by: katie @ 2026-06-05 18:51 PDT
Updated by: katie @ 2026-06-05 18:51 PDT

Press ESC to exit
```

#### Filter the issue list

```
mt view [--status <s>] [--priority <p>] [--type <t>] [--assignee <name>] [--createdBy <user>] [--all]
```

| Flag                  | Short  | Filters by                                 |
| --------------------- | ------ | ------------------------------------------ |
| `--status <value>`    | `-s`   | `open`, `in_progress`, `blocked`, `closed` |
| `--priority <value>`  | `-p`   | `p0`–`p9`                                  |
| `--type <value>`      | —      | `bug`, `feature`, `task`, `docs`, `store`  |
| `--assignee <value>`  | `-a`   | assignee name                              |
| `--createdBy <value>` | `--cb` | OS username of creator                     |
| `--all`               | —      | includes closed issues (no value needed)   |

By default, closed issues are excluded. Use `--all` or `--status closed` to include them.

#### Examples

```bash
$ mt view --status in_progress
$ mt view --priority p1
$ mt view --type bug --assignee kngo
$ mt view --all
$ mt view --all --status closed
```

> [!NOTE]
> `mt view` reads from the local SQLite cache. If you have recently run `git pull`, run `mt sync` first to ensure the cache is up to date.

### `mt version`

Prints the currently installed version of Manta.

```bash
$ mt version
```

**Output:**

```
1.7.1
```

### `mt init`

Sets up Manta in the current repository. Creates the `.manta/` folder, adds a `merge=union` rule to `.gitattributes` so teammates' JSONL changes are appended rather than conflicted on `git pull`, and writes this `AGENT.md` file. Run once per repo.

```bash
$ mt init
```

**Output:**

```
Manta initialized.
Run this once in your repo to enable merge support:
  git config pull.rebase false
```

> [!NOTE]
> If Manta is already initialized in the repo, `mt init` will print a message and exit without making any changes.

### `mt sync`

Rebuilds the local SQLite cache from the JSONL event log. Run this after `git pull` to make sure your local database reflects your teammates' latest changes.

```bash
$ mt sync
```

**Output (success):**

```
Synced successfully.
```

**Output (no changes):**

```
Already up to date; no new events to sync.
```

### `mt clear`

Erases all issues from the JSONL log by truncating it. Asks for confirmation before clearing. Defaults to `.manta/manta.jsonl` if no path is provided.

```
mt clear [path/to/manta.jsonl]
```

#### Examples

```bash
$ mt clear
$ mt clear .manta/manta.jsonl
```

**Output (confirmed):**

```
Clear the entire log? [y/N] y
Log cleared.
```

**Output (cancelled):**

```
Clear the entire log? [y/N] N
Clear cancelled.
```

> [!NOTE]
> This erases all issue history permanently. Do not run this unless the user explicitly asks.

### `mt migrate`

Imports issues from a Beads JSONL export into Manta. Preserves the original Beads IDs. Issues that already exist in Manta are skipped.

```
mt migrate <path/to/beads.jsonl>
```

#### Example

```bash
$ mt migrate ./beads-export.jsonl
```

**Output:**

```
Migration complete:
  Migrated: 12
  Skipped (already exist): 3
  Failed: 0
```

## Issue Fields

### User-provided fields

| Field       | Required     | Allowed values                             | Notes                                                       |
| ----------- | ------------ | ------------------------------------------ | ----------------------------------------------------------- |
| title       | Yes (create) | Any string, max 50 chars                   | Pass as positional arg or `--title` / `-t`                  |
| description | No           | Any string, max 512 chars                  | `--desc` or `-d`                                            |
| status      | No           | `open`, `in_progress`, `blocked`, `closed` | Defaults to `open` on create. Cannot be `closed` on create. |
| priority    | No           | `p0`–`p9`                                  | p0 is highest. Defaults to `p5` on create.                  |
| type        | No           | `bug`, `feature`, `task`, `docs`, `store`  | Defaults to `task`. `--type` (no shorthand)                 |
| assignee    | No           | Letters only (a-z, A-Z)                    | `--assignee` or `-a`                                        |

### Auto-assigned fields (read only)

These fields are set automatically and cannot be modified by the user.

| Field     | Description                                                                 |
| --------- | --------------------------------------------------------------------------- |
| ID        | Unique ID in `manta-xxxx` format, assigned on creation                      |
| createdAt | ISO timestamp when the issue was created                                    |
| createdBy | OS username of whoever created the issue, pulled from `$USER` / `$USERNAME` |
| updatedAt | ISO timestamp of the most recent change                                     |
| updatedBy | OS username of whoever made the most recent change                          |

## Errors

If a command fails, Manta prints an error message to stderr and exits with code 1.

### Common errors

| Error                                                                    | Cause                                           |
| ------------------------------------------------------------------------ | ----------------------------------------------- |
| `No input provided`                                                      | `mt` run with no command                        |
| `Missing required input: id`                                             | update/close/delete called without an ID        |
| `Too few flags for 'update'`                                             | update called with ID only, no fields to change |
| `Too many flags for 'close'/'delete'`                                    | extra flags passed to close or delete           |
| `Unexpected argument(s) detected`                                        | arguments passed to version/sync/init           |
| `Invalid flag '...'`                                                     | flag doesn't start with `--`                    |
| `Unknown flag '...'`                                                     | flag not recognized                             |
| `Duplicate flag '...'`                                                   | same flag used twice                            |
| `'mt migrate' does not take any flags`                                   | flags passed to migrate or clear                |
| `Flag '--createdBy' can only be used with 'view'`                        | createdBy used on wrong command                 |
| `Missing value for flag '...'`                                           | flag present but no value given                 |
| `Unknown command '...'`                                                  | unrecognized command                            |
| `Missing required input: title`                                          | create called without a title                   |
| `Invalid status 'closed': issues cannot be created with a closed status` | status set to closed on create                  |
| `Cannot filter by title or description`                                  | view filtered by title or desc                  |
| `Missing required input: path`                                           | migrate/clear called without a path             |
| `validate error: '...' is not a valid issue id`                          | ID doesn't match `manta-<suffix>`               |
| `validate error: title must be under 50 characters`                      | title too long                                  |
| `validate error: description must be under 512 characters`               | description too long                            |
| `validate error: '...' is not a valid priority`                          | priority not in `p0`–`p9`                       |
| `validate error: '...' is not a valid status`                            | status not in allowed set                       |
| `validate error: '...' is not a valid type`                              | type not in allowed set                         |
| `validate error: '...' is not a valid assignee`                          | assignee contains non-letter characters         |
| `validate error: '...' is not a valid username`                          | createdBy contains invalid characters           |

### Flag aliases

| Alias  | Expands to    |
| ------ | ------------- |
| `-t`   | `--title`     |
| `-d`   | `--desc`      |
| `-p`   | `--priority`  |
| `-s`   | `--status`    |
| `-a`   | `--assignee`  |
| `--cb` | `--createdBy` |

Aliases are resolved before validation, so `-t` and `--title` collide as duplicates.

### Parser check order

Within the flag-parsing loop, checks run in this order:

1. Token starts with `--` + letter → else **Invalid flag** (format)
2. Flag (after alias) is known → else **Unknown flag**
3. Flag not already set → else **Duplicate flag**
4. Command accepts flags → else **Command takes no flags**
5. `--createdBy` only on `view` → else **createdBy restriction**
6. Value present (or absent for `--all`) → else **Missing value** / **valueless flag**

Required-field and flag-count checks run after the loop completes.

## Stored Data

All Manta data is stored in the `.manta/` folder in this repo:

- `.manta/manta.jsonl` — append-only event log committed to git (source of truth)
- `.manta/manta.db` — local SQLite cache for fast queries (gitignored, rebuilt on demand)

You can read `.manta/manta.jsonl` directly to inspect raw event history. Each line is a JSON object with one of three shapes:

**issue.created:**

```json
{
  "type": "issue.created",
  "timestamp": "...",
  "actor": "username",
  "issueId": "manta-xxxx",
  "issue": {
    "title": "...",
    "description": "...",
    "status": "open",
    "priority": "p5",
    "issueType": "task",
    "assignee": null,
    "createdAt": "...",
    "createdBy": "username",
    "updatedAt": "...",
    "updatedBy": "username"
  }
}
```

**issue.updated:**

```json
{
  "type": "issue.updated",
  "timestamp": "...",
  "actor": "username",
  "issueId": "manta-xxxx",
  "changes": {
    "status": "in_progress",
    "updatedAt": "...",
    "updatedBy": "username"
  }
}
```

**issue.deleted:**

```json
{
  "type": "issue.deleted",
  "timestamp": "...",
  "actor": "username",
  "issueId": "manta-xxxx"
}
```

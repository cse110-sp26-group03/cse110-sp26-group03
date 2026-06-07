# Agent Guide for Manta

This file tells you everything you need to use Manta from the terminal. Manta is an issue tracker. You can create, update, close, delete, and view issues using the `mt` command. All data is stored locally in this repo under `.manta/`.

## Quick Reference

```
mt create “title” [flags]			create a new issue
mt update manta-xxxx [flags]		update fields on an existing issue
mt close manta-xxxx			close an issue (sets status to closed)
mt delete manta-xxxx			delete an issue permanently
mt view				list all open issues
mt manta-xxxx				view a specific issue in detail (subform of mt view)
mt view [flags]				filter the issue list
mt version				print the installed version on Manta
mt init					set up Manta in the current repo (run once per repo)
mt sync				rebuild local SQLite cache from the JSONL log
mt clear [path]				erase all issues from the log
mt migrate <path>			import issues from a Beads JSONL export
mt help [command]			show general help or open the wiki page for a command
```

## Rules

### For agents

- Always run `mt view` at the start of a session to get the current state of open issues before doing any work
- When picking up an issue, mark it in progress first: `mt update manta-xxxx –status in_progress`
- Only work on one issue at a time unless the user explicitly says otherwise
- When you finish an issue, close it: `mt close manta-xxxx`
- Do not delete issues unless the user prompts you to.
- Do not create issues on your own, unless the user explicitly gives you permission to do so. Otherwise, wait for the user to create them.
- If you are blocked or unsure, update the issue status and leave a note in the description rather than proceeding with assumptions: `mt update manta-xxxx –status open –desc “blocked: need clarification on X”`

### For humans

- Create issues before asking an agent to work on them
- Assign a clear title, priority, and type so the agent has enough context to act without asking for clarification
- Review the agent’s work before closing issues if the task involved significant code changes
- Use `mt view` to check the current state of issues before and after an agent session

## Issue IDs

Every issue has a unique ID in the format `manta-xxxx` where `xxxx` is a 4-character string using the Crockford base32 alphabet (e.g. `manta-h3kp`).

The ID is assigned automatically when an issue is created. You cannot choose or change it.

If you are migrating from beads, issue IDs may have a different suffix length (e.g. `manta-h3k` with 3 characters). These are still valid Manta IDs and all commands work the same way with them.

When a command requires an ID, you can use either the full ID or just the suffix:

```
mt close manta-h3kp        full ID
mt close h3kp                   short ID, Manta adds manta- automatically
```

## Commands

### `mt create`

Creates a new issue. Title is required, all other flags are optional.

```
mt create “title [--desc <text>] [--priority <p0-p9>] [--type <type>] [--assignee <name>]
```

| Flag | Short | Description | Default |
| — | — | — | — |
| `--title` | `-t` | Issue title (max 50 chars) | required |
| `--desc` | `-d` | Longer description (max 512 chars) | empty |
| `--priority` | `-p` | Priority level: `p0` - `p9` (p0 is highest) | `p5` |
| `--status` | `-s` | Initial status: `open`, `in_progress`, `blocked` | `open` |
| `--type` | - | Type: `bug`, `feature`, `task`, `docs`, `store` | `task` |
| `--assignee` | `-a` | Who is working on this issue (letters only) | empty |

> [!NOTE]
> `closed` is not a valid status on create. Use `mt close` to close an issue.

#### Examples

```bash
$ mt create “Mobile friendly screens”
$ mt create “Fix bug” –priority p1 –type bug
$ mt create “Add documentation” –d “Description of pros and cons” –assignee Ryan
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

| Flag | Short | Description |
| — | — | — |
| `--title` | `-t` | New title |
| `--desc` | `-d` | New description |
| `--priority` | `-p` | New priority: `p0` - `p9` |
| `--status` | `-s` | New status: `open`, `in_progress`, `blocked`, `closed` |
| `--type` | - | New type: `bug`, `feature`, `task`, `docs`, `store` |
| `--assignee | `-a` | New assignee |

#### Examples

Updating an existing issue with the id manta-h3kp, changing the `status` field to `in_progress` and the `priority` field to `p0`.

```bash
$ mt update h3kp –status in_progress –priority p0
$ mt update manta-h3kp –status in_progress –priority p0
```

**Output:**

```bash
Update issue manta-h3kp with priority=p0, status=in_progress, updatedAt=X, updatedBy=X
```

> [!NOTE]
> All commands requiring a manta ID accept the full ID (manta-[xxxx]) or just the four digits ([xxxx])

### `mt close`

Marks an issue as closed by setting its status to `closed`. Only the ID is required.

```
mt close manta-xxxx
```

#### Examples

Closing an existing issue with the id manta-h3kp.

```bash
$ mt close manta-h3kp
$ mt close h3kp
```

**Output:**

```bash
Closed issue manta-h3kp
```

### `mt delete`

Permanently deletes an issue. Only the ID is required. On an interactive terminal, Manta will ask for confirmation before deleting.

```
mt delete manta-xxxx
```

#### Examples

Deleting an existing issue with the id manta-h3kp.

```bash
$ mt delete manta-h3kp
$ mt delete h3kp
```

**Output (confirmed):**

```bash
Delete issue manta-h3kp? [y/N] y
Deleted issue manta-h3kp
```

**Output (cancelled):**

```bash
Delete issue manta-h3kp? [y/N] N
Deletion cancelled
```

> [!NOTE]
> Deletion is permanent and cannot be undone. Do not delete issues unless the user explicitly asks.

### `mt view`

Lists issues or shows the detail of a single issue.

#### mt view

Lists all open issues in a paginated table. Use left/right arrow keys to navigate pages. Press ESC to exit.

```bash
$ mt view
```

**Output:**

```
ID      TITLE                                    STATUS    PRIORITY    TYPE    ASSIGNEE    CREATED BY
-------------------------------------------------------------------------------------------------------------------------------
g1xy    issue 1                                 open     	   p0        	task    	  -           	 katie
z1t9	issue 3                                 open	   p1        	bug    	  kngo           	 katie
n1vm	issue 2                                 open      	   p1        	task    	  -           	 katie
qx1z	issue 4                                 open      	   p1       	task    	  -           	 katie
44dv	issue 5                                 open      	   p1        	bug    	  kngo            	 katie

< prev.    next >
Page 1 of 2

Press ESC to exit
```

#### mt manta-xxxx

Shows the full detail of a single issue. Press ESC to exit.

```bash
$ mt view manta-t4pd
$ mt view t4pd
```

**Output:**

```
issue 6                                                                                     manta-t4pd
------------------------------------------------------------------------------------------------------
<no description>

------------------------------------------------------------------------------------------------------
Priority: p5                                        Status: open
Assignee: -                                       Type: task
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Created by: katie @ 2026-06-05 18:51 PDT
Updated by: katie @ 2026-06-05 18:51 PDT

Press ESC to exit
```

#### mt view [flags]

Filters the issue list by one or more fields. Only issues matching all provided filters are shown.

Available filters:
| Flag | Short | Filters by |
| --- | --- | --- |
| `--status <value>` | `-s` | `open`, `in_progress`, `blocked`, `closed` |
| `--priority <value>` | `-p` | `p0`–`p9` |
| `--type <value>` | - | `bug`, `feature`, `task`, `docs`, `store` |
| `--assignee <value>` | `-a` | assignee name |
| `--createdBy <value>` | `--cb` | OS username of creator |
| `--all` | - | includes closed issues in the list (no value needed) |

#### Examples

**Filter by a single flag:**

```bash
$ mt view –status in_progress
$ mt view –priority p1
$ mt view –type bug
$ mt view –assignee kngo
$ mt view –createdBy katie
$ mt view –all
```

**Combine multiple filters:**

```
$ mt view --status open --priority p1
$ mt view --type bug --assignee kngo
$ mt view --all --status closed
```

**Output (issues found using multiple filters):**

```
ID      TITLE                                    STATUS    PRIORITY    TYPE    ASSIGNEE    CREATED BY
-------------------------------------------------------------------------------------------------------------------------------
z1t9	issue 3                                 open	   p1        	bug    	  kngo           	 katie
44dv	issue 5                                 open      	   p1        	bug    	  kngo            	 katie

< prev.    next >
Page 1 of 1

Press ESC to exit
```

**Output (no issues found):**

```
No issues found.
```

> [!NOTE]
> `mt view` reads from the local SQLite cache and does not sync from the JSONL log. If you have recently run `git pull`, run a write command or `mt sync` first to ensure the cache is up to date.

### `mt version`

Prints the currently installed version of Manta.

```bash
$ mt version
```

**Output:**

```bash
0.1.0
```

### `mt init`

Sets up Manta in the current repository. Creates the `.manta/` folder and adds a `merge=union` rule to `.gitattributes` so teammates’ JSONL changes are appended rather than conflicted on `git pull`. Run once per repo.

```bash
$ mt init
```

**Output:**

```bash
Manta initialized.
Run this once in your repo to enable merge support:
  git config pull.rebase false
```

> [!NOTE]
> If Manta is already initialized in the repo, `mt init` will print a message and exit without making any changes.

### `mt sync`

Rebuilds the local SQLite cache from the JSONL event log. Run this after `git pull` to make sure your local database reflects your teammates’ latest changes.

```bash
$ mt sync
```

**Output (success):**

```bash
Synced successfully.
```

**Output (no changes):**

```bash
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

```bash
Clear the entire log? [y/N] y
Log cleared.
```

**Output (cancelled):**

```bash
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

### `mt help`

Prints general help with all available commands. With a command name, opens the wiki page for that command in your browser.

```
mt help
mt help <command>
```

#### Examples

```bash
$ mt help
$ mt help create
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

| Field     | Description                                                              |
| --------- | ------------------------------------------------------------------------ |
| ID        | Unique ID in `manta-xxxx` format, assigned on creation                   |
| createdAt | ISO timestamp when the issue was created                                 |
| createdBy | OS username of whoever created the issue, pulled from `process.env.USER` |
| updatedAt | ISO timestamp of the most recent change                                  |
| updatedBy | OS username of whoever made the most recent change                       |

## Errors

If a command fails, Manta prints an error message and exits with code 1.

### Common Errors

See the sections below for full details and examples:

| Error                                               | Cause                                           | Section                                                                                   |
| --------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `No input provided`                                 | `mt` run with no command                        | [Running with no commands](#running-with-no-commands)                                     |
| `Missing required input: id`                        | update/close/delete called without an ID        | [No ID when ID is required](#no-id-when-id-is-required)                                   |
| `Too few flags for 'update'`                        | update called with ID only, no fields to change | [Attempting to update with ID only](#attempting-to-update-with-id-only-no-fields)         |
| `Too many flags for 'close'/'delete'`               | extra flags passed to close or delete           | [Passing more than an ID to close/delete](#passing-more-than-an-id-to-closedelete)        |
| `Unexpected argument(s) detected`                   | arguments passed to version/sync/init           | [Passing arguments to a no-argument command](#passing-arguments-to-a-no-argument-command) |
| `Invalid flag`                                      | flag doesn't start with `--`                    | [Incorrect flag format](#incorrect-flag-format)                                           |
| `Unknown flag`                                      | flag not recognized                             | [Invalid flag](#invalid-flag)                                                             |
| `Duplicate flag`                                    | same flag used twice                            | [Duplicate flag](#duplicate-flag)                                                         |
| `'mt migrate' does not take any flags`              | flags passed to migrate or clear                | [Command takes no flags](#command-takes-no-flags)                                         |
| `Flag '--createdBy' can only be used with 'view'`   | createdBy used on wrong command                 | [createdBy used outside view](#createdby-used-outside-view)                               |
| `Missing value for flag`                            | flag present but no value given                 | [Missing value for a flag](#missing-value-for-a-flag)                                     |
| `Unknown command`                                   | unrecognized command                            | [Unknown command](#unknown-command)                                                       |
| `Missing required input: title`                     | create called without a title                   | [create without a title](#create-without-a-title)                                         |
| `Invalid status 'closed' on create`                 | status set to closed on create                  | [create with a closed status](#create-with-a-closed-status)                               |
| `Cannot filter by title or description`             | view filtered by title or desc                  | [view filtered by title or description](#view-filtered-by-title-or-description)           |
| `Missing required input: path`                      | migrate/clear called without a path             | [migrate without a path](#migrate-without-a-path)                                         |
| `validate error: not a valid issue id`              | ID doesn't match `manta-<suffix>`               | [Invalid issue ID](#invalid-issue-id)                                                     |
| `validate error: title must be under 50 characters` | title too long                                  | [Title too long](#title-too-long)                                                         |
| `validate error: not a valid priority`              | priority not in `p0`–`p9`                       | [Invalid priority](#invalid-priority)                                                     |
| `validate error: not a valid status`                | status not in allowed set                       | [Invalid status](#invalid-status)                                                         |
| `validate error: not a valid type`                  | type not in allowed set                         | [Invalid type](#invalid-type)                                                             |
| `validate error: not a valid assignee`              | assignee contains non-letter characters         | [Invalid assignee](#invalid-assignee)                                                     |

### Argument Count Errors

#### Running with no commands

Running `mt` without any commands will result in the following error.

```bash
$ mt
```

```bash
No input provided. Commands look like: mt <cmd> [flags]
```

#### No ID when ID is required

For commands requiring an ID (update, close, delete), attempting to use the command without an ID will result in the following error.

```bash
$ mt update
$ mt update --type 'bug'
$ mt close
$ mt delete
```

```bash
Missing required input: id
```

#### Attempting to update with ID only (no fields)

For `mt update`, updating with no fields will result in the following error.

```bash
$ mt update xxxx
```

```bash
Too few flags for 'update:' No updates to any field were provided undefined
```

#### Passing more than an ID to close/delete

`close` and `delete` accept exactly one input (the ID). Any extra flag triggers the max-count error.

```bash
$ mt close xxxx --priority p1
$ mt delete xxxx --status open
```

```bash
Too many flags for 'close:' Only an ID is expected
```

```bash
Too many flags for 'delete:' Only an ID is expected
```

#### Passing arguments to a no-argument command

`version`, `sync`, and `init` take no positional arguments and no flags.

```bash
$ mt version 1.2.3
$ mt sync now
$ mt init extra
```

```bash
Unexpected argument(s) detected - 'mt version' should be called with no arguments.
```

(`version` is replaced by whichever of `version`/`sync`/`init` was run.)

### Parsing Errors

#### Parser Check Order

Within the flag-parsing loop, checks run in this order, the first failure is the one reported:

1. token starts with `--` + letter -> else **Invalid flag** (format)
2. flag (after alias) is known -> else **Unknown flag**
3. flag not already set -> else **Duplicate flag**
4. command accepts flags -> else **Command takes no flags**
5. `--createdBy` only on `view` -> else **createdBy** restriction
6. value present (or absent for `--all`) -> else **Missing value** / **valueless flag**

Required-field and flag-count checks run after the loop completes.

#### Incorrect flag format

Flags must begin with `--` followed by a letter. A single dash, or a dash followed by a non-letter, is rejected.

```bash
$ mt create xxxx -priority p1
```

```bash
Invalid flag '-priority': flags must start with --
```

```bash
$ mt create 'incorrect format' --assignee example priority p1
```

```bash
Invalid flag '-priority': flags must start with --
```

#### Invalid flag

A token that starts with `--` but does not resolve to a known flag (after alias expansion) is rejected. The error reports the resolved flag name and lists every valid flag.

```bash
$ mt create xxxx --foo bar
$ mt update xxxx --proirity p1
```

```bash
Unknown flag 'foo': valid flags are
title, desc, status, priority, type, assignee, all, createdBy
```

> [!NOTE]
> Aliases that expand to a valid flag (`t`→title, `d`→desc, `p`→priority, `s`→status, `a`→assignee, `cb`→createdBy) are accepted; anything else is reported by its expanded form.

#### Duplicate flag

A flag may be provided once per command. Providing the same flag 2+ times, directly or via its alias, is rejected.

```bash
$ mt create xxxx --priority p1 --priority p2
$ mt create xxxx --p p1 --priority p2
```

```bash
Duplicate flag 'priority': --priority was already set
```

The error reports the resolved flag name, so `--p` and `--priority` collide because both resolve to `priority`.

#### Command takes no flags

`migrate` and `clear` take only a positional path argument and reject any flag.

```bash
$ mt migrate ./beads.jsonl --title x
$ mt clear ./.manta/manta.jsonl --status open
```

```bash
'mt migrate' does not take any flags.
```

> [!NOTE]
> `migrate` is replaced by whichever no-flag command was run.
> An _unknown_ flag is caught by the "Invalid flag" check first; this error fires only for an otherwise-valid flag name used on a no-flag command.

#### `--createdBy` used outside `view`

`--createdBy` (alias `--cb`) is a `view`-only filter. Using it with any other command is rejected at parse time.

```bash
$ mt create xxxx --createdBy user
$ mt update xxxx --cb user
```

```bash
Flag '--createdBy' can only be used with the 'view' command
```

#### Missing value for a flag

Every flag except `--all` requires a value. A flag immediately followed by another flag (or the end of input) is rejected.

```bash
$ mt create xxxx --desc --priority p1
$ mt update xxxx --status
```

```bash
Missing value for flag 'desc'
```

> [!Note]
> The error names the flag whose value is missing.

#### Value passed to a valueless flag

`--all` is a boolean flag and must not be given a value.

```bash
$ mt view --all everything
```

```bash
--'--all' flag cannot be called with a value.
```

#### Unknown command

The first token must be a valid command: `create, update, close, delete, version, view, sync, init, migrate, clear`.

```bash
$ mt creat xxxx
$ mt remove xxxx
```

```bash
Unknown command 'creat': valid commands are create, update, close, delete, version, view, sync, init, migrate, clear
```

#### `create` without a title

`create` requires a title, passed positionally or via `--title`.

```bash
$ mt create --priority p1
```

```bash
Missing required input: title
```

#### `create` with a closed status

An issue cannot be created already closed.

```bash
$ mt create xxxx --status closed
```

```bash
Invalid status 'closed': issues cannot be created with a closed status
```

#### `view` filtered by title or description

`view` filters only by status, priority, type, assignee, or createdBy, not by title or description.

```bash
$ mt view --title something
$ mt view --desc something
```

```bash
Cannot filter by title or description.
Can only filter by: status, priority, type, assignee
```

#### `migrate` without a path

`mt migrate` requires a path to a Beads JSONL file.

```bash
$ mt migrate
```

```bash
Missing required input: path to Beads JSONL file.
Usage: mt migrate <path/to/beads.jsonl>
```

#### `clear` without a path

If `mt clear` is ran with an empty string, an error is thrown. `clear` with no arguments defaults to `.manta/manta.jsonl`.

```bash
$ mt clear ''
```

```bash
Missing required input: path to Manta JSONL file.
Usage: mt clear <path/to/manta.jsonl>
```

### Validation Errors

#### Invalid issue ID

ID must match `manta-<suffix>` (pattern `^manta-.+$`). The parser auto-prefixes a
bare suffix with `manta-`, so this fires mainly on malformed IDs.

```bash
$ mt update manta- --priority p1
```

```bash
validate error: 'manta-' is not a valid issue id
```

#### Title too long

Max 50 characters.

```bash
$ mt create "<51+ character title>"
```

```bash
validate error: title must be under 50 characters
```

#### Description too long

Max 512 characters.

```bash
$ mt create xxxx --desc "<513+ character description>"
```

```bash
validate error: description must be under 512 characters
```

#### Invalid priority

Must match `p<N>` where N is a single digit (`p0`–`p9`).

```bash
$ mt create xxxx --priority high
$ mt update xxxx --priority p10
```

```bash
validate error: 'high' is not a valid priority
```

#### Priority required (create only)

`create` requires a priority; the parser supplies `p5` by default, so this fires only if that default is absent.

```bash
validate error: priority is required
```

#### Invalid status

Must be one of: `open, in_progress, blocked, closed`.

```bash
$ mt update xxxx --status done
```

```bash
validate error: 'done' is not a valid status
```

#### Status required (create only)

`create` requires a status; the parser defaults to `open`, so this fires only if that default is absent.

```bash
validate error: status is required
```

#### Invalid type

Must be one of: `bug, feature, task, docs, store`.

```bash
$ mt create xxxx --type epic
```

```bash
validate error: 'epic' is not a valid type
```

#### Invalid assignee

Alphabetic characters only (`^[a-zA-Z]+$`) — no digits, spaces, or symbols.

```bash
$ mt create xxxx --assignee user_1
```

```bash
validate error: 'user_1' is not a valid assignee
```

#### `createdBy` outside `view` (Stage 2 guard)

Backstop for the parser's restriction — `createdBy` is rejected for any non-`view` command.

```bash
validate error: 'createdBy' is not a valid flag for 'create'
```

#### Invalid username (createdBy)

On `view`, `createdBy` must be alphanumeric plus underscores (`^[a-zA-Z0-9_]+$`).

```bash
$ mt view --createdBy "bad name"
```

```bash
validate error: 'bad name' is not a valid username
```

#### Invalid path

`migrate`/`clear` path must be a non-empty string.

```bash
validate error: path must be a valid file path
```

## Stored Data# Agent Guide for Manta

This file tells you everything you need to use Manta from the terminal. Manta is an issue tracker. You can create, update, close, delete, and view issues using the `mt` command. All data is stored locally in this repo under `.manta/`.

## Quick Reference

```
mt create “title” [flags]			create a new issue
mt update manta-xxxx [flags]		update fields on an existing issue
mt close manta-xxxx			close an issue (sets status to closed)
mt delete manta-xxxx			delete an issue permanently
mt view				list all open issues
mt manta-xxxx				view a specific issue in detail (subform of mt view)
mt view [flags]				filter the issue list
mt version				print the installed version on Manta
mt init					set up Manta in the current repo (run once per repo)
mt sync				rebuild local SQLite cache from the JSONL log
mt clear [path]				erase all issues from the log
mt migrate <path>			import issues from a Beads JSONL export
mt help [command]			show general help or open the wiki page for a command
```

## Rules

### For agents

- Always run `mt view` at the start of a session to get the current state of open issues before doing any work
- When picking up an issue, mark it in progress first: `mt update manta-xxxx –status in_progress`
- Only work on one issue at a time unless the user explicitly says otherwise
- When you finish an issue, close it: `mt close manta-xxxx`
- Do not delete issues unless the user prompts you to
- Do not create issues on your own. Wait for the user to create them, unless the user explicitly gives you permission to do so
- If you are blocked or unsure, update the issue status and leave a note in the description rather than proceeding with assumptions: `mt update manta-xxxx –status open –desc “blocked: need clarification on X”`

### For humans

- Create issues before asking an agent to work on them
- Assign a clear title, priority, and type so the agent has enough context to act without asking for clarification
- Review the agent’s work before closing issues if the task involved significant code changes
- Use `mt view` to check the current state of issues before and after an agent session

## Issue IDs

Every issue has a unique ID in the format `manta-xxxx` where `xxxx` is a 4-character string using the Crockford base32 alphabet (e.g. `manta-h3kp`).

The ID is assigned automatically when an issue is created. You cannot choose or change it.

If you are migrating from beads, issue IDs may have a different suffix length (e.g. `manta-h3k` with 3 characters). These are still valid Manta IDs and all commands work the same way with them.

When a command requires an ID, you can use either the full ID or just the suffix:

```
mt close manta-h3kp        full ID
mt close h3kp                   short ID, Manta adds manta- automatically
```

## Commands

### `mt create`

Creates a new issue. Title is required, all other flags are optional.

```
mt create “title [--desc <text>] [--priority <p0-p9>] [--type <type>] [--assignee <name>]
```

| Flag | Short | Description | Default |
| — | — | — | — |
| `--title` | `-t` | Issue title (max 50 chars) | required |
| `--desc` | `-d` | Longer description (max 512 chars) | empty |
| `--priority` | `-p` | Priority level: `p0` - `p9` (p0 is highest) | `p5` |
| `--status` | `-s` | Initial status: `open`, `in_progress`, `blocked` | `open` |
| `--type` | - | Type: `bug`, `feature`, `task`, `docs`, `store` | `task` |
| `--assignee` | `-a` | Who is working on this issue (letters only) | empty |

> [!NOTE]
> `closed` is not a valid status on create. Use `mt close` to close an issue.

#### Examples

```bash
$ mt create “Mobile friendly screens”
$ mt create “Fix bug” –priority p1 –type bug
$ mt create “Add documentation” –d “Description of pros and cons” –assignee Ryan
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

| Flag | Short | Description |
| — | — | — |
| `--title` | `-t` | New title |
| `--desc` | `-d` | New description |
| `--priority` | `-p` | New priority: `p0` - `p9` |
| `--status` | `-s` | New status: `open`, `in_progress`, `blocked`, `closed` |
| `--type` | - | New type: `bug`, `feature`, `task`, `docs`, `store` |
| `--assignee | `-a` | New assignee |

#### Examples

Updating an existing issue with the id manta-h3kp, changing the `status` field to `in_progress` and the `priority` field to `p0`.

```bash
$ mt update h3kp –status in_progress –priority p0
$ mt update manta-h3kp –status in_progress –priority p0
```

**Output:**

```bash
Update issue manta-h3kp with priority=p0, status=in_progress, updatedAt=X, updatedBy=X
```

> [!NOTE]
> All commands requiring a manta ID accept the full ID (manta-[xxxx]) or just the four digits ([xxxx])

### `mt close`

Marks an issue as closed by setting its status to `closed`. Only the ID is required.

```
mt close manta-xxxx
```

#### Examples

Closing an existing issue with the id manta-h3kp.

```bash
$ mt close manta-h3kp
$ mt close h3kp
```

**Output:**

```bash
Closed issue manta-h3kp
```

### `mt delete`

Permanently deletes an issue. Only the ID is required. On an interactive terminal, Manta will ask for confirmation before deleting.

```
mt delete manta-xxxx
```

#### Examples

Deleting an existing issue with the id manta-h3kp.

```bash
$ mt delete manta-h3kp
$ mt delete h3kp
```

**Output (confirmed):**

```bash
Delete issue manta-h3kp? [y/N] y
Deleted issue manta-h3kp
```

**Output (cancelled):**

```bash
Delete issue manta-h3kp? [y/N] N
Deletion cancelled
```

> [!NOTE]
> Deletion is permanent and cannot be undone. Do not delete issues unless the user explicitly asks.

### `mt view`

Lists issues or shows the detail of a single issue.

#### mt view

Lists all open issues in a paginated table. Use left/right arrow keys to navigate pages. Press ESC to exit.

```bash
$ mt view
```

**Output:**

```
ID      TITLE                                    STATUS    PRIORITY    TYPE    ASSIGNEE    CREATED BY
-------------------------------------------------------------------------------------------------------------------------------
g1xy    issue 1                                 open     	   p0        	task    	  -           	 katie
z1t9	issue 3                                 open	   p1        	bug    	  kngo           	 katie
n1vm	issue 2                                 open      	   p1        	task    	  -           	 katie
qx1z	issue 4                                 open      	   p1       	task    	  -           	 katie
44dv	issue 5                                 open      	   p1        	bug    	  kngo            	 katie

< prev.    next >
Page 1 of 2

Press ESC to exit
```

#### mt manta-xxxx

Shows the full detail of a single issue. Press ESC to exit.

```bash
$ mt view manta-t4pd
$ mt view t4pd
```

**Output:**

```
issue 6                                                                                     manta-t4pd
------------------------------------------------------------------------------------------------------
<no description>

------------------------------------------------------------------------------------------------------
Priority: p5                                        Status: open
Assignee: -                                       Type: task
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Created by: katie @ 2026-06-05 18:51 PDT
Updated by: katie @ 2026-06-05 18:51 PDT

Press ESC to exit
```

#### mt view [flags]

Filters the issue list by one or more fields. Only issues matching all provided filters are shown.

Available filters:
| Flag | Short | Filters by |
| --- | --- | --- |
| `--status <value>` | `-s` | `open`, `in_progress`, `blocked`, `closed` |
| `--priority <value>` | `-p` | `p0`–`p9` |
| `--type <value>` | - | `bug`, `feature`, `task`, `docs`, `store` |
| `--assignee <value>` | `-a` | assignee name |
| `--createdBy <value>` | `--cb` | OS username of creator |
| `--all` | - | includes closed issues in the list (no value needed) |

#### Examples

**Filter by a single flag:**

```bash
$ mt view –status in_progress
$ mt view –priority p1
$ mt view –type bug
$ mt view –assignee kngo
$ mt view –createdBy katie
$ mt view –all
```

**Combine multiple filters:**

```
$ mt view --status open --priority p1
$ mt view --type bug --assignee kngo
$ mt view --all --status closed
```

**Output (issues found using multiple filters):**

```
ID      TITLE                                    STATUS    PRIORITY    TYPE    ASSIGNEE    CREATED BY
-------------------------------------------------------------------------------------------------------------------------------
z1t9	issue 3                                 open	   p1        	bug    	  kngo           	 katie
44dv	issue 5                                 open      	   p1        	bug    	  kngo            	 katie

< prev.    next >
Page 1 of 1

Press ESC to exit
```

**Output (no issues found):**

```
No issues found.
```

> [!NOTE]
> `mt view` reads from the local SQLite cache and does not sync from the JSONL log. If you have recently run `git pull`, run a write command or `mt sync` first to ensure the cache is up to date.

### `mt version`

Prints the currently installed version of Manta.

```bash
$ mt version
```

**Output:**

```bash
0.1.0
```

### `mt init`

Sets up Manta in the current repository. Creates the `.manta/` folder and adds a `merge=union` rule to `.gitattributes` so teammates’ JSONL changes are appended rather than conflicted on `git pull`. Run once per repo.

```bash
$ mt init
```

**Output:**

```bash
Manta initialized.
Run this once in your repo to enable merge support:
  git config pull.rebase false
```

> [!NOTE]
> If Manta is already initialized in the repo, `mt init` will print a message and exit without making any changes.

### `mt sync`

Rebuilds the local SQLite cache from the JSONL event log. Run this after `git pull` to make sure your local database reflects your teammates’ latest changes.

```bash
$ mt sync
```

**Output (success):**

```bash
Synced successfully.
```

**Output (no changes):**

```bash
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

```bash
Clear the entire log? [y/N] y
Log cleared.
```

**Output (cancelled):**

```bash
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

### `mt help`

Prints general help with all available commands. With a command name, opens the wiki page for that command in your browser.

```
mt help
mt help <command>
```

#### Examples

```bash
$ mt help
$ mt help create
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

| Field     | Description                                                              |
| --------- | ------------------------------------------------------------------------ |
| ID        | Unique ID in `manta-xxxx` format, assigned on creation                   |
| createdAt | ISO timestamp when the issue was created                                 |
| createdBy | OS username of whoever created the issue, pulled from `process.env.USER` |
| updatedAt | ISO timestamp of the most recent change                                  |
| updatedBy | OS username of whoever made the most recent change                       |

## Errors

If a command fails, Manta prints an error message and exits with code 1.

### Common Errors

See the sections below for full details and examples:

| Error                                               | Cause                                           | Section                                                                                   |
| --------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `No input provided`                                 | `mt` run with no command                        | [Running with no commands](#running-with-no-commands)                                     |
| `Missing required input: id`                        | update/close/delete called without an ID        | [No ID when ID is required](#no-id-when-id-is-required)                                   |
| `Too few flags for 'update'`                        | update called with ID only, no fields to change | [Attempting to update with ID only](#attempting-to-update-with-id-only-no-fields)         |
| `Too many flags for 'close'/'delete'`               | extra flags passed to close or delete           | [Passing more than an ID to close/delete](#passing-more-than-an-id-to-closedelete)        |
| `Unexpected argument(s) detected`                   | arguments passed to version/sync/init           | [Passing arguments to a no-argument command](#passing-arguments-to-a-no-argument-command) |
| `Invalid flag`                                      | flag doesn't start with `--`                    | [Incorrect flag format](#incorrect-flag-format)                                           |
| `Unknown flag`                                      | flag not recognized                             | [Invalid flag](#invalid-flag)                                                             |
| `Duplicate flag`                                    | same flag used twice                            | [Duplicate flag](#duplicate-flag)                                                         |
| `'mt migrate' does not take any flags`              | flags passed to migrate or clear                | [Command takes no flags](#command-takes-no-flags)                                         |
| `Flag '--createdBy' can only be used with 'view'`   | createdBy used on wrong command                 | [createdBy used outside view](#createdby-used-outside-view)                               |
| `Missing value for flag`                            | flag present but no value given                 | [Missing value for a flag](#missing-value-for-a-flag)                                     |
| `Unknown command`                                   | unrecognized command                            | [Unknown command](#unknown-command)                                                       |
| `Missing required input: title`                     | create called without a title                   | [create without a title](#create-without-a-title)                                         |
| `Invalid status 'closed' on create`                 | status set to closed on create                  | [create with a closed status](#create-with-a-closed-status)                               |
| `Cannot filter by title or description`             | view filtered by title or desc                  | [view filtered by title or description](#view-filtered-by-title-or-description)           |
| `Missing required input: path`                      | migrate/clear called without a path             | [migrate without a path](#migrate-without-a-path)                                         |
| `validate error: not a valid issue id`              | ID doesn't match `manta-<suffix>`               | [Invalid issue ID](#invalid-issue-id)                                                     |
| `validate error: title must be under 50 characters` | title too long                                  | [Title too long](#title-too-long)                                                         |
| `validate error: not a valid priority`              | priority not in `p0`–`p9`                       | [Invalid priority](#invalid-priority)                                                     |
| `validate error: not a valid status`                | status not in allowed set                       | [Invalid status](#invalid-status)                                                         |
| `validate error: not a valid type`                  | type not in allowed set                         | [Invalid type](#invalid-type)                                                             |
| `validate error: not a valid assignee`              | assignee contains non-letter characters         | [Invalid assignee](#invalid-assignee)                                                     |

### Argument Count Errors

#### Running with no commands

Running `mt` without any commands will result in the following error.

```bash
$ mt
```

```bash
No input provided. Commands look like: mt <cmd> [flags]
```

#### No ID when ID is required

For commands requiring an ID (update, close, delete), attempting to use the command without an ID will result in the following error.

```bash
$ mt update
$ mt update --type 'bug'
$ mt close
$ mt delete
```

```bash
Missing required input: id
```

#### Attempting to update with ID only (no fields)

For `mt update`, updating with no fields will result in the following error.

```bash
$ mt update xxxx
```

```bash
Too few flags for 'update:' No updates to any field were provided undefined
```

#### Passing more than an ID to close/delete

`close` and `delete` accept exactly one input (the ID). Any extra flag triggers the max-count error.

```bash
$ mt close xxxx --priority p1
$ mt delete xxxx --status open
```

```bash
Too many flags for 'close:' Only an ID is expected
```

```bash
Too many flags for 'delete:' Only an ID is expected
```

#### Passing arguments to a no-argument command

`version`, `sync`, and `init` take no positional arguments and no flags.

```bash
$ mt version 1.2.3
$ mt sync now
$ mt init extra
```

```bash
Unexpected argument(s) detected - 'mt version' should be called with no arguments.
```

(`version` is replaced by whichever of `version`/`sync`/`init` was run.)

### Parsing Errors

#### Parser Check Order

Within the flag-parsing loop, checks run in this order, the first failure is the one reported:

1. token starts with `--` + letter -> else **Invalid flag** (format)
2. flag (after alias) is known -> else **Unknown flag**
3. flag not already set -> else **Duplicate flag**
4. command accepts flags -> else **Command takes no flags**
5. `--createdBy` only on `view` -> else **createdBy** restriction
6. value present (or absent for `--all`) -> else **Missing value** / **valueless flag**

Required-field and flag-count checks run after the loop completes.

#### Incorrect flag format

Flags must begin with `--` followed by a letter. A single dash, or a dash followed by a non-letter, is rejected.

```bash
$ mt create xxxx -priority p1
```

```bash
Invalid flag '-priority': flags must start with --
```

```bash
$ mt create 'incorrect format' --assignee example priority p1
```

```bash
Invalid flag '-priority': flags must start with --
```

#### Invalid flag

A token that starts with `--` but does not resolve to a known flag (after alias expansion) is rejected. The error reports the resolved flag name and lists every valid flag.

```bash
$ mt create xxxx --foo bar
$ mt update xxxx --proirity p1
```

```bash
Unknown flag 'foo': valid flags are
title, desc, status, priority, type, assignee, all, createdBy
```

> [!NOTE]
> Aliases that expand to a valid flag (`t`→title, `d`→desc, `p`→priority, `s`→status, `a`→assignee, `cb`→createdBy) are accepted; anything else is reported by its expanded form.

#### Duplicate flag

A flag may be provided once per command. Providing the same flag 2+ times, directly or via its alias, is rejected.

```bash
$ mt create xxxx --priority p1 --priority p2
$ mt create xxxx --p p1 --priority p2
```

```bash
Duplicate flag 'priority': --priority was already set
```

The error reports the resolved flag name, so `--p` and `--priority` collide because both resolve to `priority`.

#### Command takes no flags

`migrate` and `clear` take only a positional path argument and reject any flag.

```bash
$ mt migrate ./beads.jsonl --title x
$ mt clear ./.manta/manta.jsonl --status open
```

```bash
'mt migrate' does not take any flags.
```

> [!NOTE]
> `migrate` is replaced by whichever no-flag command was run.
> An _unknown_ flag is caught by the "Invalid flag" check first; this error fires only for an otherwise-valid flag name used on a no-flag command.

#### `--createdBy` used outside `view`

`--createdBy` (alias `--cb`) is a `view`-only filter. Using it with any other command is rejected at parse time.

```bash
$ mt create xxxx --createdBy user
$ mt update xxxx --cb user
```

```bash
Flag '--createdBy' can only be used with the 'view' command
```

#### Missing value for a flag

Every flag except `--all` requires a value. A flag immediately followed by another flag (or the end of input) is rejected.

```bash
$ mt create xxxx --desc --priority p1
$ mt update xxxx --status
```

```bash
Missing value for flag 'desc'
```

> [!Note]
> The error names the flag whose value is missing.

#### Value passed to a valueless flag

`--all` is a boolean flag and must not be given a value.

```bash
$ mt view --all everything
```

```bash
--'--all' flag cannot be called with a value.
```

#### Unknown command

The first token must be a valid command: `create, update, close, delete, version, view, sync, init, migrate, clear`.

```bash
$ mt creat xxxx
$ mt remove xxxx
```

```bash
Unknown command 'creat': valid commands are create, update, close, delete, version, view, sync, init, migrate, clear
```

#### `create` without a title

`create` requires a title, passed positionally or via `--title`.

```bash
$ mt create --priority p1
```

```bash
Missing required input: title
```

#### `create` with a closed status

An issue cannot be created already closed.

```bash
$ mt create xxxx --status closed
```

```bash
Invalid status 'closed': issues cannot be created with a closed status
```

#### `view` filtered by title or description

`view` filters only by status, priority, type, assignee, or createdBy, not by title or description.

```bash
$ mt view --title something
$ mt view --desc something
```

```bash
Cannot filter by title or description.
Can only filter by: status, priority, type, assignee
```

#### `migrate` without a path

`mt migrate` requires a path to a Beads JSONL file.

```bash
$ mt migrate
```

```bash
Missing required input: path to Beads JSONL file.
Usage: mt migrate <path/to/beads.jsonl>
```

#### `clear` without a path

If `mt clear` is ran with an empty string, an error is thrown. `clear` with no arguments defaults to `.manta/manta.jsonl`.

```bash
$ mt clear ''
```

```bash
Missing required input: path to Manta JSONL file.
Usage: mt clear <path/to/manta.jsonl>
```

### Validation Errors

#### Invalid issue ID

ID must match `manta-<suffix>` (pattern `^manta-.+$`). The parser auto-prefixes a
bare suffix with `manta-`, so this fires mainly on malformed IDs.

```bash
$ mt update manta- --priority p1
```

```bash
validate error: 'manta-' is not a valid issue id
```

#### Title too long

Max 50 characters.

```bash
$ mt create "<51+ character title>"
```

```bash
validate error: title must be under 50 characters
```

#### Description too long

Max 512 characters.

```bash
$ mt create xxxx --desc "<513+ character description>"
```

```bash
validate error: description must be under 512 characters
```

#### Invalid priority

Must match `p<N>` where N is a single digit (`p0`–`p9`).

```bash
$ mt create xxxx --priority high
$ mt update xxxx --priority p10
```

```bash
validate error: 'high' is not a valid priority
```

#### Priority required (create only)

`create` requires a priority; the parser supplies `p5` by default, so this fires only if that default is absent.

```bash
validate error: priority is required
```

#### Invalid status

Must be one of: `open, in_progress, blocked, closed`.

```bash
$ mt update xxxx --status done
```

```bash
validate error: 'done' is not a valid status
```

#### Status required (create only)

`create` requires a status; the parser defaults to `open`, so this fires only if that default is absent.

```bash
validate error: status is required
```

#### Invalid type

Must be one of: `bug, feature, task, docs, store`.

```bash
$ mt create xxxx --type epic
```

```bash
validate error: 'epic' is not a valid type
```

#### Invalid assignee

Alphabetic characters only (`^[a-zA-Z]+$`) — no digits, spaces, or symbols.

```bash
$ mt create xxxx --assignee user_1
```

```bash
validate error: 'user_1' is not a valid assignee
```

#### `createdBy` outside `view` (Stage 2 guard)

Backstop for the parser's restriction — `createdBy` is rejected for any non-`view` command.

```bash
validate error: 'createdBy' is not a valid flag for 'create'
```

#### Invalid username (createdBy)

On `view`, `createdBy` must be alphanumeric plus underscores (`^[a-zA-Z0-9_]+$`).

```bash
$ mt view --createdBy "bad name"
```

```bash
validate error: 'bad name' is not a valid username
```

#### Invalid path

`migrate`/`clear` path must be a non-empty string.

```bash
validate error: path must be a valid file path
```

## Stored Data

All Manta data is stored in the `.manta/` folder in this repo:

- `.manta/manta.jsonl`: append-only event log committed to git (source of truth)
- `.manta/manta.db`: local SQLite cache for fast queries

You can read `.manta/manta.jsonl` directly if you need to inspect the raw event history.
Each line is a JSON object describing one event (create, update, close, delete).

# Agent Guide for Manta

This file tells you everything you need to use Manta from the terminal. Manta is an issue tracker. You can create, update, close, delete, and view issues using the `mt` command. All data is stored locally in this repo under `.manta/`.

## Quick Reference

```
mt create “title” [flags]			create a new issue
mt update manta-xxxx [flags]		update fields on an existing issue
mt close manta-xxxx			close an issue (sets status to closed)
mt delete manta-xxxx			delete an issue permanently
mt view				list all open issues
mt manta-xxxx				view a specific issue in detail (subform of mt view)
mt view [flags]				filter the issue list
mt version				print the installed version on Manta
mt init					set up Manta in the current repo (run once per repo)
mt sync				rebuild local SQLite cache from the JSONL log
mt clear [path]				erase all issues from the log
mt migrate <path>			import issues from a Beads JSONL export
mt help [command]			show general help or open the wiki page for a command
```

## Rules

### For agents

- Always run `mt view` at the start of a session to get the current state of open issues before doing any work
- When picking up an issue, mark it in progress first: `mt update manta-xxxx –status in_progress`
- Only work on one issue at a time unless the user explicitly says otherwise
- When you finish an issue, close it: `mt close manta-xxxx`
- Do not delete issues unless the user prompts you to
- Do not create issues on your own. Wait for the user to create them, unless the user explicitly gives you permission to do so
- If you are blocked or unsure, update the issue status and leave a note in the description rather than proceeding with assumptions: `mt update manta-xxxx –status open –desc “blocked: need clarification on X”`

### For humans

- Create issues before asking an agent to work on them
- Assign a clear title, priority, and type so the agent has enough context to act without asking for clarification
- Review the agent’s work before closing issues if the task involved significant code changes
- Use `mt view` to check the current state of issues before and after an agent session

## Issue IDs

Every issue has a unique ID in the format `manta-xxxx` where `xxxx` is a 4-character string using the Crockford base32 alphabet (e.g. `manta-h3kp`).

The ID is assigned automatically when an issue is created. You cannot choose or change it.

If you are migrating from beads, issue IDs may have a different suffix length (e.g. `manta-h3k` with 3 characters). These are still valid Manta IDs and all commands work the same way with them.

When a command requires an ID, you can use either the full ID or just the suffix:

```
mt close manta-h3kp        full ID
mt close h3kp                   short ID, Manta adds manta- automatically
```

## Commands

### `mt create`

Creates a new issue. Title is required, all other flags are optional.

```
mt create “title [--desc <text>] [--priority <p0-p9>] [--type <type>] [--assignee <name>]
```

| Flag         | Short | Description                                           | Default  |
| ------------ | ----- | ----------------------------------------------------- | -------- |
| `--title`    | `-t`  | Issue title (max 50 chars)                            | required |
| `--desc`     | `-d`  | Longer description (max 512 chars)                    | empty    |
| `--priority` | `-p`  | Priority level: `p0` - `p9` (p0 is highest)           | `p5`     |
| `--status`   | `-s`  | Initial status: `open`, `in_progress`, `blocked`      | `open`   |
| `--type`     | `-`   | Type: `bug`, `feature`, `task`, `docs` &#124; `store` | `task`   |
| `--assignee` | `-a`  | Who is working on this issue (letters only)           | empty    |

> [!NOTE]
> `closed` is not a valid status on create. Use `mt close` to close an issue.

#### Examples

```bash
$ mt create “Mobile friendly screens”
$ mt create “Fix bug” –priority p1 –type bug
$ mt create “Add documentation” –d “Description of pros and cons” –assignee Ryan
```

**Output:**

```
Created issue manta-h3kp: Mobile friendly screens
Created issue manta-ar10: Fix bug
Created issue manta-nmec: Add documentation
```

### `mt update`

Updates one or more fields on an existing issue. ID and at least one flag are required.

```bash
mt update manta-xxxx [--title <text>] [--desc <text>] [--priority <p>] [--status <s>] [--type <t>] [--assignee <name>]
```

| Flag | Short | Description |
| — | — | — |
| `--title` | `-t` | New title |
| `--desc` | `-d` | New description |
| `--priority` | `-p` | New priority: `p0` - `p9` |
| `--status` | `-s` | New status: `open`, `in_progress`, `blocked`, `closed` |
| `--type` | - | New type: `bug`, `feature`, `task`, `docs`, `store` |
| `--assignee | `-a` | New assignee |

#### Examples

Updating an existing issue with the id manta-h3kp, changing the `status` field to `in_progress` and the `priority` field to `p0`.

```bash
$ mt update h3kp –status in_progress –priority p0
$ mt update manta-h3kp –status in_progress –priority p0
```

**Output:**

```bash
Update issue manta-h3kp with priority=p0, status=in_progress, updatedAt=X, updatedBy=X
```

> [!NOTE]
> All commands requiring a manta ID accept the full ID (manta-[xxxx]) or just the four digits ([xxxx])

### `mt close`

Marks an issue as closed by setting its status to `closed`. Only the ID is required.

```
mt close manta-xxxx
```

#### Examples

Closing an existing issue with the id manta-h3kp.

```bash
$ mt close manta-h3kp
$ mt close h3kp
```

**Output:**

```bash
Closed issue manta-h3kp
```

### `mt delete`

Permanently deletes an issue. Only the ID is required. On an interactive terminal, Manta will ask for confirmation before deleting.

```
mt delete manta-xxxx
```

#### Examples

Deleting an existing issue with the id manta-h3kp.

```bash
$ mt delete manta-h3kp
$ mt delete h3kp
```

**Output (confirmed):**

```bash
Delete issue manta-h3kp? [y/N] y
Deleted issue manta-h3kp
```

**Output (cancelled):**

```bash
Delete issue manta-h3kp? [y/N] N
Deletion cancelled
```

> [!NOTE]
> Deletion is permanent and cannot be undone. Do not delete issues unless the user explicitly asks.

### `mt view`

Lists issues or shows the detail of a single issue.

#### mt view

Lists all open issues in a paginated table. Use left/right arrow keys to navigate pages. Press ESC to exit.

```bash
$ mt view
```

**Output:**

```
ID      TITLE                                    STATUS    PRIORITY    TYPE    ASSIGNEE    CREATED BY
-------------------------------------------------------------------------------------------------------------------------------
g1xy    issue 1                                 open     	   p0        	task    	  -           	 katie
z1t9	issue 3                                 open	   p1        	bug    	  kngo           	 katie
n1vm	issue 2                                 open      	   p1        	task    	  -           	 katie
qx1z	issue 4                                 open      	   p1       	task    	  -           	 katie
44dv	issue 5                                 open      	   p1        	bug    	  kngo            	 katie

< prev.    next >
Page 1 of 2

Press ESC to exit
```

#### mt manta-xxxx

Shows the full detail of a single issue. Press ESC to exit.

```bash
$ mt view manta-t4pd
$ mt view t4pd
```

**Output:**

```
issue 6                                                                                     manta-t4pd
------------------------------------------------------------------------------------------------------
<no description>

------------------------------------------------------------------------------------------------------
Priority: p5                                        Status: open
Assignee: -                                       Type: task
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Created by: katie @ 2026-06-05 18:51 PDT
Updated by: katie @ 2026-06-05 18:51 PDT

Press ESC to exit
```

#### mt view [flags]

Filters the issue list by one or more fields. Only issues matching all provided filters are shown.

Available filters:
| Flag | Short | Filters by |
| --- | --- | --- |
| `--status <value>` | `-s` | `open`, `in_progress`, `blocked`, `closed` |
| `--priority <value>` | `-p` | `p0`–`p9` |
| `--type <value>` | - | `bug`, `feature`, `task`, `docs`, `store` |
| `--assignee <value>` | `-a` | assignee name |
| `--createdBy <value>` | `--cb` | OS username of creator |
| `--all` | - | includes closed issues in the list (no value needed) |

#### Examples

**Filter by a single flag:**

```bash
$ mt view –status in_progress
$ mt view –priority p1
$ mt view –type bug
$ mt view –assignee kngo
$ mt view –createdBy katie
$ mt view –all
```

**Combine multiple filters:**

```
$ mt view --status open --priority p1
$ mt view --type bug --assignee kngo
$ mt view --all --status closed
```

**Output (issues found using multiple filters):**

```
ID      TITLE                                    STATUS    PRIORITY    TYPE    ASSIGNEE    CREATED BY
-------------------------------------------------------------------------------------------------------------------------------
z1t9	issue 3                                 open	   p1        	bug    	  kngo           	 katie
44dv	issue 5                                 open      	   p1        	bug    	  kngo            	 katie

< prev.    next >
Page 1 of 1

Press ESC to exit
```

**Output (no issues found):**

```
No issues found.
```

> [!NOTE]
> `mt view` reads from the local SQLite cache and does not sync from the JSONL log. If you have recently run `git pull`, run a write command or `mt sync` first to ensure the cache is up to date.

### `mt version`

Prints the currently installed version of Manta.

```bash
$ mt version
```

**Output:**

```bash
0.1.0
```

### `mt init`

Sets up Manta in the current repository. Creates the `.manta/` folder and adds a `merge=union` rule to `.gitattributes` so teammates’ JSONL changes are appended rather than conflicted on `git pull`. Run once per repo.

```bash
$ mt init
```

**Output:**

```bash
Manta initialized.
Run this once in your repo to enable merge support:
  git config pull.rebase false
```

> [!NOTE]
> If Manta is already initialized in the repo, `mt init` will print a message and exit without making any changes.

### `mt sync`

Rebuilds the local SQLite cache from the JSONL event log. Run this after `git pull` to make sure your local database reflects your teammates’ latest changes.

```bash
$ mt sync
```

**Output (success):**

```bash
Synced successfully.
```

**Output (no changes):**

```bash
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

```bash
Clear the entire log? [y/N] y
Log cleared.
```

**Output (cancelled):**

```bash
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

### `mt help`

Prints general help with all available commands. With a command name, opens the wiki page for that command in your browser.

```
mt help
mt help <command>
```

#### Examples

```bash
$ mt help
$ mt help create
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

| Field     | Description                                                              |
| --------- | ------------------------------------------------------------------------ |
| ID        | Unique ID in `manta-xxxx` format, assigned on creation                   |
| createdAt | ISO timestamp when the issue was created                                 |
| createdBy | OS username of whoever created the issue, pulled from `process.env.USER` |
| updatedAt | ISO timestamp of the most recent change                                  |
| updatedBy | OS username of whoever made the most recent change                       |

## Errors

If a command fails, Manta prints an error message and exits with code 1.

### Common Errors

See the sections below for full details and examples:

| Error                                               | Cause                                           | Section                                                                                   |
| --------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `No input provided`                                 | `mt` run with no command                        | [Running with no commands](#running-with-no-commands)                                     |
| `Missing required input: id`                        | update/close/delete called without an ID        | [No ID when ID is required](#no-id-when-id-is-required)                                   |
| `Too few flags for 'update'`                        | update called with ID only, no fields to change | [Attempting to update with ID only](#attempting-to-update-with-id-only-no-fields)         |
| `Too many flags for 'close'/'delete'`               | extra flags passed to close or delete           | [Passing more than an ID to close/delete](#passing-more-than-an-id-to-closedelete)        |
| `Unexpected argument(s) detected`                   | arguments passed to version/sync/init           | [Passing arguments to a no-argument command](#passing-arguments-to-a-no-argument-command) |
| `Invalid flag`                                      | flag doesn't start with `--`                    | [Incorrect flag format](#incorrect-flag-format)                                           |
| `Unknown flag`                                      | flag not recognized                             | [Invalid flag](#invalid-flag)                                                             |
| `Duplicate flag`                                    | same flag used twice                            | [Duplicate flag](#duplicate-flag)                                                         |
| `'mt migrate' does not take any flags`              | flags passed to migrate or clear                | [Command takes no flags](#command-takes-no-flags)                                         |
| `Flag '--createdBy' can only be used with 'view'`   | createdBy used on wrong command                 | [createdBy used outside view](#createdby-used-outside-view)                               |
| `Missing value for flag`                            | flag present but no value given                 | [Missing value for a flag](#missing-value-for-a-flag)                                     |
| `Unknown command`                                   | unrecognized command                            | [Unknown command](#unknown-command)                                                       |
| `Missing required input: title`                     | create called without a title                   | [create without a title](#create-without-a-title)                                         |
| `Invalid status 'closed' on create`                 | status set to closed on create                  | [create with a closed status](#create-with-a-closed-status)                               |
| `Cannot filter by title or description`             | view filtered by title or desc                  | [view filtered by title or description](#view-filtered-by-title-or-description)           |
| `Missing required input: path`                      | migrate/clear called without a path             | [migrate without a path](#migrate-without-a-path)                                         |
| `validate error: not a valid issue id`              | ID doesn't match `manta-<suffix>`               | [Invalid issue ID](#invalid-issue-id)                                                     |
| `validate error: title must be under 50 characters` | title too long                                  | [Title too long](#title-too-long)                                                         |
| `validate error: not a valid priority`              | priority not in `p0`–`p9`                       | [Invalid priority](#invalid-priority)                                                     |
| `validate error: not a valid status`                | status not in allowed set                       | [Invalid status](#invalid-status)                                                         |
| `validate error: not a valid type`                  | type not in allowed set                         | [Invalid type](#invalid-type)                                                             |
| `validate error: not a valid assignee`              | assignee contains non-letter characters         | [Invalid assignee](#invalid-assignee)                                                     |

### Argument Count Errors

#### Running with no commands

Running `mt` without any commands will result in the following error.

```bash
$ mt
```

```bash
No input provided. Commands look like: mt <cmd> [flags]
```

#### No ID when ID is required

For commands requiring an ID (update, close, delete), attempting to use the command without an ID will result in the following error.

```bash
$ mt update
$ mt update --type 'bug'
$ mt close
$ mt delete
```

```bash
Missing required input: id
```

#### Attempting to update with ID only (no fields)

For `mt update`, updating with no fields will result in the following error.

```bash
$ mt update xxxx
```

```bash
Too few flags for 'update:' No updates to any field were provided undefined
```

#### Passing more than an ID to close/delete

`close` and `delete` accept exactly one input (the ID). Any extra flag triggers the max-count error.

```bash
$ mt close xxxx --priority p1
$ mt delete xxxx --status open
```

```bash
Too many flags for 'close:' Only an ID is expected
```

```bash
Too many flags for 'delete:' Only an ID is expected
```

#### Passing arguments to a no-argument command

`version`, `sync`, and `init` take no positional arguments and no flags.

```bash
$ mt version 1.2.3
$ mt sync now
$ mt init extra
```

```bash
Unexpected argument(s) detected - 'mt version' should be called with no arguments.
```

(`version` is replaced by whichever of `version`/`sync`/`init` was run.)

### Parsing Errors

#### Parser Check Order

Within the flag-parsing loop, checks run in this order, the first failure is the one reported:

1. token starts with `--` + letter -> else **Invalid flag** (format)
2. flag (after alias) is known -> else **Unknown flag**
3. flag not already set -> else **Duplicate flag**
4. command accepts flags -> else **Command takes no flags**
5. `--createdBy` only on `view` -> else **createdBy** restriction
6. value present (or absent for `--all`) -> else **Missing value** / **valueless flag**

Required-field and flag-count checks run after the loop completes.

#### Incorrect flag format

Flags must begin with `--` followed by a letter. A single dash, or a dash followed by a non-letter, is rejected.

```bash
$ mt create xxxx -priority p1
```

```bash
Invalid flag '-priority': flags must start with --
```

```bash
$ mt create 'incorrect format' --assignee example priority p1
```

```bash
Invalid flag '-priority': flags must start with --
```

#### Invalid flag

A token that starts with `--` but does not resolve to a known flag (after alias expansion) is rejected. The error reports the resolved flag name and lists every valid flag.

```bash
$ mt create xxxx --foo bar
$ mt update xxxx --proirity p1
```

```bash
Unknown flag 'foo': valid flags are
title, desc, status, priority, type, assignee, all, createdBy
```

> [!NOTE]
> Aliases that expand to a valid flag (`t`→title, `d`→desc, `p`→priority, `s`→status, `a`→assignee, `cb`→createdBy) are accepted; anything else is reported by its expanded form.

#### Duplicate flag

A flag may be provided once per command. Providing the same flag 2+ times, directly or via its alias, is rejected.

```bash
$ mt create xxxx --priority p1 --priority p2
$ mt create xxxx --p p1 --priority p2
```

```bash
Duplicate flag 'priority': --priority was already set
```

The error reports the resolved flag name, so `--p` and `--priority` collide because both resolve to `priority`.

#### Command takes no flags

`migrate` and `clear` take only a positional path argument and reject any flag.

```bash
$ mt migrate ./beads.jsonl --title x
$ mt clear ./.manta/manta.jsonl --status open
```

```bash
'mt migrate' does not take any flags.
```

> [!NOTE]
> `migrate` is replaced by whichever no-flag command was run.
> An _unknown_ flag is caught by the "Invalid flag" check first; this error fires only for an otherwise-valid flag name used on a no-flag command.

#### `--createdBy` used outside `view`

`--createdBy` (alias `--cb`) is a `view`-only filter. Using it with any other command is rejected at parse time.

```bash
$ mt create xxxx --createdBy user
$ mt update xxxx --cb user
```

```bash
Flag '--createdBy' can only be used with the 'view' command
```

#### Missing value for a flag

Every flag except `--all` requires a value. A flag immediately followed by another flag (or the end of input) is rejected.

```bash
$ mt create xxxx --desc --priority p1
$ mt update xxxx --status
```

```bash
Missing value for flag 'desc'
```

> [!Note]
> The error names the flag whose value is missing.

#### Value passed to a valueless flag

`--all` is a boolean flag and must not be given a value.

```bash
$ mt view --all everything
```

```bash
--'--all' flag cannot be called with a value.
```

#### Unknown command

The first token must be a valid command: `create, update, close, delete, version, view, sync, init, migrate, clear`.

```bash
$ mt creat xxxx
$ mt remove xxxx
```

```bash
Unknown command 'creat': valid commands are create, update, close, delete, version, view, sync, init, migrate, clear
```

#### `create` without a title

`create` requires a title, passed positionally or via `--title`.

```bash
$ mt create --priority p1
```

```bash
Missing required input: title
```

#### `create` with a closed status

An issue cannot be created already closed.

```bash
$ mt create xxxx --status closed
```

```bash
Invalid status 'closed': issues cannot be created with a closed status
```

#### `view` filtered by title or description

`view` filters only by status, priority, type, assignee, or createdBy, not by title or description.

```bash
$ mt view --title something
$ mt view --desc something
```

```bash
Cannot filter by title or description.
Can only filter by: status, priority, type, assignee
```

#### `migrate` without a path

`mt migrate` requires a path to a Beads JSONL file.

```bash
$ mt migrate
```

```bash
Missing required input: path to Beads JSONL file.
Usage: mt migrate <path/to/beads.jsonl>
```

#### `clear` without a path

If `mt clear` is ran with an empty string, an error is thrown. `clear` with no arguments defaults to `.manta/manta.jsonl`.

```bash
$ mt clear ''
```

```bash
Missing required input: path to Manta JSONL file.
Usage: mt clear <path/to/manta.jsonl>
```

### Validation Errors

#### Invalid issue ID

ID must match `manta-<suffix>` (pattern `^manta-.+$`). The parser auto-prefixes a
bare suffix with `manta-`, so this fires mainly on malformed IDs.

```bash
$ mt update manta- --priority p1
```

```bash
validate error: 'manta-' is not a valid issue id
```

#### Title too long

Max 50 characters.

```bash
$ mt create "<51+ character title>"
```

```bash
validate error: title must be under 50 characters
```

#### Description too long

Max 512 characters.

```bash
$ mt create xxxx --desc "<513+ character description>"
```

```bash
validate error: description must be under 512 characters
```

#### Invalid priority

Must match `p<N>` where N is a single digit (`p0`–`p9`).

```bash
$ mt create xxxx --priority high
$ mt update xxxx --priority p10
```

```bash
validate error: 'high' is not a valid priority
```

#### Priority required (create only)

`create` requires a priority; the parser supplies `p5` by default, so this fires only if that default is absent.

```bash
validate error: priority is required
```

#### Invalid status

Must be one of: `open, in_progress, blocked, closed`.

```bash
$ mt update xxxx --status done
```

```bash
validate error: 'done' is not a valid status
```

#### Status required (create only)

`create` requires a status; the parser defaults to `open`, so this fires only if that default is absent.

```bash
validate error: status is required
```

#### Invalid type

Must be one of: `bug, feature, task, docs, store`.

```bash
$ mt create xxxx --type epic
```

```bash
validate error: 'epic' is not a valid type
```

#### Invalid assignee

Alphabetic characters only (`^[a-zA-Z]+$`) — no digits, spaces, or symbols.

```bash
$ mt create xxxx --assignee user_1
```

```bash
validate error: 'user_1' is not a valid assignee
```

#### `createdBy` outside `view` (Stage 2 guard)

Backstop for the parser's restriction — `createdBy` is rejected for any non-`view` command.

```bash
validate error: 'createdBy' is not a valid flag for 'create'
```

#### Invalid username (createdBy)

On `view`, `createdBy` must be alphanumeric plus underscores (`^[a-zA-Z0-9_]+$`).

```bash
$ mt view --createdBy "bad name"
```

```bash
validate error: 'bad name' is not a valid username
```

#### Invalid path

`migrate`/`clear` path must be a non-empty string.

```bash
validate error: path must be a valid file path
```

## Stored Data

All Manta data is stored in the `.manta/` folder in this repo:

- `.manta/manta.jsonl`: append-only event log committed to git (source of truth)
- `.manta/manta.db`: local SQLite cache for fast queries

You can read `.manta/manta.jsonl` directly if you need to inspect the raw event history.
Each line is a JSON object describing one event (create, update, close, delete).

All Manta data is stored in the `.manta/` folder in this repo:

- `.manta/manta.jsonl`: append-only event log committed to git (source of truth)
- `.manta/manta.db`: local SQLite cache for fast queries

You can read `.manta/manta.jsonl` directly if you need to inspect the raw event history.
Each line is a JSON object describing one event (create, update, close, delete).

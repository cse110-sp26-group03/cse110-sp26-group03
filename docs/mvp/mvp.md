# Manta - Minimum Viable Product (MVP)


## Problem Statement

As generative AI becomes more integrated within our developmental workflow, traditional issue trackers have failed to keep pace. Many tools used to assist and facilitate development assume that a human is the actor. Today, issues are often opened by agents, resolved by agents, and only reviewed by humans. Existing systems offer no native way to distinguish human work from AI-assisted work and don't offer the support required to leverage AI agents in such workflows.

Issue trackers weren't designed with agents as actors and as a result, workarounds can become convoluted. A system built for human actors cannot adequately nor efficiently track, attribute, or communicate work in an environment where agents are active participants. A purpose-built system needs to be lightweight enough for fast-paced workflows, and transparent enough for humans to stay informed and in control. 

---

## Solution

Manta is a local-first issue tracker designed for developers and small teams who prefer working directly from the terminal. It requires no external platforms, cloud infrastructure, or accounts, and stores all data inside the project repository.

Issues are managed through a simple CLI interface using commands such as `mt create`, `mt update`, `mt close`, `mt delete`, and `mt view`. Changes are saved to an append-only event log that gets committed to git, allowing teammates to stay in sync through their normal push/pull workflow.

By storing issue data locally in structured files, developers can also use Manta alongside their AI agents. A developer creates and manages issues through the CLI, then points their agent to the corresponding Manta issue in the repository. Since the data is already accessible in the local project context, agents can read issue details, status updates, and project history.

Manta is designed to stay minimal while solving a growing workflow problem: developers want fast issue tracking that works seamlessly with both humans and AI-assisted development. The result is a system optimized for small teams who value simplicity, speed, and local ownership of their tools and data.

![image](/assets/images/current-structure.png)

---

## Target Users

Manta is designed for small software teams and solo developers who want a lightweight, local issue tracker that fits naturally into their existing terminal-based workflow. These are developers who do not need the complexity of tools like JIRA or Linear, and just want something simple that lives in their repo.

Since all issues are stored locally inside the project repository, developers can also point their AI agents directly to the issue data. A developer can create an issue with `mt create`, then tell their agent “go look in the manta database and work on manta-xxxx”. There is no extra integration or setup required. The agent reads the structured issue data directly from the local files.

---

### Persona 1 - April (Solo developer)

April is a solo developer working on a personal project in her spare time. She uses AI agents like Claude Code to help her write features and fix bugs, but she manages everything herself. She does not want to pay for or configure a heavyweight tool like Linear or JIRA just to track her own work. She wants a simple issue tracker that lives in her repo, works from the terminal, and doesn’t require any setup or maintenance (no accounts, dashboards, or configurations).

**Wants + needs:**
- Lightweight issue tracking that lives locally in her repo
- Simple CLI commands without leaving the terminal
- Issues that persist across sessions so she always knows what to work on next
- Something she can point her AI agent to directly

**Doesn't want/need:**
- Heavyweight tools with features she’ll never use
- External services that require internet access or a subscription
- Any setup before she can start tracking work  

---
### Persona 2 - Marcus (Project lead)

Marcus leads a small team of 3-4 developers building a startup product. His team moves quickly and does not need the complexity of other popular issue trackers. He wants a shared issue tracker that syncs through git without introducing anything new to learn or maintain.

**Wants/needs:**
- Shared issue tracking that syncs through normal git push/pull
- Simple status and ownership tracking across the team
- Something the entire team can adopt in minutes with little onboarding
- Issues stored locally so agents can read them directly from the repo

**Doesn't want/need:**
- A tool requiring its own server or account
- Complex workflows or permissions for a small team
- Anything that slows down a fast-moving development pace

---

### Who Manta is NOT designed for:
- Large enterprise teams needing complex workflows, permissions, or reporting
- Teams that do not use the terminal and prefer a graphical UI for managing work
- Teams that need built-in AI agent integration where agents do most of the work

---

### User Stories

**User Story 1 – Team member:**
As a member of a small software engineering team, I want a simple, lightweight issue tracker that my team can start using immediately without heavy setup or configuration. I want to create, update, close, delete, and view issues from my terminal in seconds, and have my changes automatically sync with my teammates through our normal git workflow.

**User Story 2 – Small team syncing through git:**
As a member of a software development team, I want issue changes made by my teammates to show up automatically when I pull from git so that our issue tracker stays in sync without requiring a separate server or tool to manage.

**User Story 3 – AI agent:**
As an AI agent working alongside a small software engineering team, I want to read structured issue details with clear fields for status, priority, type, and assignee so I can pick up tasks, update progress, and hand back to humans when review is needed (without relying on a human to translate vague descriptions for me).

**User Story 4 – Solo developer pointing an agent to local issues:**
As a solo developer using AI agents, I want to create issues from my terminal and point my agent directly to the local issue database so that my agent can pick up tasks without me needing to copy-paste context or explain the project state at the start of every session.

---

## Project Timeline

| Sprint | Week | Focus | Key Deliverables |
| --- | --- | --- | --- |
| Sprint 0 | Apr 26 | Research | Reviewed existing tools (Beads, JIRA, Linear), researched possible features,  brainstormed direction |
| Sprint 1 | May 3 | Prototyping | Split into two prototype teams (CLI vs VS Code extension), tested collaborative development, explored architecture |
| Review 1 | - | Retrospective | Liked: smaller teams improved communication. Disliked: uneven communication, unclear standards |
| Sprint 2 | May 10 | Finalize Plans | Established conventions, assigned tasks via GitHub issues, redistributed into frontend/backend teams, finalized ADRs and file structure |
| Review 2 | - | Retrospective | Liked: clearer team responsibilities. Disliked: confusion between members on finer development details |
| Sprint 3 | May 17 | Development | CI pipeline set up (ESLint linter & Prettier styler), core ADRs finalized, create/update/close/delete working end-to-end |
| Sprint 4 | May 24 | Ship | CD pipeline, JSDoc documentation, version control, development towards MVP or post-MVP features, peer code review with another team |

### Current Status (May 22)

**Done:**
- Walking prototype: `mt create`, `mt update`, `mt close`, `mt delete` working end-to-end (CLI → JSONL + SQLite)
- Full pipeline:  `user command line input → index.js → parser.js → validate.js → event.js → store.js → output to user`
- CI pipeline, ESLint, Prettier

**In progress:**
- CD pipeline
- `mt view`: list all open and in progress issues (no args); lists detailed issue information (manta-xxxx)
- `replay.js`: rebuild SQLite from JSONL on startup and after `git pull`
- migrate client from Beads (ex: mt bd migrate <path.to.beads.jsonl>)
- JSDoc
	
### What’s next (Sprint 4):
To complete the MVP the following must be finished:
- `mt view`
- `replay.js` for JSONL/SQLite sync
- Installation and version updating
- Additional flags and functionality improvements

---

## Features

### SQLite Cache and Event Log

Issue data is stored in a local SQLite cache for fast queries. A JSONL file is kept as a single source of truth and is used to rebuild when the SQLite database deviates from the log. 

### Commands

| command | description | usage | 
| --- | --- | --- |
| version | Prints the currently installed version of Manta | mt version |
| create | Creates an issue | mt create [issue name] --[optional field <field value>]... |
| update  | Updates an existing issue | mt update manta-xxxx --[optional field <field value>]... |
| close | Closes an existing issue| mt close manta-xxxx |
| delete | Deletes an existing issue | mt delete manta-xxxx |
| view | Lists existing issues | mt view |

### Supported flags/fields 

Below is an overview of the currently supported flags + fields for CLI commands. 

| name | description | restrictions | additional notes | example |
| --- | --- | --- | --- | --- |
| ID | the manta ID of the issue | cannot be changed, assigned on creation | used to identify and update, close, delete issues | manta-hk3p |
| title | the title of the issue | required on create, max 50 chars| can be updated/created with --title or -t | --title "sample title" | 
| description | more detailed description of the issue | max 512 chars | can be updated/created with --desc or -d | --description "sample description" |
| status | progress marker | allowed: 'open', 'in_progress', 'closed' | can be updated/created with --status or -s | -s "in_progress" | 
| priority | importance marker | must be in the form p<number> with number being 0-9. p0 is highest priority. | can updated/created with --priority or -p | -p "p3" |
| issue type | what type of issue it is | allowed: 'bug', 'feature', 'task', 'docs', 'store' | can be updated/created with --type (no shorthand) | --type "bug" | 
| assignee | who is working on the issue | a string with only a-z and A_Z | can be updated/created with --assignee or -a | -a "exampleassignee" |

Note that quotes are optional, so `--title "sample title"` and `--title sample title` will produce the same title. 

---

## User Flow

### Creating an issue:

A user begins by creating an issue using the command `mt create [title] [optional fields]`. A title is required but the user may input optional fields including description, priority, type, or assignee. Manta validates the input, generates a unique issue ID in the format manta-xxxx, and stores the issue in the SQLite database. If successful, Manta will output a confirmation with the created issue's ID and its information.

### Updating an issue:

After an issue has been created, the user can update any of its fields by using the command `mt update manta-[4 digit id] [updated fields]`. Manta validates the input, updates the record in the database, and outputs a confirmation with the changes made if no errors are thrown.

![image](/assets/images/create-update.png)

### Closing an issue:

To close an issue, users can use the command `mt close manta-[4 digit id].` As this event only updates the status of the issue, it undergoes a similar process to updating an issue. If successful, Manta will output a confirmation message with the closed issue's ID. 

### Deleting an issue:

To delete an issue, users can use the command `mt delete manta-[4 digit id]. Manta will validate the input, ensuring the record exists in the database before deleting the row. If successful, Manta will output a confirmation message with the deleted issue's ID. 

![image](/assets/images/close-delete.png)

## Acceptance Criteria

### Issue Management (CRUD):
- [ ] User can create a new issue from the CLI with a title, description, status, priority, type, and assignee in under 30 seconds without configuration
- [ ] A user can update any field of an existing issue via a single command and the change is reflected immediately in the local store
- [ ] A user can close or delete an issue via CLI and the change is reflected immediately in the local store
- [ ] All CRUD operations are available without internet connection (local-first)
### Issue Format:
- [ ] Each issue contains the required fields
- [ ] Issue files are stored in a machine-readable format (that AI agents can parse without needing to preprocess)
- [ ] Vague/missing fields are handled accordingly and do not cause silent failures
### Audit Trail:
- [ ] Every change made is appended to an immutable log in chronological order
- [ ] Log records issue affected, what changed, actor, and time stamp
### CLI Interface:
- [ ] Command shell is readable and organized 
- [ ] Core issue commands (`create, update, close, delete, view`) execute within 2 seconds on a standard machine
- [ ] `mt view` displays a readable summary of all existing issues

---

## Future Work

### Migration from Beads
For users who already have an existing and want to migrate to Manta, we want to implement a migration utility that reads exported Beads data and converts it into Manta's issue format. The migration tool should map Beads fields to their Manta equivalents. Issue history and timestamps should be preserved as faithfully as the Beads export format allows. Original beads data should remain untouched and users should be able to review a dry-run diff before committing the import. Post-migration, all issues should be fully functional within Manta with no manual cleanup required for standard cases.

### Dependencies and Blockers for Issues
Issues should support explicit dependency relationships and the ability to mark one issue as blocked by one or more other issues. The CLI should additionally display blocking relationships in `mt view` output, making it easy to see at a glance which issues cannot be progressed. When an issue that is blocking others is closed, Manta should notify the user that dependent issues are now unblocked. Circular dependencies (2+ issues depend on one another directly or indirectly) should be detected and rejected at write time. 

### Web Dashboard
A lightweight web dashboard should provide a visual overview of the issue store for users who prefer a graphical interface or need to share project status with stakeholders who don't use CLI. The dashboard should display open issues organized by status and priority, and render the audit log for any selected issue. 

### JSONL Compaction
As a project accumulates history, the append-only JSONL log will grow unbounded. We need to find a way to compress the log without losing records and still allow a replay command to reconstruct any prior project state from the archive. 










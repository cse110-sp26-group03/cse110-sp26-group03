# cse110-sp26-group03
## Team Page!
View our team here: [StringRays](admin/team.md)

View our Agile Team Status Video here: [Youtube Link](https://www.youtube.com/watch?v=EK99ER9aCGg)

## Install

Manta is available on npm: [npmjs.com/package/manta-it](https://www.npmjs.com/package/manta-it)

```bash
bun install -g manta-it
```

## Getting Started

A short guide to running Manta locally and trying a few commands.

### Prerequisites

Manta runs on [Bun](https://bun.sh). Install it once:

```bash
curl -fsSL https://bun.sh/install | bash
```

Restart your shell and verify the install:

```bash
bun --version
```

### Install

Clone the repo and install dependencies:

```bash
git clone https://github.com/cse110-sp26-group03/cse110-sp26-group03.git
cd cse110-sp26-group03
bun install
```

### Run

The easiest way is to link the CLI globally so you can run `mt` from anywhere:

```bash
bun link
```


### Try it

```bash
# -> Print version
mt version

# -> Create issues
mt create "Issue name" --priority p1 --assignee bob

# -> Update issues
mt update manta-xxxx --status in_progress

# -> Close issues
mt close manta-xxxx

# -> Delete issues
mt delete manta-xxxx

# -> View issues (interactive table; ESC to exit)
mt view

# -> View one issue by ID (short ID works too, e.g. mt view tzdb)
mt view manta-xxxx

```

Replace `manta-xxxx` with the ID printed by your first `create`. See the table at the end of the readme for additional information on supported flags and fields.

`mt view` opens in a separate terminal view. Use **left/right arrows** to change pages in the list, and **ESC** to return to your shell. Filter examples: `mt view --priority p1`, `mt view --all`, `mt view --cb alice`.

After a **`git pull`** that updates `.manta/manta.jsonl`, the SQLite cache refreshes on the next **write** command (`create`, `update`, `close`, `delete`). If `mt view` looks out of date right after a pull, run any write command or wait until you mutate an issue.

### Where your data lives

Manta creates a `.manta/` directory in your current working directory:

- `.manta/manta.jsonl` — durable event log (the source of truth)
- `.manta/manta.db` — local SQLite cache used for fast queries

### Supported flags/fields 

Below is an overview of the currently supported flags + fields for CLI commands. 

| name | description | restrictions | additional notes | example |
| --- | --- | --- | --- | --- |
| ID | the manta ID of the issue | cannot be changed, assigned on creation | used to identify and update, close, delete issues | manta-hk3p |
| title | the title of the issue | required on create, max 50 chars| can be updated/created with --title or --t | --title "sample title" | 
| description | more detailed description of the issue | max 512 chars | can be updated/created with --desc or --d | --description "sample description" |
| status | progress marker | allowed: 'open', 'in_progress', 'closed' | can be updated/created with --status or --s | --s "in_progress" | 
| priority | importance marker | must be in the form p<number> with number being 0-9. p0 is highest priority. | can updated/created with --priority or --p | --p "p3" |
| issue type | what type of issue it is | allowed: 'bug', 'feature', 'task', 'docs', 'store' | can be updated/created with --type (no shorthand) | --type "bug" | 
| assignee | who is working on the issue | a string with only a-z and A_Z | can be updated/created with --assignee or --a | --a "exampleassignee" |

Note that quotes are optional, so `--title "sample title"` and `--title sample title` will produce the same title. 

Here is an overview of the fields that are auto-assigned by the issue tracker, and cannot be modified by the user. 
| name | description | restrictions | additional notes | 
| --- | --- | --- | --- |
| ID | the manta ID of the issue | manta-xxxx format where xxxx is a unique sequence of Crockford base32 characters | assigned on creation | 
| createdAt | the time the issue was created | ISO timestamp (UTC) | updated only once at creation |
| createdBy | the person who created the issue | a-z, A-Z string, pulled from process.env| updated only once at creation |
| updatedAt | the most recent time the issue was edited | ISO timestamp (UTC) | the most recent edit time, not all edits |
| updatedBy | the person who updated most recently | a-z, A-Z string, pulled from process.env | most recent editor, not all of them | 




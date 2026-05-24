# cse110-sp26-group03
## Team Page
View our team here: [StringRays](admin/team.md)

View our Agile Team Status Video here: [Youtube Link](https://www.youtube.com/watch?v=EK99ER9aCGg)

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
# -> Create issues
mt create "Issue name" --priority p1 --assignee bob

# -> Update issues
mt update manta-xxxx --status in_progress

# -> Close issues
mt close manta-xxxx

# -> Delete issues
mt delete manta-xxxx

```

Replace `manta-xxxx` with the ID printed by your first `create`. 

Below is an overview of the currently supported flags + fields for CLI commands. 

| name | description | restrictions | additional notes | example |
| --- | --- | --- | --- | --- |
| ID | the manta ID of the issue | cannot be changed, assigned on creation | used to identify and update, close, delete issues | manta-hk3p |
| title | the title of the issue | required on create, max 50 chars| can be updated/created with --title or -t | --title "sample title" | 
| description | more detailed description of the issue | max 512 chars | can be updated/created with --desc or -d | --description "sample description" |
| status | progress marker | allowed: 'open', 'in_progress', 'closed' | can be updated/created with --status or -s | -s "in_progress" | 
| priority | importance marker | must be in the form p<number> with number being 0-9. p0 is highest priority. | can updated/created with --priority or -p | -p "p3" |
| issue type | what type of issue it is | allowed: 'bug', 'feature', 'task', 'docs', 'store' | can be updated/created with --type (no shorthand) | --type "bug" | 
| assignee | who is working on the issue | currently a string with only a-z and A_Z | can be updated/created with --assignee or -a | -a "exampleassignee" |

Note that quotes are optional, so `--title "sample title"` and `--title sample title` will produce the same title. 

Here is an overview of the fields that are auto-assigned by the issue tracker, and cannot be modified by the user. 
| name | description | restrictions | additional notes | 
| --- | --- | --- | --- |
| ID | the manta ID of the issue | manta-xxxx format where xxxx is a unique sequence of Crockford base32 characters | assigned on creation | 
| createdAt | the time the issue was created | ISO timestamp (UTC) | updated only once at creation |
| createdBy | the person who created the issue | a-z, A-Z string | updated only once at creation |
| updatedAt | the most recent time the issue was edited | ISO timestamp (UTC) | the most recent edit time, not all edits |
| updatedBy | the person who updated most recently | a-z, A-Z string | most recent editor, not all of them | 


### Viewing your issues (temporary workaround)

We're actively adding `mt show` / `mt list` so you can view issues directly from the CLI, but those commands aren't implemented yet. In the meantime, you can view your issues through a GUI:

1. Install the **SQLite Viewer** extension by **Florian Klampfer** on VS Code ([Marketplace link](https://marketplace.visualstudio.com/items?itemName=qwtel.sqlite-viewer)).
2. Create an issue on Manta (see the `mt create` command above).
3. Go to the `.manta/` directory and open `manta.db` to view it in the visualizer.

### Where your data lives

Manta creates a `.manta/` directory in your current working directory:

- `.manta/manta.jsonl` — durable event log (the source of truth)
- `.manta/manta.db` — local SQLite cache used for fast queries

To peek at your issues directly:

```bash
sqlite3 .manta/manta.db "SELECT ID, Title, Status, Priority, Assignee FROM issues;"
```



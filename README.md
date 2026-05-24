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

Replace `manta-xxxx` with the ID printed by your first `create`. See `design/cli-input-output.md` for the full command syntax and planned flags.

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



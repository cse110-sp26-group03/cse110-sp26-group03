# ADR-004: Migration from Beads

## Status
Proposed — 2026-05-17

Status: Pending

## Context

Currently, our product aims to improve upon Beads, however, if a user, or a team wanted to switch from Beads to Manta, they would have to manually recreate all of their issues.
This added work load may outweigh the improvements of Manta and discourage migration unless there was an easy, and quick way to migrate data from Beads.
Some important details that we considered is that:
1. Beads handles data storage using a similar method as Manta (through a JSONL)
2. The JSONL holds the current Beads data in a semi-structured, and parsable way
3. Core data can be mapped from Beads to Manta

## Considered Options

1. **Read from Bead's JSONL file**. Due to how JSONL files are organized, a command can be created that reads and parses Beads JSONL file, and outputs a Manta-compatable JSONL file with the translated data
2. **Users remake their issues.** The user is responsible for migrating their issues from Beads to Manta

## Decision

We want to adopt Option 1: Translating a Bead JSONL file to a Manta JSONL file appeals more to the user's needs as migration is easier and faster. 

We agreed upon this roadmap upon the CLI command: `mt migrate beads`
1. Reads the Beads JSONL.
2. Validates the file looks like Beads format (check for expected fields).
3. Validate the Manta project is empty.
4. Translates each Beads issue to create event with current state (fields not used by Manta are omitted).
5. Appends events to Manta's JSONL updates SQLite
6. Reports: "Migrated # issues from beads. # fields had no Manta equivalent and were dropped. Run `mt list` to see your issues."

**Notes**
- The Manta project needs to be empty to ensure that there are no duplicate or conflicting issues.
- Upon calling `mt migrate beads`, the Beads JSONL file will be read line by line, and the `(key, value)` pairs will be parsed, translated and outputed as a line in the Manta JSONL file. Then replay.js will read the Manta JSONL file and update the Manta SQLite file.
- Beads issue IDs are compatable with Manta issue IDs since the alphabet used to generate Beads issue IDS is a subset of the alphabet used to generate Manta IDs.

## Consequences

**Positive:**

- Gives the user an easy path to switch to Manta
- Reduces the human error of manual migrations
  
**Negative:**
- Must consider the many keys that Beads might store in their JSONL files
- Need to maintain compatability if Beads changes their JSONL schema, or data storage method

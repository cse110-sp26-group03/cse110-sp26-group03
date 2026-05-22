// src/cli/index.js
//
// Manta CLI entry point.
//
// Pipeline: argv -> parse -> validate -> replay -> create_event -> applyEvent -> print.

/* global process */

import { parse } from "./parser.js";
import { validate } from "../validation/validation.js";
import { create_event } from "./event.js";
import { applyEvent } from "../storage/store.js";
import { replay } from "../storage/replay.js";

/**
 * Run the Manta CLI: parse argv, sync the cache, apply the command.
 *
 * Wrapped in an async function because step 3 (replay) is asynchronous;
 * any step that fails prints its message and exits with status 1.
 */
async function main() {
  // 1. Parse argv -> { cmd, flags }.
  let parsed_command;
  try {
    parsed_command = parse(process.argv);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  // 2. Validate the parsed command (required fields, enum values, formats).
  try {
    validate(parsed_command);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  // 3. Replay the JSONL log into the SQLite cache so the cache reflects
  //    every event — including teammates' changes pulled in via git —
  //    before this command reads or writes it (per backend ADR-007).
  try {
    await replay();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  // 4. Build the storage event from the parsed command.
  let event;
  try {
    event = create_event(parsed_command);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  // 5. applyEvent (from src/storage/store.js) writes the event to both
  //    of Manta's stores. It returns the event back. On create events,
  //    storage generates the issue ID and fills it in as event.issueId.
  try {
    event = applyEvent(event);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  // 6. Print a success message based on which command was run.
  //      - create  -> show the new issue's id and title
  //      - update  -> show which fields changed, formatted as "key=value"
  //      - close   -> confirm the id was closed
  //      - delete  -> confirm the id was deleted
  switch (parsed_command.cmd) {
    case "create":
      console.log(`Created issue ${event.issueId}: ${event.issue.title}`);
      break;
    case "update": {
      const changes = Object.entries(event.changes)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      console.log(`Updated issue ${event.issueId} with ${changes}`);
      break;
    }
    case "close":
      console.log(`Closed issue ${event.issueId}`);
      break;
    case "delete":
      console.log(`Deleted issue ${event.issueId}`);
      break;
  }
}

main();

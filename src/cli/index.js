#!/usr/bin/env bun
// src/cli/index.js
//
// Manta CLI entry point.
//
// Pipeline:
//   Write commands: argv -> parse -> validate -> create_event -> syncFromLog -> applyEvent -> print
//   Read-only:      version, view, sync, and init exit before create_event

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { parse } from './parser.js';
import { validate } from '../validation/validation.js';
import { create_event } from './event.js';
import { applyEvent, issueExists } from '../storage/store.js';
import { FETCH } from '../storage/fetch.js';
import { DISPLAY } from './display.js';
import { syncFromLog } from '../storage/replay.js';
import { init } from './init.js';
import { clear } from './clear.js';
import { help } from '../help/help.js';

// ---- Step 1: Parse argv -----------------------------------------------

let parsed_command;
try {
  parsed_command = parse(process.argv);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

// ---- Step 2: Validate -------------------------------------------------
// skips commands that are not in the possible_flags table (commands that don't need validation)

try {
  validate(parsed_command);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

// early exit command: help

if (parsed_command.cmd === 'help') {
  try {
    help(parsed_command['flags']['help_cmd']);
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

// Early exit command: clear
// Clearing wipes the entire log, so confirm on a real terminal — but only
// once clear() has verified the file exists and has content. The callback
// passed below never runs for a missing or already-empty log, so we never
// prompt for a no-op. Falls through to syncFromLog afterward so the SQLite
// cache is rebuilt (emptied) to match the cleared log.

if (parsed_command.cmd === 'clear') {
  try {
    const confirm = process.stdin.isTTY
      ? () =>
          /^y(es)?$/i.test((prompt('Clear the entire log? [y/N]') ?? '').trim())
      : null;
    const changes = await clear(parsed_command.flags.path, confirm);
    if (changes === null) {
      console.log('Clear cancelled.');
      process.exit(0);
    }
    console.log(changes ? 'Log cleared.' : 'Log is already empty.');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

// ---- Step 1.5: Sync SQLite cache from JSONL log -----------------------
// Cheap when nothing changed (hash matches the stored checkpoint and
// replay is skipped); does a full rebuild when teammates' events have
// arrived via git pull. Must run before applyEvent so that update/delete
// see the freshest issue set.

try {
  let madeChanges = syncFromLog();

  // early exit on sync and clear
  if (parsed_command.cmd === 'sync' || parsed_command.cmd === 'clear') {
    console.log(
      madeChanges
        ? 'Synced successfully.'
        : 'Already up to date; no new events to sync.',
    );
    process.exit(0);
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

// ---- Early exit, read-only commands ----------------------------------

if (parsed_command.cmd === 'init') {
  init();
  process.exit(0);
}

if (parsed_command.cmd === 'version') {
  const pkgPath = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../package.json',
  );
  const { version } = JSON.parse(readFileSync(pkgPath, 'utf8'));
  console.log(version);
  process.exit(0);
}

// ---- Early exit: view -------------------------------------------------
// FETCH reads the SQLite cache; DISPLAY renders list or detail (ADR-009).
// Does not call create_event or applyEvent — view is read-only.

if (parsed_command.cmd === 'view') {
  try {
    const result = FETCH(parsed_command);
    await DISPLAY(parsed_command, result);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  process.exit(0);
}

// ---- Early exit: migrate ----------------------------------------------
// Migration reads a Beads JSONL export, translates each issue into a
// Manta issue.created event, and appends directly to .manta/manta.jsonl
// using store.js's appendToLog. After all events are written, the
// migrate function calls syncFromLog itself to rebuild SQLite.
// Does not go through create_event or applyEvent.

if (parsed_command.cmd === 'migrate') {
  try {
    const { migrateBeads } = await import('./migrate.js');
    const result = migrateBeads(parsed_command.flags.path);
    console.log(`\nMigration complete:`);
    console.log(`  Migrated: ${result.migrated}`);
    console.log(`  Skipped (already exist): ${result.skipped}`);
    console.log(`  Failed: ${result.failed}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  process.exit(0);
}

// ---- Step 2.5: Confirm destructive deletes ----------------------------
// Delete is irreversible (removes from both stores), so require an
// interactive y/n when stdin is a real terminal. In tests, CI, or piped
// input (no TTY) there is nobody to answer, so proceed without prompting.
//
// Verify the issue exists (against the just-synced SQLite cache) before
// prompting, so we never ask the user to confirm a delete that would only
// fail with "no issue with that ID exists" once applyEvent runs.

if (parsed_command.cmd === 'delete') {
  if (!issueExists(parsed_command.flags.id)) {
    console.error(
      `Cannot delete issue "${parsed_command.flags.id}": no issue with that ID exists.`,
    );
    process.exit(1);
  }

  if (process.stdin.isTTY) {
    const answer = prompt(`Delete issue ${parsed_command.flags.id}? [y/N]`);
    if (!/^y(es)?$/i.test((answer ?? '').trim())) {
      console.log('Deletion cancelled.');
      process.exit(0);
    }
  }
}

// ---- Step 3: Build event ----------------------------------------------

let event;
try {
  event = create_event(parsed_command);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

// ---- Step 4: Apply event to storage -----------------------------------
// Writes to both JSONL and SQLite. On create events, storage generates
// the issue ID and returns it on event.issueId.

try {
  event = applyEvent(event);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

// ---- Step 5: Print result ---------------------------------------------

switch (parsed_command.cmd) {
  case 'create':
    console.log(`Created issue ${event.issueId}: ${event.issue.title}`);
    break;
  case 'update': {
    const changes = Object.entries(event.changes)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    console.log(`Updated issue ${event.issueId} with ${changes}`);
    break;
  }
  case 'close':
    console.log(`Closed issue ${event.issueId}`);
    break;
  case 'delete':
    console.log(`Deleted issue ${event.issueId}`);
    break;
}

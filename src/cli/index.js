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

import updateNotifier from 'update-notifier';

import { parse } from './parser.js';
import { validate } from '../validation/validation.js';
import { create_event } from './event.js';
import { applyEvent } from '../storage/store.js';
import { FETCH } from '../storage/fetch.js';
import { DISPLAY } from './display.js';
import { syncFromLog } from '../storage/replay.js';
import { init } from './init.js';

// ---- Step 0: Async update check ---------------------------------------
// Checks the npm registry at most once per 24h (cached by update-notifier).
// Non-blocking: the request fires in the background and the banner is
// printed on the run AFTER a new version is detected, never the same run.
// Respects NO_UPDATE_NOTIFIER=1 out of the box. See CI ADR-006.

const pkgPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../package.json',
);
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

updateNotifier({
  pkg,
  updateCheckInterval: 1000 * 60 * 60 * 24, // 24h
}).notify({
  isGlobal: true,
  message:
    'Update available: {currentVersion} → {latestVersion}\n' +
    'Run `bun update -g manta-it` to upgrade.',
});

// ---- Step 1: Parse argv -----------------------------------------------

let parsed_command;
try {
  parsed_command = parse(process.argv);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

// ---- Step 1.5: Sync SQLite cache from JSONL log -----------------------
// Cheap when nothing changed (hash matches the stored checkpoint and
// replay is skipped); does a full rebuild when teammates' events have
// arrived via git pull. Must run before applyEvent so that update/delete
// see the freshest issue set.

try {
  syncFromLog();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

// ---- Early exits: read-only commands ----------------------------------

if (parsed_command.cmd === 'init') {
  init();
  process.exit(0);
}

if (parsed_command.cmd == 'sync') {
  console.log('Synced successfully.');
  process.exit(0);
}

if (parsed_command.cmd === 'version') {
  console.log(pkg.version);
  process.exit(0);
}

// ---- Step 2: Validate -------------------------------------------------

try {
  validate(parsed_command);
} catch (err) {
  console.error(err.message);
  process.exit(1);
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

// ---- Step 2.5: Confirm destructive deletes ----------------------------
// Delete is irreversible (removes from both stores), so require an
// interactive y/n when stdin is a real terminal. In tests, CI, or piped
// input (no TTY) there is nobody to answer, so proceed without prompting.

if (parsed_command.cmd === 'delete' && process.stdin.isTTY) {
  const answer = prompt(`Delete issue ${parsed_command.flags.id}? [y/N]`);
  if (!/^y(es)?$/i.test((answer ?? '').trim())) {
    console.log('Deletion cancelled.');
    process.exit(0);
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

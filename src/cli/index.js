#!/usr/bin/env bun
// src/cli/index.js
//
// Manta CLI entry point.
//
// Pipeline: argv -> parse -> validate -> create_event -> applyEvent -> print.
// Exception: version reads package.json and exits before storage.

/* global process */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { parse } from './parser.js';
import { validate } from '../validation/validation.js';
import { create_event } from './event.js';
import { applyEvent } from '../storage/store.js';
import { FETCH } from '../storage/fetch.js'
import { DISPLAY } from './display.js';

// 1. Parse argv -> { cmd, flags }.
let parsed_command;
try {
  parsed_command = parse(process.argv);
} catch (err) {
  console.error(err.message);
  process.exit(1);
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

// 2. Validate the parsed command (required fields, enum values, formats).
try {
  validate(parsed_command);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

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

// 3. Build the storage event from the parsed command.
let event;
try {
  event = create_event(parsed_command);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

// 4. applyEvent (from src/storage/store.js) writes the event to both
//    of Manta's stores:
//    It returns the event back.
//    On create events, storage generates the
//    issue ID and fills it in on the returned event as event.issueId
try {
  event = applyEvent(event);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

// 5. Print a success message based on which command was run.
//      - create  -> show the new issue's id and title
//      - update  -> show which fields changed, formatted as "key=value"
//      - close   -> confirm the id was closed
//      - delete  -> confirm the id was deleted
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


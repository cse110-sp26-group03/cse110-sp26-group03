#!/usr/bin/env bun
// src/cli/index.js
//
// Manta CLI entry point.
//
// Pipeline: argv -> parse -> validate -> create_event -> applyEvent -> print.
// Exception: "version" reads package.json and exits before reaching storage.

/* global process */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { parse } from './parser.js';
import { validate } from '../validation/validation.js';
import { create_event } from './event.js';
import { applyEvent } from '../storage/store.js';

// ---- Step 1: Parse argv -----------------------------------------------

let parsed_command;
try {
  parsed_command = parse(process.argv);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

// ---- Early exit: version ----------------------------------------------

if (parsed_command.cmd === 'version') {
  const pkgPath = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../package.json',
  );
  const { version } = JSON.parse(readFileSync(pkgPath, 'utf8'));
  console.log(version);
  process.exit(0);
}

// ---- Step 2: Validate -------------------------------------------------

try {
  validate(parsed_command);
} catch (err) {
  console.error(err.message);
  process.exit(1);
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

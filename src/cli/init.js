// src/cli/init.js
//
// Implements `mt init`.
//
// Creates the .manta/ directory and writes the .gitattributes merge=union rule
// so teammates' JSONL changes are appended rather than conflicted on git pull.
// Prints a reminder for the one step the user must do manually.

import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';

const MANTA_DIR = '.manta';
const GITATTRIBUTES_PATH = '.gitattributes';
const GITATTRIBUTES_LINE = '.manta/manta.jsonl merge=union';

/**
 * Initializes Manta in the current directory.
 *
 * - Creates .manta/ if it doesn't exist.
 * - Appends the merge=union rule to .gitattributes if not already present.
 * - Prints a reminder to run `git config pull.rebase false`.
 */
export function init() {
  // Detect if already initialized.
  const alreadyInitialized = existsSync(MANTA_DIR);

  if (alreadyInitialized) {
    console.log('Manta is already initialized in this repository.');
    return;
  }

  // Create .manta/ directory.
  mkdirSync(MANTA_DIR, { recursive: true });

  // Add merge=union rule to .gitattributes if not already there.
  const existing = existsSync(GITATTRIBUTES_PATH)
    ? readFileSync(GITATTRIBUTES_PATH, 'utf8')
    : '';

  if (!existing.includes(GITATTRIBUTES_LINE)) {
    const separator =
      existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
    writeFileSync(
      GITATTRIBUTES_PATH,
      existing + separator + GITATTRIBUTES_LINE + '\n',
      'utf8',
    );
  }

  console.log('Manta initialized.');
  console.log('Run this once in your repo to enable merge support:');
  console.log('  git config pull.rebase false');
}

// src/cli/init.js
//
// Implements `mt init`.
//
// Creates the .manta/ directory and writes the .gitattributes merge=union rule
// so teammates' JSONL changes are appended rather than conflicted on git pull.
// Also writes agent.md to the project root for AI agent reference.
// Prints a reminder for the one step the user must do manually.

import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';

const MANTA_DIR = '.manta';
const GITATTRIBUTES_PATH = '.gitattributes';
const GITATTRIBUTES_LINE = '.manta/manta.jsonl merge=union';
const AGENT_MD_PATH = 'AGENT.md';
const AGENT_MD_TEMPLATE = new URL('../agent.md', import.meta.url);

/**
 * Initializes Manta in the current directory.
 *
 * - Creates .manta/ if it doesn't exist.
 * - Appends the merge=union rule to .gitattributes if not already present.
 * - Writes agent.md to the project root for AI agent reference.
 * - Prints a reminder to run `git config pull.rebase false`.
 */
export function init() {
  // Read the current .gitattributes, as a way for checking whether we've already initialized, not .manta/
  const existing = existsSync(GITATTRIBUTES_PATH)
    ? readFileSync(GITATTRIBUTES_PATH, 'utf8')
    : '';

  // The .manta/ directory is created as a side effect of opening the SQLite
  // database. storage/db.js runs `mkdirSync('.manta', ...)` the moment it is
  // imported. Because index.js imports the storage modules before it ever
  // calls init(), .manta/ already exists by the time we get here, even in a
  // brand-new repo. So `.manta/` existing tells us nothing about whether the
  // user has actually run `init`.
  //
  // Instead we use the .gitattributes merge rule as the real marker of
  // initialization, because writing that line is something only init() does.
  const alreadyInitialized = existing.includes(GITATTRIBUTES_LINE);

  if (alreadyInitialized) {
    console.log('Manta is already initialized in this repository.');
    return;
  }

  mkdirSync(MANTA_DIR, { recursive: true });

  // Append the merge=union rule to .gitattributes if it doesn't exist. If the file already had
  // content not ending in a newline, add one first so we don't glue other rule
  // onto the end of an existing line.
  const separator = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
  writeFileSync(
    GITATTRIBUTES_PATH,
    existing + separator + GITATTRIBUTES_LINE + '\n',
    'utf8',
  );

  // Write agent.md to project root for AI agent reference.
  if (!existsSync(AGENT_MD_PATH)) {
    const agentContent = readFileSync(AGENT_MD_TEMPLATE, 'utf8');
    writeFileSync(AGENT_MD_PATH, agentContent, 'utf8');
  }

  console.log('Manta initialized.');
  console.log('Run this once in your repo to enable merge support:');
  console.log('  git config pull.rebase false');
}

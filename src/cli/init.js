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
const AGENT_MD_PATH = 'agent.md';
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

  // Write agent.md to project root for AI agent reference.
  if (!existsSync(AGENT_MD_PATH)) {
    const agentContent = readFileSync(AGENT_MD_TEMPLATE, 'utf8');
    writeFileSync(AGENT_MD_PATH, agentContent, 'utf8');
  }

  console.log('Manta initialized.');
  console.log('Run this once in your repo to enable merge support:');
  console.log('  git config pull.rebase false');
}

/**
 * Unit tests for the CLI init command (`src/cli/init.js`).
 *
 * init() is the only exported function. It creates the .manta/ directory,
 * writes the merge=union rule to .gitattributes, and prints setup reminders.
 * Parser coverage for `mt init` lives in parser.test.js.
 *
 * Each describe() block below targets one scenario:
 *   1. init() — first run         — .manta/, .gitattributes creation and messages
 *   2. init() — gitattributes     — append, dedupe, newline handling
 *   3. init() — already init      — early return when .manta/ exists
 *   4. init() — idempotency       — second run, scope limits, preserved .manta/ files
 *   5. init() — partial & edges   — repair gaps, substring dedupe, .manta as file
 */
import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import {
  mkdtempSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { init } from '../../../src/cli/init.js';

/** Directory Manta creates on first init. */
const MANTA_DIR = '.manta';

/** Git attributes file written or updated by init. */
const GITATTRIBUTES_PATH = '.gitattributes';

/** The merge=union rule init adds for the JSONL log. */
const GITATTRIBUTES_LINE = '.manta/manta.jsonl merge=union';

/** JSONL log path under .manta/ — created later by write commands, not init. */
const MANTA_LOG_PATH = join(MANTA_DIR, 'manta.jsonl');

/** SQLite cache path under .manta/ — created later by storage, not init. */
const MANTA_DB_PATH = join(MANTA_DIR, 'manta.db');

let workDir;
let savedCwd;

// Each test runs in an isolated temp directory so init() never touches the repo.
beforeEach(() => {
  savedCwd = process.cwd();
  workDir = mkdtempSync(join(tmpdir(), 'manta-init-'));
  process.chdir(workDir);
});

afterEach(() => {
  process.chdir(savedCwd);
  rmSync(workDir, { recursive: true, force: true });
});

/**
 * Run fn() while capturing every console.log line. Restores console.log
 * afterward so later tests see the real implementation.
 *
 * @param {() => void} fn - Callback that triggers the logs under test.
 * @returns {string[]} The captured log lines in call order.
 */
function captureConsoleLog(fn) {
  const lines = [];
  const original = console.log;
  console.log = (...args) => {
    lines.push(args.map(String).join(' '));
  };
  try {
    fn();
  } finally {
    console.log = original;
  }
  return lines;
}

/**
 * init() tests for a fresh repository with no .manta/ directory yet.
 * Covers directory creation, .gitattributes bootstrap, and user-facing
 * success messages.
 * 1. First test checks that .manta/ is created
 * 2. Second test checks that .gitattributes is written with the merge rule
 * 3. Third test checks the initialization and git config reminder messages
 */
describe('init() — first run', () => {
  test('creates the .manta/ directory', () => {
    expect(existsSync(MANTA_DIR)).toBe(false);

    init();

    expect(existsSync(MANTA_DIR)).toBe(true);
  });

  test('writes .gitattributes with the merge=union rule when missing', () => {
    init();

    expect(readFileSync(GITATTRIBUTES_PATH, 'utf8')).toBe(
      GITATTRIBUTES_LINE + '\n',
    );
  });

  test('prints initialization messages and the git config reminder', () => {
    const lines = captureConsoleLog(() => init());

    expect(lines).toEqual([
      'Manta initialized.',
      'Run this once in your repo to enable merge support:',
      '  git config pull.rebase false',
    ]);
  });
});

/**
 * init() tests for .gitattributes edge cases on first run. init() should
 * append the merge rule without clobbering existing content, avoid
 * duplicates, and preserve newline formatting.
 * 1. First test checks that existing content is preserved when appending
 * 2. Second test checks that a newline is inserted before the rule when the
 *    file has no trailing newline
 * 3. Third test checks that the rule is not duplicated when already present
 * 4. Fourth test checks that an empty .gitattributes file gets only the rule
 * 5. Fifth test checks append after trailing blank lines
 * 6. Sixth test checks that a whitespace variant of the rule is not treated as a duplicate
 */
describe('init() — gitattributes', () => {
  test('appends the merge rule to an existing .gitattributes file', () => {
    writeFileSync(GITATTRIBUTES_PATH, '*.png binary\n', 'utf8');

    init();

    expect(readFileSync(GITATTRIBUTES_PATH, 'utf8')).toBe(
      '*.png binary\n' + GITATTRIBUTES_LINE + '\n',
    );
  });

  test('inserts a newline before appending when the file lacks a trailing newline', () => {
    writeFileSync(GITATTRIBUTES_PATH, '*.png binary', 'utf8');

    init();

    expect(readFileSync(GITATTRIBUTES_PATH, 'utf8')).toBe(
      '*.png binary\n' + GITATTRIBUTES_LINE + '\n',
    );
  });

  test('does not duplicate the merge rule when it is already present', () => {
    writeFileSync(GITATTRIBUTES_PATH, GITATTRIBUTES_LINE + '\n', 'utf8');

    init();

    expect(readFileSync(GITATTRIBUTES_PATH, 'utf8')).toBe(
      GITATTRIBUTES_LINE + '\n',
    );
  });

  test('writes only the merge rule into an empty .gitattributes file', () => {
    writeFileSync(GITATTRIBUTES_PATH, '', 'utf8');

    init();

    expect(readFileSync(GITATTRIBUTES_PATH, 'utf8')).toBe(
      GITATTRIBUTES_LINE + '\n',
    );
  });

  test('appends the merge rule after trailing blank lines', () => {
    writeFileSync(GITATTRIBUTES_PATH, '*.png binary\n\n', 'utf8');

    init();

    expect(readFileSync(GITATTRIBUTES_PATH, 'utf8')).toBe(
      '*.png binary\n\n' + GITATTRIBUTES_LINE + '\n',
    );
  });

  test('appends the canonical rule when an existing line differs by whitespace', () => {
    const variant = '.manta/manta.jsonl  merge=union';
    writeFileSync(GITATTRIBUTES_PATH, variant + '\n', 'utf8');

    init();

    expect(readFileSync(GITATTRIBUTES_PATH, 'utf8')).toBe(
      variant + '\n' + GITATTRIBUTES_LINE + '\n',
    );
  });

  test('does not duplicate the merge rule when it appears among other lines', () => {
    const existing = '*.png binary\n' + GITATTRIBUTES_LINE + '\n*.md text\n';
    writeFileSync(GITATTRIBUTES_PATH, existing, 'utf8');

    init();

    expect(readFileSync(GITATTRIBUTES_PATH, 'utf8')).toBe(existing);
  });

  test('skips adding the rule when a commented line contains the same text', () => {
    const existing = '# ' + GITATTRIBUTES_LINE + '\n';
    writeFileSync(GITATTRIBUTES_PATH, existing, 'utf8');

    init();

    expect(readFileSync(GITATTRIBUTES_PATH, 'utf8')).toBe(existing);
  });
});

/**
 * init() tests when .manta/ already exists. init() should exit early without
 * touching .gitattributes or re-printing the first-run setup flow.
 * 1. First test checks the already-initialized message
 * 2. Second test checks that an existing .gitattributes file is left unchanged
 * 3. Third test checks that a missing .gitattributes file stays missing
 */
describe('init() — already init', () => {
  beforeEach(() => {
    mkdirSync(MANTA_DIR, { recursive: true });
  });

  test('prints the already-initialized message and skips first-run output', () => {
    const lines = captureConsoleLog(() => init());

    expect(lines).toEqual(['Manta is already initialized in this repository.']);
    expect(lines).not.toContain('Manta initialized.');
  });

  test('does not modify an existing .gitattributes file', () => {
    writeFileSync(GITATTRIBUTES_PATH, '*.png binary\n', 'utf8');

    init();

    expect(readFileSync(GITATTRIBUTES_PATH, 'utf8')).toBe('*.png binary\n');
  });

  test('does not create .gitattributes when it is missing', () => {
    expect(existsSync(GITATTRIBUTES_PATH)).toBe(false);

    init();

    expect(existsSync(GITATTRIBUTES_PATH)).toBe(false);
  });
});

/**
 * init() idempotency and scope tests. First run should only bootstrap .manta/
 * and .gitattributes; later runs and re-entry should not create storage files
 * or mutate existing .manta/ contents.
 * 1. First test checks that a second init() call reports already initialized
 * 2. Second test checks that manta.jsonl and manta.db are not created on first run
 * 3. Third test checks that pre-existing files inside .manta/ are left unchanged
 */
describe('init() — idempotency & scope', () => {
  test('reports already initialized on a second init() call', () => {
    captureConsoleLog(() => init());

    const lines = captureConsoleLog(() => init());

    expect(lines).toEqual(['Manta is already initialized in this repository.']);
    expect(existsSync(MANTA_DIR)).toBe(true);
    expect(readFileSync(GITATTRIBUTES_PATH, 'utf8')).toBe(
      GITATTRIBUTES_LINE + '\n',
    );
  });

  test('does not create manta.jsonl or manta.db on first run', () => {
    init();

    expect(existsSync(MANTA_LOG_PATH)).toBe(false);
    expect(existsSync(MANTA_DB_PATH)).toBe(false);
  });

  test('leaves pre-existing files in .manta/ untouched on re-run', () => {
    mkdirSync(MANTA_DIR, { recursive: true });
    writeFileSync(MANTA_LOG_PATH, '{"type":"issue.created"}\n', 'utf8');
    const before = readFileSync(MANTA_LOG_PATH, 'utf8');

    init();

    expect(readFileSync(MANTA_LOG_PATH, 'utf8')).toBe(before);
  });
});

/**
 * init() tests for partial initialization and unusual filesystem states.
 * Documents repair gaps and the string-based dedupe behavior in init.js.
 * 1. First test checks that a missing merge rule is not repaired when .manta/ exists
 * 2. Second test checks that an existing .manta file is treated as initialized
 */
describe('init() — partial & edges', () => {
  test('does not repair .gitattributes when .manta/ exists but the merge rule is missing', () => {
    mkdirSync(MANTA_DIR, { recursive: true });
    writeFileSync(GITATTRIBUTES_PATH, '*.png binary\n', 'utf8');

    init();

    expect(readFileSync(GITATTRIBUTES_PATH, 'utf8')).toBe('*.png binary\n');
  });

  test('treats an existing .manta file as already initialized', () => {
    writeFileSync(MANTA_DIR, 'not a directory', 'utf8');

    const lines = captureConsoleLog(() => init());

    expect(lines).toEqual(['Manta is already initialized in this repository.']);
    expect(existsSync(GITATTRIBUTES_PATH)).toBe(false);
  });
});

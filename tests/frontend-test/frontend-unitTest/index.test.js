/**
 * Unit tests for the CLI command router (`src/cli/index.js`).
 *
 * index.js is the one who runs the commands from other files
 *   parse -> validate -> (early-exit commands) -> syncFromLog -> create_event
 *   -> applyEvent -> print
 * and decides which commands exit early. These tests focus on that routing and
 * error-handling logic, not on the individual stages
 *
 * describe() blocks:
 *   1. parse + validate gate   — bad input exits 1 before any work happens
 *   2. mt help                 — early exit that runs BEFORE syncFromLog
 *   3. mt version              — prints the package.json version, exits 0
 *   4. mt sync                 — reports synced / already-up-to-date, exits 0
 *   5. mt delete gate          — issueExists check + confirmation prompt 
 *   6. read-only ordering      — read only commands never write to the log
 */
import {
  test,
  expect,
  describe,
  beforeEach,
  afterEach,
} from 'bun:test';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

/**
 * Path to the CLI entry point (index.js) under test
 */
const CLI_PATH = resolve(import.meta.dir, '../../../src/cli/index.js');

/** Path to package.json, so the version test asserts against the real value. */
const PKG_PATH = resolve(import.meta.dir, '../../../package.json');

/**
 * Run the `mt` CLI once in the given directory.
 *
 * Spawns index.js as a child process (like a real `mt` invocation) and waits
 * for it to finish. 
 * 
 * @param {string} cwd - Working directory to run in 
 * @param {string[]} args - CLI arguments, e.g. ['view', '--all'].
 * @returns {{stdout: string, stderr: string, code: number}}
 */
function runMt(cwd, args) {
  //child process than runs in index.js with given args
  const proc = Bun.spawnSync([process.execPath, CLI_PATH, ...args], { cwd });
  return {
    stdout: proc.stdout.toString(), // normal output text
    stderr: proc.stderr.toString(), // error output text
    code: proc.exitCode, // 0 = success, nonzero = failure
  };
}

/**
 * Create an issue and return its generated ID, failing the test if create did
 * not succeed.
 *
 * @param {string} cwd - The isolated working directory.
 * @returns {string} The full generated issue ID (e.g. "manta-h3kp").
 */
function createIssue(cwd) {
  const { stdout, code } = runMt(cwd, ['create', 'Fix login bug']);
  expect(code).toBe(0);
  const match = stdout.match(/Created issue (manta-\S+):/);
  expect(match).not.toBeNull();
  return match[1];
}

// Each test gets its own temp dir initialized as a fresh Manta repo, removed
// afterward so nothing leaks between tests or into the developer's real repo.
let dir;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'manta-index-'));
  const { code } = runMt(dir, ['init']); // start from an initialized repo
  expect(code).toBe(0);
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/**
 * parse + validate gate. index.js runs parse() then validate() first and exits
 * with code 1 if either throws. Nothing past the
 * gate should run, so no event is ever created for bad input.
 * 1. No command at all is rejected by the parser.
 * 2. An unknown command is rejected by the parser.
 * 3. A structurally-valid command with an invalid flag VALUE is rejected by the
 *    validation stage
 */
describe('parse + validate gate', () => {
  // Running with no command should fail before any command logic.
  test('exits 1 when no command is given', () => {
    const { code, stderr } = runMt(dir, []);
    expect(code).toBe(1);
    expect(stderr.length).toBeGreaterThan(0); // an error message was printed
  });

  // An unrecognized command is caught by parse() and reported.
  test('exits 1 on an unknown command', () => {
    const { code, stderr } = runMt(dir, ['frobnicate']);
    expect(code).toBe(1);
    expect(stderr).toMatch(/unknown command/i);
  });

  // 'urgent' parses fine but fails semantic
  // validation (priority must match /^p[0-9]$/)
  test('exits 1 when a flag value fails validation', () => {
    const { code, stderr } = runMt(dir, [
      'create',
      'Bad priority',
      '--priority',
      'urgent', // not a pN value
    ]);
    expect(code).toBe(1);
    expect(stderr.length).toBeGreaterThan(0);
  });
});

/**
 * mt help. help is the first exit branch in index.js and runs before
 * syncFromLog, so it works even with no cache. With no argument it prints the
 * general help overview and exits 0.
 */
describe('mt help', () => {
  test('prints general help and exits 0', () => {
    const { stdout, code } = runMt(dir, ['help']);
    expect(code).toBe(0);
    expect(stdout).toContain('Manta (mt)'); // header of the general help text
    expect(stdout).toMatch(/Usage:/);
  });
});

/**
 * mt version. A read-only early exit, index.js reads the version straight out
 * of package.json, prints it, and exits 0. We compare against the real
 * package.json value so the test tracks version bumps automatically.
 */
describe('mt version', () => {
  test('prints the package.json version and exits 0', () => {
    const { version } = JSON.parse(readFileSync(PKG_PATH, 'utf8'));

    const { stdout, code } = runMt(dir, ['version']);
    expect(code).toBe(0);
    expect(stdout.trim()).toBe(version);
  });
});

/**
 * mt sync. index.js runs syncFromLog() then, for the `sync` command, prints
 * whether a rebuild happened and exits 0.
 * 1. A freshly initialized repo has no new events, so sync is a no-op and
 *    reports it is already up to date.
 * 2. Deleting the SQLite cache forces sync to rebuild the cache from the log and report
 *    success.
 */
describe('mt sync', () => {
  // Nothing has changed since init, so there is nothing to replay.
  test('reports already up to date on a fresh repo', () => {
    const { stdout, code } = runMt(dir, ['sync']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/already up to date/i);
  });

  // With the cache gone, the stored checkpoint is gone too, so the log no
  // longer matches and syncFromLog does a full rebuild.
  test('rebuilds and reports success after the cache is deleted', () => {
    createIssue(dir); // writes one event to the JSONL log

    for (const f of ['manta.db', 'manta.db-wal', 'manta.db-shm']) {
      rmSync(join(dir, '.manta', f), { force: true });
    }

    const { stdout, code } = runMt(dir, ['sync']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/synced successfully/i);
  });
});

/**
 * mt delete gate. Before building a delete event, index.js verifies the issue
 * exists and asks for confirmation. 
 * 1. Deleting an unknown ID is rejected by index.js's own issueExists check,
 *    before any prompt or event, with a clear message and exit 1.
 * 2. Deleting an existing ID proceeds without prompting and succeeds.
 */
describe('mt delete gate', () => {
  // index.js shows a missing ID with its own message
  test('exits 1 with a clear message when the issue does not exist', () => {
    const { code, stderr } = runMt(dir, ['delete', 'manta-nope']);
    expect(code).toBe(1);
    expect(stderr).toMatch(/no issue with that ID exists/i);
  });

  // With a real issue ID, the delete command should succeed without prompting
  test('deletes without prompting', () => {
    const id = createIssue(dir);

    const { stdout, code } = runMt(dir, ['delete', id]);
    expect(code).toBe(0);
    expect(stdout).toMatch(/Deleted issue/);
    expect(stdout).not.toMatch(/\[y\/N\]/i); // prompt text never appeared
  });
});

/**
 * Read-only command ordering. Running a read-only command must not write anything.
 */
describe('read-only commands do not write to the log', () => {
  test('version does not create or append to the JSONL log', () => {
    const logPath = join(dir, '.manta', 'manta.jsonl');
    expect(existsSync(logPath)).toBe(false); // nothing written yet after init

    const { code } = runMt(dir, ['version']);
    expect(code).toBe(0);

    // Still no log, version exited before any write stage.
    expect(existsSync(logPath)).toBe(false);
  });
});

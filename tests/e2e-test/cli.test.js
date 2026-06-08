/**
 * End-to-end tests for the Manta CLI (`mt`).
 *
 * E2E steps covered
 *   1. init — Checks that init creates the `.manta/` directory
 *   2. create — adds an issue and prints its generated ID
 *   3. view — check that lists correct created issue
 *   4. update — a field change is persisted and visible on the next view
 *   5. close — the issue's status flips to closed
 *   6. delete — the issue is removed and can no longer be viewed
 *   7. persistence — the JSONL log records every event, and the replay is able to reproduce the same state
 */
import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

/**
 * Path to index.js in frontent/cli
 */
const CLI_PATH = resolve(import.meta.dir, '../../src/cli/index.js');

/**
 * Run the `mt` CLI once in the given directory
 *
 * Helper Function used in tests
 * Bun.spawnSync is used to run the CLI as like a child process, while we wait for its result
 * @param {string} cwd - which folder to run in
 * @param {string[]} args - CLI arguments ['create', 'Fix bug', '--priority', 'p2'].
 * @returns {{stdout: string, stderr: string, code: number}}
 */
function runMt(cwd, args) {
  //creates child process given current test (process.execPath),
  //running on cli/index.js, with args
  const proc = Bun.spawnSync([process.execPath, CLI_PATH, ...args], { cwd });
  return {
    stdout: proc.stdout.toString(), //normal output, get the text
    stderr: proc.stderr.toString(), //error output
    code: proc.exitCode, // 0 = success, nonzero = error
  };
}

/**
 * Create an issue and return its generated ID, failing the test if the create
 * command did not succeed.
 *
 * @param {string} cwd - The isolated working directory.
 * @param {string[]} [extraArgs] - Extra create flags beyond the title.
 * @returns {string} The full generated issue ID (e.g. "manta-h3kp").
 */
function createIssue(cwd, extraArgs = []) {
  const { stdout, code } = runMt(cwd, [
    'create',
    'Fix login bug',
    ...extraArgs,
  ]); //stdout is the text output, code is the success satus
  expect(code).toBe(0);
  // index.js prints: `Created issue manta-xxxx: <title>`
  const match = stdout.match(/Created issue (manta-\S+):/);
  expect(match).not.toBeNull();
  return match[1];
}

// Each test gets its own temp dir, initialized as a fresh Manta repo, and the
// dir is removed afterward so no info leaks
// beforeEach and afterEach run before and after every test
let dir;
beforeEach(() => {
  //tmpdir returns string of a new temp folder (AppData\Local\Temp as an example)
  //join(tmpdir(), 'manta-e2e-') sticks manta-e2e onto that path, so we get string AppData\Local\Temp\manta-e2e- as an example
  //mkdtempSync creates the actual temp directory with the string, and adds random chars at the end to make sure its unique
  dir = mkdtempSync(join(tmpdir(), 'manta-e2e-'));
  const { code } = runMt(dir, ['init']); //mt init in that temp directory
  expect(code).toBe(0);
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/**
 * init tests. `mt init` creates a repo for Manta.
 * 1. First test checks that init reports success and creates the .manta/
 *    directory plus the .gitattributes
 * 2. Second test checks that a second init is safe and just says
 *    repo is already installed
 */
describe('mt init', () => {
  // The beforeEach already ran init once; assert it produced the expected files.
  test('creates .manta/ and the .gitattributes merge rule', () => {
    // join(dir, '.manta) creates string path of the dir (directory) we made with the .manta
    //existsSync(path) checks if the path exists
    //so this checks whether the path (dir +  '.manta') exists. or in simple words if .manta was added to the dir
    expect(existsSync(join(dir, '.manta'))).toBe(true);
    //reads the file's contents and reutrns it. 'utf8' means we want text not bytes.
    const attrs = readFileSync(join(dir, '.gitattributes'), 'utf8');
    expect(attrs).toContain('.manta/manta.jsonl merge=union'); //check merge rule exists in .gitattributes
  });

  // Running init again should not throw error, and print that its already initialized
  test('is a no-op when already initialized', () => {
    const { stdout, code } = runMt(dir, ['init']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/already initialized/i);
  });
});

/**
 * create + view tests. Walk through of add an issue, then see it
 * 1. First test checks that create prints a generated ID and the detail view
 *    of that ID shows the title, priority, and assignee that were set at creation.
 * 2. Second test checks that the issue appears in the `view --all` list.
 * 3. Third test checks that creating without a required title fails
 */
describe('mt create + view', () => {
  // Create with explicit priority and assignee, then see if detail matches
  test('creates an issue and shows it in the detail view', () => {
    const id = createIssue(dir, ['--priority', 'p2', '--assignee', 'alice']);

    const { stdout, code } = runMt(dir, ['view', id]); //run view command
    expect(code).toBe(0); //check if view command succeed
    expect(stdout).toContain('Fix login bug'); //view includes title, set to fix login bug (mentioned in helper function)
    expect(stdout).toContain('p2'); //view includes priority, set to p2
    expect(stdout).toContain('alice'); //view includes assignee, set to alice
  });

  // The list view --all should include the just-created issue's short ID.
  test('lists the created issue with view --all', () => {
    const id = createIssue(dir);
    const shortId = id.replace('manta-', ''); // list view removes 'manta-' prefix, so strip it here for check

    const { stdout, code } = runMt(dir, ['view', '--all']);
    expect(code).toBe(0);
    expect(stdout).toContain(shortId); // list includes ID
    expect(stdout).toContain('Fix login bug'); //title should be in list view
  });

  // A title is required, no title should fail
  test('fails when required title is missing', () => {
    const { stderr, code } = runMt(dir, ['create', '--priority', 'p2']);
    expect(code).toBe(1);
    expect(stderr).toMatch(/title/i);
  });
});

/**
 * update tests. `mt update <id> --field value` changes an existing issue.
 * 1. First test checks that an updated field is persisted and shows up on the
 *    next view.
 * 2. Second test checks that updating a non existent issue should fail
 */
describe('mt update', () => {
  // Rename the issue, then confirm the new title is what the view reports.
  test('persists a field change visible on the next view', () => {
    const id = createIssue(dir);

    const upd = runMt(dir, ['update', id, '--title', 'Renamed issue']);
    expect(upd.code).toBe(0);
    expect(upd.stdout).toMatch(/Updated issue/);

    const { stdout } = runMt(dir, ['view', id]);
    expect(stdout).toContain('Renamed issue');
  });

  // Updating an ID that was never created should be rejected by the store.
  test('fails for an unknown issue ID', () => {
    const { stderr, code } = runMt(dir, [
      'update',
      'manta-nope', // non existent ID
      '--title',
      'x',
    ]);
    expect(code).toBe(1);
    expect(stderr).toMatch(/no issue with that ID exists/i);
  });
});

/**
 * close + delete tests.
 * 1. First test checks that close reports success and flips the status to
 *    closed
 * 2. Second test checks that delete removes the issue so a later view of that
 *    ID fails.
 */
describe('mt close + delete', () => {
  // Close the issue and verify the detail view now shows a closed status.
  test('close marks the issue closed', () => {
    const id = createIssue(dir);

    const closed = runMt(dir, ['close', id]);
    expect(closed.code).toBe(0);
    expect(closed.stdout).toMatch(/Closed issue/);

    const { stdout } = runMt(dir, ['view', id]);
    expect(stdout).toMatch(/Status:\s*closed/i);
  });

  // Delete the issue, then a view of the
  // same ID should fail because the row is gone from both stores.
  test('delete removes the issue', () => {
    const id = createIssue(dir);

    const del = runMt(dir, ['delete', id]);
    expect(del.code).toBe(0);
    expect(del.stdout).toMatch(/Deleted issue/); //make sure delete happened

    const { code } = runMt(dir, ['view', id]);
    expect(code).toBe(1); // FETCH throws "Query failed" for a missing ID
  });
});

/**
 * Check persistence between the JSONL log and the SQLite cache that is rebuilt from the log by replay.
 * 1. First test checks that each command appends the expected event type to
 *    the JSONL log
 * 2. Second test checks that deleting the SQLite cache and rerunning a command
 *    rebuilds it from the log alone, with no loss of data.
 */
describe('persistence and replay', () => {
  // The JSONL log should accumulate one line per write command, in the order
  // the commands ran (create, then update, then close).
  test('records each write as an event line in the JSONL log', () => {
    const id = createIssue(dir);
    runMt(dir, ['update', id, '--title', 'Renamed']);
    runMt(dir, ['close', id]);

    const log = readFileSync(join(dir, '.manta', 'manta.jsonl'), 'utf8');
    const events = log
      .trim() //remove trailing newline
      .split('\n') //split into lines, each line is an event
      .map((line) => JSON.parse(line)); //parse each line from JSON text into an object

    expect(events.map((e) => e.type)).toEqual([
      'issue.created',
      'issue.updated',
      'issue.updated', // `close` is persisted as a status update
    ]);
    // Every event refers to the same issue we created.
    expect(events.every((e) => e.issueId === id)).toBe(true);
  });

  // Deleting the SQLite cache simulates a fresh clone
  // The next command must rebuild the cache from the JSONL log via replay, so
  // the issue is still viewable with all its data intact.
  test('rebuilds the SQLite cache from the log after the cache is deleted', () => {
    const id = createIssue(dir, ['--assignee', 'bob']);

    // Drop the cache and its files, keeping only the JSONL log.
    for (const f of ['manta.db', 'manta.db-wal', 'manta.db-shm']) {
      rmSync(join(dir, '.manta', f), { force: true });
    }

    // Any command triggers syncFromLog(), which replays the log into a new DB.
    const { stdout, code } = runMt(dir, ['view', id]);
    expect(code).toBe(0);
    expect(stdout).toContain('Fix login bug');
    expect(stdout).toContain('bob');
  });
});

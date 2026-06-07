/**
 * End-to-end tests for the `mt` CLI (`src/cli/index.js`).
 *
 * These tests run the program the way a real user would. Each test spawns
 * `bun src/cli/index.js ...` as a separate process in a fresh temporary
 * directory, and checks only what can be observed from the outside: stdout,
 * stderr, the exit code, and the files the CLI writes under `.manta/`. None of
 * them reach into the program's internal modules.
 *
 * The full write pipeline under test (see index.js):
 *   argv -> parse -> validate -> syncFromLog -> create_event -> applyEvent -> print
 * The read-only and early-exit commands are also covered: version, init, view,
 * sync, clear, and delete.
 *
 * Running the CLI as a child process keeps the tests deterministic, for two
 * reasons:
 *   - A child process has no terminal attached to its input, so
 *     `process.stdin.isTTY` is undefined. In that case index.js skips the
 *     interactive y/N prompt, so delete and clear run without asking.
 *   - For the same reason, display.js sees that stdout is not a terminal and
 *     prints the view once, instead of starting its interactive screen loop.
 *     This means `mt view` returns right away instead of hanging.
 *
 * Each test gets its own temporary directory, so the `.manta/manta.jsonl` log
 * and the `.manta/manta.db` cache are fully isolated from one test to the next.
 */
import {
  test,
  expect,
  describe,
  beforeEach,
  afterEach,
} from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  rmSync,
  existsSync,
  readFileSync,
  appendFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Absolute path to the CLI entry point, resolved relative to this test file.
const CLI = fileURLToPath(new URL('../../src/cli/index.js', import.meta.url));

// The version the CLI is expected to print, taken from the same package.json.
const PKG_VERSION = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8'),
).version;

/** A fresh working directory for each test; the CLI reads and writes its `.manta/` here. */
let workdir;

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), 'manta-e2e-'));
});

afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
});

/**
 * Run the mt CLI in this test's temp working directory.
 *
 * @param {...string} args - CLI arguments, exactly as typed after `mt`.
 * @returns {{stdout: string, stderr: string, code: number}}
 */
function mt(...args) {
  const r = spawnSync('bun', [CLI, ...args], {
    cwd: workdir,
    encoding: 'utf8',
  });
  if (r.error) throw r.error;
  return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', code: r.status };
}

/**
 * Create an issue via the CLI and return its generated ID.
 *
 * @param {string} title - The issue title (positional argument).
 * @param {...string} extra - Any additional flags (e.g. '--type', 'bug').
 * @returns {string} The full generated ID, e.g. "manta-h3kp".
 */
function createIssue(title, ...extra) {
  const { stdout, code } = mt('create', title, ...extra);
  expect(code).toBe(0);
  const m = stdout.match(/Created issue (manta-[0-9a-z]+):/);
  expect(m).not.toBeNull();
  return m[1];
}

/** Absolute path to the JSONL log inside the current temp workdir. */
function logPath() {
  return join(workdir, '.manta', 'manta.jsonl');
}

// ---- version ------------------------------------------------------------

describe('mt version', () => {
  test('prints the package.json version and exits 0', () => {
    // mt version prints just the version string and nothing else.
    const { stdout, code } = mt('version');
    expect(code).toBe(0);
    expect(stdout.trim()).toBe(PKG_VERSION);
  });

  test('rejects extra arguments', () => {
    // version takes no arguments; passing one is an error.
    const { code, stderr } = mt('version', 'extra');
    expect(code).toBe(1);
    expect(stderr).toMatch(/no arguments/i);
  });
});

// ---- init ---------------------------------------------------------------

describe('mt init', () => {
  test('init currently reports "already initialized" and writes no gitattributes', () => {
    const { stdout, code } = mt('init');
    expect(code).toBe(0);
    expect(existsSync(join(workdir, '.manta'))).toBe(true);
    expect(stdout).toMatch(/already initialized/i);
    expect(existsSync(join(workdir, '.gitattributes'))).toBe(false);
  });

  test('does nothing new on a second run', () => {
    // Running init again is harmless and changes nothing.
    mt('init');
    const { stdout, code } = mt('init');
    expect(code).toBe(0);
    expect(stdout).toMatch(/already initialized/i);
  });
});

// ---- create + view ------------------------------------------------------

describe('mt create / mt view', () => {
  test('an empty workspace shows no issues', () => {
    // With no events yet, the list view reports an empty result.
    const { stdout, code } = mt('view');
    expect(code).toBe(0);
    expect(stdout).toMatch(/No issues found/);
  });

  test('create writes a create event to the JSONL log', () => {
    // A create should append exactly one issue.created line to the log.
    const id = createIssue('Alpha E2E');
    expect(existsSync(logPath())).toBe(true);

    const lines = readFileSync(logPath(), 'utf8').trim().split('\n');
    expect(lines.length).toBe(1);
    const event = JSON.parse(lines[0]);
    expect(event.type).toBe('issue.created');
    expect(event.issueId).toBe(id);
    expect(event.issue.title).toBe('Alpha E2E');
  });

  test('a created issue appears in the list view', () => {
    // The new issue's title should appear in the list output.
    createIssue('Alpha E2E');
    const { stdout, code } = mt('view');
    expect(code).toBe(0);
    expect(stdout).toContain('Alpha E2E');
  });

  test('detail view shows the issue by id with its flags applied', () => {
    // mt view <id> shows one issue, including the flags we passed in.
    const id = createIssue('Beta E2E', '--type', 'bug', '--assignee', 'alice');
    const { stdout, code } = mt('view', id);
    expect(code).toBe(0);
    expect(stdout).toContain(id);
    expect(stdout).toContain('Beta E2E');
    expect(stdout).toContain('bug');
    expect(stdout).toContain('alice');
  });

  test('the SQLite cache file is created alongside the log', () => {
    // Writing also builds the local SQLite cache file.
    createIssue('Alpha E2E');
    expect(existsSync(join(workdir, '.manta', 'manta.db'))).toBe(true);
  });
});

// ---- update -------------------------------------------------------------

describe('mt update', () => {
  test('updates a field and the new value is visible in detail view', () => {
    // Change one field, then confirm it shows up in the detail view.
    const id = createIssue('Gamma E2E');

    const upd = mt('update', id, '--title', 'Renamed E2E');
    expect(upd.code).toBe(0);
    expect(upd.stdout).toMatch(/Updated issue manta-[0-9a-z]+ with/);
    expect(upd.stdout).toContain('title=Renamed E2E');

    const view = mt('view', id);
    expect(view.stdout).toContain('Renamed E2E');
  });

  test('rejects an update with no fields to change', () => {
    // An update must change at least one field, or it is rejected.
    const id = createIssue('Gamma E2E');
    const { code, stderr } = mt('update', id);
    expect(code).toBe(1);
    expect(stderr).toMatch(/too few flags/i);
  });
});

// ---- close --------------------------------------------------------------

describe('mt close', () => {
  test('closed issues drop out of the default view but show under --all', () => {
    // Create two issues, close one, and compare the default and --all views.
    const closedId = createIssue('Closeme E2E');
    createIssue('Keepme E2E');

    const close = mt('close', closedId);
    expect(close.code).toBe(0);
    expect(close.stdout).toMatch(/Closed issue/);

    // The default list should hide the closed issue and keep the open one.
    const def = mt('view');
    expect(def.stdout).not.toContain('Closeme E2E');
    expect(def.stdout).toContain('Keepme E2E');

    // The --all flag should bring the closed issue back.
    const all = mt('view', '--all');
    expect(all.stdout).toContain('Closeme E2E');
    expect(all.stdout).toContain('Keepme E2E');
  });
});

// ---- delete -------------------------------------------------------------

describe('mt delete', () => {
  test('deletes an existing issue (no TTY => no prompt)', () => {
    // Delete runs without a prompt here because stdin is not a terminal.
    const id = createIssue('Deleteme E2E');

    const del = mt('delete', id);
    expect(del.code).toBe(0);
    expect(del.stdout).toMatch(/Deleted issue/);

    // The issue should be gone even from the --all view.
    const all = mt('view', '--all');
    expect(all.stdout).not.toContain('Deleteme E2E');

    // A delete event should have been appended to the log.
    const events = readFileSync(logPath(), 'utf8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l));
    expect(events.some((e) => e.type === 'issue.deleted' && e.issueId === id)).toBe(
      true,
    );
  });

  test('deleting a non-existent issue fails with a clear error', () => {
    // Deleting an unknown id should fail rather than do nothing.
    const { code, stderr } = mt('delete', 'manta-nope');
    expect(code).toBe(1);
    expect(stderr).toMatch(/no issue with that ID exists/i);
  });
});

// ---- sync ---------------------------------------------------------------

describe('mt sync', () => {
  test('does nothing right after our own write', () => {
    createIssue('Solo E2E');
    // create has already moved the checkpoint forward, so there is nothing new to replay.
    const { stdout, code } = mt('sync');
    expect(code).toBe(0);
    expect(stdout).toMatch(/up to date/i);
  });

  test('replays an event that was appended outside the CLI (as a git pull would)', () => {
    createIssue('Solo E2E');

    // Simulate a teammate's event arriving through a git pull: take the
    // create event we just wrote, give it a new ID and title, and append it
    // straight to the log, without going through the CLI.
    const original = JSON.parse(
      readFileSync(logPath(), 'utf8').trim().split('\n')[0],
    );
    original.issueId = 'manta-ext9';
    original.issue.title = 'External E2E';
    appendFileSync(logPath(), JSON.stringify(original) + '\n', 'utf8');

    // The log's hash no longer matches the stored checkpoint, so sync rebuilds the cache.
    const sync = mt('sync');
    expect(sync.code).toBe(0);
    expect(sync.stdout).toMatch(/Synced successfully/i);

    // Both the original issue and the one added outside the CLI should now be visible.
    const view = mt('view', '--all');
    expect(view.stdout).toContain('Solo E2E');
    expect(view.stdout).toContain('External E2E');
  });
});

// ---- clear --------------------------------------------------------------

describe('mt clear', () => {
  test('empties the log and the issues drop out of view', () => {
    // Clearing truncates the log, then the cache re-syncs to empty.
    createIssue('Wipe E2E');
    expect(readFileSync(logPath(), 'utf8').trim().length).toBeGreaterThan(0);

    const clear = mt('clear');
    expect(clear.code).toBe(0);
    expect(clear.stdout).toMatch(/Log cleared/i);

    // The log is now empty, so the refreshed cache should show nothing.
    expect(readFileSync(logPath(), 'utf8').trim().length).toBe(0);
    const view = mt('view');
    expect(view.stdout).toMatch(/No issues found/);
  });

  test('reports an already-empty log without error', () => {
    mt('init'); // ensure .manta exists
    createIssue('Tmp E2E');
    mt('clear'); // first clear empties it
    const again = mt('clear'); // second clear: the log is already empty
    expect(again.code).toBe(0);
    expect(again.stdout).toMatch(/already empty/i);
  });
});

// ---- argument / command errors -----------------------------------------

describe('mt error handling', () => {
  test('unknown command exits 1 with a helpful message', () => {
    // An unrecognized command is rejected with a non-zero exit code.
    const { code, stderr } = mt('frobnicate');
    expect(code).toBe(1);
    expect(stderr).toMatch(/unknown command/i);
  });

  test('create without a title is rejected', () => {
    // create requires a title; without one it errors out.
    const { code, stderr } = mt('create');
    expect(code).toBe(1);
    expect(stderr).toMatch(/missing required input: title/i);
  });

  test('no command at all is rejected', () => {
    // Running mt with no command is an error.
    const { code, stderr } = mt();
    expect(code).toBe(1);
    expect(stderr).toMatch(/no input provided/i);
  });
});

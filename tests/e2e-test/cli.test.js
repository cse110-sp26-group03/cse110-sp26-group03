/**
 * End-to-end tests for the `mt` CLI (`src/cli/index.js`).
 *
 * Unlike the unit tests, these exercise the whole program across a real
 * process boundary: each case spawns `bun src/cli/index.js ...` as a child
 * process in a fresh temp directory and asserts only on observable behavior
 * -- stdout, stderr, exit code, and the on-disk `.manta` artifacts. Nothing
 * here reaches into module internals, so the suite stays honest about what a
 * user actually sees.
 *
 * The full write pipeline under test (per index.js):
 *   argv -> parse -> validate -> syncFromLog -> create_event -> applyEvent -> print
 * plus the read-only / early-exit paths: version, init, view, sync, clear, delete.
 *
 * Why spawning is deterministic here:
 *   - A child process's stdin is not a TTY, so `process.stdin.isTTY` is falsy.
 *     index.js therefore skips the interactive y/N prompt and lets delete and
 *     clear proceed unattended.
 *   - For the same reason display.js detects a non-TTY stdout and prints the
 *     view once instead of entering its interactive alt-screen loop, so
 *     `mt view` returns immediately instead of hanging.
 *
 * Each test runs in its own mkdtemp dir, so the `.manta/manta.jsonl` log and
 * `.manta/manta.db` cache are fully isolated between cases.
 */
import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
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

// The version the CLI should report, read from the same package.json it reads.
const PKG_VERSION = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../package.json', import.meta.url)),
    'utf8',
  ),
).version;

/** Per-test isolated working directory; the CLI operates on its `.manta/`. */
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
    const { stdout, code } = mt('version');
    expect(code).toBe(0);
    expect(stdout.trim()).toBe(PKG_VERSION);
  });

  test('rejects extra arguments', () => {
    const { code, stderr } = mt('version', 'extra');
    expect(code).toBe(1);
    expect(stderr).toMatch(/no arguments/i);
  });
});

// ---- init ---------------------------------------------------------------

describe('mt init', () => {
  // KNOWN BUG (init.js): db.js eagerly creates `.manta/` when it is imported,
  // which happens for every command. By the time init() runs, `.manta` already
  // exists, so init takes its "already initialized" early return and never
  // writes the `.gitattributes merge=union` rule through the CLI. This test
  // pins that current behavior; flip these assertions once init.js is fixed to
  // write `.gitattributes` unconditionally.
  test('init currently reports "already initialized" and writes no gitattributes', () => {
    const { stdout, code } = mt('init');
    expect(code).toBe(0);
    expect(existsSync(join(workdir, '.manta'))).toBe(true);
    expect(stdout).toMatch(/already initialized/i);
    expect(existsSync(join(workdir, '.gitattributes'))).toBe(false);
  });

  test('is idempotent on a second run', () => {
    mt('init');
    const { stdout, code } = mt('init');
    expect(code).toBe(0);
    expect(stdout).toMatch(/already initialized/i);
  });
});

// ---- create + view ------------------------------------------------------

describe('mt create / mt view', () => {
  test('an empty workspace shows no issues', () => {
    const { stdout, code } = mt('view');
    expect(code).toBe(0);
    expect(stdout).toMatch(/No issues found/);
  });

  test('create writes a create event to the JSONL log', () => {
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
    createIssue('Alpha E2E');
    const { stdout, code } = mt('view');
    expect(code).toBe(0);
    expect(stdout).toContain('Alpha E2E');
  });

  test('detail view shows the issue by id with its flags applied', () => {
    const id = createIssue('Beta E2E', '--type', 'bug', '--assignee', 'alice');
    const { stdout, code } = mt('view', id);
    expect(code).toBe(0);
    expect(stdout).toContain(id);
    expect(stdout).toContain('Beta E2E');
    expect(stdout).toContain('bug');
    expect(stdout).toContain('alice');
  });

  test('the SQLite cache file is created alongside the log', () => {
    createIssue('Alpha E2E');
    expect(existsSync(join(workdir, '.manta', 'manta.db'))).toBe(true);
  });
});

// ---- update -------------------------------------------------------------

describe('mt update', () => {
  test('updates a field and the new value is visible in detail view', () => {
    const id = createIssue('Gamma E2E');

    const upd = mt('update', id, '--title', 'Renamed E2E');
    expect(upd.code).toBe(0);
    expect(upd.stdout).toMatch(/Updated issue manta-[0-9a-z]+ with/);
    expect(upd.stdout).toContain('title=Renamed E2E');

    const view = mt('view', id);
    expect(view.stdout).toContain('Renamed E2E');
  });

  test('rejects an update with no fields to change', () => {
    const id = createIssue('Gamma E2E');
    const { code, stderr } = mt('update', id);
    expect(code).toBe(1);
    expect(stderr).toMatch(/too few flags/i);
  });
});

// ---- close --------------------------------------------------------------

describe('mt close', () => {
  test('closed issues drop out of the default view but show under --all', () => {
    const closedId = createIssue('Closeme E2E');
    createIssue('Keepme E2E');

    const close = mt('close', closedId);
    expect(close.code).toBe(0);
    expect(close.stdout).toMatch(/Closed issue/);

    // Default list hides the closed issue, keeps the open one.
    const def = mt('view');
    expect(def.stdout).not.toContain('Closeme E2E');
    expect(def.stdout).toContain('Keepme E2E');

    // --all brings the closed issue back.
    const all = mt('view', '--all');
    expect(all.stdout).toContain('Closeme E2E');
    expect(all.stdout).toContain('Keepme E2E');
  });
});

// ---- delete -------------------------------------------------------------

describe('mt delete', () => {
  test('deletes an existing issue (no TTY => no prompt)', () => {
    const id = createIssue('Deleteme E2E');

    const del = mt('delete', id);
    expect(del.code).toBe(0);
    expect(del.stdout).toMatch(/Deleted issue/);

    // Gone even from the --all view.
    const all = mt('view', '--all');
    expect(all.stdout).not.toContain('Deleteme E2E');

    // A delete event was appended to the log.
    const events = readFileSync(logPath(), 'utf8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l));
    expect(
      events.some((e) => e.type === 'issue.deleted' && e.issueId === id),
    ).toBe(true);
  });

  test('deleting a non-existent issue fails with a clear error', () => {
    const { code, stderr } = mt('delete', 'manta-nope');
    expect(code).toBe(1);
    expect(stderr).toMatch(/no issue with that ID exists/i);
  });
});

// ---- sync ---------------------------------------------------------------

describe('mt sync', () => {
  test('is a no-op right after our own write', () => {
    createIssue('Solo E2E');
    // create already rolled the checkpoint forward, so nothing to replay.
    const { stdout, code } = mt('sync');
    expect(code).toBe(0);
    expect(stdout).toMatch(/up to date/i);
  });

  test('replays an externally appended event (git-pull style)', () => {
    createIssue('Solo E2E');

    // Simulate a teammate's event arriving via git pull: take our own
    // create event, give it a fresh ID and title, and append it directly
    // to the log -- bypassing the CLI entirely.
    const original = JSON.parse(
      readFileSync(logPath(), 'utf8').trim().split('\n')[0],
    );
    original.issueId = 'manta-ext9';
    original.issue.title = 'External E2E';
    appendFileSync(logPath(), JSON.stringify(original) + '\n', 'utf8');

    // The log hash no longer matches the checkpoint, so sync rebuilds.
    const sync = mt('sync');
    expect(sync.code).toBe(0);
    expect(sync.stdout).toMatch(/Synced successfully/i);

    // Both the original and the externally-added issue are now visible.
    const view = mt('view', '--all');
    expect(view.stdout).toContain('Solo E2E');
    expect(view.stdout).toContain('External E2E');
  });
});

// ---- clear --------------------------------------------------------------

describe('mt clear', () => {
  test('empties the log and the issues drop out of view', () => {
    createIssue('Wipe E2E');
    expect(readFileSync(logPath(), 'utf8').trim().length).toBeGreaterThan(0);

    const clear = mt('clear');
    expect(clear.code).toBe(0);
    expect(clear.stdout).toMatch(/Log cleared/i);

    // Log is now empty and the synced cache shows nothing.
    expect(readFileSync(logPath(), 'utf8').trim().length).toBe(0);
    const view = mt('view');
    expect(view.stdout).toMatch(/No issues found/);
  });

  test('reports an already-empty log without error', () => {
    mt('init'); // make .manta exist
    createIssue('Tmp E2E');
    mt('clear'); // first clear empties it
    const again = mt('clear'); // second clear: nothing to do
    expect(again.code).toBe(0);
    expect(again.stdout).toMatch(/already empty/i);
  });
});

// ---- argument / command errors -----------------------------------------

describe('mt error handling', () => {
  test('unknown command exits 1 with a helpful message', () => {
    const { code, stderr } = mt('frobnicate');
    expect(code).toBe(1);
    expect(stderr).toMatch(/unknown command/i);
  });

  test('create without a title is rejected', () => {
    const { code, stderr } = mt('create');
    expect(code).toBe(1);
    expect(stderr).toMatch(/missing required input: title/i);
  });

  test('no command at all is rejected', () => {
    const { code, stderr } = mt();
    expect(code).toBe(1);
    expect(stderr).toMatch(/no input provided/i);
  });
});

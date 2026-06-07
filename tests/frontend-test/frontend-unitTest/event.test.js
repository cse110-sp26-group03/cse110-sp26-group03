/**
 * Unit tests for the CLI event builder (`src/cli/event.js`).
 *
 * create_event() is the only exported function. It turns a validated parse
 * object into a storage event (issue.created, issue.updated, or issue.deleted).
 * Semantic value checks live in validation.test.js; argv shape lives in
 * parser.test.js.
 *
 * Each describe() block below targets one command path:
 *   1. create_event() — create  — issue.created shape, defaults, optional fields, actor
 *   2. create_event() — update  — partial changes, field mapping, updatedAt/updatedBy
 *   3. create_event() — close   — issue.updated with status closed
 *   4. create_event() — delete   — issue.deleted envelope
 *   5. create_event() — actor    — $USER / $USERNAME on write commands
 *   6. create_event() — errors   — unrecognized commands
 */
import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { create_event } from '../../../src/cli/event.js';

/**
 * Build a parse object with the given command and flags. Lets individual
 * tests pass just the pieces they care about instead of the full shape.
 *
 * @param {string} cmd - The command name (create, update, close, delete).
 * @param {object} [flags] - Flag values to merge in.
 * @returns {{cmd: string, flags: object}} A parse object ready for create_event().
 */
function makeParse(cmd, flags = {}) {
  return { cmd, flags };
}

/**
 * Env keys touched by actor tests. Saved in beforeEach and restored in
 * afterEach so the developer's shell environment is unchanged.
 *
 * @type {string[]}
 */
const ENV_KEYS = ['USER', 'USERNAME'];

let savedEnv;

// Start every actor test from a clean slate with neither USER nor USERNAME set.
beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  delete process.env.USER;
  delete process.env.USERNAME;
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
});

/**
 * Assert that a value is a parseable ISO-8601 timestamp string.
 *
 * @param {*} value
 */
function expectIsoTimestamp(value) {
  expect(typeof value).toBe('string');
  expect(Number.isNaN(new Date(value).getTime())).toBe(false);
}

/**
 * create_event() tests for the create command. Builds issue.created events
 * with defaults, optional fields, timestamps, and actor resolution.
 * 1. First test checks the full issue.created envelope with parser defaults
 * 2. Second test checks create with only a title when status/priority are omitted
 * 3. Third test checks that desc, type, and assignee map into the issue payload
 * 4. Fourth test checks that createdAt/updatedAt match the event timestamp
 * 5. Fifth test checks that $USER is used as actor when set
 * 6. Sixth test checks fallback to $USERNAME when $USER is unset
 * 7. Seventh test checks that $USER wins when both env vars are present
 */
describe('create_event() — create', () => {
  test('builds issue.created with defaults', () => {
    const event = create_event(
      makeParse('create', {
        title: 'Fix login bug',
        priority: 'p5',
        status: 'open',
      }),
    );

    expect(event.type).toBe('issue.created');
    expect(event.issueId).toBeNull();
    expect(event.issue).toEqual({
      title: 'Fix login bug',
      description: '',
      status: 'open',
      priority: 'p5',
      issueType: 'task',
      assignee: null,
      createdAt: event.timestamp,
      createdBy: event.actor,
      updatedAt: event.timestamp,
      updatedBy: event.actor,
    });
    expectIsoTimestamp(event.timestamp);
    expect(event.actor).toBe('local-user');
  });

  test('accepts create with only title when status and priority are omitted', () => {
    const event = create_event(makeParse('create', { title: 'Only Title' }));

    expect(event).toMatchObject({
      type: 'issue.created',
      issueId: null,
      issue: {
        title: 'Only Title',
        description: '',
        status: undefined,
        priority: undefined,
        issueType: 'task',
        assignee: null,
      },
    });
    expect(event.issue).toHaveProperty('createdAt');
    expect(event.issue).toHaveProperty('createdBy');
    expect(event.issue).toHaveProperty('updatedAt');
    expect(event.issue).toHaveProperty('updatedBy');
  });

  test('includes optional desc, type, and assignee', () => {
    const event = create_event(
      makeParse('create', {
        title: 'New feature',
        desc: 'Add dark mode',
        priority: 'p2',
        status: 'in_progress',
        type: 'feature',
        assignee: 'Alice',
      }),
    );

    expect(event.issue.description).toBe('Add dark mode');
    expect(event.issue.issueType).toBe('feature');
    expect(event.issue.assignee).toBe('Alice');
  });

  test('stamps createdAt and updatedAt with event timestamp', () => {
    const event = create_event(
      makeParse('create', { title: 'T', priority: 'p5', status: 'open' }),
    );
    expect(event.issue.createdAt).toBe(event.timestamp);
    expect(event.issue.updatedAt).toBe(event.timestamp);
  });

  test('uses $USER as actor when set', () => {
    process.env.USER = 'alice';
    const event = create_event(
      makeParse('create', { title: 'T', priority: 'p5', status: 'open' }),
    );
    expect(event.actor).toBe('alice');
    expect(event.issue.createdBy).toBe('alice');
    expect(event.issue.updatedBy).toBe('alice');
  });

  test('falls back to $USERNAME when $USER is unset', () => {
    process.env.USERNAME = 'bob';
    const event = create_event(
      makeParse('create', { title: 'T', priority: 'p5', status: 'open' }),
    );
    expect(event.actor).toBe('bob');
  });

  test('prefers $USER over $USERNAME when both are set', () => {
    process.env.USER = 'alice';
    process.env.USERNAME = 'bob';
    const event = create_event(
      makeParse('create', { title: 'T', priority: 'p5', status: 'open' }),
    );
    expect(event.actor).toBe('alice');
  });
});

/**
 * create_event() tests for the update command. Builds issue.updated events
 * with only the changed fields, maps parser flag names to storage names, and
 * always stamps updatedAt/updatedBy.
 * 1. First test checks that only provided flags appear in changes
 * 2. Second test checks desc→description and type→issueType mapping
 * 3. Third test checks multiple change fields in one event
 * 4. Fourth test checks updatedAt/updatedBy even for a single-field update
 * 5. Fifth test checks that omitted fields are absent from changes
 * 6. Sixth test checks a status-only update
 * 7. Seventh test checks an assignee-only update
 * 8. Eighth test checks all changeable fields combined
 */
describe('create_event() — update', () => {
  test('includes only provided change fields', () => {
    const event = create_event(
      makeParse('update', { id: 'manta-ab12', priority: 'p0' }),
    );

    expect(event).toEqual({
      type: 'issue.updated',
      timestamp: event.timestamp,
      actor: 'local-user',
      issueId: 'manta-ab12',
      changes: {
        priority: 'p0',
        updatedAt: event.timestamp,
        updatedBy: 'local-user',
      },
    });
    expectIsoTimestamp(event.timestamp);
  });

  test('maps desc to description and type to issueType', () => {
    const event = create_event(
      makeParse('update', {
        id: 'manta-xy99',
        desc: 'Updated text',
        type: 'bug',
      }),
    );

    expect(event.changes.description).toBe('Updated text');
    expect(event.changes.issueType).toBe('bug');
    expect(event.changes).not.toHaveProperty('desc');
    expect(event.changes).not.toHaveProperty('type');
  });

  test('accepts multiple change fields at once', () => {
    const event = create_event(
      makeParse('update', {
        id: 'manta-hk3p',
        title: 'Renamed',
        status: 'in_progress',
        assignee: 'Carol',
      }),
    );

    expect(event.changes).toMatchObject({
      title: 'Renamed',
      status: 'in_progress',
      assignee: 'Carol',
    });
    expect(event.changes.updatedAt).toBe(event.timestamp);
    expect(event.changes.updatedBy).toBe('local-user');
  });

  test('always stamps updatedAt and updatedBy', () => {
    const event = create_event(
      makeParse('update', { id: 'manta-tzdb', title: 'Only title' }),
    );
    expect(event.changes.updatedAt).toBe(event.timestamp);
    expect(event.changes.updatedBy).toBe(event.actor);
  });

  test('omits fields that were not provided', () => {
    const event = create_event(
      makeParse('update', { id: 'manta-ab12', status: 'blocked' }),
    );

    expect(event.changes.status).toBe('blocked');
    expect(event.changes).not.toHaveProperty('title');
    expect(event.changes).not.toHaveProperty('priority');
    expect(event.changes).not.toHaveProperty('description');
    expect(event.changes).not.toHaveProperty('issueType');
    expect(event.changes).not.toHaveProperty('assignee');
  });

  test('updates status only', () => {
    const event = create_event(
      makeParse('update', { id: 'manta-xy99', status: 'in_progress' }),
    );
    expect(event.changes).toMatchObject({ status: 'in_progress' });
    expect(Object.keys(event.changes).sort()).toEqual(
      ['status', 'updatedAt', 'updatedBy'].sort(),
    );
  });

  test('updates assignee only', () => {
    const event = create_event(
      makeParse('update', { id: 'manta-xy99', assignee: 'Dave' }),
    );
    expect(event.changes).toMatchObject({ assignee: 'Dave' });
    expect(Object.keys(event.changes).sort()).toEqual(
      ['assignee', 'updatedAt', 'updatedBy'].sort(),
    );
  });

  test('updates all changeable fields in one event', () => {
    const event = create_event(
      makeParse('update', {
        id: 'manta-xy99',
        title: 'Updated Test Issue',
        desc: 'This is an updated description.',
        status: 'in_progress',
        priority: 'p9',
        type: 'bug',
        assignee: 'Nathan',
      }),
    );

    expect(event).toMatchObject({
      type: 'issue.updated',
      issueId: 'manta-xy99',
      changes: {
        title: 'Updated Test Issue',
        description: 'This is an updated description.',
        status: 'in_progress',
        priority: 'p9',
        issueType: 'bug',
        assignee: 'Nathan',
      },
    });
    expect(event.changes.updatedAt).toBe(event.timestamp);
    expect(event.changes.updatedBy).toBe(event.actor);
  });
});

/**
 * create_event() tests for the close command. Close is implemented as an
 * issue.updated event that sets status to closed.
 * 1. First test checks the issue.updated envelope with status closed
 */
describe('create_event() — close', () => {
  test('builds issue.updated with status closed', () => {
    const event = create_event(makeParse('close', { id: 'manta-hk3p' }));

    expect(event.type).toBe('issue.updated');
    expect(event.issueId).toBe('manta-hk3p');
    expect(event.actor).toBe('local-user');
    expect(event.timestamp).toBe(event.changes.updatedAt);
    expect(event.changes).toEqual({
      status: 'closed',
      updatedAt: event.timestamp,
      updatedBy: 'local-user',
    });
  });
});

/**
 * create_event() tests for the delete command.
 * 1. First test checks the issue.deleted envelope with no changes/issue payload
 */
describe('create_event() — delete', () => {
  test('builds issue.deleted with issueId', () => {
    const event = create_event(makeParse('delete', { id: 'manta-tzdb' }));

    expect(event).toEqual({
      type: 'issue.deleted',
      timestamp: event.timestamp,
      actor: 'local-user',
      issueId: 'manta-tzdb',
    });
    expect(event).not.toHaveProperty('changes');
    expect(event).not.toHaveProperty('issue');
    expectIsoTimestamp(event.timestamp);
  });
});

/**
 * create_event() actor tests. All write commands resolve the actor from
 * process.env before stamping createdBy/updatedBy.
 * 1. First test checks that $USER is used on update, close, and delete
 */
describe('create_event() — actor', () => {
  test('uses $USER on update, close, and delete', () => {
    process.env.USER = 'carol';

    const update = create_event(
      makeParse('update', { id: 'manta-ab12', priority: 'p1' }),
    );
    expect(update.actor).toBe('carol');
    expect(update.changes.updatedBy).toBe('carol');

    const close = create_event(makeParse('close', { id: 'manta-hk3p' }));
    expect(close.actor).toBe('carol');
    expect(close.changes.updatedBy).toBe('carol');

    const del = create_event(makeParse('delete', { id: 'manta-tzdb' }));
    expect(del.actor).toBe('carol');
  });
});

/**
 * create_event() error tests. Commands that never reach create_event in the
 * CLI pipeline should still throw a clear error.
 * 1. First test checks that unrecognized commands throw with a descriptive message
 */
describe('create_event() — errors', () => {
  test('rejects unrecognized commands', () => {
    expect(() => create_event(makeParse('notacommand'))).toThrow(
      /event creation error: 'notacommand' is not a recognized command/,
    );
    expect(() => create_event(makeParse('view'))).toThrow(
      /event creation error: 'view' is not a recognized command/,
    );
    expect(() => create_event(makeParse('init'))).toThrow(
      /event creation error: 'init' is not a recognized command/,
    );
  });
});

/**
 * Unit tests for the CLI event builder (`src/cli/event.js`).
 *
 * Stage 1: event shape, defaults, partial updates, close semantics, and actor.
 */
import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { create_event } from '../../../src/cli/event.js';

/**
 * Build a parse object for create_event().
 *
 * @param {string} cmd - The command name (create, update, close, delete).
 * @param {object} [flags] - Flag values to merge in.
 * @returns {{cmd: string, flags: object}}
 */
function makeParse(cmd, flags = {}) {
  return { cmd, flags };
}

/** Saved env keys so actor tests can restore process.env afterward. */
const ENV_KEYS = ['USER', 'USERNAME'];

let savedEnv;

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

describe('create_event() — create', () => {
  // Parser supplies priority/status defaults; event.js fills desc, type, assignee.
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

  // event.js passes through status/priority when the parser omits them.
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

  // All optional create flags map correctly into the issue payload.
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

  // createdAt/updatedAt share the same timestamp as the event envelope.
  test('stamps createdAt and updatedAt with event timestamp', () => {
    const event = create_event(
      makeParse('create', { title: 'T', priority: 'p5', status: 'open' }),
    );
    expect(event.issue.createdAt).toBe(event.timestamp);
    expect(event.issue.updatedAt).toBe(event.timestamp);
  });

  // Make sure $USER is preferred as the actor.
  test('uses $USER as actor when set', () => {
    process.env.USER = 'alice';
    const event = create_event(
      makeParse('create', { title: 'T', priority: 'p5', status: 'open' }),
    );
    expect(event.actor).toBe('alice');
    expect(event.issue.createdBy).toBe('alice');
    expect(event.issue.updatedBy).toBe('alice');
  });

  // $USERNAME is used when $USER is absent.
  test('falls back to $USERNAME when $USER is unset', () => {
    process.env.USERNAME = 'bob';
    const event = create_event(
      makeParse('create', { title: 'T', priority: 'p5', status: 'open' }),
    );
    expect(event.actor).toBe('bob');
  });

  // $USER wins when both Unix and Windows env vars are present.
  test('prefers $USER over $USERNAME when both are set', () => {
    process.env.USER = 'alice';
    process.env.USERNAME = 'bob';
    const event = create_event(
      makeParse('create', { title: 'T', priority: 'p5', status: 'open' }),
    );
    expect(event.actor).toBe('alice');
  });
});

describe('create_event() — update', () => {
  // Only fields present in flags appear in changes payload.
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

  // Parser flag names map to storage field names correctly.
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

  // Multiple change fields can be combined in one event.
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

  // updatedAt/updatedBy are always stamped even with a single change.
  test('always stamps updatedAt and updatedBy', () => {
    const event = create_event(
      makeParse('update', { id: 'manta-tzdb', title: 'Only title' }),
    );
    expect(event.changes.updatedAt).toBe(event.timestamp);
    expect(event.changes.updatedBy).toBe(event.actor);
  });

  // Unchanged fields are omitted from changes, not set to undefined.
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

  // Single-field updates for status and assignee.
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

  // Every updatable flag can be combined in a single issue.updated event.
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

describe('create_event() — close', () => {
  // Close correctly builds with issue.updated with status closed.
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

describe('create_event() — delete', () => {
  // Delete correctly builds issue.deleted with issueId.
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

describe('create_event() — actor', () => {
  // Write commands other than create also stamp $USER as actor.
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

describe('create_event() — errors', () => {
  // Commands that never reach create_event in the CLI pipeline still error clearly.
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

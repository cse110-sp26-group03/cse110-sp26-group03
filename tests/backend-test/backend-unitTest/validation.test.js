/**
 * Unit tests for validation (`src/validation/validation.js`).
 */
import { test, expect, describe } from 'bun:test';
import { validate } from '../../../src/validation/validation.js';

/**
 * Build a parse object with defaults so individual tests only have
 *
 * @param {string} cmd - The command name (create, update, close, delete, view).
 * @param {object} [flags] - Flag values to merge in.
 * @returns {{cmd: string, flags: object}} A parse object ready for validate().
 */
function makeParse(cmd, flags = {}) {
  return { cmd, flags };
}

/**
 * Create parse object that passes validation.
 */
const VALID_CREATE = {
  cmd: 'create',
  flags: {
    title: 'Fix the bug',
    desc: 'Something is broken',
    priority: 'p1',
    status: 'open',
    type: 'bug',
    assignee: 'alice',
  },
};

describe('validate() paths', () => {
  // a valid create parse object should pass and return true.
  test('returns true for a fully valid create', () => {
    expect(validate(VALID_CREATE)).toBe(true);
  });

  // check update with no flags
  test('returns true for an update that only sets a valid id', () => {
    expect(validate(makeParse('update', { id: 'manta-ab12' }))).toBe(true);
  });

  // check close and delete with no flags is fine
  test('returns true for close, delete with no flags', () => {
    expect(validate(makeParse('close'))).toBe(true);
    expect(validate(makeParse('delete'))).toBe(true);
  });

  // check if optional flags on view are accepted
  test('returns true for a view with valid filter flags', () => {
    const parse = makeParse('view', {
      id: 'manta-zz99',
      priority: 'p3',
      status: 'closed',
      type: 'feature',
      assignee: 'bob',
      createdBy: 'bob_99',
    });
    expect(validate(parse)).toBe(true);
  });
});

describe('id validation', () => {
  /** Comment out for now as migration might include non-4 char IDs
  // The ID format is manta- followed by exactly 4 Crockford chars
  test('accepts a well-formed manta id', () => {
    expect(validate(makeParse('update', { id: 'manta-9hjk' }))).toBe(true);
  });
  */

  // Wrong shape must throw.
  test('rejects a malformed id with a descriptive message', () => {
    expect(() => validate(makeParse('update', { id: 'banana' }))).toThrow(
      /'banana' is not a valid issue id/,
    );
  });

});

describe('title and description length limits', () => {
  // Titles cap at 50 characters
  test('accepts a title at 50-char', () => {
    const title = 'a'.repeat(50);
    expect(
      validate({ ...VALID_CREATE, flags: { ...VALID_CREATE.flags, title } }),
    ).toBe(true);
  });

  // 51 characters is over the limit and must throw.
  test('rejects a title longer than 50 chars', () => {
    const title = 'a'.repeat(51);
    expect(() =>
      validate({ ...VALID_CREATE, flags: { ...VALID_CREATE.flags, title } }),
    ).toThrow(/title must be under 50 characters/);
  });

  // Descriptions cap at 512 characters; 512 is allowed
  test('accepts a description at the 512-char boundary', () => {
    const desc = 'd'.repeat(512);
    expect(
      validate({ ...VALID_CREATE, flags: { ...VALID_CREATE.flags, desc } }),
    ).toBe(true);
  });

  // check that 513 chars is over the limit and throws
  test('rejects a description longer than 512 chars', () => {
    const desc = 'd'.repeat(513);
    expect(() =>
      validate({ ...VALID_CREATE, flags: { ...VALID_CREATE.flags, desc } }),
    ).toThrow(/description must be under 512 characters/);
  });

  // Check Empty string still passes
  test('check an empty title, desc as no error', () => {
    expect(
      validate({
        ...VALID_CREATE,
        flags: { ...VALID_CREATE.flags, title: '', desc: '' },
      }),
    ).toBe(true);
  });
});

describe('priority validation, required on create, optional on update)', () => {
  // Valid priorities match /^p[0-9]$/.
  test('accepts a valid pN priority', () => {
    expect(
      validate({
        ...VALID_CREATE,
        flags: { ...VALID_CREATE.flags, priority: 'p0' },
      }),
    ).toBe(true);
  });

  // Bad format throws
  test('rejects a malformed priority', () => {
    expect(() =>
      validate({
        ...VALID_CREATE,
        flags: { ...VALID_CREATE.flags, priority: 'high' },
      }),
    ).toThrow(/'high' is not a valid priority/);
  });

  // On create, priority is required: omitting it is an error.
  test('requires priority on create', () => {
    const flags = { ...VALID_CREATE.flags };
    delete flags.priority;
    expect(() => validate({ cmd: 'create', flags })).toThrow(
      /priority is required/,
    );
  });

  // On update, an omitted priority should still be fine
  test('allows an omitted priority on update', () => {
    expect(validate(makeParse('update', { id: 'manta-ab12' }))).toBe(true);
  });
});

describe('status validation, required on create, optional on update)', () => {
  // Status must be one of open, in_progress, closed.
  test('accepts each allowed status', () => {
    for (const status of ['open', 'in_progress', 'closed']) {
      expect(
        validate({ ...VALID_CREATE, flags: { ...VALID_CREATE.flags, status } }),
      ).toBe(true);
    }
  });

  test('rejects an unknown status', () => {
    expect(() =>
      validate({
        ...VALID_CREATE,
        flags: { ...VALID_CREATE.flags, status: 'done' },
      }),
    ).toThrow(/'done' is not a valid status/);
  });

  // Required on create, optional on update
  test('requires status on create', () => {
    const flags = { ...VALID_CREATE.flags };
    delete flags.status;
    expect(() => validate({ cmd: 'create', flags })).toThrow(
      /status is required/,
    );
  });
});

describe('type validation', () => {
  // Allowed types come from VALID_TYPES in the source.
  test('accepts each allowed type', () => {
    for (const type of ['bug', 'feature', 'task', 'docs', 'store']) {
      expect(
        validate({ ...VALID_CREATE, flags: { ...VALID_CREATE.flags, type } }),
      ).toBe(true);
    }
  });

  test('rejects an unknown type', () => {
    expect(() =>
      validate({
        ...VALID_CREATE,
        flags: { ...VALID_CREATE.flags, type: 'epic' },
      }),
    ).toThrow(/'epic' is not a valid type/);
  });

  // type is optional — omitting it is fine even on create.
  test('allows an omitted type', () => {
    const flags = { ...VALID_CREATE.flags };
    delete flags.type;
    expect(validate({ cmd: 'create', flags })).toBe(true);
  });
});

describe('assignee validation', () => {
  // Assignees must be alphabetic only (no digits or symbols).
  test('accepts an alphabetic assignee', () => {
    expect(
      validate({
        ...VALID_CREATE,
        flags: { ...VALID_CREATE.flags, assignee: 'Alice' },
      }),
    ).toBe(true);
  });

  test('rejects an assignee containing digits or symbols', () => {
    expect(() =>
      validate({
        ...VALID_CREATE,
        flags: { ...VALID_CREATE.flags, assignee: 'alice99' },
      }),
    ).toThrow(/'alice99' is not a valid assignee/);
  });
});

describe('createdBy validation (view-only filter)', () => {
  // createdBy allows alphanumerics and underscores.
  test('accepts an alphanumeric/underscore username on view', () => {
    expect(validate(makeParse('view', { createdBy: 'user_42' }))).toBe(true);
  });

  test('rejects a username with illegal characters on view', () => {
    expect(() => validate(makeParse('view', { createdBy: 'user-42' }))).toThrow(
      /'user-42' is not a valid username/,
    );
  });

  // createdBy isn't listed in possible_flags for non-view commands, so
  // check_createdBy is never invoked for them — there's no way to reach its
  // "not a valid flag for ..." branch through validate(). We document that the
  // filter is simply ignored on, e.g., update rather than rejected.
  test('createdBy is not evaluated for non-view commands', () => {
    expect(
      validate(
        makeParse('update', { id: 'manta-ab12', createdBy: 'whatever!' }),
      ),
    ).toBe(true);
  });
});

describe('error semantics', () => {
  // validate throws a real Error (not a string), so callers can rely on
  // err.message / instanceof checks.
  test('throws an Error instance whose message is the check string', () => {
    try {
      validate(makeParse('update', { id: 'nope' }));
      throw new Error('expected validate to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toMatch(/is not a valid issue id/);
    }
  });

  // The first failing check short-circuits: with both a bad id and a bad
  // priority on update, the id (checked first per possible_flags order) wins.
  test('reports the first failing flag in command order', () => {
    expect(() =>
      validate(makeParse('update', { id: 'bad', priority: 'also-bad' })),
    ).toThrow(/is not a valid issue id/);
  });
});

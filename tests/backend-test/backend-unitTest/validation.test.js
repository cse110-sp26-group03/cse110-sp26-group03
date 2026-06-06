/**
 * Unit tests for the validation layer (`src/validation/validation.js`).
 *
 * validate() is the only exported function, but it delegates to other helper functions. 
 *
 * Each describe() block below targets one function, with three tests each:
 *   1.  validate()        — dispatch: passes valid commands, skips unknown
 *                           commands, and throws in command-flag order
 *   2.  check_id()        — the manta-<chars> id format
 *   3.  check_title()     — title length limit (<= 50)
 *   4.  check_desc()      — description length limit (<= 512)
 *   5.  check_priority()  — pN format, required on create, optional on update
 *   6.  check_status()    — allowed set, required on create, optional on update
 *   7.  check_type()      — allowed set, optional even on create
 *   8.  check_assignee()  — alphabetic only
 *   9.  check_createdBy() — view-only username filter
 *   10. check_path()      — non-empty path for migrate / clear
 */
import { test, expect, describe } from 'bun:test';
import { validate } from '../../../src/validation/validation.js';

/**
 * Build a parse object with the given command and flags. Lets individual
 * tests pass just the pieces they care about instead of the full shape.
 *
 * @param {string} cmd - The command name (create, update, close, delete, view,
 *                       migrate, clear, help).
 * @param {object} [flags] - Flag values to merge in.
 * @returns {{cmd: string, flags: object}} A parse object ready for validate().
 */
function makeParse(cmd, flags = {}) {
  return { cmd, flags };
}

/**
 * A fully valid create parse object. Many tests start from this and then
 * override a single flag to test a specific check function.
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

/**
 * validate() tests, covering its own logic
 * 1. First test checks that a fully valid create passes and returns true
 * 2. Second test checks that a command with no validation rules is skipped
 * 3. Third test checks that the first failing flag in command order is the one
 *    reported, and that a real Error instance is thrown
 */
describe('validate()', () => {
  // Every check passes, so validate returns true.
  test('returns true for a fully valid create', () => {
    expect(validate(VALID_CREATE)).toBe(true);
  });

  // A command not listed in possible_flags has no rules, so validate skips
  // straight to returning true without running any check.
  test('returns true (skips) for a command with no validation rules', () => {
    expect(validate(makeParse('help', { anything: 'goes' }))).toBe(true);
  });

  // With both a bad id and a bad priority on update, the id is what throws. We catch manually to confirm it's an Error.
  test('throws an Error for the first failing flag in command order', () => {
    try {
      validate(makeParse('update', { id: 'bad', priority: 'also-bad' }));
      // Reaching here means validate didn't throw, fail the test
      throw new Error('expected validate to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toMatch(/is not a valid issue id/);
    }
  });
});

/**
 * check_id() tests, reached through an update (id is in update's flag list).
 * The id format is `manta-` followed by one or more characters.
 * 1. First test checks that a well-formed manta id is accepted
 * 2. Second test checks that a malformed id is rejected with a descriptive message
 * 3. Third test checks that an omitted id is accepted (undefined skips the check)
 */


describe('check_id()', () => {
  /** Will look back later on once clear id format for migrate 
  test('accepts a well-formed manta id', () => {
    expect(validate(makeParse('update', { id: 'manta-ab12' }))).toBe(true);
  });

  test('rejects a malformed id with a descriptive message', () => {
    expect(() => validate(makeParse('update', { id: 'banana' }))).toThrow(
      /'banana' is not a valid issue id/,
    );
  });
*/

  // An update with no id at all should still pass (id is optional).
  test('accepts an omitted id', () => {
    expect(validate(makeParse('update', {}))).toBe(true);
  });
});

/**
 * check_title() tests, reached through a create. Titles cap at 50 characters.
 * 1. First test checks that a title at 50 characters is accepted
 * 2. Second test checks that a title longer than 50 chars is rejected
 * 3. Third test checks that an empty title is accepted
 */
describe('check_title()', () => {
  // 'a'.repeat(50) builds a 50-character string of 'a's.
  test('accepts a title at the 50-char boundary', () => {
    const title = 'a'.repeat(50);
    expect(
      validate({ ...VALID_CREATE, flags: { ...VALID_CREATE.flags, title } }),
    ).toBe(true);
  });

  // 51 characters is one over the limit and must throw.
  test('rejects a title longer than 50 chars', () => {
    const title = 'a'.repeat(51);
    expect(() =>
      validate({ ...VALID_CREATE, flags: { ...VALID_CREATE.flags, title } }),
    ).toThrow(/title must be under 50 characters/);
  });

  test('accepts an empty title', () => {
    expect(
      validate({ ...VALID_CREATE, flags: { ...VALID_CREATE.flags, title: '' } }),
    ).toBe(true);
  });
});

/**
 * check_desc() tests, reached through a create. Descriptions cap at 512 chars.
 * 1. First test checks that a description at 512 characters is accepted
 * 2. Second test checks that a description longer than 512 chars is rejected
 * 3. Third test checks that an empty description is accepted
 */
describe('check_desc()', () => {
  test('accepts a description at the 512-char boundary', () => {
    const desc = 'd'.repeat(512);
    expect(
      validate({ ...VALID_CREATE, flags: { ...VALID_CREATE.flags, desc } }),
    ).toBe(true);
  });

  test('rejects a description longer than 512 chars', () => {
    const desc = 'd'.repeat(513);
    expect(() =>
      validate({ ...VALID_CREATE, flags: { ...VALID_CREATE.flags, desc } }),
    ).toThrow(/description must be under 512 characters/);
  });

  test('accepts an empty description', () => {
    expect(
      validate({ ...VALID_CREATE, flags: { ...VALID_CREATE.flags, desc: '' } }),
    ).toBe(true);
  });
});

/**
 * check_priority() tests, reached through create/update. Valid priorities
 * match /^p[0-9]$/; required on create, optional on update.
 * 1. First test checks that a valid pN priority is accepted
 * 2. Second test checks that a malformed priority is rejected
 * 3. Third test checks that priority is required on create but optional on update
 */
describe('check_priority()', () => {
  test('accepts a valid pN priority', () => {
    expect(
      validate({
        ...VALID_CREATE,
        flags: { ...VALID_CREATE.flags, priority: 'p0' },
      }),
    ).toBe(true);
  });

  test('rejects a malformed priority', () => {
    expect(() =>
      validate({
        ...VALID_CREATE,
        flags: { ...VALID_CREATE.flags, priority: 'high' },
      }),
    ).toThrow(/'high' is not a valid priority/);
  });

  // `delete` removes the key so it is gone, so we can test that an omitted priority is rejected on create but accepted on update
  test('is required on create but optional on update', () => {
    const flags = { ...VALID_CREATE.flags };
    delete flags.priority;
    expect(() => validate({ cmd: 'create', flags })).toThrow(
      /priority is required/,
    );
    expect(validate(makeParse('update', { id: 'manta-ab12' }))).toBe(true);
  });
});

/**
 * check_status() tests, reached through create/update. Status must be one of
 * open, in_progress, blocked, closed. required on create, optional on update.
 * 1. First test checks that each allowed status value is accepted
 * 2. Second test checks that an unknown status is rejected
 * 3. Third test checks that status is required on create but optional on update
 */
describe('check_status()', () => {
  // Checks each status is valid
  test('accepts each allowed status', () => {
    for (const status of ['open', 'in_progress', 'blocked', 'closed']) {
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

  test('is required on create but optional on update', () => {
    const flags = { ...VALID_CREATE.flags };
    delete flags.status;
    expect(() => validate({ cmd: 'create', flags })).toThrow(
      /status is required/,
    );
    expect(validate(makeParse('update', { id: 'manta-ab12' }))).toBe(true);
  });
});

/**
 * check_type() tests, reached through a create. Allowed types come from
 * VALID_TYPES in the source; type is optional even on create.
 * 1. First test checks that each allowed type value is accepted
 * 2. Second test checks that an unknown type is rejected
 * 3. Third test checks that an omitted type is accepted (even on create)
 */
describe('check_type()', () => {
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

  test('accepts an omitted type', () => {
    const flags = { ...VALID_CREATE.flags };
    delete flags.type;
    expect(validate({ cmd: 'create', flags })).toBe(true);
  });
});

/**
 * check_assignee() tests, reached through a create. Assignees must be
 * alphabetic only
 * 1. First test checks that an alphabetic assignee is accepted
 * 2. Second test checks that an assignee with digits or symbols is rejected
 * 3. Third test checks that an omitted assignee is accepted
 */
describe('check_assignee()', () => {
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

  test('accepts an omitted assignee', () => {
    const flags = { ...VALID_CREATE.flags };
    delete flags.assignee;
    expect(validate({ cmd: 'create', flags })).toBe(true);
  });
});

/**
 * check_createdBy() tests. createdBy allows
 * alphanumerics and underscores.
 * 1. First test checks that an alphanumeric/underscore username is accepted on view
 * 2. Second test checks that a username with illegal characters is rejected on view
 * 3. Third test checks that createdBy is ignored for non-view commands 
 */
describe('check_createdBy()', () => {
  test('accepts an alphanumeric/underscore username on view', () => {
    expect(validate(makeParse('view', { createdBy: 'user_42' }))).toBe(true);
  });

  // Illegal characters (here a hyphen) throw and name the bad value.
  test('rejects a username with illegal characters on view', () => {
    expect(() => validate(makeParse('view', { createdBy: 'user-42' }))).toThrow(
      /'user-42' is not a valid username/,
    );
  });

  // createdBy isn't listed in possible_flags for non-view commands, so
  // check_createdBy is never invoked for them
  test('is not evaluated for non-view commands', () => {
    expect(
      validate(
        makeParse('update', { id: 'manta-ab12', createdBy: 'whatever' }),
      ),
    ).toBe(true);
  });
});

/**
 * check_path() tests, reached through migrate 
 * The path must be a non-empty, non-whitespace string; deeper existence checks
 * happen later in migrate.js. Both migrate and clear list `path` as their only
 * flag, so check_path runs for both — each test exercises both commands.
 * 1. First test checks that a non-empty path is accepted on migrate and clear
 * 2. Second test checks that an empty/whitespace-only path is rejected on both
 * 3. Third test checks that an omitted path is accepted on both (undefined skips)
 */
describe('check_path()', () => {
  test('accepts a non-empty path on migrate and clear', () => {
    for (const cmd of ['migrate', 'clear']) {
      expect(validate(makeParse(cmd, { path: './issues.json' }))).toBe(true);
    }
  });

  // An empty/whitespace string trims to length 0, so it is rejected.
  test('rejects an empty or whitespace-only path on migrate and clear', () => {
    for (const cmd of ['migrate', 'clear']) {
      expect(() => validate(makeParse(cmd, { path: '   ' }))).toThrow(
        /path must be a valid file path/,
      );
    }
  });

  test('accepts an omitted path on migrate and clear', () => {
    for (const cmd of ['migrate', 'clear']) {
      expect(validate(makeParse(cmd, {}))).toBe(true);
    }
  });
});

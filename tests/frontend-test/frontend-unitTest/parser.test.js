/**
 * Unit tests for the CLI parser (`src/cli/parser.js`).
 *
 * parse() is the only exported function. It turns process.argv into a
 * { cmd, flags } object. These tests cover argv shape, flags, aliases, and
 * structural errors only — semantic value checks live in validation.test.js.
 *
 * Each describe() block below targets one command group:
 *   1. parse() — create                  — title, defaults, aliases, normalization
 *   2. parse() — update, close, delete   — id prefixing, change fields, rejections
 *   3. parse() — view                      — detail/list filters, --all, --cb
 *   4. parse() — no-arg and path commands  — version, sync, init, migrate, clear, help
 *   5. parse() — structural errors         — unknown cmd/flag, duplicates, syntax
 */
import { test, expect, describe } from 'bun:test';
import { parse } from '../../../src/cli/parser.js';

/**
 * Build a fake process.argv with a runtime, script path, and tokens. Lets
 * individual tests pass just the command-line tokens they care about.
 *
 * @param {...string} tokens - Command and arguments after the script path.
 * @returns {string[]} A process.argv-shaped array ready for parse().
 */
function argv(...tokens) {
  return ['bun', '/path/to/index.js', ...tokens];
}

/**
 * parse() tests for the create command. Covers positional and flag-based
 * titles, defaults, shorthand aliases, value normalization, and create-specific
 * rejections.
 * 1. First test checks positional title plus long-form flags
 * 2. Second test checks default priority (p5) and status (open)
 * 3. Third test checks shorthand aliases (--t, --d, --p, --s, --a)
 * 4. Fourth test checks title from --title flag only
 * 5. Fifth test checks multi-word positional title joining
 * 6. Sixth test checks lowercasing of status, priority, and type values
 * 7. Seventh test checks case preservation on title, desc, and assignee
 * 8. Eighth test checks rejection of closed status on create
 * 9. Ninth test checks that a title is required
 * 10. Tenth test checks that --cb is view-only
 * 11. Eleventh test checks valueless --all stored as an empty string
 */
describe('parse() — create', () => {
  test('parses positional title and flags', () => {
    const result = parse(
      argv('create', 'Fix login bug', '--priority', 'p1', '--type', 'bug'),
    );
    expect(result).toEqual({
      cmd: 'create',
      flags: {
        title: 'Fix login bug',
        priority: 'p1',
        type: 'bug',
        status: 'open',
      },
    });
  });

  test('applies default priority and status', () => {
    const result = parse(argv('create', 'Only a title'));
    expect(result.flags.priority).toBe('p5');
    expect(result.flags.status).toBe('open');
  });

  test('creates with shorthand flags (--t, --d, --p, --s, --a)', () => {
    const result = parse(
      argv(
        'create',
        '--t',
        'Alias test',
        '--d',
        'A short description',
        '--p',
        'p2',
        '--s',
        'in_progress',
        '--a',
        'Bob',
      ),
    );
    expect(result.flags.title).toBe('Alias test');
    expect(result.flags.desc).toBe('A short description');
    expect(result.flags.priority).toBe('p2');
    expect(result.flags.status).toBe('in_progress');
    expect(result.flags.assignee).toBe('Bob');
  });

  test('parses title from --title flag only', () => {
    expect(parse(argv('create', '--title', 'Flag title'))).toEqual({
      cmd: 'create',
      flags: {
        title: 'Flag title',
        priority: 'p5',
        status: 'open',
      },
    });
  });

  test('joins multi-word positional title', () => {
    const result = parse(
      argv('create', 'Fix', 'login', 'bug', '--priority', 'p1'),
    );
    expect(result.flags.title).toBe('Fix login bug');
    expect(result.flags.priority).toBe('p1');
  });

  test('lowercases status, priority, and type flag values', () => {
    const result = parse(
      argv(
        'create',
        'T',
        '--status',
        'IN_PROGRESS',
        '--priority',
        'P1',
        '--type',
        'BUG',
      ),
    );
    expect(result.flags.status).toBe('in_progress');
    expect(result.flags.priority).toBe('p1');
    expect(result.flags.type).toBe('bug');
  });

  test('preserves case on positional title, description, and assignee', () => {
    const result = parse(
      argv(
        'create',
        'ExactCase Title',
        '--desc',
        'Fix OAuth Bug!!!',
        '--assignee',
        'Alice',
      ),
    );
    expect(result.flags.title).toBe('ExactCase Title');
    expect(result.flags.desc).toBe('Fix OAuth Bug!!!');
    expect(result.flags.assignee).toBe('Alice');
  });

  test('rejects create with closed status', () => {
    expect(() => parse(argv('create', 'Bad', '--status', 'closed'))).toThrow(
      /cannot be created with a closed status/,
    );
  });

  test('requires a title', () => {
    expect(() => parse(argv('create', '--p', 'p1'))).toThrow(
      /Missing required input: title/,
    );
  });

  test('rejects --cb on create', () => {
    expect(() => parse(argv('create', 'X', '--cb', 'bob'))).toThrow(
      /can only be used with the 'view' command/,
    );
  });

  test('accepts --all on create', () => {
    expect(parse(argv('create', 'T', '--all'))).toEqual({
      cmd: 'create',
      flags: {
        title: 'T',
        all: '',
        priority: 'p5',
        status: 'open',
      },
    });
  });
});

/**
 * parse() tests for update, close, and delete. Covers manta- id prefixing,
 * change-field requirements, shorthand aliases, and command-specific rejections.
 * Update tests (1–10): id normalization, change fields, rejections, --all
 * Close tests (11–16): id-only parsing, extra-flag rejections
 * Delete tests (17–21): id-only parsing, extra-flag rejections
 */
describe('parse() — update, close, delete', () => {
  test('prefixes short issue ids with manta-', () => {
    const result = parse(argv('update', 'ab12', '--status', 'open'));
    expect(result.flags.id).toBe('manta-ab12');
  });

  test('accepts update with id and one changed field', () => {
    const result = parse(argv('update', 'manta-xy99', '--priority', 'p0'));
    expect(result.cmd).toBe('update');
    expect(result.flags.id).toBe('manta-xy99');
    expect(result.flags.priority).toBe('p0');
  });

  test('updates with shorthand flags (--t, --d, --p, --s, --a)', () => {
    const result = parse(
      argv(
        'update',
        'xy99',
        '--t',
        'New title',
        '--d',
        'Updated desc',
        '--p',
        'p1',
        '--s',
        'in_progress',
        '--a',
        'Carol',
      ),
    );
    expect(result.flags.id).toBe('manta-xy99');
    expect(result.flags.title).toBe('New title');
    expect(result.flags.desc).toBe('Updated desc');
    expect(result.flags.priority).toBe('p1');
    expect(result.flags.status).toBe('in_progress');
    expect(result.flags.assignee).toBe('Carol');
  });

  test('accepts update with --type as a change field', () => {
    const result = parse(argv('update', 'xy99', '--type', 'bug'));
    expect(result.flags.id).toBe('manta-xy99');
    expect(result.flags.type).toBe('bug');
  });

  test('preserves case on update title and assignee', () => {
    const result = parse(
      argv(
        'update',
        'xy99',
        '--title',
        'ExactCase Title',
        '--assignee',
        'Alice',
      ),
    );
    expect(result.flags.title).toBe('ExactCase Title');
    expect(result.flags.assignee).toBe('Alice');
  });

  test('accepts update with id longer than 4 characters', () => {
    const result = parse(argv('update', 'abc12345', '--status', 'open'));
    expect(result.flags.id).toBe('manta-abc12345');
  });

  test('rejects update with only an id', () => {
    expect(() => parse(argv('update', 'manta-ab12'))).toThrow(
      /Too few flags for 'update:' No updates to any field were provided/,
    );
    expect(() => parse(argv('update', 'ab12'))).toThrow(
      /Too few flags for 'update:' No updates to any field were provided/,
    );
  });

  test('rejects update without an id', () => {
    expect(() => parse(argv('update'))).toThrow(/Missing required input: id/);
    expect(() => parse(argv('update', '--status', 'open'))).toThrow(
      /Missing required input: id/,
    );
  });

  test('accepts update with --all flag', () => {
    expect(parse(argv('update', 'ab12', '--all'))).toEqual({
      cmd: 'update',
      flags: {
        id: 'manta-ab12',
        all: '',
      },
    });
  });

  test('rejects update with --cb flag', () => {
    expect(() => parse(argv('update', 'ab12', '--cb', 'alice'))).toThrow(
      /can only be used with the 'view' command/,
    );
  });

  test('parses close with only an id', () => {
    const result = parse(argv('close', 'hk3p'));
    expect(result).toEqual({
      cmd: 'close',
      flags: { id: 'manta-hk3p' },
    });
  });

  test('parses close with full manta- id', () => {
    const result = parse(argv('close', 'manta-hk3p'));
    expect(result).toEqual({
      cmd: 'close',
      flags: { id: 'manta-hk3p' },
    });
  });

  test('accepts close with id longer than 4 characters', () => {
    const result = parse(argv('close', 'longid99'));
    expect(result.flags.id).toBe('manta-longid99');
  });

  test('requires an id for close', () => {
    expect(() => parse(argv('close'))).toThrow(/Missing required input: id/);
  });

  test('rejects close with extra flags', () => {
    expect(() => parse(argv('close', 'hk3p', '--status', 'open'))).toThrow(
      /Too many flags for 'close:' Only an ID is expected/,
    );
  });

  test('rejects close with --all flag', () => {
    expect(() => parse(argv('close', 'hk3p', '--all'))).toThrow(
      /Too many flags for 'close:' Only an ID is expected/,
    );
  });

  test('rejects close with --cb flag', () => {
    expect(() => parse(argv('close', 'hk3p', '--cb', 'alice'))).toThrow(
      /can only be used with the 'view' command/,
    );
  });

  test('parses delete with a full id', () => {
    const result = parse(argv('delete', 'tzdb'));
    expect(result).toEqual({
      cmd: 'delete',
      flags: { id: 'manta-tzdb' },
    });
  });

  test('accepts delete with id longer than 4 characters', () => {
    const result = parse(argv('delete', 'manta-verylong123'));
    expect(result.flags.id).toBe('manta-verylong123');
  });

  test('requires an id for delete', () => {
    expect(() => parse(argv('delete'))).toThrow(/Missing required input: id/);
  });

  test('rejects delete with extra flags', () => {
    expect(() => parse(argv('delete', 'tzdb', '--priority', 'p1'))).toThrow(
      /Too many flags for 'delete:' Only an ID is expected/,
    );
  });

  test('rejects delete with --all flag', () => {
    expect(() => parse(argv('delete', 'tzdb', '--all'))).toThrow(
      /Too many flags for 'delete:' Only an ID is expected/,
    );
  });

  test('rejects delete with --cb flag', () => {
    expect(() => parse(argv('delete', 'tzdb', '--cb', 'alice'))).toThrow(
      /can only be used with the 'view' command/,
    );
  });
});

/**
 * parse() tests for the view command. Covers bare view, detail view by id,
 * list filters, --all, --cb (createdBy alias), and invalid filters.
 * 1. First test checks bare view with no args
 * 2. Second test checks short id prefixing on detail view
 * 3. Third test checks detail view with full manta- id
 * 4. Fourth test checks ids longer than 4 characters
 * 5. Fifth test checks detail view with id plus a filter
 * 6. Sixth test checks --type and --assignee list filters
 * 7. Seventh test checks shorthand filter aliases (--p, --s, --a)
 * 8. Eighth test checks --all alone on list view
 * 9. Ninth test checks list filters combined with --all
 * 10. Tenth test checks --cb (createdBy alias) on view
 * 11. Eleventh test checks case preservation on assignee and createdBy
 * 12. Twelfth test checks rejection of title filter
 * 13. Thirteenth test checks rejection of desc filter
 */
describe('parse() — view', () => {
  test('parses bare view with no args', () => {
    expect(parse(argv('view'))).toEqual({ cmd: 'view', flags: {} });
  });

  test('prefixes short id on detail view', () => {
    const result = parse(argv('view', 'tzdb'));
    expect(result.flags.id).toBe('manta-tzdb');
  });

  test('parses detail view with full manta- id', () => {
    const result = parse(argv('view', 'manta-tzdb'));
    expect(result).toEqual({
      cmd: 'view',
      flags: { id: 'manta-tzdb' },
    });
  });

  test('accepts view with id longer than 4 characters', () => {
    const result = parse(argv('view', 'abc12345'));
    expect(result.flags.id).toBe('manta-abc12345');
  });

  test('parses detail view with id and a filter', () => {
    const result = parse(argv('view', 'tzdb', '--status', 'open'));
    expect(result).toEqual({
      cmd: 'view',
      flags: {
        id: 'manta-tzdb',
        status: 'open',
      },
    });
  });

  test('parses view with --type and --assignee filters', () => {
    const result = parse(argv('view', '--type', 'bug', '--assignee', 'Alice'));
    expect(result).toEqual({
      cmd: 'view',
      flags: {
        type: 'bug',
        assignee: 'Alice',
      },
    });
  });

  test('parses view with shorthand filters (--p, --s, --a)', () => {
    const result = parse(
      argv('view', '--p', 'p1', '--s', 'open', '--a', 'Bob'),
    );
    expect(result).toEqual({
      cmd: 'view',
      flags: {
        priority: 'p1',
        status: 'open',
        assignee: 'Bob',
      },
    });
  });

  test('parses view with --all alone', () => {
    expect(parse(argv('view', '--all'))).toEqual({
      cmd: 'view',
      flags: { all: '' },
    });
  });

  test('parses list filters and --all', () => {
    const result = parse(
      argv('view', '--priority', 'p1', '--status', 'open', '--all'),
    );
    expect(result).toEqual({
      cmd: 'view',
      flags: {
        priority: 'p1',
        status: 'open',
        all: '',
      },
    });
  });

  test('allows --cb (createdBy alias) only on view', () => {
    const result = parse(argv('view', '--cb', 'alice'));
    expect(result.flags.createdBy).toBe('alice');
  });

  test('preserves case on view assignee and createdBy', () => {
    const result = parse(
      argv('view', '--assignee', 'Alice', '--cb', 'BobSmith'),
    );
    expect(result.flags.assignee).toBe('Alice');
    expect(result.flags.createdBy).toBe('BobSmith');
  });

  test('rejects title filter on view', () => {
    expect(() => parse(argv('view', '--title', 'foo'))).toThrow(
      /Cannot filter by title or description/,
    );
  });

  test('rejects desc filter on view', () => {
    expect(() => parse(argv('view', '--desc', 'foo'))).toThrow(
      /Cannot filter by title or description/,
    );
  });
});

/**
 * parse() tests for commands that take no args, a path, or an optional
 * subcommand. Nested describe() blocks group one command each.
 */
describe('parse() — no-arg and path commands', () => {
  /**
   * version command tests.
   * 1. First test checks version with no arguments
   * 2. Second test checks rejection of extra arguments
   */
  describe('version', () => {
    test('accepts with no arguments', () => {
      expect(parse(argv('version'))).toEqual({ cmd: 'version', flags: {} });
    });

    test('rejects with extra arguments', () => {
      expect(() => parse(argv('version', 'extra'))).toThrow(
        /should be called with no arguments/,
      );
    });
  });

  /**
   * sync command tests.
   * 1. First test checks sync with no arguments
   * 2. Second test checks rejection of extra arguments
   */
  describe('sync', () => {
    test('accepts with no arguments', () => {
      expect(parse(argv('sync'))).toEqual({ cmd: 'sync', flags: {} });
    });

    test('rejects with extra arguments', () => {
      expect(() => parse(argv('sync', 'extra'))).toThrow(
        /should be called with no arguments/,
      );
    });
  });

  /**
   * init command tests.
   * 1. First test checks init with no arguments
   * 2. Second test checks rejection of extra arguments
   */
  describe('init', () => {
    test('accepts with no arguments', () => {
      expect(parse(argv('init'))).toEqual({ cmd: 'init', flags: {} });
    });

    test('rejects with extra arguments', () => {
      expect(() => parse(argv('init', 'extra'))).toThrow(
        /should be called with no arguments/,
      );
    });
  });

  /**
   * migrate command tests. migrate requires a positional path to the Beads
   * JSONL file and does not accept flags.
   * 1. First test checks that path is required
   * 2. Second test checks absolute positional path
   * 3. Third test checks relative positional path
   * 4. Fourth test checks paths containing spaces
   * 5. Fifth test checks rejection of flags
   */
  describe('migrate', () => {
    test('requires path', () => {
      expect(() => parse(argv('migrate'))).toThrow(
        /Missing required input: path to Beads JSONL/,
      );
    });

    test('parses positional path', () => {
      expect(parse(argv('migrate', '/tmp/beads.jsonl'))).toEqual({
        cmd: 'migrate',
        flags: { path: '/tmp/beads.jsonl' },
      });
    });

    test('parses with relative path', () => {
      expect(parse(argv('migrate', './beads.jsonl'))).toEqual({
        cmd: 'migrate',
        flags: { path: './beads.jsonl' },
      });
    });

    test('preserves paths with spaces', () => {
      expect(parse(argv('migrate', '/tmp/my beads.jsonl')).flags.path).toBe(
        '/tmp/my beads.jsonl',
      );
    });

    test('rejects flags', () => {
      expect(() =>
        parse(argv('migrate', 'a.jsonl', '--priority', 'p1')),
      ).toThrow(/does not take any flags/);
    });
  });

  /**
   * clear command tests. clear defaults to .manta/manta.jsonl when no path is
   * given and does not accept flags.
   * 1. First test checks default path when no arguments are given
   * 2. Second test checks explicit positional path
   * 3. Third test checks paths containing spaces
   * 4. Fourth test checks rejection of flags
   */
  describe('clear', () => {
    test('accepts with no arguments', () => {
      expect(parse(argv('clear'))).toEqual({
        cmd: 'clear',
        flags: { path: '.manta/manta.jsonl' },
      });
    });

    test('parses with explicit path', () => {
      expect(parse(argv('clear', '/tmp/custom.jsonl'))).toEqual({
        cmd: 'clear',
        flags: { path: '/tmp/custom.jsonl' },
      });
    });

    test('preserves paths with spaces', () => {
      expect(parse(argv('clear', '/tmp/my log.jsonl')).flags.path).toBe(
        '/tmp/my log.jsonl',
      );
    });

    test('rejects flags', () => {
      expect(() => parse(argv('clear', '--priority', 'p1'))).toThrow(
        /does not take any flags/,
      );
    });
  });

  /**
   * help command tests. help accepts an optional subcommand positional and
   * does not accept flags.
   * 1. First test checks bare help with no arguments
   * 2. Second test checks optional help subcommand
   * 3. Third test checks rejection of wrong-casing subcommand
   * 4. Fourth test checks multiple positional args joined as one subcommand
   * 5. Fifth test checks unknown subcommand error message
   * 6. Sixth test checks rejection of flags
   */
  describe('help', () => {
    test('accepts with no arguments', () => {
      expect(parse(argv('help'))).toEqual({ cmd: 'help', flags: {} });
    });

    test('parses optional help subcommand', () => {
      expect(parse(argv('help', 'create'))).toEqual({
        cmd: 'help',
        flags: { help_cmd: 'create' },
      });
    });

    test('rejects help subcommand with wrong casing', () => {
      expect(() => parse(argv('help', 'CREATE'))).toThrow(
        /Unknown command 'CREATE'/,
      );
    });

    // Multiple positional tokens are joined and treated as one subcommand name.
    test('rejects multiple positional args as one unknown subcommand', () => {
      expect(() => parse(argv('help', 'create', 'update'))).toThrow(
        /Unknown command 'create update'/,
      );
    });

    test('rejects unknown help subcommand', () => {
      expect(() => parse(argv('help', 'fly'))).toThrow(/Unknown command 'fly'/);
      expect(() => parse(argv('help', 'fly'))).toThrow(/Run 'mt help'/);
    });

    test('rejects flags', () => {
      expect(() => parse(argv('help', '--priority', 'p1'))).toThrow(
        /'mt help' does not take any flags/,
      );
    });
  });
});

/**
 * parse() structural error tests. Cross-cutting argv rules: command lookup,
 * flag syntax, duplicates, and missing values.
 * 1. First test checks uppercase command names are lowercased
 * 2. Second test checks empty argv (no command token)
 * 3. Third test checks unknown command
 * 4. Fourth test checks unknown flag
 * 5. Fifth test checks duplicate title from positional and --title
 * 6. Sixth test checks duplicate flags on create
 * 7. Seventh test checks duplicate flags on update
 * 8. Eighth test checks invalid single-dash flag syntax
 * 9. Ninth test checks flag with missing value
 * 10. Tenth test checks --all given a trailing value
 */
describe('parse() — structural errors', () => {
  test('accepts uppercase command name', () => {
    expect(parse(argv('CREATE', 'My Title'))).toEqual({
      cmd: 'create',
      flags: {
        title: 'My Title',
        priority: 'p5',
        status: 'open',
      },
    });
  });

  test('rejects empty argv', () => {
    expect(() => parse(['bun', '/path/to/index.js'])).toThrow(
      /No input provided/,
    );
  });

  test('rejects unknown command', () => {
    expect(() => parse(argv('fly'))).toThrow(/Unknown command 'fly'/);
  });

  test('rejects unknown flag', () => {
    expect(() => parse(argv('create', 'T', '--notreal', 'x'))).toThrow(
      /Unknown flag 'notreal'/,
    );
  });

  test('rejects duplicate title from positional and flag', () => {
    expect(() => parse(argv('create', 'Pos', '--title', 'Flag'))).toThrow(
      /Duplicate flag 'title'/,
    );
  });

  test('rejects duplicate flags', () => {
    expect(() =>
      parse(argv('create', 'T', '--priority', 'p1', '--priority', 'p2')),
    ).toThrow(/Duplicate flag 'priority'/);
  });

  test('rejects duplicate flags on update', () => {
    expect(() =>
      parse(argv('update', 'ab12', '--status', 'open', '--status', 'closed')),
    ).toThrow(/Duplicate flag 'status'/);
  });

  test('rejects invalid flag syntax', () => {
    expect(() => parse(argv('create', 'T', '-priority', 'p1'))).toThrow(
      /Invalid flag '-priority'/,
    );
  });

  test('rejects flag with missing value', () => {
    expect(() => parse(argv('create', 'T', '--priority'))).toThrow(
      /Missing value for flag 'priority'/,
    );
  });

  test('rejects --all with a value', () => {
    expect(() => parse(argv('view', '--all', 'yes'))).toThrow(
      /cannot be called with a value/,
    );
  });
});

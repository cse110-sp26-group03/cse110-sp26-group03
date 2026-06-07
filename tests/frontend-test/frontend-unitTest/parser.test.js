/**
 * Unit tests for the CLI parser (`src/cli/parser.js`).
 *
 * Stage 1 only: argv shape, flags, aliases, and structural errors.
 * Semantic value checks live in validation.test.js.
 */
import { test, expect, describe } from 'bun:test';
import { parse } from '../../../src/cli/parser.js';

/**
 * Build a fake process.argv (runtime + script + tokens).
 *
 * @param {...string} tokens - Command and arguments after the script path.
 * @returns {string[]}
 */
function argv(...tokens) {
  return ['bun', '/path/to/index.js', ...tokens];
}

describe('parse() — create', () => {
  // A positional title plus long-form flags map into the expected cmd/flags shape.
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

  // Omitted priority and status get create defaults (p5, open).
  test('applies default priority and status', () => {
    const result = parse(argv('create', 'Only a title'));
    expect(result.flags.priority).toBe('p5');
    expect(result.flags.status).toBe('open');
  });

  // Shorthand aliases (--t, --d, --p, --s, --a) resolve to the same flag keys.
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

  // Title may come from --title instead of a positional arg.
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

  // Tokens before the first flag are joined into a single positional title.
  test('joins multi-word positional title', () => {
    const result = parse(
      argv('create', 'Fix', 'login', 'bug', '--priority', 'p1'),
    );
    expect(result.flags.title).toBe('Fix login bug');
    expect(result.flags.priority).toBe('p1');
  });

  // status, priority, and type values are lowercased; preserve_case flags are not.
  test('lowercases status, priority, and type flag values', () => {
    const result = parse(
      argv('create', 'T', '--status', 'IN_PROGRESS', '--priority', 'P1', '--type', 'BUG'),
    );
    expect(result.flags.status).toBe('in_progress');
    expect(result.flags.priority).toBe('p1');
    expect(result.flags.type).toBe('bug');
  });

  // Parser does not normalize casing on title, desc, or assignee.
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

  // create forbids --status closed at parse time.
  test('rejects create with closed status', () => {
    expect(() => parse(argv('create', 'Bad', '--status', 'closed'))).toThrow(
      /cannot be created with a closed status/,
    );
  });

  // create without a title throws Missing required input.
  test('requires a title', () => {
    expect(() => parse(argv('create', '--p', 'p1'))).toThrow(
      /Missing required input: title/,
    );
  });

  // createdBy alias (--cb) is view-only.
  test('rejects --cb on create', () => {
    expect(() => parse(argv('create', 'X', '--cb', 'bob'))).toThrow(
      /can only be used with the 'view' command/,
    );
  });

  // --all is a valueless flag stored as an empty string.
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

describe('parse() — update, close, delete', () => {
  // Short ids without the manta- prefix get normalized.
  test('prefixes short issue ids with manta-', () => {
    const result = parse(argv('update', 'ab12', '--status', 'open'));
    expect(result.flags.id).toBe('manta-ab12');
  });

  // update needs an id plus at least one changed field.
  test('accepts update with id and one changed field', () => {
    const result = parse(argv('update', 'manta-xy99', '--priority', 'p0'));
    expect(result.cmd).toBe('update');
    expect(result.flags.id).toBe('manta-xy99');
    expect(result.flags.priority).toBe('p0');
  });

  // Shorthand aliases work on update the same way as create.
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

  // --type is a valid change field on update.
  test('accepts update with --type as a change field', () => {
    const result = parse(argv('update', 'xy99', '--type', 'bug'));
    expect(result.flags.id).toBe('manta-xy99');
    expect(result.flags.type).toBe('bug');
  });

  // Parser preserves casing on update title and assignee.
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

  // Ids longer than 4 chars are still prefixed when needed.
  test('accepts update with id longer than 4 characters', () => {
    const result = parse(argv('update', 'abc12345', '--status', 'open'));
    expect(result.flags.id).toBe('manta-abc12345');
  });

  // update with only an id and no change fields is too few flags.
  test('rejects update with only an id', () => {
    expect(() => parse(argv('update', 'manta-ab12'))).toThrow(
      /Too few flags for 'update:' No updates to any field were provided/,
    );
    expect(() => parse(argv('update', 'ab12'))).toThrow(
      /Too few flags for 'update:' No updates to any field were provided/,
    );
  });

  // update always requires an id, whether positional or via flag.
  test('rejects update without an id', () => {
    expect(() => parse(argv('update'))).toThrow(/Missing required input: id/);
    expect(() => parse(argv('update', '--status', 'open'))).toThrow(
      /Missing required input: id/,
    );
  });

  // --all alone counts as the required change field on update.
  test('accepts update with --all flag', () => {
    expect(parse(argv('update', 'ab12', '--all'))).toEqual({
      cmd: 'update',
      flags: {
        id: 'manta-ab12',
        all: '',
      },
    });
  });

  // createdBy alias (--cb) is view-only.
  test('rejects update with --cb flag', () => {
    expect(() => parse(argv('update', 'ab12', '--cb', 'alice'))).toThrow(
      /can only be used with the 'view' command/,
    );
  });

  // close takes a single positional id and normalizes the prefix.
  test('parses close with only an id', () => {
    const result = parse(argv('close', 'hk3p'));
    expect(result).toEqual({
      cmd: 'close',
      flags: { id: 'manta-hk3p' },
    });
  });

  // close accepts ids that already include the manta- prefix.
  test('parses close with full manta- id', () => {
    const result = parse(argv('close', 'manta-hk3p'));
    expect(result).toEqual({
      cmd: 'close',
      flags: { id: 'manta-hk3p' },
    });
  });

  // close allows ids longer than 4 characters.
  test('accepts close with id longer than 4 characters', () => {
    const result = parse(argv('close', 'longid99'));
    expect(result.flags.id).toBe('manta-longid99');
  });

  // close without an id throws Missing required input.
  test('requires an id for close', () => {
    expect(() => parse(argv('close'))).toThrow(/Missing required input: id/);
  });

  // close accepts only the id — extra flags are rejected.
  test('rejects close with extra flags', () => {
    expect(() => parse(argv('close', 'hk3p', '--status', 'open'))).toThrow(
      /Too many flags for 'close:' Only an ID is expected/,
    );
  });

  // --all is not allowed on close.
  test('rejects close with --all flag', () => {
    expect(() => parse(argv('close', 'hk3p', '--all'))).toThrow(
      /Too many flags for 'close:' Only an ID is expected/,
    );
  });

  // createdBy alias (--cb) is view-only.
  test('rejects close with --cb flag', () => {
    expect(() => parse(argv('close', 'hk3p', '--cb', 'alice'))).toThrow(
      /can only be used with the 'view' command/,
    );
  });

  // delete takes a single positional id and normalizes the prefix.
  test('parses delete with a full id', () => {
    const result = parse(argv('delete', 'tzdb'));
    expect(result).toEqual({
      cmd: 'delete',
      flags: { id: 'manta-tzdb' },
    });
  });

  // delete accepts ids longer than 4 characters.
  test('accepts delete with id longer than 4 characters', () => {
    const result = parse(argv('delete', 'manta-verylong123'));
    expect(result.flags.id).toBe('manta-verylong123');
  });

  // delete without an id throws Missing required input.
  test('requires an id for delete', () => {
    expect(() => parse(argv('delete'))).toThrow(/Missing required input: id/);
  });

  // delete accepts only the id — extra flags are rejected.
  test('rejects delete with extra flags', () => {
    expect(() => parse(argv('delete', 'tzdb', '--priority', 'p1'))).toThrow(
      /Too many flags for 'delete:' Only an ID is expected/,
    );
  });

  // --all is not allowed on delete.
  test('rejects delete with --all flag', () => {
    expect(() => parse(argv('delete', 'tzdb', '--all'))).toThrow(
      /Too many flags for 'delete:' Only an ID is expected/,
    );
  });

  // createdBy alias (--cb) is view-only.
  test('rejects delete with --cb flag', () => {
    expect(() => parse(argv('delete', 'tzdb', '--cb', 'alice'))).toThrow(
      /can only be used with the 'view' command/,
    );
  });
});

describe('parse() — view', () => {
  // Bare view with no args returns an empty flags object.
  test('parses bare view with no args', () => {
    expect(parse(argv('view'))).toEqual({ cmd: 'view', flags: {} });
  });

  // Detail view normalizes a short positional id.
  test('prefixes short id on detail view', () => {
    const result = parse(argv('view', 'tzdb'));
    expect(result.flags.id).toBe('manta-tzdb');
  });

  // Detail view accepts ids that already include the manta- prefix.
  test('parses detail view with full manta- id', () => {
    const result = parse(argv('view', 'manta-tzdb'));
    expect(result).toEqual({
      cmd: 'view',
      flags: { id: 'manta-tzdb' },
    });
  });

  // view allows ids longer than 4 characters.
  test('accepts view with id longer than 4 characters', () => {
    const result = parse(argv('view', 'abc12345'));
    expect(result.flags.id).toBe('manta-abc12345');
  });

  // Detail view can combine a positional id with filter flags.
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

  // List view accepts --type and --assignee as filters.
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

  // Shorthand filter aliases (--p, --s, --a) work on view.
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

  // --all alone is valid on list view.
  test('parses view with --all alone', () => {
    expect(parse(argv('view', '--all'))).toEqual({
      cmd: 'view',
      flags: { all: '' },
    });
  });

  // List filters can be combined with --all.
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

  // --cb is the createdBy alias and is only valid on view.
  test('allows --cb (createdBy alias) only on view', () => {
    const result = parse(argv('view', '--cb', 'alice'));
    expect(result.flags.createdBy).toBe('alice');
  });

  // Parser preserves casing on view assignee and createdBy.
  test('preserves case on view assignee and createdBy', () => {
    const result = parse(
      argv('view', '--assignee', 'Alice', '--cb', 'BobSmith'),
    );
    expect(result.flags.assignee).toBe('Alice');
    expect(result.flags.createdBy).toBe('BobSmith');
  });

  // title and desc are not valid view filters.
  test('rejects title filter on view', () => {
    expect(() => parse(argv('view', '--title', 'foo'))).toThrow(
      /Cannot filter by title or description/,
    );
  });

  // title and desc are not valid view filters.
  test('rejects desc filter on view', () => {
    expect(() => parse(argv('view', '--desc', 'foo'))).toThrow(
      /Cannot filter by title or description/,
    );
  });
});

describe('parse() — no-arg and path commands', () => {
  describe('version', () => {
    // version takes no arguments.
    test('accepts with no arguments', () => {
      expect(parse(argv('version'))).toEqual({ cmd: 'version', flags: {} });
    });

    // Extra tokens after version are rejected.
    test('rejects with extra arguments', () => {
      expect(() => parse(argv('version', 'extra'))).toThrow(
        /should be called with no arguments/,
      );
    });
  });

  describe('sync', () => {
    // sync takes no arguments.
    test('accepts with no arguments', () => {
      expect(parse(argv('sync'))).toEqual({ cmd: 'sync', flags: {} });
    });

    // Extra tokens after sync are rejected.
    test('rejects with extra arguments', () => {
      expect(() => parse(argv('sync', 'extra'))).toThrow(
        /should be called with no arguments/,
      );
    });
  });

  describe('init', () => {
    // init takes no arguments.
    test('accepts with no arguments', () => {
      expect(parse(argv('init'))).toEqual({ cmd: 'init', flags: {} });
    });

    // Extra tokens after init are rejected.
    test('rejects with extra arguments', () => {
      expect(() => parse(argv('init', 'extra'))).toThrow(
        /should be called with no arguments/,
      );
    });
  });

  describe('migrate', () => {
    // migrate requires a positional path to the Beads JSONL file.
    test('requires path', () => {
      expect(() => parse(argv('migrate'))).toThrow(
        /Missing required input: path to Beads JSONL/,
      );
    });

    // Absolute paths are accepted as the positional arg.
    test('parses positional path', () => {
      expect(parse(argv('migrate', '/tmp/beads.jsonl'))).toEqual({
        cmd: 'migrate',
        flags: { path: '/tmp/beads.jsonl' },
      });
    });

    // Relative paths are accepted as the positional arg.
    test('parses with relative path', () => {
      expect(parse(argv('migrate', './beads.jsonl'))).toEqual({
        cmd: 'migrate',
        flags: { path: './beads.jsonl' },
      });
    });

    // Paths containing spaces are preserved as a single token.
    test('preserves paths with spaces', () => {
      expect(parse(argv('migrate', '/tmp/my beads.jsonl')).flags.path).toBe(
        '/tmp/my beads.jsonl',
      );
    });

    // migrate does not accept any flags.
    test('rejects flags', () => {
      expect(() =>
        parse(argv('migrate', 'a.jsonl', '--priority', 'p1')),
      ).toThrow(/does not take any flags/);
    });
  });

  describe('clear', () => {
    // clear defaults to .manta/manta.jsonl when no path is given.
    test('accepts with no arguments', () => {
      expect(parse(argv('clear'))).toEqual({
        cmd: 'clear',
        flags: { path: '.manta/manta.jsonl' },
      });
    });

    // An explicit positional path overrides the default.
    test('parses with explicit path', () => {
      expect(parse(argv('clear', '/tmp/custom.jsonl'))).toEqual({
        cmd: 'clear',
        flags: { path: '/tmp/custom.jsonl' },
      });
    });

    // Paths containing spaces are preserved as a single token.
    test('preserves paths with spaces', () => {
      expect(parse(argv('clear', '/tmp/my log.jsonl')).flags.path).toBe(
        '/tmp/my log.jsonl',
      );
    });

    // clear does not accept any flags.
    test('rejects flags', () => {
      expect(() => parse(argv('clear', '--priority', 'p1'))).toThrow(
        /does not take any flags/,
      );
    });
  });

  describe('help', () => {
    // Bare help returns an empty flags object.
    test('accepts with no arguments', () => {
      expect(parse(argv('help'))).toEqual({ cmd: 'help', flags: {} });
    });

    // A single positional arg selects which command to show help for.
    test('parses optional help subcommand', () => {
      expect(parse(argv('help', 'create'))).toEqual({
        cmd: 'help',
        flags: { help_cmd: 'create' },
      });
    });

    // help_cmd must match a known command name exactly (case-sensitive).
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

    // Unknown subcommands get a help-specific error message.
    test('rejects unknown help subcommand', () => {
      expect(() => parse(argv('help', 'fly'))).toThrow(
        /Unknown command 'fly'/,
      );
      expect(() => parse(argv('help', 'fly'))).toThrow(/Run 'mt help'/);
    });

    // help does not accept any flags.
    test('rejects flags', () => {
      expect(() => parse(argv('help', '--priority', 'p1'))).toThrow(
        /'mt help' does not take any flags/,
      );
    });
  });
});

describe('parse() — structural errors', () => {
  // Command names are lowercased before lookup.
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

  // argv with only runtime and script paths and no command throws.
  test('rejects empty argv', () => {
    expect(() => parse(['bun', '/path/to/index.js'])).toThrow(
      /No input provided/,
    );
  });

  // Unrecognized command names throw Unknown command.
  test('rejects unknown command', () => {
    expect(() => parse(argv('fly'))).toThrow(/Unknown command 'fly'/);
  });

  // Flags not in the command's allowed set throw Unknown flag.
  test('rejects unknown flag', () => {
    expect(() => parse(argv('create', 'T', '--notreal', 'x'))).toThrow(
      /Unknown flag 'notreal'/,
    );
  });

  // A positional title plus --title sets title twice and is rejected.
  test('rejects duplicate title from positional and flag', () => {
    expect(() => parse(argv('create', 'Pos', '--title', 'Flag'))).toThrow(
      /Duplicate flag 'title'/,
    );
  });

  // The same flag cannot appear twice on create.
  test('rejects duplicate flags', () => {
    expect(() =>
      parse(argv('create', 'T', '--priority', 'p1', '--priority', 'p2')),
    ).toThrow(/Duplicate flag 'priority'/);
  });

  // The same flag cannot appear twice on update.
  test('rejects duplicate flags on update', () => {
    expect(() =>
      parse(argv('update', 'ab12', '--status', 'open', '--status', 'closed')),
    ).toThrow(/Duplicate flag 'status'/);
  });

  // Flags must use double-dash syntax; single-dash is invalid.
  test('rejects invalid flag syntax', () => {
    expect(() => parse(argv('create', 'T', '-priority', 'p1'))).toThrow(
      /Invalid flag '-priority'/,
    );
  });

  // A flag that expects a value must be followed by one.
  test('rejects flag with missing value', () => {
    expect(() => parse(argv('create', 'T', '--priority'))).toThrow(
      /Missing value for flag 'priority'/,
    );
  });

  // --all is valueless and cannot be given a trailing value.
  test('rejects --all with a value', () => {
    expect(() => parse(argv('view', '--all', 'yes'))).toThrow(
      /cannot be called with a value/,
    );
  });
});

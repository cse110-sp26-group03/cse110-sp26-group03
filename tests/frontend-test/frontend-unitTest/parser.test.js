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
      /Too few flags for 'update:'/,
    );
    expect(() => parse(argv('update', 'ab12'))).toThrow(
      /Too few flags for 'update:'/,
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
      /Too many flags for 'close:'/,
    );
  });

  test('rejects close with --all flag', () => {
    expect(() => parse(argv('close', 'hk3p', '--all'))).toThrow(
      /Too many flags for 'close:'/,
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
      /Too many flags for 'delete:'/,
    );
  });

  test('rejects delete with --all flag', () => {
    expect(() => parse(argv('delete', 'tzdb', '--all'))).toThrow(
      /Too many flags for 'delete:'/,
    );
  });

  test('rejects delete with --cb flag', () => {
    expect(() => parse(argv('delete', 'tzdb', '--cb', 'alice'))).toThrow(
      /can only be used with the 'view' command/,
    );
  });
});

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

describe('parse() — no-arg and path commands', () => {
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
});

describe('parse() — structural errors', () => {
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

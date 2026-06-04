// src/cli/parser.js
//
// Manta's argv parser (Stage 1 validation).
//
// Converts raw process.argv into a parse object { cmd, flags } that
// the rest of the pipeline consumes. Handles command extraction,
// positional arguments (title for create, ID for update/close/delete/view),
// flag aliases, and flag-value pairing.
//
// Stage 1 checks are structural: unknown commands, unknown flags,
// missing values, duplicate flags, and flag-count constraints.
// Stage 2 (validation.js) handles semantic checks on the flag values.

// ---- Constants --------------------------------------------------------

// all valid commands
/** @type {Array.<string>} */
const cmds = [
  'create',
  'update',
  'close',
  'delete',
  'version',
  'view',
  'sync',
  'init',
  'migrate',
  'clear'
];

// for commands that are called with no args
/** @type {Array.<string>} */
const empty_cmds = ['version', 'sync', 'init'];

// for commands that are called with no flags
const no_flag_cmds = ['migrate', 'clear']

/** @type {Array.<string>} */
const possible_flags = [
  'title',
  'desc',
  'status',
  'priority',
  'type',
  'assignee',
  'all',
  'createdBy',
];

// for flags that expect no args
/** @type {Array.<string>} */
const empty_flags = ['all'];

// flag shorthands
/** @type {Object.<string, string>} */
const flag_aliases = {
  t: 'title',
  d: 'desc',
  p: 'priority',
  s: 'status',
  a: 'assignee',
  cb: 'createdBy',
};

// for flags that need to preserve capitalization
/** @type {Array.<string>} */
const preserve_case = ['title', 'desc', 'assignee', 'createdBy'];

/**
 * Expected flag counts for commands with strict arity.
 *
 * Commands not listed here have no count constraints at this stage.
 */
const expected_flag_counts = {
  delete: { min: 1, max: 1, msg: 'Only an ID is expected' },
  close: { min: 1, max: 1, msg: 'Only an ID is expected' },
  update: {
    min: 2,
    msg: 'No updates to any field were provided',
  },
};

const DEFAULT_LOG_PATH = '.manta/manta.jsonl';

// ---- Public API -------------------------------------------------------

/**
 * Parse process.argv into a command-and-flags object.
 *
 * Expects argv[0..1] to be the runtime and script path (stripped here).
 * The first real token is the command; everything between the command
 * and the first --flag is treated as a positional argument (title for
 * create, issue ID for update/close/delete/view).
 *
 * @param {Array.<string>} argv - The raw process.argv array.
 * @returns {object} The parsed command and its flags as { cmd, flags }.
 * @throws {Error} On any structural problem: missing command, unknown
 *                 command, unknown flag, missing flag value, duplicate
 *                 flag, or flag-count violation.
 */
export function parse(argv) {
  const raw_args = argv.slice(2).map((str) => str.trim());
  const args = raw_args.map((str) => str.toLowerCase());

  if (args.length === 0)
    throw new Error(`No input provided. Commands look like: mt <cmd> [flags]`);

  const cmd = args[0];
  if (!args[0])
    throw new Error(`Missing command. Commands look like: mt <cmd> [flags]`);
  if (!cmds.includes(cmd))
    throw new Error(
      `Unknown command '${cmd}': valid commands are ${cmds.join(', ')}`,
    );

  if (empty_cmds.includes(cmd) && args.length > 1)
    throw new Error(
      `Unexpected argument(s) detected - 'mt ${cmd}' should be called with no arguments.`,
    );

  const flags = {};

  // ---- Positional argument extraction ---------------------------------
  // Grab everything between the command and the first flag.
  // Any dash-prefixed token marks the start of flags.

  const first_flag = args.findIndex((el) => el.startsWith('-'));
  const in_between = raw_args
    .slice(1, first_flag === -1 ? args.length : first_flag)
    .join(' ');

  switch (cmd) {
    case 'create':
      if (in_between) flags['title'] = in_between;
      break;
    case 'update':
    case 'close':
    case 'delete':
    case 'view':
      if (in_between) flags['id'] = in_between;
      break;
    case 'migrate':
      if (in_between) flags['path'] = in_between;
      break;
    case 'clear':
      flags['path'] = in_between || DEFAULT_LOG_PATH // use default log path if none is provided
      break;
  }

  // ---- Flag parsing ---------------------------------------------------

  let i = first_flag === -1 ? args.length : first_flag;

  while (i < args.length) {
    const current = args[i];

    if (current.startsWith('-')) {
      if (!/^--[a-z]/.test(current))
        throw new Error(`Invalid flag '${current}': flags must start with --`);

      const flag = flag_aliases[current.slice(2)] ?? current.slice(2);

      if (!possible_flags.includes(flag))
        throw new Error(
          `Unknown flag '${flag}': valid flags are\n${possible_flags.join(', ')}`,
        );
      if (flags[flag])
        throw new Error(`Duplicate flag '${flag}': --${flag} was already set`);

      if (no_flag_cmds.includes(cmd)) {
        throw new Error(`'mt ${cmd}' does not take any flags.`);
      }

      if (flag === 'createdBy' && cmd !== 'view')
        throw new Error(
          `Flag '--createdBy' can only be used with the 'view' command`,
        );

      // Collect tokens between this flag and the next dash-prefixed token.
      const next_flag_offset = args
        .slice(i + 1)
        .findIndex((element) => element.startsWith('-'));

      const next_flag_index =
        next_flag_offset === -1 ? args.length : i + 1 + next_flag_offset;

      const flag_args = (preserve_case.includes(flag) ? raw_args : args)
        .slice(i + 1, next_flag_index)
        .join(' ');

      if (empty_flags.includes(flag)) {
        if (flag_args.trim() !== '')
          throw new Error(
            `--'${current}' flag cannot be called with a value. `,
          );
      } else {
        if (flag_args.trim() === '')
          throw new Error(`Missing value for flag '${flag}'`);
      }

      flags[flag] = flag_args;
      i = next_flag_index;
    } else {
      i++;
    }
  }

  

  // ---- Defaults and required-field checks -----------------------------

  switch (cmd) {
    case 'create':
      if (!flags['title']) throw new Error(`Missing required input: title`);
      if (!flags['priority']) flags['priority'] = 'p5';

      if (flags['status']) {
        if (flags['status'] === 'closed')
          throw new Error(
            `Invalid status 'closed': issues cannot be created with a closed status`,
          );
      } else {
        flags['status'] = 'open';
      }
      break;

    case 'update':
    case 'close':
    case 'delete':
      if (!flags['id']) throw new Error(`Missing required input: id`);
      if (flags['id'] && flags['id'].slice(0, 6) !== 'manta-')
        flags['id'] = `manta-${flags['id']}`;

      break;
    case 'view':
      if (flags['id'] && flags['id'].slice(0, 6) !== 'manta-')
        flags['id'] = `manta-${flags['id']}`;

      if (flags['title'] || flags['desc'])
        throw new Error(
          'Cannot filter by title or description.\n Can only filter by: status, priority, type, assignee',
        );
      break;
    case 'migrate':
      if (!flags['path']) {
        throw new Error(
          `Missing required input: path to Beads JSONL file. \n` +
          `Usage: mt migrate <path/to/beads.jsonl>`
        );
      }
      break;
    case 'clear':
      if (!flags['path']) {
        throw new Error(
          `Missing required input: path to Manta JSONL file. \n` +
          `Usage: mt clear <path/to/manta.jsonl>`
        );
      }
      break;
  }

  // ---- Flag-count constraints -----------------------------------------

  if (expected_flag_counts[cmd]) {
    const { min, max } = expected_flag_counts[cmd];
    const count = Object.keys(flags).length;
    if (min != null && count < min)
      throw new Error(
        `Too few flags for '${cmd}:' ${expected_flag_counts[cmd].msg}`,
      );
    if (max != null && count > max)
      throw new Error(
        `Too many flags for '${cmd}:' ${expected_flag_counts[cmd].msg}`,
      );
  }

  return {
    cmd: cmd,
    flags: flags,
  };
}

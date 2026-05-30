// src/cli/parser.js
//
// Manta's argv parser (Stage 1 validation).
//
// Converts raw process.argv into a parse object { cmd, flags } that
// the rest of the pipeline consumes. Handles command extraction,
// positional arguments (title for create, ID for update/close/delete),
// flag aliases, and flag-value pairing.
//
// Stage 1 checks are structural: unknown commands, unknown flags,
// missing values, duplicate flags, and flag-count constraints.
// Stage 2 (validation.js) handles semantic checks on the flag values.

const cmds = ['create', 'update', 'close', 'delete', 'version'];

const possible_flags = [
  'title',
  'desc',
  'status',
  'priority',
  'type',
  'assignee',
];

/** @type {Object<string, string>} Single-character flag aliases. */
const flag_aliases = {
  t: 'title',
  d: 'desc',
  p: 'priority',
  s: 'status',
  a: 'assignee',
};

/**
 * Expected flag counts for commands with strict arity.
 *
 * Commands not listed here have no count constraints at this stage.
 *
 * @type {Object<string, {min?: number, max?: number, msg: string}>}
 */
const expected_flag_counts = {
  delete: { min: 1, max: 1, msg: 'Only an ID is expected' },
  close: { min: 1, max: 1, msg: 'Only an ID is expected' },
  update: {
    min: 2,
    msg: 'No updates to any field were provided',
  },
};

// ---- Public API -------------------------------------------------------

/**
 * Parse process.argv into a command-and-flags object.
 *
 * Expects argv[0..1] to be the runtime and script path (stripped here).
 * The first real token is the command; everything between the command
 * and the first --flag is treated as a positional argument (title for
 * create, issue ID for update/close/delete).
 *
 * @param {string[]} argv - The raw process.argv array.
 * @returns {{cmd: string, flags: object}} The parsed command and its flags.
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

  const flags = {};

  // Extract the positional argument between the command and the first flag.
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
      if (in_between) flags['id'] = in_between;
      break;
    case 'version':
      if (in_between)
        throw new Error(
          `Unexpected argument '${in_between.trim()}': version takes no arguments`,
        );
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

      // Collect all tokens between this flag and the next dash-prefixed token.
      const next_flag_offset = args
        .slice(i + 1)
        .findIndex((element) => element.startsWith('-'));

      const next_flag_index =
        next_flag_offset === -1 ? args.length : i + 1 + next_flag_offset;

      // Preserve original casing for title, desc, and assignee values.
      const preserve_case = ['title', 'desc', 'assignee'].includes(flag);
      const flag_args = (preserve_case ? raw_args : args)
        .slice(i + 1, next_flag_index)
        .join(' ');

      if (flag_args.trim() === '')
        throw new Error(`Missing value for flag '${current}'`);

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

  if (cmd === 'version' && Object.keys(flags).length > 0)
    throw new Error(`Unexpected flags for 'version': no flags are expected`);

  return {
    cmd: cmd,
    flags: flags,
  };
}

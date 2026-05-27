// parse object format:
//
// {
//   cmd: "create",
//   flags: {
//     title: "Hello world",
//     priority: "p2"
//   }
// }

// all valid commands
const cmds = ['create', 'update', 'close', 'delete', 'version', 'view', 'replay'];

// all valid flags
const possible_flags = [
  'title',
  'desc',
  'status',
  'priority',
  'type',
  'assignee',
  'all', 
  'createdBy'
];

const empty_flags = [
  'all'
]

// shorthands for flags
const flag_aliases = {
  t: 'title',
  d: 'desc',
  p: 'priority',
  s: 'status',
  a: 'assignee',
  cb: 'createdBy'
};

// flags that need to preserve capitalization.
const preserve_case = ['title', 'desc', 'assignee', 'createdBy']

// for cmds that need to have exact numbers of flags
// ex. close and delete should only ever have 1 flag -> id

const expected_flag_counts = {
  delete: { min: 1, max: 1, msg: 'Only an ID is expected' },
  close: { min: 1, max: 1, msg: 'Only an ID is expected' },
  update: {
    min: 2,
    msg: 'No updates to any field were provided',
  },
};

// returns parse object if argv is parsed successfully, otherwise throws error. Use try/catch
// only runs basic/surface level checks (Stage 1 validation)
// Stage 2 validation (command-specific validation) is handled by validate.js
export function parse(argv) {
  const raw_args = argv.slice(2).map((str) => str.trim()); // original casing, used for flag values
  const args = raw_args.map((str) => str.toLowerCase()); // lowercased, used for parsing logic

  if (args.length === 0)
    throw new Error(`No input provided. Commands look like: mt <cmd> [flags]`); // checks for empty input

  // NOTE: no prefix check anymore. "mt" is provided by the environment in the final
  // product, so it never reaches the parser. The command is now the first arg.

  const cmd = args[0]; // extract command only
  if (!args[0])
    throw new Error(`Missing command. Commands look like: mt <cmd> [flags]`); // check if command is missing
  if (!cmds.includes(cmd))
    throw new Error(
      `Unknown command '${cmd}': valid commands are ${cmds.join(', ')}`,
    ); // check if command exists

  // object to store all flag info
  const flags = {};

  // grab everything in between the command and the first flag.
  // for example if i have:
  //      create Hello world --priority p2     -->     grabs "Hello world"
  //      delete manta-h35p                    -->     grabs "manta-h35p"

  // NOTE: treat ANY dash-prefixed token as a flag boundary (was "--").
  // This way a malformed flag like "-d" becomes the start of a flag instead
  // of being swallowed into the in-between text, so the regex check below can reject it.
  const first_flag = args.findIndex((el) => el.startsWith('-'));
  const in_between = raw_args
    .slice(1, first_flag === -1 ? args.length : first_flag)
    .join(' '); // slice up to first flag, otherwise to the end

  // map args to the correct flag based on the command
  switch (cmd) {
    case 'create':
      if (in_between) flags['title'] = in_between; // map to "title" if in_between is not ""
      break;
    case 'update':
    case 'close':
    case 'delete':
    case 'view':
      if (in_between) flags['id'] = in_between; // map to "id" if in_between is not ""
      break;
    case 'version':
      if (in_between)
        throw new Error(
          `Unexpected argument '${in_between.trim()}': version takes no arguments`,
        );
      break;
  }

  let i = first_flag === -1 ? args.length : first_flag; // start at the first flag if found. otherwise start at the end so the loop doesn't run

  while (i < args.length) {
    const current = args[i];

    // flag found
    if (current.startsWith('-')) {
      // reject anything that isn't exactly "--<name>", ex. -, -t, ---, ---title
      if (!/^--[a-z]/.test(current))
        throw new Error(`Invalid flag '${current}': flags must start with --`);

      // grabs the flag. attempts to convert from shorthand first, or else just removes the "--"
      const flag = flag_aliases[current.slice(2)] ?? current.slice(2);

      // if flag is invalid, throws error and shows list of valid flags
      if (!possible_flags.includes(flag))
        throw new Error(
          `Unknown flag '${flag}': valid flags are\n${possible_flags.join(', ')}`,
        );
      if (flags[flag])
        throw new Error(`Duplicate flag '${flag}': --${flag} was already set`); // flag dupe check

      if (flag === 'createdBy' && cmd !== 'view')
        throw new Error(`Flag '--createdBy' can only be used with the 'view' command`);

      // take everything between this flag and next flag.
      // NOTE: next boundary is ANY dash-prefixed token (was "--"), matching the
      // detection above so a malformed flag like "-d" ends the current flag's value
      // instead of being absorbed into it.
      const next_flag_offset = args
        .slice(i + 1)
        .findIndex((element) => element.startsWith('-'));

      // slice to the end if none found, else slice to the next flag
      const next_flag_index =
        next_flag_offset === -1 ? args.length : i + 1 + next_flag_offset;

      // join everything in between this and next flag into one string.
      // use raw_args for title, desc, and assignee to preserve capitalization
      const flag_args = (preserve_case.includes(flag) ? raw_args : args)
        .slice(i + 1, next_flag_index)
        .join(' ');
 
      if (empty_flags.includes(flag)){

           // for flags that need to be called with no values.
          if (flag_args.trim() !== '')
          throw new Error(`--'${current}' flag cannot be called with a value. `);

      } else {

          // for flags that need values, verify a value is there. no blank values get through
          if (flag_args.trim() === '')
          throw new Error(`Missing value for flag '${flag}'`); 

      }

      

      // add flag and its info to the flag object.
      flags[flag] = flag_args;

      // move the index to the next flag (or the end if no more exist)
      i = next_flag_index;
    } else {
      // do nothing and keep going
      i++;
    }
  }

  // final checks / fill-ins for default values
  switch (cmd) {
    case 'create':
      if (!flags['title']) throw new Error(`Missing required input: title`); // no empty titles

      if (!flags['priority']) flags['priority'] = 'p5'; // default priority to p5 if not explicitly set

      // can't create issues as "closed"
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
      // needs id
      if (!flags['id']) throw new Error(`Missing required input: id`);
      break;
    case 'view':
      if (flags['title'] || flags['desc']) throw new Error('Cannot filter by title or description.\n Can only filter by: status, priority, type, assignee')
  }

  // for commands that expect an exact amount or range of flags
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

  //console.log(`cmd: ${cmd}`)
  //console.log("flags:", flags)

  return {
    cmd: cmd,
    flags: flags,
  };
}

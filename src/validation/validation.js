// src/validation/validation.js
//
// Manta's Stage 2 validation layer.
//
// Receives a parse object from parser.js and enforces command-specific
// constraints: field formats, length limits, enum membership, and
// required-vs-optional rules that depend on the command.
//
// Stage 1 (parser.js) handles structural checks — missing commands,
// unknown flags, flag counts. Stage 2 here handles semantic checks —
// whether each flag's value is actually valid.

// ---- Constants --------------------------------------------------------

const ID_PATTERN = /^manta-.+$/;
const TITLE_MAX_LENGTH = 50;
const DESC_MAX_LENGTH = 512;
const PRIORITY_PATTERN = /^p([0-9])$/;
const VALID_STATUSES = ['open', 'in_progress', 'blocked', 'closed'];
const VALID_TYPES = ['bug', 'feature', 'task', 'docs', 'store'];
const ASSIGNEE_PATTERN = /^[a-zA-Z]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

/**
 * Map of which flags each command accepts.
 *
 * Controls the iteration order in validate() — only the flags listed
 * for the given command are checked.
 *
 * @type {Object.<string, Array.<string>>}
 */
const possible_flags = {
  create: ['title', 'desc', 'priority', 'status', 'type', 'assignee'],
  update: ['id', 'title', 'desc', 'priority', 'status', 'type', 'assignee'],
  close: ['id'],
  delete: ['id'],
  view: ['id', 'priority', 'status', 'type', 'assignee', 'createdBy'],
  migrate: ['path'],
  clear: ['path'],
};

/**
 * Map of flag names to their validation functions.
 *
 * Each function returns null on success or an error message string
 * on failure.
 *
 * @type {Object.<string, Function>}
 */
const validations = {
  id: check_id,
  title: check_title,
  desc: check_desc,
  priority: check_priority,
  status: check_status,
  type: check_type,
  assignee: check_assignee,
  createdBy: check_createdBy,
  path: check_path,
};

// ---- Public API -------------------------------------------------------

/**
 * Validate a parse object against command-specific rules.
 *
 * Iterates over every possible flag for the given command and runs
 * its check function. Each check receives the flag value and the
 * command name so it can distinguish required-on-create from
 * optional-on-update.
 *
 * @param {object} parse_obj - A parse object with { cmd, flags }.
 * @returns {boolean} True if all checks pass.
 * @throws {Error} On the first validation failure encountered.
 */
export function validate(parse_obj) {
  const { cmd, flags } = parse_obj;

  if (!(cmd in possible_flags)) return true; // only check commands that need to be validated.

  for (const flag of possible_flags[cmd]) {
    const error_msg = validations[flag](flags[flag], cmd);
    if (error_msg) throw new Error(error_msg);
  }

  return true;
}

// ---- Check functions --------------------------------------------------
// Each returns null on success or an error message string on failure.
// All values arrive as strings (still in parsed form). The second
// argument is the command name, used by checks whose required-ness
// depends on the command.

/**
 * Validate an issue ID against the manta-XXXX format.
 *
 * @param {string|undefined} id - The ID value to check.
 * @returns {string|null} Error message, or null if valid.
 */
function check_id(id) {
  if (id === undefined) return null;
  if (ID_PATTERN.test(id)) return null;
  return `validate error: '${id}' is not a valid issue id`;
}

/**
 * Validate a title's length (max 50 characters).
 *
 * @param {string|undefined} title - The title value to check.
 * @returns {string|null} Error message, or null if valid.
 */
function check_title(title) {
  if (title === undefined || title === '') return null;
  if (title.length <= TITLE_MAX_LENGTH) return null;
  return 'validate error: title must be under 50 characters';
}

/**
 * Validate a description's length (max 512 characters).
 *
 * @param {string|undefined} desc - The description value to check.
 * @returns {string|null} Error message, or null if valid.
 */
function check_desc(desc) {
  if (desc === undefined || desc === '') return null;
  if (desc.length <= DESC_MAX_LENGTH) return null;
  return 'validate error: description must be under 512 characters';
}

/**
 * Validate a priority value against the pN format.
 *
 * Priority is required on create (the parser supplies a default) but
 * optional on update — undefined means "leave unchanged."
 *
 * @param {string|undefined} priority - The priority value to check.
 * @param {string} cmd - The command name, for required-ness logic.
 * @returns {string|null} Error message, or null if valid.
 */
function check_priority(priority, cmd) {
  if (priority === undefined) {
    return cmd === 'create' ? 'validate error: priority is required' : null;
  }
  if (PRIORITY_PATTERN.test(priority)) return null;
  return `validate error: '${priority}' is not a valid priority`;
}

/**
 * Validate a status value against the allowed set.
 *
 * Status is required on create (the parser supplies a default) but
 * optional on update — undefined means "leave unchanged."
 *
 * @param {string|undefined} status - The status value to check.
 * @param {string} cmd - The command name, for required-ness logic.
 * @returns {string|null} Error message, or null if valid.
 */
function check_status(status, cmd) {
  if (status === undefined) {
    return cmd === 'create' ? 'validate error: status is required' : null;
  }
  if (VALID_STATUSES.includes(status)) return null;
  return `validate error: '${status}' is not a valid status`;
}

/**
 * Validate an issue type against the allowed set.
 *
 * @param {string|undefined} type - The type value to check.
 * @returns {string|null} Error message, or null if valid.
 */
function check_type(type) {
  if (type === undefined) return null;
  if (VALID_TYPES.includes(type)) return null;
  return `validate error: '${type}' is not a valid type`;
}

/**
 * Validate an assignee name (alphabetic characters only).
 *
 * @param {string|undefined} assignee - The assignee value to check.
 * @returns {string|null} Error message, or null if valid.
 */
function check_assignee(assignee) {
  if (assignee === undefined) return null;
  if (ASSIGNEE_PATTERN.test(assignee)) return null;
  return `validate error: '${assignee}' is not a valid assignee`;
}

/**
 * Validate a createdBy filter value (alphanumeric and underscores only).
 *
 * Only valid for the view command; returns an error for any other command.
 *
 * @param {string|undefined} creator - The createdBy value to check.
 * @param {string} cmd - The command name, for command-restriction logic.
 * @returns {string|null} Error message, or null if valid.
 */
function check_createdBy(creator, cmd) {
  if (cmd !== 'view')
    return `validate error: 'createdBy' is not a valid flag for '${cmd}'`;
  if (creator === undefined) return null;
  if (USERNAME_PATTERN.test(creator)) return null;
  return `validate error: '${creator}' is not a valid username`;
}

/**
 * Validate a file path for the migrate command.
 *
 * The path must be a non-empty string. Further existence checks
 * happen in migrate.js.
 *
 * @param {string|undefined} path - The file path to check.
 * @returns {string|null} Error message, or null if valid.
 */
function check_path(path) {
  if (path === undefined) return null;
  if (typeof path === 'string' && path.trim().length > 0) return null;
  return 'validate error: path must be a valid file path';
}

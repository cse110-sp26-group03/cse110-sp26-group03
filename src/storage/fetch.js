// src/storage/fetch.js
//
// Manta's read-only query layer for the view command.
//
// Opens the SQLite cache in read-only mode and returns either a single
// issue (when an ID is provided) or a filtered, priority-sorted list.
//
// Two modes based on the parse object's flags:
//   Detail: flags.id is set   -> returns one issue object.
//   List:   flags.id is unset -> returns an array of issue objects,
//           optionally filtered by status, priority, type, assignee,
//           or createdBy. Closed issues are excluded by default unless
//           the --all flag is present.

import { Database } from 'bun:sqlite';

const db = new Database('.manta/manta.db', {
  readonly: true,
});

/**
 * Map of filter flag names to their corresponding SQLite column names.
 *
 * @type {Object.<string, string>}
 */
const filter_map = {
  status: 'status',
  priority: 'priority',
  type: 'issueType',
  assignee: 'assignee',
  createdBy: 'createdBy',
};

// ---- Public API -------------------------------------------------------

/**
 * Fetch issues from the SQLite cache based on the parsed view command.
 *
 * When flags.id is present, returns a single issue object matching
 * that ID. Otherwise returns an array of issues sorted by priority,
 * with closed issues excluded unless the --all flag is set.
 *
 * @param {object} parse_obj - A parse object with { cmd, flags }.
 * @returns {object|Array.<object>} A single issue or an array of issues.
 * @throws {Error} If the query fails or the requested issue is not found.
 */
export function FETCH(parse_obj) {
  try {
    if (parse_obj['flags']['id']) {
      return fetchSingleIssue(parse_obj['flags']['id']);
    } else {
      return fetchIssueList(parse_obj['flags']);
    }
  } catch (err) {
    throw new Error('Query failed: ' + err.message, { cause: err });
  }
}

// ---- Query helpers ----------------------------------------------------

/**
 * Fetch a single issue by its ID.
 *
 * @param {string} id - The full issue ID (e.g. "manta-h3kp").
 * @returns {object} The matching issue row.
 * @throws {Error} If no issue with that ID exists.
 */
function fetchSingleIssue(id) {
  let issue = db.query('SELECT * FROM issues WHERE id = ?').get(id);

  if (!issue) {
    throw new Error(`Issue with id ${id} not found`);
  }

  return issue;
}

/**
 * Fetch a filtered, sorted list of issues.
 *
 * Builds a WHERE clause from the provided flags. Closed issues are
 * excluded unless the --all flag is present or a specific status
 * filter is set. Results are sorted by priority (ascending numeric),
 * with closed issues pushed to the bottom.
 *
 * @param {object} flags - The flags object from the parse result.
 * @returns {Array.<object>} An array of matching issue rows.
 */
function fetchIssueList(flags) {
  const conditions = [];
  const params = [];

  if (!('all' in flags) && !flags['status'])
    conditions.push("status != 'closed'");

  for (const [flag, col] of Object.entries(filter_map)) {
    if (flags[flag]) {
      conditions.push(`${col} = ?`);
      params.push(flags[flag]);
    }
  }

  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  return db
    .query(
      `SELECT * FROM issues${where}
          ORDER BY
          (status = 'closed'),
          CAST(SUBSTR(priority, 3, LENGTH(priority) - 3) AS INTEGER)`,
    )
    .all(...params);
}

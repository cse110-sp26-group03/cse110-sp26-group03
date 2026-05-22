// src/storage/replay.js
//
// Manta's replay layer.
//
// Rebuilds the SQLite cache (.manta/manta.db) from the JSONL event log
// (.manta/manta.jsonl, the source of truth) so the local cache reflects
// every event — including teammates' changes pulled in via `git pull`.
//
// Two modes, chosen automatically:
//
//   Full replay      — runs when there is no checkpoint yet: the first
//                      run, or after the cache DB was deleted and
//                      rebuilt (the documented recovery step). Wipes the
//                      issues table and applies every line of the log.
//
//   Incremental sync — runs when a checkpoint exists. Per backend
//                      ADR-007 the checkpoint is the git commit SHA the
//                      cache was last synced to. replay() reads that
//                      SHA, asks `git diff` for the JSONL lines added
//                      between it and HEAD, and applies only those —
//                      the fast path after a `git pull`.
//
// The checkpoint itself is owned by checkpoint.js (ADR-007); this module
// only reads it and advances it to the current HEAD SHA on success.
//
// replay() applies events to SQLite ONLY. It never writes the JSONL log
// (store.js owns that) and never generates issue IDs — it reuses the
// issueId already recorded on each logged event. Creates use INSERT OR
// REPLACE and updates/deletes target by ID, so applying the same event
// twice is harmless: re-running replay can only converge the cache, it
// cannot corrupt it. Because a create is always logged before any
// update to the same issue, an idempotent re-apply never resets a row
// past a later change.
//
// Per frontend ADR-004 events come in three types — issue.created,
// issue.updated, issue.deleted. A whole batch is applied inside one
// SQLite transaction: if any line is malformed the cache rolls back
// untouched.
//
// Graceful degradation: if git is unavailable (not a repo, no commits)
// or the stored SHA can no longer be diffed (history rewritten, shallow
// clone), replay falls back to a full replay from the working-tree log,
// so the cache is still rebuilt correctly.

import { readFileSync, existsSync } from "fs";
import { execFileSync } from "child_process";

const DEFAULT_LOG_PATH = ".manta/manta.jsonl";

// Maps an update event's field name (camelCase) to its SQLite column
// (PascalCase), matching schema.sql. Only fields an update may carry are
// listed — createdAt/createdBy are set once on create and never change.
const UPDATE_COLUMNS = {
  title: "Title",
  description: "Description",
  status: "Status",
  priority: "Priority",
  issueType: "IssueType",
  assignee: "Assignee",
  updatedAt: "UpdatedAt",
  updatedBy: "UpdatedBy",
};

// ---- Public API ----------------------------------------------------

/**
 * Replay the JSONL event log into the SQLite cache.
 *
 * Picks full vs. incremental mode automatically from the checkpoint and
 * the current git state (see the module header). Safe to call on every
 * startup and after every `git pull`; repeated calls converge the cache.
 *
 * All parameters are optional — production code calls `await replay()`
 * with no arguments and the real db / checkpoint singletons are used.
 * The parameters exist so tests can inject an isolated database.
 *
 * @param {object}   [options]
 * @param {object}   [options.db]            bun:sqlite Database handle.
 *                                           Defaults to the db.js singleton.
 * @param {string}   [options.logPath]       Path to the JSONL log.
 *                                           Defaults to ".manta/manta.jsonl".
 * @param {string}   [options.cwd]           Working directory for git
 *                                           commands. Defaults to the
 *                                           process working directory.
 * @param {function} [options.getCheckpoint] Override for checkpoint.js's
 *                                           getCheckpoint (testing only).
 * @param {function} [options.setCheckpoint] Override for checkpoint.js's
 *                                           setCheckpoint (testing only).
 * @returns {Promise<{mode: string, applied: number, headSha: string|null}>}
 *          `mode` is "full", "incremental", or "noop"; `applied` is the
 *          number of events written to SQLite.
 */
export async function replay(options = {}) {
  const { logPath = DEFAULT_LOG_PATH, cwd } = options;
  let { db, getCheckpoint, setCheckpoint } = options;

  // Resolve the production singletons lazily. Keeping db.js and
  // checkpoint.js out of this module's static imports means replay.js
  // can be imported — and its logic exercised with an injected db —
  // without opening the real bun:sqlite cache as a side effect.
  if (!db) {
    db = (await import("./db.js")).default;
  }
  if (!getCheckpoint || !setCheckpoint) {
    const checkpoint = await import("./checkpoint.js");
    getCheckpoint = getCheckpoint || checkpoint.getCheckpoint;
    setCheckpoint = setCheckpoint || checkpoint.setCheckpoint;
  }

  const oldSha = getCheckpoint();
  const headSha = getHeadSha(cwd);

  // Already synced to the committed history — nothing for replay to do.
  // (Local, uncommitted appends are written straight to SQLite by
  // store.js, so they are never replay's responsibility.)
  if (oldSha !== null && headSha !== null && oldSha === headSha) {
    return { mode: "noop", applied: 0, headSha };
  }

  // Incremental path: a checkpoint exists and git can diff against it.
  if (oldSha !== null && headSha !== null) {
    const newLines = diffNewLogLines(oldSha, headSha, logPath, cwd);
    if (newLines !== null) {
      const applied = applyLines(db, newLines, { wipeFirst: false });
      setCheckpoint(headSha);
      return { mode: "incremental", applied, headSha };
    }
    // git could not diff the stored SHA (history rewritten, shallow
    // clone, ...). Fall through to a full replay, which always works.
  }

  // Full replay: rebuild the issues table from the entire log.
  const allLines = readLogLines(logPath);
  const applied = applyLines(db, allLines, { wipeFirst: true });
  if (headSha !== null) {
    setCheckpoint(headSha);
  }
  return { mode: "full", applied, headSha };
}

// ---- git helpers ---------------------------------------------------

/**
 * Return the current HEAD commit SHA, or null if unavailable.
 *
 * Unavailable means there is no git repository, or a repository with no
 * commits yet. Callers treat null as "git can't help" and fall back to
 * a full replay.
 *
 * @param {string} [cwd] - Directory to run git in.
 * @returns {string|null}
 */
function getHeadSha(cwd) {
  return runGit(["rev-parse", "HEAD"], cwd);
}

/**
 * Find the JSONL log lines added between two commits.
 *
 * Uses `git diff` (backend ADR-007) with zero context lines, so every
 * line in the output that starts with "+" is a genuine new event line.
 *
 * @param {string} oldSha  - The last-synced commit SHA (the checkpoint).
 * @param {string} headSha - The current HEAD commit SHA.
 * @param {string} logPath - Path to the JSONL log.
 * @param {string} [cwd]   - Directory to run git in.
 * @returns {string[]|null} New log lines, or null if git could not
 *                          produce a diff (e.g. the stored SHA is gone).
 */
function diffNewLogLines(oldSha, headSha, logPath, cwd) {
  const diff = runGit(
    ["diff", "--no-color", "-U0", oldSha, headSha, "--", logPath],
    cwd
  );
  if (diff === null) {
    return null;
  }
  return parseAddedLines(diff);
}

/**
 * Run a git command, returning its trimmed stdout, or null on failure.
 *
 * Every git failure mode — git not installed, not a repo, bad revision —
 * collapses to null so callers have a single "git can't help" signal.
 * git's own stderr is discarded to keep replay quiet.
 *
 * @param {string[]} args - Arguments passed to git.
 * @param {string} [cwd]  - Directory to run git in.
 * @returns {string|null}
 */
function runGit(args, cwd) {
  try {
    const out = execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.trim();
  } catch {
    return null;
  }
}

/**
 * Extract added content lines from `git diff -U0` output.
 *
 * In a unified diff, added lines start with "+"; the "+++ " file header
 * also starts with "+" and must be skipped. Blank results are dropped.
 *
 * @param {string} diff - Raw `git diff` output.
 * @returns {string[]}
 */
function parseAddedLines(diff) {
  const lines = [];
  for (const line of diff.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      const content = line.slice(1);
      if (content.trim().length > 0) {
        lines.push(content);
      }
    }
  }
  return lines;
}

// ---- Reading the log -----------------------------------------------

/**
 * Read every non-empty line of the JSONL log from the working tree.
 *
 * @param {string} logPath - Path to the JSONL log.
 * @returns {string[]} The log lines, or [] if the log does not exist yet.
 */
function readLogLines(logPath) {
  if (!existsSync(logPath)) {
    return [];
  }
  return readFileSync(logPath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0);
}

// ---- Applying events to SQLite -------------------------------------

/**
 * Apply a batch of JSONL lines to the SQLite cache in one transaction.
 *
 * Each line is parsed and dispatched by event type. The whole batch is
 * atomic: if any line is malformed or carries an unknown type, the
 * transaction rolls back and the cache is left exactly as it was.
 *
 * @param {object}   db             - bun:sqlite Database handle.
 * @param {string[]} lines          - JSONL lines to apply.
 * @param {object}   opts
 * @param {boolean}  opts.wipeFirst - When true, clear the issues table
 *                                    before applying (a full replay).
 * @returns {number} The number of events applied.
 * @throws {Error} If a line is not valid JSON or has an unknown type.
 */
function applyLines(db, lines, { wipeFirst }) {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO issues (
      ID, Title, Description, Status, Priority, IssueType, Assignee,
      CreatedAt, CreatedBy, UpdatedAt, UpdatedBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const remove = db.prepare(`DELETE FROM issues WHERE ID = ?`);

  db.exec("BEGIN");
  try {
    if (wipeFirst) {
      db.exec("DELETE FROM issues");
    }
    let applied = 0;
    for (let i = 0; i < lines.length; i++) {
      const event = parseEvent(lines[i], i + 1);
      applyEvent(db, event, insert, remove);
      applied++;
    }
    db.exec("COMMIT");
    return applied;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/**
 * Parse one JSONL line into an event object.
 *
 * @param {string} line    - The raw log line.
 * @param {number} lineNum - 1-based position, used only in error text.
 * @returns {object} The parsed event.
 * @throws {Error} If the line is not valid JSON.
 */
function parseEvent(line, lineNum) {
  try {
    return JSON.parse(line);
  } catch {
    throw new Error(`replay: malformed JSON on log line ${lineNum}: ${line}`);
  }
}

/**
 * Apply a single event to the SQLite cache.
 *
 * Mirrors store.js's SQLite writes, with two deliberate differences:
 * creates use INSERT OR REPLACE (so re-applying a logged create is
 * idempotent) and reuse the issueId already on the event instead of
 * generating a new one. An update or delete for an issue that is not in
 * the cache is a harmless no-op — its create line is simply earlier in
 * the log and will be applied first by any full replay.
 *
 * @param {object} db     - bun:sqlite Database handle.
 * @param {object} event  - A parsed event (frontend ADR-004 shape).
 * @param {object} insert - Prepared INSERT OR REPLACE statement.
 * @param {object} remove - Prepared DELETE statement.
 * @throws {Error} If event.type is not a recognized type.
 */
function applyEvent(db, event, insert, remove) {
  switch (event.type) {
    case "issue.created":
      applyCreate(event, insert);
      break;
    case "issue.updated":
      applyUpdate(db, event);
      break;
    case "issue.deleted":
      remove.run(event.issueId);
      break;
    default:
      throw new Error(`replay: unrecognized event type "${event.type}"`);
  }
}

/**
 * Insert (or replace) an issue row from a create event.
 *
 * Column order matches the prepared INSERT in applyLines and schema.sql.
 *
 * @param {object} event  - An issue.created event with issueId + issue.
 * @param {object} insert - Prepared INSERT OR REPLACE statement.
 */
function applyCreate(event, insert) {
  const issue = event.issue;
  insert.run(
    event.issueId,
    issue.title,
    issue.description,
    issue.status,
    issue.priority,
    issue.issueType,
    issue.assignee,
    issue.createdAt,
    issue.createdBy,
    issue.updatedAt,
    issue.updatedBy
  );
}

/**
 * Apply an update event: write only the fields it changed.
 *
 * Builds the SET clause dynamically so untouched columns are left alone.
 * Per frontend ADR-004 a changes object holds only modified fields.
 *
 * @param {object} db    - bun:sqlite Database handle.
 * @param {object} event - An issue.updated event with issueId + changes.
 * @throws {Error} If changes names a field with no SQLite column.
 */
function applyUpdate(db, event) {
  const fields = Object.keys(event.changes);
  if (fields.length === 0) {
    return;
  }
  const assignments = fields.map((field) => `${columnFor(field)} = ?`);
  const values = fields.map((field) => event.changes[field]);
  db.prepare(`UPDATE issues SET ${assignments.join(", ")} WHERE ID = ?`).run(
    ...values,
    event.issueId
  );
}

/**
 * Map an update field name to its SQLite column.
 *
 * @param {string} field - A camelCase field from a changes object.
 * @returns {string} The matching PascalCase column name.
 * @throws {Error} If the field has no column in the issues table.
 */
function columnFor(field) {
  const column = UPDATE_COLUMNS[field];
  if (!column) {
    throw new Error(`replay: unknown update field "${field}"`);
  }
  return column;
}

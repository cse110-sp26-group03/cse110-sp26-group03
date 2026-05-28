// src/storage/store.js
//
// Manta's storage layer.
//
// Owns all writes to Manta's two stores: the JSONL event log
// (.manta/manta.jsonl, the source of truth, committed to git) and the
// SQLite cache (.manta/manta.db, the local query layer, gitignored).
//
// Per backend ADR-008, this file exposes a single function, applyEvent(event),
// which dispatches based on event.type. CLI commands, the MCP server,
// and the replay layer all call applyEvent — none of them touch JSONL
// or SQLite directly.
//
// Per frontend ADR-004, events come in three types — issue.created, issue.updated,
// issue.deleted — each with a specific shape. store.js trusts events.js
// to construct them correctly and does not validate them here.
//
// Per backend ADR-005, store.js generates issue IDs on create events. SQLite's
// PRIMARY KEY constraint catches the rare collision; store.js retries
// up to 5 times before failing loudly.

import { appendFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import db from './db.js';
import { recordAppend, syncFromLog } from './replay.js';

const DEFAULT_LOG_PATH = '.manta/manta.jsonl';

// Crockford base32 alphabet — drops i, l, o, u to avoid visual confusion.
const CROCKFORD_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
const ID_SUFFIX_LENGTH = 4;
const ID_MAX_RETRIES = 5;

// ---- Public API ----------------------------------------------------

/**
 * Apply an event to both JSONL and SQLite. Dispatches by event.type.
 *
 * Creates write to SQLite first (to validate the generated ID), then JSONL.
 * Updates and deletes write to JSONL first (durability before visibility),
 * then SQLite.
 *
 * @param {object} event - Event object per ADR-004 (created/updated/deleted).
 * @returns {object} The persisted event (with issueId set for creates).
 * @throws {Error} If event.type is unrecognized.
 */
export function applyEvent(event) {
  switch (event.type) {
    case 'issue.created':
      return applyCreate(event);
    case 'issue.updated':
      return applyUpdate(event);
    case 'issue.deleted':
      return applyDelete(event);
    default:
      throw buildStoreError(event.type, null, 'unrecognized event type.');
  }
}

// ---- Event handlers ------------------------------------------------

/**
 * Persist a create event.
 *
 * Generates a random ID and inserts into SQLite, retrying on UNIQUE
 * collision up to ID_MAX_RETRIES times. Appends to JSONL only after
 * SQLite accepts the row, so the log never records a collided ID.
 *
 * @param {object} event - A create event; event.issueId is filled in here.
 * @returns {object} The event with its assigned issueId.
 * @throws {Error} If a unique ID can't be generated within ID_MAX_RETRIES,
 *                 or if SQLite rejects the insert for any other reason.
 */
function applyCreate(event) {
  for (let attempt = 1; attempt <= ID_MAX_RETRIES; attempt++) {
    event.issueId = generateIssueId();

    try {
      insertIssue(event);
    } catch (err) {
      if (isUniqueConstraintError(err) && attempt < ID_MAX_RETRIES) {
        continue; // Collision — try again with a fresh ID.
      }
      throw err;
    }

    // SQLite accepted the ID. JSONL is the durable record.
    const line = appendToLog(event);
    recordAppend(line);
    return event;
  }

  throw buildStoreError(
    'create',
    null,
    'failed to generate unique issue ID after multiple attempts. Check if there is space for more IDs or if the database is corrupted.',
  );
}

/**
 * Persist an update event.
 *
 * Checks the issue exists before writing anything, so we never log an update for a missing issue.
 * If the issue doesn't exist, we call a replay function to update the SQLite from the JSONL.
 * If the issue still doesn't exist in the updated SQLite, we throw an error.
 * Otherwise, we append to the JSONL and apply the update to the SQLite.
 *
 * @param {object} event - An update event with issueId and a changes object.
 * @returns {object} The event, unchanged.
 * @throws {Error} If the issue doesn't exist or changes is empty.
 */
function applyUpdate(event) {
  if (!issueExists(event.issueId)) {
    syncFromLog();
    if (!issueExists(event.issueId)) {
      throw buildStoreError(
        'update',
        event.issueId,
        'no issue with that ID exists.',
      );
    }
  }

  const fields = Object.keys(event.changes);
  if (fields.length === 0) {
    throw buildStoreError(
      'update',
      event.issueId,
      'no fields to change were provided.',
    );
  }

  const line = appendToLog(event);
  recordAppend(line);
  updateIssue(event);
  return event;
}

/**
 * Persist a delete event.
 *
 * Checks the issue exists before writing anything, so we never log a delete for a missing issue. 
 * If the issue doesn't exist, we call a replay function to update the SQLite from the JSONL.
 * If the issue still doesn't exist in the updated SQLite, we throw an error.
 * Otherwise, we append to the JSONL and remove from the SQLite.
 *
 * @param {object} event - A delete event with an issueId.
 * @returns {object} The event, unchanged.
 * @throws {Error} If the issue doesn't exist
 */
function applyDelete(event) {
  if (!issueExists(event.issueId)) {
    syncFromLog();
    if (!issueExists(event.issueId)) {
      throw buildStoreError(
        'update',
        event.issueId,
        'no issue with that ID exists.',
      );
    }
  }

  const line = appendToLog(event);
  recordAppend(line);
  deleteIssue(event);
  return event;
}

// ---- JSONL writes --------------------------------------------------

/**
 * Append a single event to the JSONL log as one line.
 *
 * Creates the parent .manta/ directory if missing; the log file itself
 * is created on first write.
 *
 * @param {object} event - The event to record.
 * @param {string} [logPath] - Log path override (mainly for testing).
 */
function appendToLog(event, logPath = DEFAULT_LOG_PATH) {
  mkdirSync(dirname(logPath), { recursive: true });
  const line = JSON.stringify(event) + '\n';
  appendFileSync(logPath, line, 'utf8');
  return line;
}

// ---- SQLite reads (for validation) ---------------------------------

/**
 * Check whether an issue with the given ID exists in SQLite.
 *
 * Used by update/delete to fail early if the target issue isn't there.
 *
 * @param {string} issueId
 * @returns {boolean}
 */
function issueExists(issueId) {
  const row = db.prepare(`SELECT 1 FROM issues WHERE ID = ?`).get(issueId);
  return row !== undefined && row !== null;
}

// ---- SQLite writes -------------------------------------------------

/**
 * Insert a new issue row into SQLite.
 *
 * Reads fields from event.issue and the top-level event.issueId.
 *
 * @param {object} event - A create event with a populated issueId.
 * @throws {Error} UNIQUE constraint error if the ID already exists;
 *                 applyCreate catches this and retries.
 */
export function insertIssue(event) {
  const i = event.issue;
  db.prepare(
    `
    INSERT INTO issues (
      ID, Title, Description, Status, Priority, IssueType, Assignee,
      CreatedAt, CreatedBy, UpdatedAt, UpdatedBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    event.issueId,
    i.title,
    i.description,
    i.status,
    i.priority,
    i.issueType,
    i.assignee,
    i.createdAt,
    i.createdBy,
    i.updatedAt,
    i.updatedBy,
  );
}

/**
 * Update an existing issue with only the fields present in event.changes.
 *
 * Builds the SET clause dynamically so only changed columns are written.
 * Per ADR-004, changes contains only modified fields.
 *
 * @param {object} event - An update event with issueId and a changes object.
 */
export function updateIssue(event) {
  const fields = Object.keys(event.changes);
  if (fields.length === 0) return;

  const setClause = fields.map((f) => `${columnName(f)} = ?`).join(', ');
  const values = fields.map((f) => event.changes[f]);

  db.prepare(
    `
    UPDATE issues SET ${setClause} WHERE ID = ?
  `,
  ).run(...values, event.issueId);
}

/**
 * Delete an issue row from SQLite by ID.
 *
 * @param {object} event - A delete event with an issueId.
 */
export function deleteIssue(event) {
  db.prepare(`DELETE FROM issues WHERE ID = ?`).run(event.issueId);
}

// ---- ID generation -------------------------------------------------

/**
 * Generate a random issue ID of the form "manta-<4 chars>".
 *
 * Uses the Crockford base32 alphabet. Called once per insert attempt;
 * applyCreate calls it again for a fresh suffix on collision.
 *
 * @returns {string} A new candidate issue ID.
 */
function generateIssueId() {
  let suffix = '';
  for (let i = 0; i < ID_SUFFIX_LENGTH; i++) {
    const idx = Math.floor(Math.random() * CROCKFORD_ALPHABET.length);
    suffix += CROCKFORD_ALPHABET[idx];
  }
  return `manta-${suffix}`;
}

// ---- Error handling -----------------------------------------------
/**
 * Build a store error with the format: `Cannot <action> issue "<issueId>": <reason>`
 *
 * Attaches issueId and reason as structured fields on the Error so the
 * frontend that catches it can use it if needed
 * err.message should return whole string
 *
 * @param {string} action - The attempted action (e.g. "update", "delete").
 * @param {string} issueId - The issue ID.
 * @param {string} reason - The reason for the error.
 * @returns {Error} A new error object with .issueId and .reason set.
 */
function buildStoreError(action, issueId, reason) {
  const subject = issueId ? `issue "${issueId}"` : 'the issue'; //if exists format it as so, otherwise can't include it
  const err = new Error(`Cannot ${action} ${subject}: ${reason}`);
  err.issueId = issueId; //we still know from this field if issueId exists or not
  err.reason = reason;
  return err;
}

// ---- Helpers -------------------------------------------------------

/**
 * Detect SQLite's UNIQUE constraint violation from an error.
 *
 * Matches on the standard SQLite message; the single place to update
 * if bun:sqlite ever changes its error shape.
 *
 * @param {Error} err - The error thrown by a SQLite write.
 * @returns {boolean} True if it's a UNIQUE constraint violation.
 */
function isUniqueConstraintError(err) {
  return /UNIQUE constraint failed/i.test(err.message);
}

/**
 * Map an event field name (camelCase) to its SQLite column (PascalCase).
 *
 * @param {string} field - The camelCase field name from a changes object.
 * @returns {string} The matching PascalCase column name.
 * @throws {Error} If the field name isn't recognized.
 */
function columnName(field) {
  const map = {
    title: 'Title',
    description: 'Description',
    status: 'Status',
    priority: 'Priority',
    issueType: 'IssueType',
    assignee: 'Assignee',
    updatedAt: 'UpdatedAt',
    updatedBy: 'UpdatedBy',
  };
  if (!map[field]) {
    throw new Error(`Unknown field for update: ${field}`);
  }
  return map[field];
}

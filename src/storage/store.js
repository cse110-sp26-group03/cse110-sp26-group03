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

import { appendFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import db from "./db.js";

const DEFAULT_LOG_PATH = ".manta/manta.jsonl";

// Crockford base32 alphabet — drops i, l, o, u to avoid visual confusion.
const CROCKFORD_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";
const ID_SUFFIX_LENGTH = 4;
const ID_MAX_RETRIES = 5;

// ---- Public API ----------------------------------------------------

/**
 * Apply an event to both JSONL and SQLite.
 *
 * For create events: generates an issue ID, inserts into SQLite first
 * (to confirm the ID is unique), retries on collision, then appends to
 * JSONL. Returns the event with issueId filled in.
 *
 * For update/delete events: appends to JSONL first (durability before
 * visibility), then applies the change to SQLite. Returns the event
 * unchanged.
 *
 * @param {object} event - Event object matching ADR-004's schema.
 * @returns {object} The persisted event (with issueId set for creates).
 * @throws If the event type is unknown or storage writes fail.
 */
export function applyEvent(event) {
  switch (event.type) {
    case "issue.created":
      return applyCreate(event);
    case "issue.updated":
      return applyUpdate(event);
    case "issue.deleted":
      return applyDelete(event);
    default:
      throw new Error(`Unknown event type: ${event.type}`);
  }
}

// ---- Event handlers ------------------------------------------------

/**
 * Persist a create event.
 *
 * Generates a random ID, inserts into SQLite, retries on UNIQUE collision
 * up to ID_MAX_RETRIES times. Only after SQLite accepts the row do we
 * append to JSON
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
    appendToLog(event);
    return event;
  }

  throw new Error(
    `Failed to generate unique issue ID after ${ID_MAX_RETRIES} attempts. ` +
    `This should be extremely rare — check for ID-space exhaustion or DB issues.`
  );
}

/**
 * Persist an update event.
 *
 * Append to JSONL first (durability), then apply to SQLite.
 */
function applyUpdate(event) {
  appendToLog(event);
  updateIssue(event);
  return event;
}

/**
 * Persist a delete event.
 *
 * Append to JSONL first (durability), then remove the row from SQLite.
 */
function applyDelete(event) {
  appendToLog(event);
  deleteIssue(event);
  return event;
}

// ---- JSONL writes --------------------------------------------------

/**
 * Append a single event to the JSONL log as one line.
 *
 * Creates the parent .manta/ directory if missing. The file itself is
 * created on first write by appendFileSync.
 */
function appendToLog(event, logPath = DEFAULT_LOG_PATH) {
  mkdirSync(dirname(logPath), { recursive: true });
  const line = JSON.stringify(event) + "\n";
  appendFileSync(logPath, line, "utf8");
}

// ---- SQLite writes -------------------------------------------------

/**
 * Insert a new issue row into SQLite.
 *
 * Called by applyCreate after an issueId has been generated. Pulls
 * fields from event.issue (the full issue object per ADR-004's create
 * event shape) and the top-level event.issueId.
 *
 * May throw a UNIQUE constraint error if the generated ID collides
 * with an existing row. applyCreate catches this and retries with a
 * fresh ID.
 */
function insertIssue(event) {
  const i = event.issue;
  db.prepare(`
    INSERT INTO issues (
      ID, Title, Description, Status, Priority, IssueType, Assignee,
      CreatedAt, CreatedBy, UpdatedAt, UpdatedBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
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
    i.updatedBy
  );
}

/**
 * Update an existing issue with only the fields present in event.changes.
 * Per frontend ADR-004, the changes object contains only modified fields.
 */
function updateIssue(event) {
  const fields = Object.keys(event.changes);
  if (fields.length === 0) return;

  const setClause = fields.map(f => `${columnName(f)} = ?`).join(", ");
  const values = fields.map(f => event.changes[f]);

  db.prepare(`
    UPDATE issues SET ${setClause} WHERE ID = ?
  `).run(...values, event.issueId);
}

function deleteIssue(event) {
  db.prepare(`DELETE FROM issues WHERE ID = ?`).run(event.issueId);
}

// ---- ID generation -------------------------------------------------

/**
 * Generate a random issue ID.
 *
 * Format: "manta-<4 chars>" using the Crockford base32 alphabet.
 * Called once per attempt — if SQLite rejects the INSERT, applyCreate
 * calls this again for a fresh random suffix.
 */
function generateIssueId() {
  let suffix = "";
  for (let i = 0; i < ID_SUFFIX_LENGTH; i++) {
    const idx = Math.floor(Math.random() * CROCKFORD_ALPHABET.length);
    suffix += CROCKFORD_ALPHABET[idx];
  }
  return `manta-${suffix}`;
}

// ---- Helpers -------------------------------------------------------

/**
 * Detect SQLite's UNIQUE constraint violation.
 *
 * The bun:sqlite error message uses the standard SQLite format, so
 * matching on the message is reliable. If bun:sqlite ever changes
 * its error shape, this check is the single place to update.
 */
function isUniqueConstraintError(err) {
  return /UNIQUE constraint failed/i.test(err.message);
}

/**
 * Map event field names (camelCase) to SQLite column names (PascalCase).
 * Centralized so renames are easy. Throws on unknown fields to catch
 * typos early rather than silently producing broken SQL.
 */
function columnName(field) {
  const map = {
    title: "Title",
    description: "Description",
    status: "Status",
    priority: "Priority",
    issueType: "IssueType",
    assignee: "Assignee",
    updatedAt: "UpdatedAt",
    updatedBy: "UpdatedBy",
  };
  if (!map[field]) {
    throw new Error(`Unknown field for update: ${field}`);
  }
  return map[field];
}
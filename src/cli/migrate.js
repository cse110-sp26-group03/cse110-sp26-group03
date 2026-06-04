// src/cli/migrate.js
//
// Manta's Beads migration command.
//
// Reads a Beads JSONL export and translates each issue into a Manta
// issue.created event. The Beads IDs (e.g. "beads-h53") are preserved
// as Manta issue IDs so users can keep referring to their issues by
// the same names.
//
// This bypasses the normal store.js create flow (applyEvent → applyCreate)
// because that path generates fresh Manta IDs. Migration deliberately
// keeps the original Beads IDs.
//
// After all events are appended to .manta/manta.jsonl, syncFromLog()
// rebuilds the SQLite cache so the migrated issues appear in queries.
//
// Field translation from Beads to Manta:
//   - id:              kept as-is (e.g. "beads-h53")
//   - title:           direct copy
//   - description:     defaulted to "" (Beads exports don't include one)
//   - status:          direct copy — Manta now supports the same four
//                      statuses as Beads (open, in_progress, blocked, closed)
//   - priority:        integer -> "p<n>" string (Beads 1 -> Manta "p1")
//   - issue_type:      direct copy for known types (bug/feature/task/
//                      docs/chore), fallback to "task" otherwise
//   - owner:           used as Manta's assignee
//   - created_by:      used as Manta's createdBy/updatedBy
//   - created_at /
//     updated_at:      copied as createdAt / updatedAt
//   - everything else: dropped (started_at, dependency_count,
//                      dependent_count, comment_count, _type)

import { readFileSync, existsSync } from 'fs';
import { appendToLog } from '../storage/store.js';
import { syncFromLog } from '../storage/replay.js';
import db from '../storage/db.js';

// ---- Public API ----------------------------------------------------

/**
 * Migrate issues from a Beads JSONL export into Manta.
 *
 * Reads each line of the Beads log, translates it into a Manta
 * issue.created event with the Beads ID preserved, and appends it
 * to .manta/manta.jsonl. Then calls syncFromLog() to rebuild SQLite.
 *
 * Issues with IDs that already exist in Manta are skipped, so this
 * command is safe to re-run.
 *
 * @param {string} beadsLogPath - Path to the Beads JSONL export file.
 * @returns {{migrated: number, skipped: number, failed: number}}
 *          Counts of issues by outcome.
 * @throws {Error} If the Beads log doesn't exist or can't be read.
 */
export function migrateBeads(beadsLogPath) {
  if (!existsSync(beadsLogPath)) {
    throw new Error(`Cannot migrate: Beads log not found at "${beadsLogPath}".`);
  }

  const contents = readFileSync(beadsLogPath, 'utf8');
  const beadsIssues = parseBeadsLog(contents);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const beadsIssue of beadsIssues) {
    try {
      if (issueIdExists(beadsIssue.id)) {
        skipped++;
        continue;
      }

      const event = translateToMantaEvent(beadsIssue);
      appendToLog(event);
      migrated++;
    } catch (err) {
      console.error(`  Failed to migrate "${beadsIssue.id}": ${err.message}`);
      failed++;
    }
  }

  // Rebuild SQLite so the new issues show up in queries.
  syncFromLog();

  return { migrated, skipped, failed };
}

// ---- Translation ---------------------------------------------------

/**
 * Translate one Beads issue into a Manta issue.created event.
 *
 * Preserves the Beads ID as the Manta issueId. Maps Beads fields to
 * Manta fields, defaulting anything Beads doesn't provide.
 *
 * @param {object} beadsIssue - One issue from a Beads JSONL export.
 * @returns {object} An issue.created event with the Beads ID preserved.
 */
function translateToMantaEvent(beadsIssue) {
  const createdAt = beadsIssue.created_at || new Date().toISOString();
  const updatedAt = beadsIssue.updated_at || createdAt;
  const createdBy = beadsIssue.created_by || 'beads-import';

  return {
    type: 'issue.created',
    timestamp: createdAt,
    actor: createdBy,
    issueId: 'manta-' + beadsIssue.id.slice(6), // preserve the Beads ID directly
    issue: {
      title: beadsIssue.title || '(untitled)',
      description: '',
      status: translateStatus(beadsIssue.status),
      priority: translatePriority(beadsIssue.priority),
      issueType: translateIssueType(beadsIssue.issue_type),
      assignee: beadsIssue.owner || null,
      createdAt: createdAt,
      createdBy: createdBy,
      updatedAt: updatedAt,
      updatedBy: createdBy,
    },
  };
}

/**
 * Translate a Beads status to a Manta status.
 *
 * Manta supports the same four statuses Beads does: open, in_progress,
 * blocked, closed. Direct passthrough for known values; unknown values
 * fall back to "open" as a safe default.
 *
 * @param {string|undefined} beadsStatus - The status field from Beads.
 * @returns {string} A valid Manta status.
 */
function translateStatus(beadsStatus) {
  const allowed = ['open', 'in_progress', 'blocked', 'closed'];
  if (allowed.includes(beadsStatus)) return beadsStatus;
  return 'open';
}

/**
 * Translate a Beads integer priority to Manta's "p<n>" string format.
 *
 * Beads uses integers (0 = highest); Manta uses strings like "p0".
 *
 * @param {number|undefined} beadsPriority - The integer priority from Beads.
 * @returns {string} A Manta-style priority string. Defaults to "p3" if missing.
 */
function translatePriority(beadsPriority) {
  if (typeof beadsPriority !== 'number' || beadsPriority < 0) {
    return 'p5';
  }
  return `p${beadsPriority}`;
}

/**
 * Translate a Beads issue_type to a Manta issueType.
 *
 * Manta's CHECK constraint allows: bug, feature, task, docs, chore.
 * Unknown types fall back to "task".
 *
 * @param {string|undefined} beadsType - The issue_type field from Beads.
 * @returns {string} A valid Manta issueType.
 */
function translateIssueType(beadsType) {
  const allowed = ['bug', 'feature', 'task', 'docs', 'chore'];
  if (allowed.includes(beadsType)) return beadsType;
  return 'task';
}

// ---- Parsing -------------------------------------------------------

/**
 * Parse a Beads JSONL export into an array of issue objects.
 *
 * Skips blank lines and any line whose _type isn't "issue" (Beads
 * exports may include other line types). Throws on invalid JSON.
 *
 * @param {string} contents - The raw text of the Beads log file.
 * @returns {object[]} The parsed Beads issues only (other line types filtered).
 * @throws {Error} If any non-blank line isn't valid JSON.
 */
function parseBeadsLog(contents) {
  const issues = [];
  const lines = contents.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;

    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch (err) {
      throw new Error(
        `Beads log line ${i + 1} is not valid JSON: ${err.message}`,
        { cause: err },
      );
    }

    // Skip lines that aren't issues. Beads logs can contain other types.
    if (parsed._type !== 'issue') continue;

    issues.push(parsed);
  }

  return issues;
}

// ---- Duplicate detection -------------------------------------------

/**
 * Check whether an issue with this ID already exists in Manta's SQLite cache.
 *
 * Used to skip Beads issues that would collide with existing Manta issues
 * (e.g. on a re-run of migrate).
 *
 * @param {string} issueId - The candidate issue ID (e.g. "beads-h53").
 * @returns {boolean} True if a row with this ID already exists.
 */
function issueIdExists(issueId) {
  const row = db.prepare(`SELECT 1 FROM issues WHERE ID = ?`).get(issueId);
  return row !== undefined && row !== null;
}
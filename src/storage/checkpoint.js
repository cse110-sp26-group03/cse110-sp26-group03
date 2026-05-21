// src/storage/checkpoint.js
//
// Read and write Manta's replay checkpoint — the marker that records
// how far this machine's SQLite cache has been synced with the JSONL
// event log. The sync layer reads it on startup so it can replay only
// new events instead of the entire log.
//
// Per backend ADR-007, the checkpoint lives in a dedicated `checkpoint`
// table inside the SQLite cache (.manta/manta.db) — NOT in a standalone
// file. Co-locating it with the cache means the two cannot desync: the
// checkpoint shares the cache's lifecycle, so deleting and rebuilding
// the cache (the documented recovery step in schema.sql) drops the
// checkpoint with it, and a fresh DB correctly replays from the start.
//
// Scope: this module covers storage only. The checkpoint's *value* is
// an opaque string here — deciding what that value is (a git commit
// SHA) and wiring up the actual replay is handled separately.

import db from "./db.js";

/**
 * Get the current replay checkpoint.
 *
 * Returns null when no checkpoint has been recorded yet — on the first
 * run, or after the cache DB was deleted and rebuilt (the table is then
 * empty). Callers MUST treat null as "replay the entire JSONL log from
 * the start".
 *
 * @returns {string|null} The checkpoint value, or null if unset.
 */
export function getCheckpoint() {
  const row = db.prepare(`SELECT Value FROM checkpoint LIMIT 1`).get();
  return row ? row.Value : null;
}

/**
 * Advance the replay checkpoint to a new value.
 *
 * The `checkpoint` table holds at most one row. The write pins it to
 * rowid 1 with INSERT OR REPLACE, so it is a single atomic statement
 * that always leaves exactly one row — no separate insert-vs-update
 * branch, and no window where the table is empty.
 *
 * @param {string} value - The new checkpoint value.
 */
export function setCheckpoint(value) {
  db.prepare(`INSERT OR REPLACE INTO checkpoint (rowid, Value) VALUES (1, ?)`).run(value);
}

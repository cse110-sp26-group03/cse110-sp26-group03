// src/DB/db.js
//
// Initializes the Manta SQLite database.
//
// Responsibilities (infrastructure only — no business logic):
//   1. Open (or create) the SQLite file at .manta/manta.db
//   2. Apply baseline PRAGMAs (WAL mode, foreign keys)
//   3. Execute schema.sql so all required tables exist
//
// Consumers (issue repo, CLI, replay, etc.) import the default export
// and use bun:sqlite's API directly:
//
//     import db from "./db.js";
//     db.prepare("SELECT * FROM issues WHERE Status = ?").all("open");
//
// For tests, call openDatabase(":memory:") to get an isolated DB
// that lives only for the duration of the test.

      import {Database} from "bun:sqlite";
           import { readFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const DEFAULT_DB_PATH = ".manta/manta.db";
const SCHEMA_URL = new URL("./schema.sql", import.meta.url);

/**
 * Open a Manta SQLite database, apply PRAGMAs, and run schema.sql.
 *
 * @param {string} [path] - Filesystem path, or ":memory:" for an in-memory DB.
 *                          Defaults to ".manta/manta.db" relative to cwd.
 * @returns {Database} A ready-to-use bun:sqlite Database instance.
 */
export function openDatabase(path = DEFAULT_DB_PATH) {
  // Make sure the parent directory exists for file-based DBs.
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new Database(path, { create: true });

  // WAL gives us better concurrent read/write behavior.
  // Not applicable to in-memory databases.
  if (path !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL;");
  }
  db.exec("PRAGMA foreign_keys = ON;");

  // Apply schema. CREATE TABLE IF NOT EXISTS makes this idempotent,
  // so re-opening an existing DB is a no-op.
  db.exec(readFileSync(SCHEMA_URL, "utf8"));

  return db;
}

// Default singleton — what production code (CLI, repos) imports.
const db = openDatabase();
export default db;

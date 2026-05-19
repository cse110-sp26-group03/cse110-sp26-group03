-- src/storage/schema.sql
--
-- SQLite schema for Manta's local cache database (.manta/manta.db).
--
-- This file defines the shape of every table the storage layer reads
-- from or writes to. It's run by db.js on database open. CREATE TABLE
-- IF NOT EXISTS makes the file idempotent — re-running it on an
-- existing database is a no-op.
--
-- Note: changes to this file will NOT be applied to databases that
-- already exist (IF NOT EXISTS prevents that). To pick up schema
-- changes, delete the local .manta/manta.db file and let it be
-- recreated on the next command.
--
-- Conventions:
--   - Column names use PascalCase (Title, CreatedAt) to match how
--     SQLite outputs them in query results.
--   - Event field names in JavaScript code are camelCase (title,
--     createdAt). store.js maps between the two via a helper.
--   - CHECK constraints enforce allowed values at the database level
--     so invalid data can't be stored even if the application layer
--     has a bug.
--
-- References:

CREATE TABLE IF NOT EXISTS issues (
  ID TEXT PRIMARY KEY NOT NULL,
  Title TEXT NOT NULL,
  Description TEXT DEFAULT '',
  -- CHECK constraints enforce allowed values for Status, Priority, and IssueType
  Status TEXT DEFAULT 'open' CHECK (Status IN ('open', 'in_progress', 'closed')),
  -- Smaller number = higher priority (P0 is the most urgent).
  -- Any non-negative integer is allowed; the user picks the scale.
  -- The "p" prefix shown to users (e.g. "p5") should be added by the CLI display
  Priority INTEGER DEFAULT 5 CHECK (Priority >= 0),
  IssueType TEXT DEFAULT 'task' CHECK (IssueType IN ('bug', 'feature', 'task', 'docs', 'chore')),
  Assignee TEXT,
  CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  CreatedBy TEXT NOT NULL DEFAULT 'local-user',
  UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UpdatedBy TEXT NOT NULL DEFAULT 'local-user'
);

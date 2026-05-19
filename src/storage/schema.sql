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

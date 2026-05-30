// src/cli/event.js
//
// Manta's event construction layer.
//
// Translates parsed CLI commands into storage events that conform to
// the three event shapes defined in ADR-004: issue.created,
// issue.updated, and issue.deleted.
//
// Each builder stamps its event with a timestamp and the current OS
// user as the actor. The resulting event objects are passed directly
// to applyEvent() in store.js — no further transformation needed.

/* global process */

// ---- Actor resolution -------------------------------------------------

/**
 * Resolve the current user from OS environment variables.
 *
 * Checks $USER (Unix) then $USERNAME (Windows), falling back to
 * "local-user" when neither is set.
 *
 * @returns {string} The current user's name.
 */
function get_actor() {
  return process.env.USER || process.env.USERNAME || 'local-user';
}

// ---- Public API -------------------------------------------------------

/**
 * Build a storage event from a parsed CLI command.
 *
 * Dispatches to the appropriate builder based on the command name.
 * The returned event is ready to be passed to applyEvent().
 *
 * @param {object} data - A parse object with { cmd, flags }.
 * @param {string} data.cmd - The command name (create, update, close, delete).
 * @param {object} data.flags - Flag key-value pairs from the parser.
 * @returns {object} A fully constructed event per ADR-004.
 * @throws {Error} If cmd is not a recognized command.
 */
export function create_event(data) {
  const { cmd, flags } = data;
  switch (cmd) {
    case 'create':
      return create_issue_event(flags);
    case 'update':
      return update_issue_event(flags, false);
    case 'close':
      return update_issue_event(flags, true);
    case 'delete':
      return delete_issue_event(flags);
    default:
      throw new Error(
        `event creation error: '${cmd}' is not a recognized command`,
      );
  }
}

// ---- Event builders ---------------------------------------------------

/**
 * Build an issue.created event.
 *
 * Populates the full issue object with defaults for optional fields
 * (empty string for description, "task" for issueType, null for assignee).
 * issueId is left null — store.js generates it on insert.
 *
 * @param {object} flags - Parsed flags containing at least title, status,
 *                         and priority; optionally desc, type, and assignee.
 * @returns {object} An issue.created event.
 */
function create_issue_event(flags) {
  const timestamp = new Date().toISOString();
  const actor = get_actor();
  const event = {
    type: 'issue.created',
    timestamp: timestamp,
    actor: actor,
    issueId: null,
    issue: {
      title: flags.title,
      description: flags.desc ?? '',
      status: flags.status,
      priority: flags.priority,
      issueType: flags.type ?? 'task',
      assignee: flags.assignee ?? null,
      createdAt: timestamp,
      createdBy: actor,
      updatedAt: timestamp,
      updatedBy: actor,
    },
  };
  return event;
}

/**
 * Build an issue.updated event for both update and close commands.
 *
 * When close is true, the changes object is hardcoded to set status
 * to "closed". Otherwise, it includes only the flags the user provided,
 * so unchanged fields are omitted from the event.
 *
 * @param {object} flags - Parsed flags; must include id, plus any fields
 *                         to change (title, desc, priority, status, type, assignee).
 * @param {boolean} close - If true, forces status to "closed" and ignores
 *                          other change flags.
 * @returns {object} An issue.updated event.
 */
function update_issue_event(flags, close) {
  const timestamp = new Date().toISOString();
  const actor = get_actor();
  let changes;
  if (close) {
    changes = {
      status: 'closed',
      updatedAt: timestamp,
      updatedBy: actor,
    };
  } else {
    changes = {
      ...(flags.title !== undefined && { title: flags.title }),
      ...(flags.desc !== undefined && { description: flags.desc }),
      ...(flags.priority !== undefined && { priority: flags.priority }),
      ...(flags.status !== undefined && { status: flags.status }),
      ...(flags.type !== undefined && { issueType: flags.type }),
      ...(flags.assignee !== undefined && { assignee: flags.assignee }),
      updatedAt: timestamp,
      updatedBy: actor,
    };
  }

  const event = {
    type: 'issue.updated',
    timestamp: timestamp,
    actor: actor,
    issueId: flags.id,
    changes: changes,
  };
  return event;
}

/**
 * Build an issue.deleted event.
 *
 * Delete events carry only the issueId — no additional payload.
 *
 * @param {object} flags - Parsed flags; must include id.
 * @returns {object} An issue.deleted event.
 */
function delete_issue_event(flags) {
  const timestamp = new Date().toISOString();
  const event = {
    type: 'issue.deleted',
    timestamp: timestamp,
    actor: get_actor(),
    issueId: flags.id,
  };
  return event;
}

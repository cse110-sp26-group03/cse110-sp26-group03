/**
 * Unit tests for the handling events
 *
 * Covers the create_event function, which is the main entry point for building events from CLI commands.
 * Tests for the individual event builder functions are not directly tested
 * but they are called indirectly through create_event, so their behavior is covered by the tests for create_event.
 *
 * event.js gets parsed input from parser.js that has already been validated for required flags and types,
 * so these tests focus on the expected output shape of the events and the handling of different command types, rather than input validation.
 * Tests for the application of events to the store are covered in store.test.js and replay.test.js, so these tests do not cover the effects of the events on storage,
 * just their construction.
 *
 */
import { test, expect } from 'bun:test';
import { create_event } from '../../../src/cli/event.js';

// ---- issue.created -------------------------------------------------
//Goal: verify that create_event is able to construct an issue create event with the expected shape and fields, based on the input command and flags.
/** An invalid command should throw an error */
test('create_event throws on unrecognized command', () => {
  expect(() => create_event({ cmd: 'notacommand', flags: {} })).toThrow(
    /event creation error: 'notacommand' is not a recognized command/,
  );
});

/** A create command only requires a title, and the rest of the fields should contain default values */
test('create_event requires only title flag for create command', () => {
  const event = create_event({
    cmd: 'create',
    flags: {
      title: 'Only Title',
    },
  });
  expect(event).toMatchObject({
    type: 'issue.created',
    issueId: null,
    issue: {
      title: 'Only Title',
      description: '',
      status: undefined,
      priority: undefined,
      issueType: 'task',
      assignee: null,
    },
  });
});

/** A valid create command should return an event with the expected shape */
test('create_event returns a valid event for create command', () => {
  const event = create_event({
    cmd: 'create',
    flags: {
      title: 'Test Issue',
      status: 'open',
      priority: 'high',
    },
  });
  expect(event).toMatchObject({
    type: 'issue.created',
    issueId: null,
    issue: {
      title: 'Test Issue',
      status: 'open',
      priority: 'high',
    },
  });
});

/** A create event should have a timestamp and actor */
test('create_event includes timestamp and actor', () => {
  const event = create_event({
    cmd: 'create',
    flags: {
      title: 'Test Issue',
      status: 'open',
      priority: 'high',
    },
  });
  expect(event).toHaveProperty('timestamp');
  expect(event).toHaveProperty('actor');
});

/** create_event should include default fields when optional flags are omitted */
test('create_event fills in default fields for optional flags', () => {
  const event = create_event({
    cmd: 'create',
    flags: {
      title: 'Minimal Issue',
      status: 'open',
      priority: 'low',
    },
  });
  expect(event.issue).toMatchObject({
    description: '',
    issueType: 'task',
    assignee: null,
  });
  expect(event.issue).toHaveProperty('createdAt');
  expect(event.issue).toHaveProperty('createdBy');
  expect(event.issue).toHaveProperty('updatedAt');
  expect(event.issue).toHaveProperty('updatedBy');
});

test('create_event correctly handles all fields for create command', () => {
  const event = create_event({
    cmd: 'create',
    flags: {
      title: 'Full Issue',
      desc: 'This issue has all fields filled out.',
      status: 'open',
      priority: 'medium',
      type: 'bug',
      assignee: 'Ori',
    },
  });
  expect(event).toMatchObject({
    type: 'issue.created',
    issueId: null,
    issue: {
      title: 'Full Issue',
      description: 'This issue has all fields filled out.',
      status: 'open',
      priority: 'medium',
      issueType: 'bug',
      assignee: 'Ori',
    },
  });
});

// ---- issue.updated -------------------------------------------------
//Goal: verify that create_event can construct an issue update event with the expected shape and fields, based on the input command and flags.

/** update event should contain only the flags that were provided */
test('create_event update only includes provided flags in changes', () => {
  const event = create_event({
    cmd: 'update',
    flags: {
      id: 'some-issue-id',
      title: 'Updated Test Issue',
      status: 'closed',
    },
  });
  expect(event).toMatchObject({
    type: 'issue.updated',
    issueId: 'some-issue-id',
    changes: {
      title: 'Updated Test Issue',
      status: 'closed',
    },
  });
  expect(event.changes).not.toHaveProperty('priority');
  expect(event.changes).not.toHaveProperty('description');
  expect(event.changes).toHaveProperty('updatedAt');
  expect(event.changes).toHaveProperty('updatedBy');
});

/**update command should be able to correctly update issue fields */
test('create_event update command correctly updates issue fields', () => {
  const event = create_event({
    cmd: 'update',
    flags: {
      id: 'some-issue-id',
      title: 'Updated Test Issue',
      desc: 'This is an updated description.',
      status: 'in_progress',
      priority: 'p9',
      type: 'bug',
      assignee: 'Nathan',
    },
  });
  expect(event).toMatchObject({
    type: 'issue.updated',
    issueId: 'some-issue-id',
    changes: {
      title: 'Updated Test Issue',
      description: 'This is an updated description.',
      status: 'in_progress',
      priority: 'p9',
      issueType: 'bug',
      assignee: 'Nathan',
    },
  });
});

// ---- issue.deleted -------------------------------------------------
//Goal: verify that create_event can construct an issue delete event

/** delete command should return an issue.deleted event with the correct issueId */
test('create_event delete command returns issue.deleted event', () => {
  const event = create_event({
    cmd: 'delete',
    flags: { id: 'some-issue-id' },
  });
  expect(event).toMatchObject({
    type: 'issue.deleted',
    issueId: 'some-issue-id',
  });
  expect(event).toHaveProperty('timestamp');
  expect(event).toHaveProperty('actor');
});

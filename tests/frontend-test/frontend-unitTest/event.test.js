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
  expect(() => create_event({ cmd: 'notacommand', flags: {} })).toThrow(/event creation error: 'notacommand' is not a recognized command/);
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

// ---- issue.updated -------------------------------------------------
//Goal: verify that create_event can construct an issue update event with the expected shape and fields, based on the input command and flags, and that it correctly handles both the update and close commands for updates.

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

// ---- issue.deleted -------------------------------------------------
//Goal: verify that create_event can construct an issue delete event with the expected shape and fields, based on the input command and flags.
/** close command should force status to closed and ignore other flags */
test('create_event close command forces status to closed', () => {
  const event = create_event({
    cmd: 'close',
    flags: {
      id: 'some-issue-id',
      title: 'Should be ignored',
      priority: 'low',
    },
  });
  expect(event).toMatchObject({
    type: 'issue.updated',
    issueId: 'some-issue-id',
    changes: { status: 'closed' },
  });
  expect(event.changes).not.toHaveProperty('title');
  expect(event.changes).not.toHaveProperty('priority');
  expect(event.changes).toHaveProperty('updatedAt');
  expect(event.changes).toHaveProperty('updatedBy');
});

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
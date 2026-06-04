/**
 * Unit tests for the storage file
 *
 * Covers the error paths of an unrecognized event type, and update/delete events that target an issue ID
 * that does not exist. These tests deliberately use a sentinel issue ID that
 * will not collide with the local `.manta` SQLite cache, so they can run
 * without seeding or tearing down the database.
 *
 * Tests for a successful create/update/delete that mutates JSONL and
 * SQLite are not covered here but is tracked seperately
 *
 */

import { test, expect } from 'bun:test';
import { applyEvent } from '../src/storage/store.js';

/**
 * applyEvent should reject any event whose type is not one of the
 * known event types
 */

/** Once merged, will update with main so current methods reflect known event types
test('applyEvent throws on unrecognized event type', () => {
  expect(() => applyEvent({ type: 'not.a.real.type' })).toThrow(
    /unrecognized event type/,
  );
});
*/

/**
 * An event with no type field at all falls through to the default branch
 * and is treated as unrecognized.
 */
test('applyEvent throws when event has no type', () => {
  expect(() => applyEvent({})).toThrow(/unrecognized event type/);
});

/**
 * The thrown error message should echo the offending type back to the caller
 * so it shows up in logs and surfaced error text.
 */
test('applyEvent error message includes the offending type', () => {
  expect(() => applyEvent({ type: 'bogus.type' })).toThrow(/bogus\.type/);
});

/**
 * applyEvent uses the structured store error format,
 * so the thrown error should have a reason and issueId field
 */
test('applyEvent throws a real Error (not a plain throw)', () => {
  try {
    applyEvent({ type: 'bogus.type' });
    throw new Error('expected applyEvent to throw');
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
    expect(err.reason).toMatch(/unrecognized event type/);
    expect(err.issueId).toBeNull();
  }
});

// ---- issue.updated -------------------------------------------------

/**
 * Sentinel issue ID used by the update/delete tests. Chosen so it will not
 * collide with any real row in the local `.manta` SQLite cache
 *
 * @type {string}
 */
const MISSING_ID = 'manta-test-missing-xyz';

/**
 * Updating an issue with an ID that doesn't exist should fail before any write
 */
test('issue.updated throws when the issue does not exist', () => {
  expect(() =>
    applyEvent({
      type: 'issue.updated',
      issueId: MISSING_ID,
      changes: { title: 'New title' },
    }),
  ).toThrow(/no issue with that ID exists/);
});

/**
 * The structured error from a failed update should carry the target issue ID
 * in both the message and the `.issueId` field, plus the matching `.reason`.
 */
test('issue.updated error includes the issueId', () => {
  try {
    applyEvent({
      type: 'issue.updated',
      issueId: MISSING_ID,
      changes: { title: 'New title' },
    });
    throw new Error('expected applyEvent to throw');
  } catch (err) {
    expect(err.message).toContain(MISSING_ID);
    expect(err.issueId).toBe(MISSING_ID);
    expect(err.reason).toMatch(/no issue with that ID exists/);
  }
});

// ---- issue.deleted -------------------------------------------------

/**
 * Deleting an issue that doesn't have an ID should fail before any write
 */
test('issue.deleted throws when the issue does not exist', () => {
  expect(() =>
    applyEvent({ type: 'issue.deleted', issueId: MISSING_ID }),
  ).toThrow(/no issue with that ID exists/);
});

/**
 * The structured error from a failed delete should carry the target issue ID
 * in both the message and the `.issueId` field, plus the matching `.reason`.
 */
test('issue.deleted error includes the issueId', () => {
  try {
    applyEvent({ type: 'issue.deleted', issueId: MISSING_ID });
    throw new Error('expected applyEvent to throw');
  } catch (err) {
    expect(err.message).toContain(MISSING_ID);
    expect(err.issueId).toBe(MISSING_ID);
    expect(err.reason).toMatch(/no issue with that ID exists/);
  }
});

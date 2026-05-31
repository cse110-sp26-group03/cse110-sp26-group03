import { test, expect } from 'bun:test';
import { applyEvent } from '../src/storage/store.js';

test('applyEvent throws on unrecognized event type', () => {
  expect(() => applyEvent({ type: 'not.a.real.type' })).toThrow(
    /unrecognized event type/,
  );
});

test('applyEvent throws when event has no type', () => {
  expect(() => applyEvent({})).toThrow(/unrecognized event type/);
});

test('applyEvent error message includes the offending type', () => {
  expect(() => applyEvent({ type: 'bogus.type' })).toThrow(/bogus\.type/);
});

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

// Use IDs that won't collide with anything in the local .manta DB.
const MISSING_ID = 'manta-test-missing-xyz';

test('issue.updated throws when the issue does not exist', () => {
  expect(() =>
    applyEvent({
      type: 'issue.updated',
      issueId: MISSING_ID,
      changes: { title: 'New title' },
    }),
  ).toThrow(/no issue with that ID exists/);
});

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

test('issue.deleted throws when the issue does not exist', () => {
  expect(() =>
    applyEvent({ type: 'issue.deleted', issueId: MISSING_ID }),
  ).toThrow(/no issue with that ID exists/);
});

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

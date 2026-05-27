import { test, expect } from 'bun:test';
import { applyEvent } from '../src/storage/store.js';

test('applyEvent throws on unrecognized event type', () => {
  expect(() => applyEvent({ type: 'not.a.real.type' })).toThrow(
    /unrecognized event type/,
  );
});

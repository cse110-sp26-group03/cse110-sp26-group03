/**
 * Unit tests for the CLI display (`src/cli/display.js`).
 *
 * DISPLAY() is the only exported function.
 * It is responsible for rendering the output of FETCH() to the console.
 *
 * The main things to test is that DISPLAY() correctly formats the output of FETCH()
 * and that it handles edge cases (e.g. empty results, errors) gracefully.
 */
import { test, expect } from 'bun:test';
import { DISPLAY } from '../../../src/cli/display.js';

/**
 * Build a parse object with the given command and flags. Lets individual
 * tests pass just the pieces they care about instead of the full shape.
 *
 * @param {string} cmd - The command name (create, update, close, delete).
 * @param {object} [flags] - Flag values to merge in.
 * @returns {{cmd: string, flags: object}} A parse object ready for create_event().
 */
function makeParse(cmd, flags = {}) {
  return { cmd, flags };
}

// Should log a friendly message when FETCH returns an empty array.
test('DISPLAY prints "No issues found." for empty results', async () => {
  const parse = makeParse('view');
  const logs = [];
  const origLog = console.log;
  try {
    console.log = (...a) => logs.push(a.join(' '));
    await DISPLAY(parse, []);
    expect(logs.length).toBe(1);
    expect(logs[0]).toBe('No issues found.');
  } finally {
    console.log = origLog;
  }
});

// Non-TTY list view: output should include table headers and exit prompt.
test('DISPLAY list view (non-TTY) prints header and footer', async () => {
  const parse = makeParse('view');
  const origIsTTY = process.stdout.isTTY;
  const origCols = process.stdout.columns;
  const logs = [];
  const origLog = console.log;
  try {
    process.stdout.isTTY = false;
    process.stdout.columns = 100;
    console.log = (...a) => logs.push(a.join(' '));

    const issues = [
      {
        ID: 'manta-abc1',
        Title: 'First issue',
        Status: 'open',
        Priority: 'p1',
        IssueType: 'bug',
        Assignee: 'Scottin',
        CreatedBy: 'Ori',
      },
      {
        ID: 'manta-abc2',
        Title: 'Second issue',
        Status: 'closed',
        Priority: 'p2',
        IssueType: 'task',
        Assignee: 'Nathan',
        CreatedBy: 'Ori',
      },
    ];

    await DISPLAY(parse, issues);

    expect(logs.length).toBe(1);
    const out = logs[0];
    expect(out).toContain('abc1');
    expect(out).toContain('abc2');
    expect(out).toContain('Press ESC to exit');
  } finally {
    console.log = origLog;
    process.stdout.isTTY = origIsTTY;
    process.stdout.columns = origCols;
  }
});

// Non-TTY detail view: output should include priority, assignee, dates, and exit prompt.
//The main difference maker here though is that detail view also includes the description.
test('DISPLAY detail view (non-TTY) prints issue details and dates', async () => {
  const parse = makeParse('view');
  const origIsTTY = process.stdout.isTTY;
  const origCols = process.stdout.columns;
  const logs = [];
  const origLog = console.log;
  try {
    process.stdout.isTTY = false;
    process.stdout.columns = 80;
    console.log = (...a) => logs.push(a.join(' '));

    const issue = {
      ID: 'manta-xyz',
      Title: 'A short title',
      Description: 'Detail view shows more info',
      Priority: 'p1',
      Status: 'open',
      IssueType: 'task',
      Assignee: 'Nathan',
      CreatedBy: 'ori',
      CreatedAt: '2026-06-07T12:00:00Z',
      UpdatedBy: null,
      UpdatedAt: '',
    };

    await DISPLAY(parse, issue);

    expect(logs.length).toBe(1);
    const out = logs[0];
    expect(out).toContain('Press ESC to exit');
    expect(out).toContain('manta-xyz');
    expect(out).toContain('Priority: p1');
    expect(out).toContain('Assignee: Nathan');
    expect(out).toContain('Created by:');
    expect(out).toContain('Updated by:');
    expect(out).toContain('Detail view shows more info');
    expect(out).not.toContain('manta-tuv');
  } finally {
    console.log = origLog;
    process.stdout.isTTY = origIsTTY;
    process.stdout.columns = origCols;
  }
});

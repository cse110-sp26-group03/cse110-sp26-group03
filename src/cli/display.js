// src/cli/display.js
//
// Manta's terminal display layer for the view command (ADR-009).
//
// Takes the output of FETCH() and renders it to the terminal in one
// of two modes:
//   List:   FETCH returned an array  -> paginated table, PAGE_SIZE issues per page.
//   Detail: FETCH returned an object -> full view of a single issue.
//
// Both modes use the alternate screen buffer when running in a TTY,
// so the user's scrollback is preserved. Press ESC to exit.

import * as readline from 'readline';

const PAGE_SIZE = 5;

const ALT_SCREEN_ON = '\x1b[?1049h';
const ALT_SCREEN_OFF = '\x1b[?1049l';
const CLEAR_SCREEN = '\x1b[2J\x1b[H';

// Largest width the detail view will ever use; it shrinks to fit narrow
// terminals but never grows past this so lines stay readable on wide ones.
const MAX_WIDTH = 132;

// Two spaces between every column in the list table.
const GAP = '  ';

// List columns in display order.
//   min      - the column's floor width; below this it's dropped entirely
//   required - never dropped, even on very narrow terminals
//   flex     - soaks up any leftover horizontal space (the title)
//   drop     - drop order when space is tight (lower number dropped first)
const COLUMNS = [
  { key: 'ID', label: 'ID', min: 6, required: true },
  { key: 'Title', label: 'TITLE', min: 16, required: true, flex: true },
  { key: 'Status', label: 'STATUS', min: 8, drop: 5 },
  { key: 'Priority', label: 'PRIORITY', min: 8, drop: 4 },
  { key: 'IssueType', label: 'TYPE', min: 6, drop: 3 },
  { key: 'Assignee', label: 'ASSIGNEE', min: 10, drop: 2 },
  { key: 'CreatedBy', label: 'CREATED BY', min: 10, drop: 1 },
];

/**
 * Current terminal width in columns, with a sane fallback when stdout
 * isn't a TTY (e.g. piped output).
 *
 * @returns {number}
 */
function term_width() {
  const c = process.stdout.columns;
  return typeof c === 'number' && c > 0 ? c : 80;
}

/**
 * Pick which list columns are visible and how wide each is, given the
 * current terminal width. Drops low-value columns when narrow and gives
 * any leftover space to the flexible title column.
 *
 * @param {number} width - Available terminal width in columns.
 * @returns {{cols: object[], widths: Map<string, number>, total: number}}
 */
function compute_layout(width) {
  let cols = COLUMNS.slice();
  /**
   * Total width the currently-kept columns need at their minimum widths,
   * including the inter-column gaps.
   *
   * @returns {number} The minimum span in terminal columns.
   */
  const span = () =>
    cols.reduce((s, c) => s + c.min, 0) + (cols.length - 1) * GAP.length;

  // Drop optional columns (lowest `drop` first) until the minimum fits.
  while (span() > width && cols.some((c) => !c.required)) {
    const victim = cols
      .filter((c) => !c.required)
      .sort((a, b) => a.drop - b.drop)[0];
    cols = cols.filter((c) => c !== victim);
  }

  const widths = new Map(cols.map((c) => [c.key, c.min]));
  const flex = cols.find((c) => c.flex);
  const leftover = width - span();
  if (flex && leftover > 0) {
    // Grow the title to fill, but cap so we never exceed MAX_WIDTH overall.
    const room = MAX_WIDTH - span();
    widths.set(flex.key, flex.min + Math.max(0, Math.min(leftover, room)));
  } else if (flex && leftover < 0) {
    // Even the minimums don't fit; squeeze the title as a last resort.
    widths.set(flex.key, Math.max(8, flex.min + leftover));
  }

  const total =
    cols.reduce((s, c) => s + widths.get(c.key), 0) +
    (cols.length - 1) * GAP.length;
  return { cols, widths, total };
}

// ---- Public API -------------------------------------------------------

/**
 * Main display function. Dispatches to list or detail view based on
 * the result returned by FETCH().
 *
 * @param {object}          parse_obj - The parsed command object from parser.js.
 * @param {object|Array.<object>} result - Output from FETCH(). Array = list, object = single issue.
 * @throws {Error} If parse_obj.cmd is not a supported display command.
 */
export async function DISPLAY(parse_obj, result) {
  switch (parse_obj.cmd) {
    case 'view':
      if (Array.isArray(result)) {
        await display_list(result);
      } else {
        await display_issue(result);
      }
      break;
    default:
      throw new Error(
        `display error: '${parse_obj.cmd}' is not a supported display command`,
      );
  }
}

// ---- Alternate screen driver ------------------------------------------

/**
 * Run an interactive view in the alternate screen buffer.
 *
 * Clears and redraws on terminal resize. When stdin is not a TTY
 * (e.g. piped output), falls back to a single non-interactive print.
 *
 * @param {Function} buildLines - Returns an array of strings to print.
 * @param {Function} [onKey] - Optional key handler; return true to trigger a redraw.
 */
async function run_alt_screen(buildLines, onKey) {
  if (!process.stdout.isTTY) {
    console.log(buildLines().join('\n'));
    return;
  }

  process.stdout.write(ALT_SCREEN_ON);
  let last_columns = process.stdout.columns;

  /**
   * Clear the alternate screen and repaint the current frame, recording
   * the width it was drawn at so resize handling can detect real changes.
   *
   * @returns {void}
   */
  function redraw() {
    process.stdout.write(CLEAR_SCREEN + buildLines().join('\n') + '\n');
    last_columns = process.stdout.columns;
  }

  redraw();

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  let resize_timer;
  /**
   * Debounced terminal-resize handler. Ignores no-op resize events and
   * coalesces rapid ones into a single redraw 100ms after the last change.
   *
   * @returns {void}
   */
  const on_resize = () => {
    const cols = process.stdout.columns;
    if (typeof cols !== 'number' || cols === last_columns) return;
    clearTimeout(resize_timer);
    resize_timer = setTimeout(redraw, 100);
  };

  process.stdout.on('resize', on_resize);

  /**
   * Tear down the alternate-screen session: cancel any pending redraw,
   * detach the resize listener, and restore the user's normal screen buffer.
   *
   * @returns {void}
   */
  const cleanup = () => {
    clearTimeout(resize_timer);
    process.stdout.off('resize', on_resize);
    process.stdout.write(ALT_SCREEN_OFF);
  };

  await new Promise(() => {
    process.stdin.on('keypress', (str, key) => {
      if (!key) return;

      if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
        cleanup();
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write('\n');
        process.exit(0);
      }

      if (onKey?.(key)) {
        redraw();
      }
    });
  });
}

// ---- List display -----------------------------------------------------

/**
 * Render a paginated table of issues.
 *
 * Uses left/right arrow keys to navigate pages. Press ESC to exit.
 *
 * @param {Array.<object>} issues - Array of issue objects from FETCH().
 */
async function display_list(issues) {
  if (!issues || issues.length === 0) {
    console.log('No issues found.');
    return;
  }

  const total_pages = Math.ceil(issues.length / PAGE_SIZE);
  let page = 0;

  await run_alt_screen(
    () => build_list_page_lines(issues, page, total_pages),
    (key) => {
      if (key.name === 'right' && page < total_pages - 1) {
        page++;
        return true;
      }
      if (key.name === 'left' && page > 0) {
        page--;
        return true;
      }
      return false;
    },
  );
}

/**
 * Build the lines for a single page of the issue list table.
 *
 * @param {Array.<object>} issues - All issues to paginate.
 * @param {number} page - Current page index (0-based).
 * @param {number} total_pages - Total number of pages.
 * @returns {Array.<string>} Lines ready to print.
 */
function build_list_page_lines(issues, page, total_pages) {
  const layout = compute_layout(term_width());
  const lines = [];

  lines.push(...header_lines(layout));

  const start = page * PAGE_SIZE;
  const slice = issues.slice(start, start + PAGE_SIZE);
  for (const issue of slice) {
    lines.push(row_line(issue, layout));
  }

  for (let i = slice.length; i < PAGE_SIZE; i++) {
    lines.push('');
  }

  lines.push('');
  lines.push(...pagination_lines(page, total_pages, layout));
  lines.push('');
  lines.push('Press ESC to exit');

  return lines;
}

/**
 * Build the table header row and separator line for the given layout.
 *
 * @param {{cols: object[], widths: Map<string, number>, total: number}} layout
 * @returns {string[]} The header and separator lines.
 */
function header_lines(layout) {
  const header = layout.cols
    .map((c) => col(c.label, layout.widths.get(c.key)))
    .join(GAP);
  return [header, '-'.repeat(layout.total)];
}

/**
 * Build a single issue row for the list table.
 *
 * @param {object} issue - Issue object from FETCH().
 * @param {{cols: object[], widths: Map<string, number>, total: number}} layout
 * @returns {string} The formatted row.
 */
function row_line(issue, layout) {
  return layout.cols
    .map((c) => {
      const value = c.key === 'ID' ? short_id(issue.ID) : issue[c.key];
      return col(value, layout.widths.get(c.key));
    })
    .join(GAP);
}

/**
 * Build the centered pagination bar with prev/next and page label.
 *
 * @param {number} page - Current page index (0-based).
 * @param {number} total_pages - Total number of pages.
 * @param {{total: number}} layout - The active table layout.
 * @returns {string[]} The nav and page-label lines.
 */
function pagination_lines(page, total_pages, layout) {
  const nav = '< prev.    next >';
  const page_label = `Page ${page + 1} of ${total_pages}`;
  const nav_padding = Math.max(0, Math.floor((layout.total - nav.length) / 2));
  const label_padding = Math.max(
    0,
    Math.floor((layout.total - page_label.length) / 2),
  );
  return [
    ' '.repeat(nav_padding) + nav,
    ' '.repeat(label_padding) + page_label,
  ];
}

// ---- Individual issue display -----------------------------------------

/**
 * Render the detailed view of a single issue.
 *
 * Called when mt view is run with a specific issue ID.
 *
 * @param {object} issue - Single issue object from FETCH().
 */
async function display_issue(issue) {
  await run_alt_screen(() => {
    const lines = build_issue_detail_lines(issue);
    lines.push('');
    lines.push('Press ESC to exit');
    return lines;
  });
}

/**
 * Build all lines for the detailed single-issue view.
 *
 * Layout: title + ID header, separator, description, separator,
 * two-column metadata (priority/status, assignee/type), dotted
 * separator, and created/updated timestamps.
 *
 * @param {object} issue - The issue object from FETCH().
 * @returns {Array.<string>} Lines ready to print.
 */
function build_issue_detail_lines(issue) {
  const lines = [];
  // Shrink to fit the terminal, but cap so it stays readable when wide.
  const width = Math.min(MAX_WIDTH, term_width());
  const half = Math.floor(width / 2);

  const title = (issue.Title ?? '-').toString();
  const id = (issue.ID ?? '-').toString();

  if (title.length + id.length + 1 <= width) {
    lines.push(title.padEnd(width - id.length) + id);
  } else {
    lines.push(...wrap_text(title, width));
    lines.push(id.padStart(width));
  }

  lines.push('-'.repeat(width));

  const desc = (issue.Description ?? '').toString();
  if (desc.trim().length === 0) {
    lines.push('<no description>');
  } else {
    for (const line of desc.split(/\r?\n/)) {
      lines.push(...wrap_text(line, width));
    }
  }

  lines.push('');
  lines.push('-'.repeat(width));

  const priority =
    issue.Priority == null || issue.Priority === ''
      ? '-'
      : String(issue.Priority).startsWith('p')
        ? String(issue.Priority)
        : `p${issue.Priority}`;

  lines.push(
    col(`Priority: ${priority}`, half) +
      col(`Status: ${val(issue.Status)}`, half),
  );
  lines.push(
    col(`Assignee: ${val(issue.Assignee)}`, half) +
      col(`Type: ${val(issue.IssueType)}`, half),
  );

  lines.push(dotted_line(width));

  lines.push(
    col(
      `Created by: ${val(issue.CreatedBy)} @ ${fmt_date(issue.CreatedAt)}`,
      width,
    ),
  );
  lines.push(
    col(
      `Updated by: ${val(issue.UpdatedBy)} @ ${fmt_date(issue.UpdatedAt)}`,
      width,
    ),
  );

  return lines;
}

// ---- Helpers ----------------------------------------------------------

/**
 * Strip the "manta-" prefix from an issue ID for compact display.
 *
 * @param {string} id - Full issue ID (e.g. "manta-h3kp").
 * @returns {string} Short ID (e.g. "h3kp").
 */
function short_id(id) {
  return id.replace('manta-', '');
}

/**
 * Coerce a field value for display, falling back to "-" when missing.
 *
 * @param {*} v - The raw field value.
 * @returns {string} The value as a string, or "-" if null/empty.
 */
function val(v) {
  return v == null || v === '' ? '-' : v.toString();
}

/**
 * Format an ISO timestamp into a compact, readable form
 * (YYYY-MM-DD HH:MM ZONE) in the machine's local timezone.
 *
 * Falls back to "-" when missing, or to the raw value if it
 * can't be parsed as a date.
 *
 * @param {*} v - The raw timestamp value (typically an ISO 8601 string).
 * @returns {string} The formatted date, or a sensible fallback.
 */
function fmt_date(v) {
  if (v == null || v === '') return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v.toString();
  /**
   * Zero-pad a number to at least two digits (e.g. 5 -> "05").
   *
   * @param {number} n - The number to pad.
   * @returns {string} The two-digit (or longer) string.
   */
  const pad = (n) => String(n).padStart(2, '0');
  const date =
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${date} ${tz_abbrev(d)}`;
}

/**
 * Get the short local timezone abbreviation (e.g. "PDT") for a date.
 *
 * @param {Date} d - The date to read the timezone from.
 * @returns {string} The zone abbreviation, or "" if unavailable.
 */
function tz_abbrev(d) {
  const part = new Intl.DateTimeFormat(undefined, {
    timeZoneName: 'short',
  })
    .formatToParts(d)
    .find((p) => p.type === 'timeZoneName');
  return part?.value ?? '';
}

/**
 * Pad or truncate a string to a fixed column width.
 *
 * @param {string} str - The string to format.
 * @param {number} width - The desired column width.
 * @returns {string} The padded or truncated string.
 */
function col(str, width) {
  const s = (str ?? '-').toString();
  if (s.length > width) return s.slice(0, width - 1) + '…';
  return s.padEnd(width);
}

/**
 * Word-wrap a single line of text to the given width. Words longer than the
 * width are hard-broken so nothing overflows the terminal.
 *
 * @param {string} text  - The text to wrap (no embedded newlines).
 * @param {number} width - Maximum line width.
 * @returns {string[]} The wrapped lines (at least one, possibly empty string).
 */
function wrap_text(text, width) {
  if (text.length <= width) return [text];

  const lines = [];
  let current = '';
  for (const word of text.split(' ')) {
    let w = word;
    // Hard-break a word that can't fit on a line by itself.
    while (w.length > width) {
      if (current) {
        lines.push(current);
        current = '';
      }
      lines.push(w.slice(0, width));
      w = w.slice(width);
    }
    if (current === '') {
      current = w;
    } else if (current.length + 1 + w.length <= width) {
      current += ' ' + w;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

/**
 * Build a dotted separator line of the given width.
 *
 * @param {number} width - Total line width.
 * @returns {string} The dotted line.
 */
function dotted_line(width) {
  let line = '';
  while (line.length < width) {
    line += '- ';
  }
  return line.slice(0, width);
}
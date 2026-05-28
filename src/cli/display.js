/* global process */

import * as readline from "readline";

// Display layer for the mt view command.
// Takes the output of FETCH() and renders it to the terminal.
//
// Two display modes:
//      List behavior -> DISPLAY(parse_obj, issues) — paginated table, 5 issues at a time
//      View behavior -> DISPLAY(parse_obj, issue)  — detailed view of a single issue
//
// Dispatches on whether FETCH returned an array (list) or a single object (view).

const PAGE_SIZE = 5;

// column widths for list display
const COL = {
    id:        8,
    title:     50,
    priority:  10,
    status:    14,
    type:      10,
    createdBy: 14,
};

const TABLE_WIDTH =
    COL.id + COL.title + COL.priority + COL.status + COL.type + COL.createdBy + 10;

/**
 * Main display function. Dispatches to list or individual issue display
 * based on the result returned by FETCH().
 *
 * @param {object}          parse_obj - The parsed command object from parser.js.
 * @param {object|object[]} result    - Output from FETCH(). Array = list, object = single issue.
 */
export async function DISPLAY(parse_obj, result) {
    switch (parse_obj.cmd) {
        case "view":
            if (Array.isArray(result)) {
                await display_list(result);
            } else {
                display_issue(result);
            }
            break;
        default:
            throw new Error(`display error: '${parse_obj.cmd}' is not a supported display command`);
    }
}

// ---- List display --------------------------------------------------

/**
 * Render a paginated table of issues.
 * Uses left/right arrow keys to navigate pages. Press ESC to exit.
 *
 * @param {object[]} issues - Array of issue objects from FETCH().
 */
async function display_list(issues) {
    if (!issues || issues.length === 0) {
        console.log("No issues found.");
        return;
    }

    const total_pages = Math.ceil(issues.length / PAGE_SIZE);
    let page = 0;

    // first render appends after existing terminal output (no clear)
    render_page(issues, page, total_pages, true);

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    await new Promise((resolve) => {
        process.stdin.on("keypress", (str, key) => {
            if (!key) return;

            // ESC or ctrl+c to exit — leave the render in history, drop to a new line
            if (key.name === "escape" || (key.ctrl && key.name === "c")) {
                if (process.stdin.isTTY) process.stdin.setRawMode(false);
                process.stdin.pause();
                console.log("");
                process.exit(0);
            }

            // right arrow
            if (key.name === "right" && page < total_pages - 1) {
                page++;
                render_page(issues, page, total_pages, false);
            }

            //left arrow
            if (key.name === "left" && page > 0) {
                page--;
                render_page(issues, page, total_pages, false);
            }
        });
    });
}

/**
 * Render the current page of the issue list.
 *
 * On the first render the output is appended after existing terminal output.
 * On subsequent renders the previous page is overwritten in place by moving
 * the cursor up over it and clearing downward — this keeps scrollback intact
 * (unlike console.clear) so the table survives after exit.
 *
 * @param {object[]} issues      - Full array of issues from FETCH().
 * @param {number}   page        - Current page index.
 * @param {number}   total_pages - Total number of pages.
 * @param {boolean}  is_first    - True for the initial render (no overwrite).
 */
function render_page(issues, page, total_pages, is_first) {
    const lines = [];

    // top margin so the table isn't flush against the invoking command
    lines.push("");
    lines.push("");

    lines.push(...header_lines());

    const start = page * PAGE_SIZE;
    const slice = issues.slice(start, start + PAGE_SIZE);
    for (const issue of slice) {
        lines.push(row_line(issue));
    }

    // pad empty rows so layout stays stable across pages
    for (let i = slice.length; i < PAGE_SIZE; i++) {
        lines.push("");
    }

    lines.push("");
    lines.push(...pagination_lines(page, total_pages));
    lines.push("");
    lines.push("Press ESC to exit");

    // overwrite the previous render in place (skip on the first render)
    if (!is_first) {
        readline.moveCursor(process.stdout, 0, -lines.length);
        readline.clearScreenDown(process.stdout);
    }

    console.log(lines.join("\n"));
}

/**
 * Build the table header row and separator line.
 *
 * @returns {string[]} The header and separator lines.
 */
function header_lines() {
    const header =
        col("ID",       COL.id)       + "  " +
        col("TITLE",    COL.title)    + "  " +
        col("PRIORITY", COL.priority) + "  " +
        col("STATUS",   COL.status)   + "  " +
        col("TYPE",     COL.type)     + "  " +
        col("CREATED BY", COL.createdBy);
    return [header, "-".repeat(TABLE_WIDTH)];
}

/**
 * Build a single issue row for the list table.
 *
 * @param {object} issue - Issue object from FETCH().
 * @returns {string} The formatted row.
 */
function row_line(issue) {
    return (
        col(short_id(issue.ID), COL.id)       + "  " +
        col(issue.Title,        COL.title)    + "  " +
        col(issue.Priority,     COL.priority) + "  " +
        col(issue.Status,       COL.status)   + "  " +
        col(issue.IssueType,    COL.type)     + "  " +
        col(issue.CreatedBy,    COL.createdBy)
    );
}

/**
 * Build the pagination bar with prev/next buttons in the center.
 *
 * @param {number} page        - Current page index (0-based).
 * @param {number} total_pages - Total number of pages.
 * @returns {string[]} The nav and page-label lines.
 */
function pagination_lines(page, total_pages) {
    const nav = "< prev.    next >";
    const page_label = `Page ${page + 1} of ${total_pages}`;
    const nav_padding = Math.floor((TABLE_WIDTH - nav.length) / 2);
    const label_padding = Math.floor((TABLE_WIDTH - page_label.length) / 2);
    return [
        " ".repeat(nav_padding) + nav,
        " ".repeat(label_padding) + page_label,
    ];
}

// ---- Individual issue display --------------------------------------

/**
 * Render the detailed view of a single issue.
 * Called when mt view <id> is run with a specific issue ID.
 *
 * TODO: implement individual issue display.
 *
 * @param {object} issue - Single issue object from FETCH().
 */
function display_issue(issue) {
    // TODO: implement in issue #122
}

// ---- Helpers -------------------------------------------------------

/**
 * Strip the "manta-" prefix from an issue ID for display.
 *
 * @param {string} id - Full issue ID (e.g. "manta-h3kp").
 * @returns {string} Short ID (e.g. "h3kp").
 */
function short_id(id) {
    return id.replace("manta-", "");
}

/**
 * Pad or truncate a string to a fixed column width.
 *
 * @param {string} str   - The string to format.
 * @param {number} width - The desired column width.
 * @returns {string} The padded or truncated string.
 */
function col(str, width) {
    const s = (str ?? "-").toString();
    if (s.length > width) return s.slice(0, width - 1) + "…";
    return s.padEnd(width);
}

// ---- Input/Output --------------------------------------------------

// DISPLAY list input (array from FETCH):
// [
//   {
//     ID: "manta-9fz0",
//     Title: "My issue",
//     Status: "open",
//     Priority: "p5",
//     IssueType: "task",
//     ...
//   },
//   ...
// ]
//
// DISPLAY list output (terminal):
//
// ID        TITLE                           PRIORITY    STATUS          TYPE        CREATED BY
// -----------------------------------------------------------------------------------------------
// 9fz0      My issue                        p5          open            task        ikey
// ht8j      Issue                           p5          open            task        ikey
// ...       ...                             ...         ...             ...         ...
//
//                           < prev.    next >
//                              Page 1 of 3
//
// Press ESC to exit
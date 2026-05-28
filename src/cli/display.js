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

    render_page(issues, page, total_pages);

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    await new Promise((resolve) => {
        process.stdin.on("keypress", (str, key) => {
            if (!key) return;

            // ESC or ctrl+c to exit
            if (key.name === "escape" || (key.ctrl && key.name === "c")) {
                if (process.stdin.isTTY) process.stdin.setRawMode(false);
                process.stdin.pause();
                console.clear();
                process.exit(0);
            }

            // right arrow
            if (key.name === "right" && page < total_pages - 1) {
                page++;
                render_page(issues, page, total_pages);
            }

            //left arrow
            if (key.name === "left" && page > 0) {
                page--;
                render_page(issues, page, total_pages);
            }
        });
    });
}

/**
 * Clear the terminal and render the current page of the issue list.
 *
 * @param {object[]} issues      - Full array of issues from FETCH().
 * @param {number}   page        - Current page index.
 * @param {number}   total_pages - Total number of pages.
 */
function render_page(issues, page, total_pages) {
    console.clear();

    const start = page * PAGE_SIZE;
    const slice = issues.slice(start, start + PAGE_SIZE);

    print_header();
    for (const issue of slice) {
        print_row(issue);
    }

    // pad empty rows so layout stays stable across pages
    for (let i = slice.length; i < PAGE_SIZE; i++) {
        console.log("");
    }

    console.log("");
    print_pagination(page, total_pages);
    console.log("");
    console.log("Press ESC to exit");
}

/**
 * Render the table header row and separator line.
 */
function print_header() {
    const header =
        col("ID",       COL.id)       + "  " +
        col("TITLE",    COL.title)    + "  " +
        col("PRIORITY", COL.priority) + "  " +
        col("STATUS",   COL.status)   + "  " +
        col("TYPE",     COL.type)     + "  " +
        col("CREATED BY", COL.createdBy);
    console.log(header);
    console.log("-".repeat(TABLE_WIDTH));
}

/**
 * Render a single issue row in the list table.
 *
 * @param {object} issue - Issue object from FETCH().
 */
function print_row(issue) {
    const row =
        col(short_id(issue.ID), COL.id)       + "  " +
        col(issue.Title,        COL.title)    + "  " +
        col(issue.Priority,     COL.priority) + "  " +
        col(issue.Status,       COL.status)   + "  " +
        col(issue.IssueType,    COL.type)     + "  " +
        col(issue.CreatedBy,    COL.createdBy);
    console.log(row);
}

/**
 * Render the pagination bar with prev/next buttons in the center.
 *
 * @param {number} page        - Current page index (0-based).
 * @param {number} total_pages - Total number of pages.
 */
function print_pagination(page, total_pages) {
    const nav = "< prev.    next >";
    const page_label = `Page ${page + 1} of ${total_pages}`;
    const nav_padding = Math.floor((TABLE_WIDTH - nav.length) / 2);
    const label_padding = Math.floor((TABLE_WIDTH - page_label.length) / 2);
    console.log(" ".repeat(nav_padding) + nav);
    console.log(" ".repeat(label_padding) + page_label);
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
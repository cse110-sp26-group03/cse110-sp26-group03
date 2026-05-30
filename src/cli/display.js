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

const ALT_SCREEN_ON = "\x1b[?1049h";
const ALT_SCREEN_OFF = "\x1b[?1049l";
const CLEAR_SCREEN = "\x1b[2J\x1b[H";

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
                await display_issue(result);
            }
            break;
        default:
            throw new Error(`display error: '${parse_obj.cmd}' is not a supported display command`);
    }
}

/**
 * Run an interactive view in the alternate screen buffer (clear + redraw on resize).
 *
 * @param {() => string[]} buildLines - Builds the lines to print.
 * @param {(key: object) => boolean}  [onKey] - Return true to redraw after arrow keys, etc.
 */
async function run_alt_screen(buildLines, onKey) {
    if (!process.stdout.isTTY) {
        console.log(buildLines().join("\n"));
        return;
    }

    process.stdout.write(ALT_SCREEN_ON);
    let last_columns = process.stdout.columns;

    function redraw() {
        process.stdout.write(CLEAR_SCREEN + buildLines().join("\n") + "\n");
        last_columns = process.stdout.columns;
    }

    redraw();

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    let resize_timer;
    const on_resize = () => {
        const cols = process.stdout.columns;
        if (typeof cols !== "number" || cols === last_columns) return;
        clearTimeout(resize_timer);
        resize_timer = setTimeout(redraw, 100);
    };

    process.stdout.on("resize", on_resize);

    const cleanup = () => {
        clearTimeout(resize_timer);
        process.stdout.off("resize", on_resize);
        process.stdout.write(ALT_SCREEN_OFF);
    };

    await new Promise(() => {
        process.stdin.on("keypress", (str, key) => {
            if (!key) return;

            if (key.name === "escape" || (key.ctrl && key.name === "c")) {
                cleanup();
                process.stdin.setRawMode(false);
                process.stdin.pause();
                process.stdout.write("\n");
                process.exit(0);
            }

            if (onKey?.(key)) {
                redraw();
            }
        });
    });
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

    await run_alt_screen(
        () => build_list_page_lines(issues, page, total_pages),
        (key) => {
            if (key.name === "right" && page < total_pages - 1) {
                page++;
                return true;
            }
            if (key.name === "left" && page > 0) {
                page--;
                return true;
            }
            return false;
        },
    );
}

/**
 * @param {object[]} issues
 * @param {number}   page
 * @param {number}   total_pages
 * @returns {string[]}
 */
function build_list_page_lines(issues, page, total_pages) {
    const lines = [];

    lines.push(...header_lines());

    const start = page * PAGE_SIZE;
    const slice = issues.slice(start, start + PAGE_SIZE);
    for (const issue of slice) {
        lines.push(row_line(issue));
    }

    for (let i = slice.length; i < PAGE_SIZE; i++) {
        lines.push("");
    }

    lines.push("");
    lines.push(...pagination_lines(page, total_pages));
    lines.push("");
    lines.push("Press ESC to exit");

    return lines;
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
 * @param {object} issue - Single issue object from FETCH().
 */
async function display_issue(issue) {
    await run_alt_screen(() => {
        const lines = build_issue_detail_lines(issue);
        lines.push("");
        lines.push("Press ESC to exit");
        return lines;
    });
}

/**
 * @param {object} issue
 * @returns {string[]}
 */
function build_issue_detail_lines(issue) {
    const lines = [];
    const width = TABLE_WIDTH;
    const quarter = Math.floor(width / 4);

    const title = (issue.Title ?? "-").toString();
    const id = (issue.ID ?? "-").toString();

    if (title.length + id.length + 1 <= width) {
        lines.push(title.padEnd(width - id.length) + id);
    } else {
        lines.push(title);
        lines.push(id.padStart(width));
    }

    lines.push("-".repeat(width));

    const desc = (issue.Description ?? "").toString();
    if (desc.length === 0) {
        lines.push("");
    } else {
        for (const line of desc.split(/\r?\n/)) {
            lines.push(line);
        }
    }

    lines.push("");
    lines.push("-".repeat(width));

    const priority = issue.Priority == null || issue.Priority === ""
        ? "-"
        : String(issue.Priority).startsWith("p")
          ? String(issue.Priority)
          : `p${issue.Priority}`;

    lines.push(
        col(priority, quarter) +
        col(issue.Assignee, quarter) +
        col(issue.IssueType, quarter) +
        col(issue.Status, quarter),
    );

    lines.push(dotted_line(width));

    lines.push(
        col(issue.CreatedBy, quarter) +
        col(issue.CreatedAt, quarter) +
        col(issue.UpdatedBy, quarter) +
        col(issue.UpdatedAt, quarter),
    );

    return lines;
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

/**
 * Build a dotted separator line of the given width.
 *
 * @param {number} width - Total line width.
 * @returns {string}
 */
function dotted_line(width) {
    let line = "";
    while (line.length < width) {
        line += "- ";
    }
    return line.slice(0, width);
}

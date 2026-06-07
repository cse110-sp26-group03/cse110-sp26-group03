import { spawn } from 'child_process';
const WIKI_BASE =
  'https://github.com/cse110-sp26-group03/cse110-sp26-group03/wiki';

/**
 * Opens a URL in the user's default browser, choosing the right launcher for
 * the current platform (`start` on Windows, `open` on macOS, `xdg-open`
 * elsewhere).
 *
 * The browser is launched as a detached background process that `mt` does not
 * wait on, so the command exits immediately. Any failure (no browser,
 * unsupported platform) is skipped over — the caller prints the URL as a fallback.
 *
 * @param {string} url - The URL to open.
 * @returns {void}
 */
function openInBrowser(url) {
  const cmd =
    process.platform === 'win32'
      ? 'start'
      : process.platform === 'darwin'
        ? 'open'
        : 'xdg-open';
  try {
    spawn(cmd, [url], {
      shell: process.platform === 'win32',
      stdio: 'ignore',
      detached: true,
    }).unref();
  } catch {
    /* no browser / unsupported platform — printed URL is the fallback */
  }
}

/**
 * Builds the general help text shown by `mt help` (with no command argument):
 * usage, the full command list grouped by purpose, and a note on flag aliases.
 *
 * @returns {string} The formatted help text, ready to print.
 */
function generalHelpText() {
  return `Manta (mt) — a git-native issue tracker that lives in your repo.

Usage:
  mt <command> [arguments] [flags]

Issue commands:
  create <title>           Create a new issue
                           flags: --title/--t, --desc/--d, --priority/--p, --status/--s, --type, --assignee/--a
  update <id>              Change one or more fields (same flags as create)
  close  <id>              Mark an issue as closed
  delete <id>              Permanently delete an issue (asks to confirm)
  view   [id]              List issues, or show one in detail
                           filters: --status/--s, --priority/--p, --type, --assignee/--a, --createdBy/--cb, --all

Repo commands:
  init                     Set up Manta in the current repo (.manta/ + git merge rule)
  sync                     Rebuild the local cache from the shared log (run after a git pull)
  migrate <path_to_jsonl>  Import issues from a Beads JSONL export
  clear  [path_to_jsonl]   Erase every issue from the log (asks to confirm)

Other:
  version                  Print the installed Manta version
  help [command]           Show this help, or open the wiki page for a command

Flags have a long form and most have a short alias — e.g. --priority and --p
are the same flag. Both use --. --type and --all have no short form.

Run 'mt help <command>' to open its documentation in the wiki.`;
}

/**
 * Handles the `mt help` command.
 *
 * With no argument, prints the general help overview. With a command name,
 * prints the wiki URL for that command and tries to open it in the browser
 * (the printed URL is the fallback if the browser cannot be launched).
 *
 * @param {string} [cmd] - Optional command name to open the wiki page for.
 *   Validated against the known command list by the parser before this runs.
 * @returns {void}
 */
export function help(cmd) {
  if (!cmd) {
    console.log(generalHelpText());
    return;
  }

  const url = `${WIKI_BASE}/mt-${cmd}`;
  console.log(`Opening the wiki page for 'mt ${cmd}' in your browser.`);
  console.log(`If it doesn't open, visit: ${url}`);
  openInBrowser(url);
}

import { truncate, stat } from 'node:fs/promises';

const DEFAULT_LOG_PATH = '.manta/manta.jsonl';

// ---- Public API ----------------------------------------------------
/**
 * Clears the contents of the manta log file by truncating it to 0 bytes.
 *
 * Called by the `mt clear` CLI command (see index.js). The file itself is
 * preserved — only its contents are erased.
 *
 * @param {string} [logPath='.manta/manta.jsonl'] - Path to the jsonl log file to clear.
 * @param {?(() => boolean | Promise<boolean>)} [confirm=null] - Optional
 *   confirmation callback. Invoked only once the file is known to exist and
 *   have content, so the caller never prompts for a no-op or a missing file.
 *   If it resolves falsy, the clear is aborted and `null` is returned.
 * @returns {Promise<?boolean>} Resolves to `true` if the file had contents that
 *   were cleared, `false` if it was already empty (0 bytes), or `null` if the
 *   confirmation callback declined.
 * @throws {Error} If the file does not exist, or for any other
 *   filesystem error.
 */
export async function clear(logPath = DEFAULT_LOG_PATH, confirm = null) {
  try {
    const { size } = await stat(logPath);
    if (size === 0) {
      // already empty. no changes to make
      return false;
    }
    if (confirm && !(await confirm())) {
      // file has content; ask first
      return null;
    }
    await truncate(logPath, 0);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`No log file was found at ${logPath}`, { cause: err });
    }
    throw err;
  }
}

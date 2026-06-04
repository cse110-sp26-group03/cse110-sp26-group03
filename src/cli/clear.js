import { truncate } from 'node:fs/promises';

const DEFAULT_LOG_PATH = '.manta/manta.jsonl';


// ---- Public API ----------------------------------------------------
/**
 * Clears the contents of the manta log file by truncating it to 0 bytes.
 *
 * Called by the `mt clear` CLI command (see index.js). The file itself is
 * preserved — only its contents are erased.
 *
 * @param {string} [logPath='.manta/manta.jsonl'] - Path to the jsonl log file to clear.
 * @returns {Promise<void>} Resolves once the file has been emptied.
 * @throws {Error} If the file does not exist, or for any other
 *   filesystem error.
 */
export async function clear(logPath = DEFAULT_LOG_PATH) {
    try {
        await truncate(logPath, 0);
    } catch (err) {
        if (err.code === 'ENOENT') {
            throw new Error(`No log file was found at ${logPath}`);
        }
        throw err;
    }
}
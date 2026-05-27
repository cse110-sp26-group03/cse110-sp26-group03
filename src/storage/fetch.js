import { Database } from 'bun:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '../../.manta/manta.db'), {
  readonly: true,
});

// Interaction with the SQLite db specifically for the mt view command.
// Takes a parse object.
// If data is fetched successfully, returns:
//      List behavior -> an array of event objects, ordered by priority.
//      View behavior -> one event object.

// Check below for what input/output should look like.

const filter_map = {
  status: 'status',
  priority: 'priority',
  type: 'issueType',
  assignee: 'assignee',
  createdBy: 'createdBy',
};

export function FETCH(parse_obj) {
  //console.log("Parse obj:", parse_obj)

  try {
    if (parse_obj['flags']['id']) {
      // view specific issue

      let issue = db
        .query('SELECT * FROM issues WHERE id = ?')
        .get(parse_obj['flags']['id']);

      if (!issue) {
        throw new Error(`Issue with id ${parse_obj['flags']['id']} not found`);
      }

      return issue;
    } else {
      // list behavior
      const { flags } = parse_obj;
      const conditions = [];
      const params = [];

      if (!('all' in parse_obj['flags']) && !flags['status'])
        conditions.push("status != 'closed'");

      for (const [flag, col] of Object.entries(filter_map)) {
        if (flags[flag]) {
          conditions.push(`${col} = ?`);
          params.push(flags[flag]);
        }
      }

      const where = conditions.length
        ? ' WHERE ' + conditions.join(' AND ')
        : '';
      return db
        .query(`SELECT * FROM issues${where} ORDER BY priority`)
        .all(...params);
    }
  } catch (err) {
    throw new Error('Query failed: ' + err.message, { cause: err });
  }
}

// input will look like this:
// {
//   cmd: "view",
//   flags: {
//     status: "in_progress",
//     priority: "p2",
//     all: "" <-- if this exists, include closed issues to be listed.
//   }
// }

// or for specific issue viewing behavior:
//   cmd: "view",
//   flags: {
//     id: "manta-h3kp"
//   }
// }

// Output will look something like this:
/* [
  {
    ID: "manta-9fz0",
    Title: "My issue",
    Description: "",
    Status: "open",
    Priority: "p5",
    IssueType: "task",
    Assignee: null,
    CreatedAt: "2026-05-21T02:56:04.612Z",
    CreatedBy: "ikey",
    UpdatedAt: "2026-05-21T02:56:04.612Z",
    UpdatedBy: "ikey",
  }, {
    ID: "manta-ht8j",
    Title: "Issue",
    Description: "",
    Status: "open",
    Priority: "p5",
    IssueType: "task",
    Assignee: null,
    CreatedAt: "2026-05-21T02:56:16.404Z",
    CreatedBy: "ikey",
    UpdatedAt: "2026-05-21T02:56:16.404Z",
    UpdatedBy: "ikey",
  }, {
    ID: "manta-b2a1",
    Title: "My",
    Description: "",
    Status: "open",
    Priority: "p5",
    IssueType: "task",
    Assignee: null,
    CreatedAt: "2026-05-21T02:56:28.809Z",
    CreatedBy: "ikey",
    UpdatedAt: "2026-05-21T02:56:28.809Z",
    UpdatedBy: "ikey",
  }
*/

// parse object format:
//
// {
//   cmd: "create",
//   flags: {
//     title: "Hello world",
//     priority: "p2"
//   }
// }

// which flags each command can have
const possible_flags = {
  create: ['title', 'desc', 'priority', 'status', 'type', 'assignee'],
  update: ['id', 'title', 'desc', 'priority', 'status', 'type', 'assignee'],
  close:  ['id'],
  delete: ['id'],
}

// maps flag name to its check function
const validations = {
  id:       check_id,
  title:    check_title,
  desc:     check_desc,
  priority: check_priority,
  status:   check_status,
  type:     check_type,
  assignee: check_assignee,
}

// master validate function. takes in parse object and returns true if all checks pass, otherwise
// throws an error.
export function validate(parse_obj) {

  // unpacks parse object
  const { cmd, flags } = parse_obj


  // loop runs checks for all possible flags for command. determined by corresponding table for
  // command in possible_flags

  for (const flag of possible_flags[cmd]) {

    const error_msg = validations[flag](flags[flag])

    // string returned = error message, so throw error
    if (error_msg) throw new Error(error_msg)

  }

  // return true if all checks pass
  return true
}

// helper functions. all input to these functions are in string form, as it's still in a
// parsed format

function check_id(id) { }

function check_title(title) { }

function check_desc(desc) { }

function check_priority(priority) { }

function check_status(status) { }

function check_type(type) { }

function check_assignee(assignee) { }
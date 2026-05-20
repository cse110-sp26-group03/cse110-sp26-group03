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

const ID_PATTERN = /^manta-[0-9a-hjkmnp-tvwxyz]{4}$/

function check_id(id) {
  if (id === undefined) return null
  if (ID_PATTERN.test(id)) return null
  return `validate error: '${id}' is not a valid issue id`
}

const TITLE_MAX_LENGTH = 50

function check_title(title) {
  if (title === undefined || title === '') return null
  if (title.length < TITLE_MAX_LENGTH) return null
  return 'validate error: title must be under 50 characters'
}

const DESC_MAX_LENGTH = 512

function check_desc(desc) {
  if (desc === undefined || desc === '') return null
  if (desc.length < DESC_MAX_LENGTH) return null
  return 'validate error: description must be under 512 characters'
}

const PRIORITY_PATTERN = /^p(10|[1-9])$/

function check_priority(priority) {
  // parser always sets priority (default p5); undefined should not reach here
  if (priority === undefined || priority === null || priority === '') {
    return 'validate error: priority is required'
  }
  if (PRIORITY_PATTERN.test(priority)) return null
  return `validate error: '${priority}' is not a valid priority`
}

const VALID_STATUSES = ['open', 'in_progress', 'closed']

function check_status(status) {
  // parser always sets status (default open); undefined should not reach here
  if (status === undefined || status === null || status === '') {
    return 'validate error: status is required'
  }
  if (VALID_STATUSES.includes(status)) return null
  return `validate error: '${status}' is not a valid status`
}

const VALID_TYPES = ['bug', 'feature', 'task', 'docs', 'store']

function check_type(type) {
  if (type === undefined) return null
  if (VALID_TYPES.includes(type)) return null
  return `validate error: '${type}' is not a valid type`
}

const ASSIGNEE_PATTERN = /^[a-zA-Z]+$/

function check_assignee(assignee) {
  if (assignee === undefined) return null
  if (ASSIGNEE_PATTERN.test(assignee)) return null
  return `validate error: '${assignee}' is not a valid assignee`
}
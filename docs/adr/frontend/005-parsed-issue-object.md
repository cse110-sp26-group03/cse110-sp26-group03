# ADR-005: Parsed Issue Object Schema

## Depreceated: DO NOT REFER TO, ASK IN SLACK/SEE OTHER DOCS

## Status
Accepted | Proposed | **Deprecated (bold selected)**

**Date:** 2026-05-19

**Authors:** Angel

---

## Context
1. Establish a concrete schema for the output of the parsed command line input, so all files that create/access this object know what fields are expected.
2. Establish what should be checked by the parser, and what is handled later by the validator.

---

## Decision

### Parsed Output Schema

parser.js will take the raw input string and separate it into the following:

```js
// example input: manta create "example title" --priority p3 --assignee exampleassignee

// parser output:
{
  ok: true,
  command: "create",
  args: ['example title'],
  flags: {
      priority: 'p3',
      assignee: 'exampleassignee'
  }
}
```

in the case where the input is invalid (see below what parser checks), this will be returned: 

```js
{
  ok: false,
  message: "parse error: "fake" is not a valid flag"
}
```

| key | value example | notes |
| --- | --- | --- |
| ok | true/false | if true, the following will be filled, otherwise, message with related error will be the only other field | 
| command | "create" | valid input: `create`, `update`, `close`, `delete`, etc. |
| args | [], \['example title'\] | any non-flag arguments following the command.|
| flags | \{priority: p3, ...\} | all the flags, separated by key : value pairs |
| message | "parse error: "fake" is not a valid flag" | error message, if ok: false |

### Parser and Validator Responsibility Separation

| check | parser | validator | notes |
| --- | --- | --- | --- |
| valid command used | X | | checking if they used a valid manta command |
| required fields filled | | X | ex: create command has a title argument somewhere |
| valid flags | X |  | check to see if all flags are valid |
| flag content valid | | X | check to see if the value passed for each flag is valid (length/formatting) | 
| valid args |  | X | checking to see if the args fit the required format | 

Basically, the parser will work as a first-pass quick validation to check two primary things: 
1. valid manta command
2. valid flags

Otherwise, the parser will simply separate out the command, the args, and the flags into key: value pairs. It will not check the content of args or the content of the values. 

In the case where the input is invalid, the parser will return the standard `{ok: false, messsage: "parse error: description"}`. 

---

## Consequences

### Positive
- standardized output so that other developers know what to expect in terms of input (parsed.args, parsed.flags, etc), especially for the following files: validator.js, event.js
- clear separation of validation duties (two step, returns issues early for basic checks in the parser)

### Negative
- two-step validation requires good communication between developers, may be confusing if responsibilities are not clearly divided
- some things may be present in both places (title can be either a flag or an arg for create commands), requiring redundant fallback checks in later stages

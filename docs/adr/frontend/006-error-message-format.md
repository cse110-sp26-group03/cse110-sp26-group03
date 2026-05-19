# ADR-006: Error Message Formatting

## Status
Accepted | **Proposed** | Deprecated (bold selected)

**Date:** 2026-05-27  
**Authors:** Angel

---

## Context
Establishing a standardized error message formatting building off of the shape established in ADR-001.

---

## Decision

In ADR-001, the standard return shape `{ok, message}` was proposed. 

In the case where everything succeeds and `store.js` is able to properly generate an ID and store to the database, it will then return the following: 

```js
{
  ok: true,
  message: "manta-XXXX"
}
```

this allows index.js to then take the generated ID and query the database to print information to the terminal. 

If checks or other errors occur, files will return the following: 

```js
{
  ok: false,
  message: "<where-it-happened> error: <description>"
}
```

if `ok: false` is ever returned, each file will pass back this object until index.js recieves it and can print the final error message. 

error descriptions should be clear but concise, clearly explaining what error occurred, or "unknown error" if extraneous errors happen. 

examples:
```txt
parse error: 'fake' is not a valid flag
parse error: 'cweate' is not a valid command
validate error: create commands must have a valid title
validate error: 'pb' is not a valid priority
event creation error: an unknown error has occurred
store error: a unique manta id could not be generated
store error: the manta 'manta-XXXX' could not be found
```

---

## Consequences

### Positive
- standardized format makes errors easy to track across different files, and identify where errors happen
- concise descriptions allow for index.js to print relevant information when errors occur. 

### Negative
- each developer will have to write specific messages depending on the error that occurred
- error messages will need to be passed all the way back to index.js.
- index.js will not be able to modify error messages as easily. 

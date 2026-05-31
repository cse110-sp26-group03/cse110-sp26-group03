# Team 3 Meeting Minutes

**Type of Meeting:** Project Work Session  
**Date/Time:** May 26th, 2026, 6:30 PM - 8:30 PM  
**Location/Method:** In-person, CSE Basement  

**Members Present:** Angel, Ori, Ike, Scott, Katie, Nat, Humza, David, Ryan, Nathan  
**Members Absent:** Tian  

## Agenda
- Discuss scrapping issue dependency and web UI
- Design `mt view` command behavior
- Decide when `replay.js` should be triggered

## New Business

The team decided to scrap issue dependency and the web UI from the project scope.

The team discussed the design of the `mt view` command. Issues will use the naming convention `manta-xxxx` for detailed issue display. The `--all` flag will show closed issues as well as open ones.

The team also discussed when `replay.js` should be invoked. Two options were considered: running it on every create, update, or delete operation, or hashing the `.jsonl` file after each create/update/delete, comparing it to a stored hash, and only calling `replay.js` if a difference is detected (updating the stored hash afterward). The team leaned toward the hash-based approach for efficiency.

The team reviewed responsibilities for several files: `migrate.js`, `fetch.js`, and `display.js`. `display.js` will contain functions to print individual issues.

## Decisions Made
- Issue dependency and web UI features are scrapped.
- Issues are displayed using the `manta-xxxx` naming convention.
- `--all` flag on `mt view` will include closed issues.
- `replay.js` will be triggered via hash comparison of the `.jsonl` file rather than on every operation.
- `display.js` will house individual issue print functions.

## Action Items
- Implement `replay.js` 
- Implement `display.js` with single-issue and multi-issue print functions.
- Wire `mt view` to call `fetch.js`.

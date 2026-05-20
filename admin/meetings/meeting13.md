# Team 3 Meeting Minutes

**Type of Meeting:** Final Project Checkpoint  
**Date/Time:** May 18th, 2026, 6:30 PM - 8:40 PM  
**Location/Method:** In-person, CSE Basement  

**Members Present:** Ori, Ryan, David, Nathan, Tian, Angel, Nat, Ike, Katie, Humza, Scott  
**MembersLeft Early:** Tian  

## Agenda
- Split up tasks between the backend and frontend teams
- Clear up confusion between backend and frontend responsibilities
- Assign specific files and implementation work to team members

## New Business
The team met in person to split up tasks and clarify any confusion between the backend and frontend teams.

The team discussed how backend and frontend responsibilities should be divided so that each group can continue making progress without overlapping or blocking each other. The team also discussed making sure errors are thrown in the correct spots with the correct messages.

The frontend team discussed how different JavaScript files should be divided among members. The team also discussed the structure of `validator.js`. The plan is for `validator.js` to contain small helper functions for each field. Each command will call the specific validation functions needed for that command.

## To-Dos

### Backend Team
- Check whether an issue ID exists before updating or deleting
- Throw errors in the correct locations
- Make sure error messages are clear and accurate
- Work on `replay.js`

### Frontend Team
- `parser.js`: Ike
- `index.js`: Scott
- `validator.js`: Humza and Ike
- `event.js`: Nat and Katie

## Decisions Made
- `validator.js` will be structured with small helper functions for each field.
- Each command will call the specific validation helper functions it needs.
- Backend work will focus on ID checking, update/delete behavior, error handling, and `replay.js`.
- Frontend work will be divided by file so team members can work in parallel.

## Action Items
- Ike will work on `parser.js`.
- Scott will work on `index.js`.
- Humza and Ike will work on `validator.js`.
- Nat and Katie will work on `event.js`.
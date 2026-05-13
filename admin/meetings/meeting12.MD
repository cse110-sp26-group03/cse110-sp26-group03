# Team 3 Meeting Minutes

**Type of Meeting:** Final Project Sprint Planning  
**Date/Time:** May 12th, 2026, 6:40 PM - 8:30 PM  
**Location/Method:** In-person, CSE Basement  

**Members Present:** David, Scott, Katie, Nat, Humza, Nathan, Ori, Ryan, Tianlin, Ike, Angel  
**Left Early:** Tianlin  

## Agenda
- Discuss this week’s sprint goals
- Shift focus from prototypes to the final project
- Review technical decisions and ADRs
- Complete the in-class SWE rubric activity

## New Business
The team met in person to discuss this week’s sprint and shift focus away from prototypes and toward the final project.

The team reviewed ADRs and discussed several major technical decisions. One discussion focused on how data should be stored using SQLite and JSONL. SQLite will act as the local database, while the JSONL file will be pushed and pulled from the repo. The JSONL file will update the local SQLite database of issues, but the JSONL file itself will not be directly modified. Instead, new action lines will be appended.

The team discussed that appending to the JSONL file is O(1), while updating an existing line would be O(n). Appending also keeps the file more readable. Ike brought up that O(n) may not be a major issue for a small team because the team likely will not have a very large number of issues.

The team also reviewed issue ID generation. The planned format uses short random hex IDs, such as `FL-a3f9c2`, to reduce the chance of duplicate IDs.

The team decided that the software name will be **Manta**, and the command prefix will be **`mt`**.

The goal is to get a working prototype by the end of the sprint. By Friday’s stand-up, the team should decide on major technical decisions, including dependencies.

The team also discussed using a local database instead of a cloud database. A local database would allow the tool to work without Wi-Fi, run faster, and better fit the needs of the target users.

At the end of the meeting, the team worked together to complete the **In-Class Activity: Exploring the Not So "Hidden" SWE Rubric**. 
## Basic Command List
- `mt help`: Lists commands
- `mt create`: Creates an issue
  - Params: title, body, assignee, priority
- `mt update`: Changes issue field(s)
  - Takes flags to decide what to change
- `mt delete`: Deletes an issue from the database
  - Params: id
- `mt list`: Lists active issues
- `mt close`: Changes an issue status to closed

## Issue Format for `issues.jsonl`
```json
{
  "title": "",
  "desc": "",
  "assignee": "",
  "priority": "",
  "date/timestamps": "",
  "ID": "",
  "status": "open/in progress/closed"
}
```
## Group Photo

![Team 3 group photo](../photos/picturegoeshere)

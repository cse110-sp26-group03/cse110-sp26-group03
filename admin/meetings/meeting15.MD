# Team 3 Meeting Minutes

**Type of Meeting:** Final Project Meeting
**Date/Time:** June 3rd, 2026, 6:00 PM - 7:00 PM  
**Location/Method:** In-person, CSE Basement  

**Members Present:** Angel, Ori, Ike, Katie, Nat, Humza, David, Ryan, Nathan, Tian  
**Members Absent:** Scott (Happy Birthday!!!!!)

## Agenda
- Discuss final tasks before code freeze on **June 7th 11:59**

## New Business

- The team discussed refactoring and redesigning the webpage into a wiki page. We want the website to be more accomadating to new users/users unfamiliar with Manta.
- Need e2e and unit testing -> form new teams for testing
- Ike and Ori will add new commands 
- Need to clean up repository 
- Ori implemented `mt migrate` and demoed its functionality 
- Beads IDs have varying length (`beads-xxx` or `beads-xxxx`), we want to keep them so 
users can still identify their issues
- Found an issue where a large portion of the README got moved to the website in a commit -> will restore soon.

## Decisions Made
- Opting for a wikipage that serves as a guide for Manta instead of webpage. We decided that since everything has been intentional throughout our process, we shouldn't rush a website.
- `mt clear` will require a backend erase function that clears the database
- Documentation will be split up among everyone on the team

## Action Items
- Need to film 2 videos next week due next Wednesday, **June 10th, 2026, 11:59 PM**, one 3 minutes (in-class video) and one 20 minutes.
- Implement `mt sync` - `syncFromLog()` 
- Implement `mt migrate` - need to handle Beads ID prefix
- Implement `mt clear` - erase JSONL and call an erase function (to be implemented)
- Ideally finish everything code-related by Saturday, **June 6th, 2026, 11:59 PM**
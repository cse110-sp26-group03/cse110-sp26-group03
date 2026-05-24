# sprint 3

all in slack #standups

## standup 1: monday

| name | did/doing | blockers |
| --- | ---- | ---- |
| Angel | did: reviewed documentation and ADRs for frontend, approved PRs and merge. create diagrams and plan out tasks for next sprint<br>next: prep team discussions, make sure everyone is together, distribute tasks. clean up github repository branches (it's a mess) | frat flu of doom and despair |
| David | Did: Finished issue 38 and waiting for review on issue 22.<br>Doing: Waiting for feedback and looking for any other issues to work on | Feedback, and a bit sick |
| Humza | Did: Been a bit behind with some family stuff but I did fix up issue 24 and it should be ready for merging.<br>Doing: gonna start working on some new issues, catching up on the new structure of the application and what everyone else had built. |  |
| Ike | Did: Wrote sample CLI I/O document + command docs<br>Doing: Catching up on all ADRs to deeper my understanding of project. Aligning with teams | Work, preparing for internship |
| Katie | Did/Doing: Reviewed frontend and backend ADRs to stay up to date with team's decisions. Waiting on additional frontend issues that Angel is putting together to pick up next | Club-related activities |
| Nat | Did: Researching ESLint for our primary linter<br>Doing: Writing ADR-006 for linting and installing ESLint | Week 8 assignments......... |
| Nathan | Did: Reviewed Scottin's ADR to familiarize myself with a good ADR. Finalized ADR-004 and approved it. Talked to Ori about how commands in the command line will be called.<br>Doing: Reading up on Prettier and how to apply it to our project | Major assignments due on Tuesday |
| Ori | Did: Facilitating issues mostly in CI/CD and storage right now. We merged the ci.yml and package.json into main with our linter and tester being called, and for now just placeholders in package.json until we implement our linter and tester. Issues have been created to implement ESLint and add Prettier as our styler. I tested our CI and it works as expected. I also connected github to our slack to keep us updating with all necessary information.<br>Doing: Working on helping frontend team come together with their initial scripts so we can run some basic tests with the CLI and sqlite. But before we run any scripts, the linter, styler, and tester need to be in play. | None at the moment. |
| Ryan | Did: Wrote ADR for CLI performance optimization.<br>Doing: Will continue to research ease of implementation of daemons at various stages of development + how to implement. | so much homework and deadlines |
| Scott | Did/Doing: Finalizing frontend ADRs with Ori and Nathan | Midterm this wednesday |
| Tian | Did: fix SQlite and make it works well with Bun<br>Doing: Preparing the tests part for data and API | lab7 |

## standup 2: wednesday 

| name | did/doing | blockers |
| --- | ---- | ---- |
| Angel | did: revised frontend file structure, approved humza/ike PR and edited some ADR files.<br>next: fix ADR documentation, create new file tree diagram for frontend, clean up github branching | midterm |
| David |  |  |
| Humza | Did/doing: Worked on and finished validate.js with Ike and we pushed that to the main branch. Updated adr 004 to match some the changes we made in validate as they deferred from our original plan. Transitioning to a different component to help finish. |  |
| Ike | Did/doing: finished parser.js and 1/2 of validate.js + bug testing. also made frontend adr007, which was a proposal of how to approach validate.js and change our parse_obj structure | class and work |
| Katie | Did: Researched options for auto-filling createdBy, updatedBy, and actor fields without prompting the user. Updated the necessary fields in event.js<br>Doing: Writing user identity ADR | None atm |
| Nat | Did: ADR for ESLint and ESLint set up<br>Doing: Implementing event.js for event creation from parsed data | Work for clubs, personal issues |
| Nathan | Did: Worked with Ori to get the prettier code formatter working when a pull request is opened in Github.<br>Doing: Not much planned, I understand that we have completed a major step of our project (which only has basic functions), so I plan to stress test what we have so far, and report anything I find | Had an assignment due yesterday that ate up a lot of time |
| Ori | Did: Fixed up store.js to address the changes discussed in last nights basement meeting: Update and delete now check for ID existence before dispatching event, added errors in the correct spots across functions.<br>Doing: Facilitating to ensure everything gets done by tonight for the video. | Waiting on frontend team so we can have real tests going. |
| Ryan | Did: not much<br>Doing: Researching and making ADR for JSONL checkpoints | 5 pages for essay need to be written by tomorrow |
| Scott |  |  |
| Tian |  |  |

## standup 3: friday

| name | did/doing | blockers |
| --- | ---- | ---- |
| Angel | did: created and assigned issues, reviewed team 4's stuff<br>next: update standup record in github | other classes + personal stuff |
| David | Did: finished the adr and made pr for JSDoc implementation<br>Doing: still looking if we want to add ESLint for JSDoc implementation or if anything else needs to be done | none |
| Humza | Did: finished the readme for the docs folder, (issue 94)<br>Doing: Waiting for approval or any chanages that need to be made. |  |
| Ike | Did/doing: Updates on docs, cleaning up branches | Quizzes for other classes |
| Katie | Did: Finished ADR for user identity<br>Doing: Working on issue #95, updating user flow diagram to match current architecture | None |
| Nat | Did: Not much after working on events.js.....<br>Doing: Reviewing Tian's ADR for issue #74, going to likely pick up another issue | None |
| Nathan | Did: looked into some options for integrating changelog updates into our CI/CD workflow.<br>Doing: assigned 2 issues to complete that I will allocate time to do tomorrow | assignments due tonight |
| Ori | Did: Had a good night of sleep after getting our video chosen to be showed to class. Caught up with Angel on next steps (we have the group feedback assignment).<br>Doing: Researching issues that I assigned my team to do. | None |
| Ryan | Did: Made the ADR for jsonl checkpoints<br>Doing: assigned to do issues 73 & 75, so I will research and discuss about that | Gotta rewatch some lectures |
| Scott | Did: finished READ-me (issue 92)<br>Doing: waiting for a teammate who hasn't used manta, to follow the how-to | work |
| Tian | Did: decision part of ADR for jsonl checkpoints, issue#74<br>Doing: issue #75 | homework of other class and revie
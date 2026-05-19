# Team Meeting Notes

**Date/Time:** 8:30 PM - 9:30 PM  
**Location/Method:** Zoom Meeting  

## Attendance

**Members Present:** Ori, Scott, Katie, Tianlin, Nat, Angel, Ryan, Nathan  
**Members Late:** Ike, Humza  
**Members Absent:** David  

---

## This Week’s Sprint

Since Tuesday, the team split into frontend and backend groups.

The team worked heavily on documentation, including:
- Writing up the CI/CD pipeline
- Backend team writing storage scripts
- Writing and reviewing ADRs

---

## Individual Updates for This Past Week

### Nathan
- Main role was writing ADRs for the backend team.
- Workload was not too bad.
- **Blockers:** Coursework due tomorrow.
- Mentioned that communication between the frontend and backend groups could be better.

### Angel
- Created multiple issues for the team.
- Wrote up ADRs and will continue writing ADRs.
- Believes the team has a solid CRUD flow.
- **Blockers:** Was sick and not super locked in this week.

### Katie
- Completed Issue #20, which included the user flow diagram, CRUD diagram, and agent diagrams.
- Reviewed frontend and backend ADRs.
- Liked the Git updates in the Slack channel.
- **Blockers:** Had a busy week.

### Tianlin
- Set up SQLite and the database.
- Prepared for testing.
- Asked the team to let him know if there are any errors with the database.

### Professor
- The team asked why the project is called AI.
- Professor answered that it is because we are in the world of AI now.
- There is not anything especially AI-specific in the tracker.
- Token tracking is not something that would stand out to him as a client.

### Ori
- Asked everyone to push ADRs to main.
- Wants everyone to put the same amount of communication into both teams.
- Wants everyone to feel ownership and equal opportunity in the project.
- Mentioned that the team has come far since last Tuesday, when there was only a rough idea.

### Ryan
- Worked on ADRs for Issue #31 and Issue #34.
- Mentioned that smaller teams are more approachable.
- Will try to pay more attention to the other team.
- **Blockers:** Homework.

### Ike
- Worked on a rough parser.
- Worked on Issue #21: rough CLI input/output design.
- Created sample docs for commands.
- Mentioned that Git reports are a good addition.
- Noted that work distribution is not evenly distributed.
- Suggested letting people know when they are not active.

### Humza
- Reviewed Slack charts.
- Finished Issue #24.
- Will make an attempt to be more active.
- Mentioned that Git reports are a good addition.

### Scott
- Coordinated with the backend team.
- Finished writing up frontend ADRs for the parser, validator, and SQLite.
- Mentioned that Git reports are a good addition.
- **Blockers:** Midterm this Wednesday.

---

## Notes

- Backend needs the data structure object from the frontend team to start implementing commands.
- Start ADRs for each file, such as:
  - `index.js`
  - `parser.js`
  - Other major project files

---

## ADR Reviews

### Frontend ADR-004
The team reviewed frontend ADR-004:
- Issue Event Object Schema

### Backend ADR-004
The team reviewed backend ADR-004:
- Migration from Beads
- People are not going to switch to our software if they cannot easily switch.
- Need to migrate Beads.
- Need to read the Beads `jsonl` file.

### Backend ADR-005
The team reviewed backend ADR-005:
- Issue IDs
- Default priority should be `p5`.

---

## CI/CD Review

The team reviewed `ci.yml`.

During every push to main:
- A Linux VM runs.
- Bun and dependencies are set up.
- The linter runs.
- Tests run.
# Tue May 5 Meeting Pre Notes

## Announcements and Recap

- Does everyone have Claude? Who does not…
- Show Slack workflow bot activated in standups and talk about standups (Mon/Wed/Fri 9:00 AM)
- Talk about how standups are gonna look like
- Mandatory participation

## Part 1 — Research recap

Go around the room asking each person what they learned from their research with follow up questions like how we will use this knowledge to our advantage for our AIT.

## Part 2 — Discoveries from hands-on testing

**What I learned from Beads:**

The dependency graph is real and powerful. I had bd create me 5 tasks and they all depended on one specific task to be done first, so it blocked all of them until task 1 is marked completed.

Agents need guardrails. When I said "do task …q7d," Claude Code installed a bunch of packages and dependencies and just started going and changing the architecture of the code and just went crazy. This is exactly the problem AIT could solve with token budgets, scope contracts, and approval gates.

Scope contracts — issue descriptions explicitly state what's in and out of scope. "Set up repo — placeholder only, do not install dependencies, do not pick a language." If the agent does something outside scope, that's a violation that gets flagged for review. This would have prevented your TypeScript surprise.

Approval gates — high-impact actions (adding dependencies, modifying CI config, changing build setup) require human approval before the agent commits. The agent says "I want to install TypeScript, may I?" and a human gets to say yes/no/discuss.

**Like the personas ask for:**

Jimmy (project lead) wants to know "when an issue was completed by a human, assisted by AI, or mostly handled by an AI agent" and explicitly doesn't want "AI work happening without human accountability." That's approval gates and audit logging.

April (solo developer) wants "lightweight/minimal token tracking since she is a student with a limited budget." That's literally token budgets.

## Part 3 — Constructing out MVP (Minimum Viable Product)

- What's an MVP? The minimum version of a product that can allow us to collect the maximum amount of learning about customers with the least effort.
  - Don't get it twisted with a prototype, because an MVP is a full functioning product we are comfortable with releasing to our customers.
- Where's the human/agent line? Are we building "agents do everything humans approve" (Beads model) or "issues are explicitly typed as human-only / agent-only / collaborative"?
- What's the project actually called? "AIT" is a working name.
- Scope of MVP vs stretch — what are the must-haves for the demo, and what's "if we have time"?

## Part 4 — Next steps and assignments

- Set up sprint board on GitHub (the spec requires this) — assign to 1 person
- Schedule sprint review/retro for next week
- Confirm M/W/F standup time and that Slack workflow is running
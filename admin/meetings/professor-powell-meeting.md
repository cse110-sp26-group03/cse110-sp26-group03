# Professor Powell Meeting Notes

**Date:** May 13th, 2026  
**Members Present:** Ori, Ryan, David, Nathan

## JSONL Architecture: Appendable vs Mutable

**Question:** We were planning on doing similar to the architecture that Beads uses; we are conflicted between an appendable vs a mutable JSONL file.

### Appendable
- O(1) per append
- Fewer merge conflicts
- The file will get larger over time
- Space is not necessarily a concern vs its performance

### Mutable
- Powell doesn't seem to favor mutable as much

### Powell's Guidance
- Queries are going to get slower and slower with more data. Powell suggests it is more efficient to use a temp table. Structure the JSONL file to meet our performance/space needs.
- Users are going to want fast lookup and insert. Saving space is not going to really help but actually hurt.
- Powell personally doesn't like the speed of Beads. Takes like one second, and it's not instantaneous enough. Think instantaneous like using CLI commands (listing and entering directories).
- Think about why they have a delay.

## Speed and UI Inspiration

- **Linear:** Very popular in the Bay Area. Its main thing was how fast it was (apparently the fastest).
- Powell proposes that we make Beads, use their patterns, but faster and with better UI like Linear's.

## Lifecycle and Migration

- **Incentive to switch from Beads:** If ours is faster and looks better than Beads, what's the reason not to switch? Show them a path from where they were to where we want them to go.
- If we want it to be migratable, probably need similar or same JSONL structure as Beads'.
- `mt migrate <filepath>` copies JSONL.

## Advice from Other Groups

- Rank the things that you feel like you won't be able to do. These are the things that you must get rid of the risk for to prevent failing in the future.

## General Advice

- **Video question for next week:** Can you talk to us about how you've been doing with the process, and the status on where the project is?
- When thinking about the end user, they have some needs to be filled. Observe and talk to them. Don't just theorize them, it's dangerous.
- Do as little as you possibly can that are the most important as you possibly can.
- Agent and user is basically the same thing.
- What characteristics can help users succeed using AI generation?

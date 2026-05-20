# ADR-007: Prettier Code Formatter

## Status
Accepted | **Proposed** | Deprecated (bold selected)

**Date:** 2026-05-19  
**Authors:** Nathan Lin

## Context
When working a team of this scale (~11 People), there will be natural variations in coding conventions that might lead to untidy code. Untidy code can result in our software being harder to maintain, debug, or read. With this in mind, our team explored a few methods of making making our code uniform. 

## Considered Options

1. **Defining coding conventions in a Markdown file.** This is a very basic way to ensure that everyone is on the same page in terms of the conventions our team agreed on; however, it can prove tedious, and time consuming in practice to manually fix existing code that was written before our conventions were established.
2. **Assigning somebody the role of reviewing conventions.** This would build upon option 1. Before merging the pull request, we would have a designated "style checker" who would review the newly written lines and confirm that they follow the coding conventions.
3. **Prettier code formatter.** Described as an opinionated code formatter, it will style code upon saving. They follow the philosophy of having few options to limit debates over styles to debates over what Prettier options to use.

## Decision
We want to choose option 3: Having our code formatting automated eliminates arguments over coding style, and eliminates human error. 

- Team members can periodically run the Prettier formatter and trust that it will accurately format the code
- With CI/CD we can make prettier run on the event of `git push` which ensures that team members always push formatted code
- Manual checks are no longe required which allows team members to use time efficiently

## Consequences

### Positive
- Limited configurations reduces arguments over coding styles
- Automates formatting of code which reduces the human error that comes from manually checking
- `.prettierrc` accepts a variety of formats (we will be using JSON) to configurate Prettier options.

### Negative
- Due to the opinionated nature, formatting choices are very limited which means that the team may dislike specific formatting rules Prettier uses
- Prettier may run noticably slower on larger files
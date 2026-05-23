# ADR-002: Javascript Runtime - Using Buns instead of Node.js

## Status

Proposed | **Accepted** | Deprecated

Date: 2026-05-15 Authors: Ori

## Context

From what we know about Beads, they use a Node.js runtime, which results in a longer start-up time (~100-200 ms) and relatively high memory usage. 
In order to achieve quick, preferably instantaneous, responses in CLI, we must aim for:
1. Constant-time operations across the board, with very limited linear-time.
2. Low memory usage to improve start-up.
3. Ability to run the Javascript files.

## Considered Options

1. **node.js runtime.**. The standard js runtime. Great library, dependency, API support.
2. **Bun runtime.** Easy to implement (drop-in replacement). Better performance compared to Node.js. Worse library, dependency, API support.

## Decision

We want to adopt Option 2: Bun has better performance; appeals to user needs (RAIL).

More Specifically in Response(R) and Load(L)
- Response will be under 100ms
- Load will be under ~1 second
- Dramatically reduces startup times (by about 4x) and memory usage
- No need for high library, dependency, API support in this project

## Consequences

**Positive:**

- Significantly improved response times and memory usage
- Bun is a majority native to Javascript
- Bun has a Bun:Sqlite module built in
- Bun has a built in test runner than is Jest-compatible
  
**Negative:**
- May encounter inexplicable bugs with the use of dependencies and libraries while building
- Newer tool might have gaps in documentation

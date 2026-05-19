# ADR-006: ESLint Linter

## Status
Accepted | **Proposed** | Deprecated

**Date:** 2026-05-18  
**Authors:** Nat

## Context

Linting is crucial in many developmental workflows because it helps identify hidden bugs, syntax errors, and enforce uniform coding standards. By catching these issues early, linting reduces debugging time and improves maintainability of our system. Likewise, we want to integrate an open-source linting tool to help facilitate our project's developmental workflow. 

## Considered Options

1.  **Biome** - Relatively new linter and formatter written in Rust. Designed as a faster, zero-config alternatiev to ESLint + Prettier, with a single dependency to manage instead of multiple.
2.  **JSHint** - Lightweight and long-standing linter focused on simplicity. Offers basic error detection and style checking with minimal configuration.
3.  **ESLint**. - Industry standard, highly configurable linter. Typically paired with Prettier for code formatting and styling. 

## Decision
We have decided to implement **ESLint** as our project's linting utility, paired with Prettier for code formatting. For our use-case and the scale of our project, raw performance is not a primary concern. Instead, we prioritize **documentation quality, reliability, and functionality**, allowing each team member to install, configure, and troubleshoot the tool with minimal friction and difficulties.

ESLint wins on each of these criteria:

- **Documentation**: Every rule has a dedicated page explaining its purpose, configuration options, and examples of correct/incorrect code.
- **Reliability and Functionality**: ESLint has been consistently used, maintained, and updated for over a decade -> stable API, predictable behavior, and limited bugs
- **Ecosystem and searchability**: Most error messages or configuration questions have been posted and answered on Stack Overflow, GitHub issues, or community blog posts.
- **Simple Configuration**: Using shared configurations such as `eslint:recommended` allows us to implement useful linting easily without complex configuration work.

Biome was the strongest alternative and was considered for its speed and unified linter/formatter approach. However, due to its newer ecosystem, there's a higher risk of encountering bugs/issues that aren't documented. For a project of our size, the speed advantage does not outweigh ESLint's reliability.

JSHint was ruled out because it lacks modern TypeScript and JSX support, and lack of flexibility in creating rules.
## Consequences

### Positive
-  Industry standard and widely used
-  Flexible and highly configurable per-rule severity
- Easy to implement auto-fixes for many rules 
- Well-organized and comprehensive documentation, can research issues and fixes fairly easily
- Reliable and well-maintained

### Negative
- Slower than Rust-based alternatives, especially in large codebases
- Higher memory usage and config file complexity as project grows
- Separate formatter (Prettier) for style, meaning we need to keep two tools in sync
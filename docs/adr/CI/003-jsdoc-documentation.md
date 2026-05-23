# ADR-003: JSDoc Documentation Generator

## Status
Accepted | **Proposed** | Deprecated (bold selected)

**Date:** 2026-05-22
**Authors:** David Tanioka

## Context
As our codebase grows, keeping JavaScript source code well documented becomes important for maintaining shared understanding across an 11 person team. So I added JSDoc through jsdoc.json and the CI so that when running, it produces a browsable HTML reference from those comments, and plugs that into the existing CI pipeline, so bad documentation is caught on pull requests.

## Considered Options

1. **Hand-written Markdown docs in `docs/`.** Authors describe each module in a Markdown file. Low tooling cost, but documentation drifts from source and easier to become out of date.
2. **TypeDoc.** A documentation generator built from TypeScript. Decent documentation, but relies heavily on typescript typing. As discussed in lectures, adopting TypeDoc would force a TypeScript migration we are not ready to take on.
3. **JSDoc.** The standard documentation tool for JavaScript. Uses `/** ... */` comments that live next to the code they describe, generates static HTML from a single `jsdoc.json` config, and is already recognized by editors with low cost setup.

## Decision
We will adopt **JSDoc** (option 3) and wire it into the CI pipeline as a step in `.github/workflows/ci.yml`, mirroring how ESLint/Prettier is used.

- A `jsdoc.json` config at the repo root points JSDoc at `src/` and emits HTML into `out/` , already in `.gitignore`, so generated docs are never committed.
- A `bun run jsdoc` script in `package.json` lets members get up to date docs locally (refreshes the HTML)
- `jsdoc` is used as a `devDependency` so every contributor and the CI runner use the same version.
- The CI job runs `bun run jsdoc` between the lint and test steps. A malformed JSDoc block fails the build the same way an ESLint or Prettier failure does.


## Consequences

### Positive
- Documentation lives next to the code it describes, which dramatically reduces drift compared to outside source, like Goodle Docs.
- Editors already render JSDoc on hover, so contributors get value even before opening the generated HTML.
- CI catches malformed JSDoc blocks on every PR, the same way it catches lint and formatting issues today.
- Generated HTML in `out/` gives a browsable reference without committing build artifacts.

### Negative
- Writing JSDoc blocks might add extra burden for those who haven't used before.
- JSDoc tags can feel not as specific as TypeScript-style type annotations.
- Adds another CI step, which slightly increases runtime.

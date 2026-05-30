# ADR-005: Distribution & Packaging

## Status

Proposed | **Accepted** | Deprecated

**Date:** 2026-05-27
**Authors:** Scottin Pham

---

## Context

Right now, using Manta requires cloning the entire repo and running a few setup commands. We want users to be able to install `mt` with a single command instead.

One important limitation: because Manta uses Bun's built-in SQLite module, it can only run on Bun, not Node.js. So any install method either needs Bun already installed, or has to bundle Bun into the download.

### Considered Options

1. **Publish to npm, install with `bun install -g manta`.** We publish Manta as an npm package. Users install it by running `bun install -g manta` in their terminal. This requires Bun to be installed first. One important note: `npm install -g manta` looks like it should work but won't on Windows, because Windows npm uses Node under the hood, which can't run Manta. Only `bun install -g` works.

2. **Compile to a native binary and attach it to each GitHub Release.** Bun can bundle the entire tool including the Bun runtime itself into a single downloadable file for each platform. No Bun required at all. Downside: the install process is manual, the user has to visit the GitHub Releases page, figure out which file matches their platform, download it, run it, and move it somewhere on their PATH themselves. This are ~5 manual steps and is error-prone. 

## Decision

**Option 1.**

Option 2 requires users to manually find the right file on GitHub, download it, and configure their PATH. Which is too many steps for something that should just work. Users won't use our software if it takes too long to setup. Option 1 is just two commands: install Bun, then `bun install -g manta`. 

Implementation is a single line change: in `.releaserc.json`, flip `"npmPublish": false` to `"npmPublish": true`. The existing release pipeline handles the rest automatically.

---

## Consequences

### Positive

- Very easy to implement. One config change, one README update
- Works on Mac, Linux, and Windows
- Easy for users to install

### Negative

- Users need to install Bun first before they can install Manta
- `npm install -g manta` will not work on Windows: Windows ignores the shebang and npm calls Node directly, which crashes on `bun:sqlite`. On Mac/Linux it works because the OS reads the shebang and calls Bun. We need to make this clear in the README.

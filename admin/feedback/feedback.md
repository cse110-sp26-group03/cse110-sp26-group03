# Team 4 Repository Review

**Reviewed by:** Team 3 (Stringrays)

## Admin & Documentation

### Strengths

- The `/admin` directory is well-organized and easy to navigate.
- The `/docs` folder contains good diagrams that help convey project concepts visually.
- CLI documentation in `/docs/cli` is notably detailed — each command includes a flag table, behavior notes, sample terminal output, and error message references. This is one of the strongest parts of the project documentation.
- Spring meeting notes follow a consistent format with attendance, agenda items, and task assignments, which reflects good team process.

### Areas for Improvement

- The meeting minutes naming convention could be more consistent and descriptive to make it easier to locate specific meetings at a glance.
- Meeting minutes would benefit from being written in third person and past tense to maintain a more professional and objective tone.
- The `/docs` directory, while containing good content, is somewhat disorganized. Some files have unclear purposes (e.g., `issue-data-model.md`), making it difficult to know what to read first or where to find specific information.
- There are no Architecture Decision Records (ADRs). The documentation explains *what* the CLI does, but not *why* certain design decisions were made. ADRs would help preserve that context for future contributors.
- The root README is incomplete and does not provide a clear picture of what the project is, how to install it, or how to run it. A newcomer visiting the repository would have difficulty understanding the project without digging into `/docs`.
- `specs-file-format.md` jumps directly into parsing rules without first explaining what `baton init` does or why someone would use a specs file, which makes it hard to follow without prior context.

### Questions

- Are there plans to add ADRs to document the reasoning behind key technical decisions? This would be especially valuable for onboarding new contributors.

### Suggestions

- Organize `/docs` into clear subsections (e.g., CLI reference, specifications, design) so readers can navigate more easily.
- Add a brief one-paragraph introduction at the top of each documentation file explaining its purpose and scope.
- Complete the README with a project description, installation instructions, and usage examples. Consider linking directly to the CLI docs from the README, since they are the strongest part of the documentation.
- Improve the overall accessibility of the project — it was unclear what the project was or what its name was unless you navigated deep into `/docs`.


## Functionality

### Strengths

- The instructions in the `docs/cli` directory are well-organized and practical. The descriptions tell users what they should expect to see when following the steps, which builds confidence for first-time users.
- The summaries of what each command and flag does are concise and easy to understand.

### Areas for Improvement

- The setup process is not particularly clear. The documentation references a command format (`baton <group> <commands> [arguments] [flags]`), but `<group>` is never defined or explained elsewhere. This is ambiguous and would leave a new user unsure of what to input.
- The `baton` command itself did not register as a valid command in any directory we tested. As users trying the software for the first time, we were unable to get it running.
- The use of `<tool> init` for initialization is confusing. The status video shows `baton init` in the flowchart, but the setup documentation uses the generic `<tool>` placeholder. If `<tool>` is meant to refer to `baton`, it would improve readability to use the actual name consistently throughout the docs.

### Questions

- How much of the functionality documented in the CLI reference is currently implemented? If certain features are not yet working, it would be helpful to label them as such (or temporarily remove them from the docs) so users don't attempt to use unimplemented commands.

### Suggestions

- Remove points of confusion in the documentation (such as the ambiguous `<tool>` and `<group>` placeholders). Since we were unable to get the software running as outside users, clarifying the setup steps should be a priority.
- If not all documented features are currently implemented, consider keeping the documentation limited to working features only. This ensures that users don't encounter broken functionality without warning.


## CI/CD Pipeline

### Strengths

- The CI pipeline follows a standard, well-structured approach. The check framework in `.github/workflows/ci.yml` separates Lint and Test into different jobs, which makes it easier to identify and isolate failures.
- The use of `npm ci` over `npm install` is a good practice, as it ensures consistency between `package.json` and the lockfile across environments.

### Areas for Improvement

- There is a mismatch in Node.js version requirements. `package.json` specifies `engines: node: >=22`, but `ci.yml` runs lint and unit tests with Node 20. This inconsistency could lead to issues where CI passes but local development fails (or vice versa).
- There is no push trigger for the `main` branch. The CI currently only runs on pull requests, which means direct pushes or merges to `main` are not rechecked. This leaves `main` vulnerable — for example, a bad merge conflict resolution could introduce issues that go undetected.

### Questions

- What is the intended minimum Node.js version to support — 20 or 22? Picking one and keeping it consistent across `package.json`, CI configuration, and documentation would prevent confusion and potential compatibility issues.

### Suggestions

- Fix the Node.js version mismatch between `package.json` and `ci.yml`.
- Add a push trigger on `main` to the CI workflow so that merged code is always validated.
- Start adding real tests — the current test suite only contains a placeholder. Even basic tests would improve confidence in the safety of pushes and merges.
- Consider adding a JSDoc check to the CI pipeline to enforce documentation standards.


## Source Code

### Strengths

- The folder structure is solid and intuitive, making it straightforward to locate different parts of the codebase.
- The CLI dispatcher in `cli.js` is cleanly written and designed to be easily extensible with new commands.
- Naming conventions and JSDoc usage are generally good. `util.js` in particular is well thought out — the flag parsing helpers are reusable and clean.
- The database schema in `db.js` is clear and intentional, and the use of a separate schema file makes it easier to scan and update.
- There are some strong design ideas, such as the smart trigger for automatically assigning new IDs and titles, and the token tracker with a configurable limit.
- Command files include usage, flags, and examples at the top, which serve as helpful mini-references. The service layer functions are documented with JSDoc (params and return types).

### Areas for Improvement

- Several service functions are currently empty (`listIssues`, `searchIssues`, `getActivityLog`, etc.), and key functions like `isTrackerReady`, `selectNextIssue`, and `workOnIssue` are called but not yet defined. The wiring is in place, but the logic is missing.
- `Issue.validate()` is called but has not been implemented yet.
- There is a naming inconsistency in `issue.js` — both `tokenLimit` (camelCase) and `token_limit` (snake_case) appear, which could lead to data loss or confusion. Settling on a single convention would improve consistency.
- There is a timestamp format mismatch: `created_at = new Date().toISOString()` produces a format like `"2026-05-25T07:15:00.000Z"`, while `DEFAULT CURRENT_TIMESTAMP` in SQLite produces `"2026-05-25 HH:MM:SS"`. This inconsistency could cause issues when comparing or sorting timestamps.
- The `Action` type is defined in `activityLog.js` but imported from `issue.js`, which is confusing and worth refactoring before it causes issues down the line.
- There is a lack of inline comments throughout the code explaining what individual lines or blocks do.

### Questions

- Is there a plan to implement the currently stubbed-out service functions before the final sprint? Prioritizing the core functions (like `listIssues` and `searchIssues`) would help get the tool to a usable state quickly.

### Suggestions

- Standardize the naming convention across the codebase (pick either camelCase or snake_case and apply it consistently).
- Fix the timestamp format mismatch between JavaScript-generated and SQLite-generated timestamps to avoid data inconsistencies.
- Relocate the `Action` definition to the file where it is logically used, or consolidate related models into a single file.
- Prioritize implementing the empty service functions and undefined methods to move the project from scaffolding to a working tool.


## New Developer Onboarding

### Strengths

- There is clear product intent documented in the `specs` folder, so a new developer can understand what the project aims to accomplish.
- The codebase is split into many small, focused source files, which helps new contributors ramp up on individual pieces without being overwhelmed.

### Areas for Improvement

- The root README is heavily lacking. A new developer arriving at the repository would not know how to get the code running or where to get started.
- The presence of multiple code locations without clear inline guidance is confusing for someone unfamiliar with the project.

### Suggestions

- A comprehensive README with setup instructions, project overview, and contribution guidelines would significantly reduce the onboarding difficulty for new developers.


## Repository Health

### Strengths

- Custom issue labels are used effectively to keep the Issues tab clean and organized.
- The docs directory and individual documents are well-organized internally.
- Branch naming conventions follow a clear pattern organized by type, author, and description, which makes it easy to understand the purpose of each branch.
- The overall structure and organization of the repository is clean.
- The use of Husky and commitlint helps enforce clean commit practices and maintain repo hygiene.

### Areas for Improvement

- The repository could benefit from issue and pull request templates to improve standardization and ensure that bug reports, feature requests, and PRs all include the necessary context.
- There are some extraneous files (e.g., `temp.md` files) that could be cleaned up.
- While the current file structure makes sense, some closely related files (such as `issue.js` and `activityLog.js`) might be worth merging, since the objects they define are closely related and tend to be imported together.

### Questions

- What is the current process for pull requests — are all PRs reviewed by other team members or leads before being merged?
- Some branches appear to be stale. Is there a reason for keeping them, or are they no longer being actively worked on?

### Suggestions

- Update the README with a project description, setup instructions, and usage guide.
- Some branches are 10+ commits behind `main`. Pulling or rebasing changes into active branches more frequently would help mitigate merge conflicts.
- Add issue and PR templates that include sections for bug reproduction steps, testing criteria, and acceptance requirements to improve overall organization and review quality.

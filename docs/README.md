# docs/

Quick reference for navigating this folder.

## Folder Structure

```
docs/
├── adr/             — Architecture Decision Records
│   ├── backend/     — Storage, runtime, migration, IDs, performance (8 ADRs)
│   ├── frontend/    — CLI parser, validation, display, events (10 ADRs)
│   ├── CI/          — ESLint, Prettier, JSDoc, changelog pipeline (5 ADRs)
│   ├── CD/          — Deployment strategy (1 ADR)
│   └── versioning/  — Version location (1 ADR)
├── design/          — Informal design artifacts
│   ├── cli-input-output.md
│   ├── miro.md
│   ├── Frontend Web Design Plan.pdf
│   ├── user-flow-diagram.drawio
│   └── storage.png
├── mvp/
│   └── mvp.md       — MVP scope, personas, acceptance criteria
└── specs/
    └── spec.md      — CSE 110 project spec and grading context
```

## ADRs

Each `adr/` subfolder has its own numbering (`001`, `002`, ...). Files follow the format `NNN-topic-slug.md`. Inside each ADR, the **bolded** status indicates the current state: **Proposed**, **Accepted**, or **Deprecated**.

## Design

Informal drafts and diagrams — context only, not authoritative.

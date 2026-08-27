# Domain Documentation: Multi-context

This repository uses a multi-context layout for domain documentation.

## Skills configuration

- **Layout**: `multi-context`
- **Root**: `CONTEXT-MAP.md`

## Structure

- **Context Map**: `CONTEXT-MAP.md` at the repository root.
- **Per-context files**:
  - `CONTEXT.md` - The domain language and high-level architecture for a context.
  - `docs/adr/*.md` - Architectural Decision Records for a context.

## Consumer Rules

1. Skills like `improve-codebase-architecture` and `diagnosing-bugs` will first read `CONTEXT-MAP.md`.
2. They will then look up the relevant context for the files they are currently editing.
3. They will read the `CONTEXT.md` and ADRs for that context to gain domain knowledge.

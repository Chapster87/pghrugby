# Domain Documentation: Multi-context

How the engineering skills should consume this repo's domain documentation when
exploring the codebase.

## Skills configuration

- **Layout**: `multi-context`
- **Root**: `CONTEXT-MAP.md`

## Structure

- **Context map**: `CONTEXT-MAP.md` at the repository root — one entry per live
  context, plus a retired-contexts section.
- **Per-context files**: a `CONTEXT.md` holding the domain language and
  high-level architecture for that context.
- **Agent docs**: `docs/agents/`; **handoffs**: `docs/handoffs/`.
- **ADRs**: `docs/adr/`, numbered — e.g.
  `0001-two-branch-release-topology-and-site-origins.md`. Because the sole live
  context is the repo root, context-scoped decisions live in `docs/adr/` rather than
  under `src/<context>/docs/adr/`. A flow's own decision records — one per grilling
  or ticket on a Wayfinder map — live in `docs/agents/` instead.

Today there is one live context: `pghrugby` (path `.`, file `CONTEXT.md`).

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root — it points at one `CONTEXT.md` per
  context. Read each one relevant to the topic.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in. In
  multi-context repos, also check `src/<context>/docs/adr/` for context-scoped
  decisions.

Skills that read this file first include `/diagnosing-bugs`,
`/improve-codebase-architecture`, `/to-spec`, and `/triage`.

If any of these files don't exist, **proceed silently**. Don't flag their
absence; don't suggest creating them upfront. The `/domain-modeling` skill
(reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates
them lazily when terms or decisions actually get resolved.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal,
a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift
to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're
inventing language the project doesn't use (reconsider) or there's a real gap
(note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than
silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_

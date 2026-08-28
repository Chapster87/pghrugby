# Agents

Entry point for agent instructions in this repository (Zed loads this file at
the repo root). Coding conventions and domain rules follow.

## The repo

A single, self-contained Next.js application for the Pittsburgh Forge Rugby
Club, rooted at the repo root (`src/`, configs, `scripts/`, `migrations/`).
Commerce and content come from Stripe, DatoCMS, ForgeCMS, Sanity (legacy,
interim), and Supabase (`orders`/`carts`). Medusa, Strapi, and the Medusa-era
storefront are removed — never reintroduce them or their patterns. All changes
stay within this repository.

## Coding conventions

- **Indentation**: 2 spaces, never tabs.
- **Variables**: `camelCase`; prefer `const` over `let`.
- **Comments**: JSDoc on functions explaining purpose, parameters, and return
  values; refrain from removing comments unrelated to your change (the owner
  leaves notes); mark future work with `@TODO:`.
- **Imports**: use `tsconfig.json` paths (`@/`, `@components/`, `@lib/`, …)
  where appropriate; React imports first, local imports second (alphabetized);
  blank line between third-party and local groups; CSS imports always last.
- **Styling**: CSS Modules (`style.module.css`, aliased `s`) for component
  styles; CSS variables for colors/fonts (see `src/styles/variables.css`);
  px units for layout, rem for font sizes; 8px grid spacing; global styles in
  `src/styles` used sparingly; nested media queries for mobile-first, using
  the custom-media vars in `src/styles/custom-media.css`.
- **Types**: global types in `src/types`.
- **Optimization**: only optimize when a unit test exceeds 100ms; otherwise
  favor readability and existing patterns.

## Rules

- Component styling details — `.rules/component-styling.md`
- Folder organization details — `.rules/folder-organization.md`

## Agent skills

### Issue tracker

GitHub Issues (no PR triage). See `docs/agents/issue-tracker.md`.

Wayfinder maps and their tickets live in GitHub Issues. Tickets are created as **sub-issues of the map issue** (native GitHub sub-issues) — this is the standard procedure. Blocking edges use native issue links (`blocks` / `blocked by`).

### Triage labels

Canonical labels (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context layout using `CONTEXT-MAP.md`. See `docs/agents/domain.md`.

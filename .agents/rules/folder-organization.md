# Folder Organization Guidelines

Project-specific deltas on top of the shared global rule
(`~/.agents/rules/folder-organization.md`). Follow that rule for the general
principles, the standard `_` subfolders, and placement conventions; the notes
below are what is specific to this repository.

## Data sources

Content comes from DatoCMS and ForgeCMS; commerce from Stripe and Supabase
(`orders`/`carts`). Integrate sources via `_data` and `_helpers`. Medusa, Strapi,
and Sanity are removed — never reintroduce them or their patterns.

## Host topology

- ForgeCMS is a separate deployment, consumed server-to-server over its Content
  Delivery API (`src/lib/forgecms/`). This repo holds no admin subtree and no
  host seam.
- Content models and custom field types belong to the instance's
  `src/extensions/**` (repo `Chapster87/pghrugby-cms`), never to this repo.

## Prototypes and `/workbench`

- **Prototypes belong outside `/workbench`:** `src/app/(core)/workbench` is the
  permanent shelf for global component wrappers (button, dialog, form controls)
  and is meant to grow. Temporary or throwaway flow prototypes are made in their
  own location and deleted once the real implementation lands.

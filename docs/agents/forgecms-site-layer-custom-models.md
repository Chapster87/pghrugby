# Site-layer custom models under the mounted core

Status: **researched 2026-09-10** for
[Research: site-layer custom models under the mounted core](https://github.com/Chapster87/pghrugby/issues/50)
on
[Wayfinder map: Embed the ForgeCMS content software into the pghrugby app](https://github.com/Chapster87/pghrugby/issues/40).

Sources (producer `cms-starter` / forgecms, tag parity with host marker
`forgecore.json` → **`core/v2`**):

- `docs/EMBEDDING.md`
- `docs/CUSTOM-FIELD-TYPES.md`
- `docs/SEAM.md`
- `docs/CONFIGURATION.md`
- demo dogfood: `src/example/standings/**`, `src/app/(cms)/example-registry.tsx`,
  `src/instrumentation.ts`
- mounted core in this repo: `src/app/admin/seam/**`,
  `src/app/admin/editor/[model]/_components/record-form/field-registry.tsx`,
  `src/app/admin/utils/field-types.ts`,
  `src/app/admin/server/cms/cda/CDACore.ts`
- live shared DB via `pnpm supabase:inspect-forgecms`

---

## Headline

**Models and fields are data. Custom field types (and media providers) are
code.**

| Need | Mechanism | Host code? | Touches `src/app/admin/**`? |
| --- | --- | --- | --- |
| New content model (e.g. a new table/shape) | Schema UI → registry rows in Supabase (`models` / `fields`) + physical table | No | No |
| New field on an existing model using a **built-in** type | Schema UI only | No | No |
| Field using a **custom** type (e.g. `standings_table`) | Schema UI stores `field_type` string **and** host registers a field-type plugin via the seam | Yes — outside core | No |
| Media storage provider | Host registers client + server media providers via the media seam | Yes — outside core | No |
| Custom admin routes / CDA resolvers | **Out of scope** on the seam today | — | — |

A core pull (`forgecms update`) wholesale-overwrites `src/app/admin/**`. Host
work stays in the shell: root layout, group wrappers, `src/proxy.ts`, env,
`tsconfig`, and **host-owned modules outside `admin/`**.

---

## What the seam is (and is not)

From `docs/SEAM.md` + `docs/CUSTOM-FIELD-TYPES.md` (verified against mounted
`core/v2`):

- Core ships an **empty** in-memory consumer registry.
- Public surface: `src/app/admin/seam/index.ts` exports
  - field types: `registerFieldType`, `getFieldTypePlugin(s)`
  - media: `registerClientMediaProvider`, `registerServerMediaProvider`, getters
- Core **never imports** host/demo code. Discovery is a **host-owned side-effect
  import** that calls `registerFieldType(...)`.
- Lookup is **additive**:
  - Schema UI type picker: `getAllFieldTypeMetadata()` =
    built-ins ∪ `getFieldTypePlugins()`
  - Record form: built-in `FIELD_REGISTRY` first, then `consumer?.Editor`, then
    text-single fallback
  - CDA: unknown / consumer types → opaque `GraphQLJSON` (default `jsonb`
    storage)

### Field-type plugin shape

```ts
registerFieldType({
  type: "standings_table", // stored as fields.field_type
  label: "Rugby Standings", // schema UI picker
  description: "…",
  category: "advanced", // basic | content | relational | advanced
  icon: "award", // lucide name
  dbType: "jsonb", // optional; defaults jsonb
  Editor: StandingsEditor, // client component, FieldRendererProps
})
```

`FieldRendererProps` (mounted path
`src/app/admin/editor/[model]/_components/record-form/types.ts`):

- `field`, `value`, `disabled`, `onChange`, `getFieldValue(slug)`, `schema`

`getFieldValue` is how an editor reads sibling fields (standings reads
`league` / `division` / `season`).

### Media seam (sibling; not required for standings model)

- **Client** half: same registrar path as field types (layout-imported module).
- **Server** half: **must** register from shell-owned `src/instrumentation.ts`
  at process boot — route handlers are not wrapped by layouts, so a layout
  import can never populate the server registry.
- Active id: `NEXT_PUBLIC_CMS_MEDIA_PROVIDER`, or the sole registered provider
  when unset.
- pghrugby currently has **no** `src/instrumentation.ts` and no media
  registration (noted open in
  [forgecms-env-build-surface.md](./forgecms-env-build-surface.md)).

---

## Where host wiring lives on pghrugby (Option A)

Producer template uses a **shell** isolation layout:

| Producer (cms-starter standalone) | pghrugby host (Option A, single root) |
| --- | --- |
| `src/app/(cms)/example-registry.tsx` client registrar | Host-owned registrar (e.g. `src/cms/admin-registry.tsx`) |
| Imported from `src/app/(cms)/layout.tsx` | Import from **`src/app/layout.tsx`** (the one `<body>`) |
| Plugins under `src/example/standings/` | Plugins under host tree, e.g. `src/cms/standings/` |
| Server media via `src/instrumentation.ts` | Same — add host `src/instrumentation.ts` when media is needed |
| `@/*` → `./src/app/(cms)/admin/*` | `@/*` → `./src/*` — **do not copy demo import paths verbatim** |

### Recommended host tree (do not create in this research ticket)

```text
src/
  app/
    layout.tsx              # import <AdminRegistry /> inside <body>
  cms/                      # host-owned; never under app/admin
    admin-registry.tsx      # "use client"; side-effect imports only; render null
    standings/
      index.ts              # registerFieldType({ type: "standings_table", … })
      standings-editor.tsx  # FieldRendererProps adapter
      standings-field.tsx   # editor UI
      standings-field.module.css
      rugby-logic.ts
  instrumentation.ts        # only if/when registering a server media provider
```

### Import path translation (critical)

Demo / producer aliases point **into** the core. On this host they must point
through `src/app/admin/…`:

| Demo import | Host import |
| --- | --- |
| `@/seam` | `@/app/admin/seam` |
| `@/editor/[model]/_components/record-form/types` | `@/app/admin/editor/[model]/_components/record-form/types` |
| `@/components/button` | `@/app/admin/components/button` |
| `@/components/fields/field-wrapper` | `@/app/admin/components/fields/field-wrapper` |
| `@/components/fields/reference-field` | `@/app/admin/components/fields/reference-field` |

Using bare `@/components/…` on pghrugby resolves to **site** components under
`src/components`, not the admin primitives the standings editor needs.

Registrar skeleton:

```tsx
// src/cms/admin-registry.tsx
"use client"
import "./standings" // side effect: registerFieldType(...)
// import "./media/register-client" // when media is in scope
export default function AdminRegistry() {
  return null
}
```

```tsx
// src/app/layout.tsx (body)
<body>
  <AdminRegistry />
  {children}
</body>
```

Registration must run in the **admin client bundle** before fields render. A
client component imported from the root layout is the Option A equivalent of
the template's `(cms)` registrar. Do **not** put this import inside
`src/app/admin/layout.tsx` (overwritten on update).

---

## Env involved

Field-type plugins need **no** new env.

| Variable | Role for site-layer work |
| --- | --- |
| Supabase trio + `CMS_API_TOKEN` | Already required for mounted core + CDA ([forgecms-env-build-surface.md](./forgecms-env-build-surface.md)) |
| `NEXT_PUBLIC_CMS_PRODUCT_NAME` | Branding only |
| `NEXT_PUBLIC_CMS_MEDIA_PROVIDER` | Only when a media provider is registered |
| `CMS_MOUNT_PATH` host constant `"/admin"` | Mount + CDA URL; not for plugins |

---

## Live standings situation (first pghrugby custom model)

Verified with `pnpm supabase:inspect-forgecms` against the shared DB:

### Model already exists (data — no seam)

| | |
| --- | --- |
| Table / slug | `standings` |
| Friendly name | Standings |
| Rows | **18** |
| Singleton | false |

### Fields

| slug | field_type | required | notes |
| --- | --- | --- | --- |
| `season` | `reference` | yes | built-in |
| `slug` | `seo_slug` | no | built-in |
| `league` | `reference` | yes | built-in |
| `division` | `reference` | yes | built-in |
| `league_standings` | **`standings_table`** | yes | **consumer type** |

Related competition models already present: `teams` (60), `leagues` (3),
`seasons` (5), `divisions` (6), `matches` (127).

### Delivery already works without the plugin

Storefront `StandingsTable` queries `standingsCollection` and reads
`league_standings` as JSON via embedded CDA
(`${NEXT_PUBLIC_BASE_URL}/admin/api/graphql`). CDA maps unrecognized types to
`GraphQLJSON`. **Public pages do not need the seam registration.**

### Admin authoring does need the plugin

Without a host `registerFieldType({ type: "standings_table", … })`:

- Schema UI type picker will **not** list “Rugby Standings” for *new* fields
  (existing field row already has `field_type = standings_table` in DB).
- Record form `FieldRegistry` misses the consumer Editor → **falls back to
  text-single**, so editors cannot use the standings grid.
- Physical column already exists as jsonb; registration does not recreate it.

So for standings, the host job is **not** “create the model” — it is **port and
register the `standings_table` editor plugin** so `/admin/editor/standings`
authors the JSON the site already reads.

Producer dogfood to port (from sibling `cms-starter`, not vendored with core):

- `src/example/standings/index.ts` — registration
- `standings-editor.tsx` — `FieldRendererProps` adapter + `getFieldValue`
- `standings-field.tsx` + CSS — grid UI; uses core `Button`, `FieldWrapper`,
  `ReferenceField` (team picker filtered by league/division/season)
- `rugby-logic.ts` — pts / LPPG / PD helpers

---

## Concrete walk-through: first custom model (standings)

### A. If the model were brand new (general path)

1. Sign into `/admin`, open **Schema**.
2. Create model (e.g. `standings`) — core creates registry row + physical table.
3. Add fields with **built-in** types (`reference`, `seo_slug`, …) in Schema UI.
4. For a column that needs custom UI/storage semantics beyond built-ins:
   - Implement host plugin + `registerFieldType`.
   - Ensure registrar is imported from root layout.
   - Reload admin; pick the new type in the schema field-type picker
     (`dbType` drives column creation; unknown types without a definition still
     default to jsonb on the create-field API).
5. Author records under `/admin/editor/<model>`.
6. Query via CDA; custom values arrive as opaque JSON unless/until typed
   delivery exists (out of scope on current seam).

### B. Standings on pghrugby (actual path — model already live)

1. **Copy** producer `src/example/standings/**` → host `src/cms/standings/**`
   (or equivalent). **Do not** place under `src/app/admin/**`.
2. **Rewrite imports** per the translation table above (seam + admin UI +
   `FieldRendererProps`).
3. Add `src/cms/admin-registry.tsx` that side-effect-imports `./standings`.
4. Mount `<AdminRegistry />` in `src/app/layout.tsx` inside `<body>`.
5. `pnpm build` / open `/admin/editor/standings` — confirm `league_standings`
   renders the rugby grid (not a plain text input); add/edit a row; confirm
   storefront standings pages still load.
6. No Schema UI model creation; no DB migration; no env change; no core edit.

Optional later: register Cloudinary (or other) media provider the same way if
admin media library is required on this host — client via registrar, server via
`src/instrumentation.ts`.

---

## Files / seams checklist (host must touch)

| Path | Purpose |
| --- | --- |
| `src/cms/standings/**` (proposed) | Plugin code (editor + register) |
| `src/cms/admin-registry.tsx` (proposed) | Client side-effect registrar |
| `src/app/layout.tsx` | Import registrar once under `<body>` |
| `src/instrumentation.ts` | Only for server media provider |
| `.env.local` | No new keys for field types |
| `src/app/admin/**` | **Never edit** — overwritten on `forgecms update` |
| `forgecore.json` | Marker only (`core/v2`, mount `/admin`) |

Core surfaces consulted (read-only):

| Path | Role |
| --- | --- |
| `src/app/admin/seam/consumer-registry.ts` | Empty registry + `registerFieldType` |
| `src/app/admin/seam/index.ts` | Public seam exports |
| `src/app/admin/seam/types.ts` | `FieldTypePlugin` contract |
| `src/app/admin/utils/field-types.ts` | Built-ins + `getAllFieldTypeMetadata` |
| `src/app/admin/editor/.../field-registry.tsx` | Editor resolution order |
| `src/app/admin/api/models/schema/fields/route.ts` | Create field; unknown type → jsonb |
| `src/app/admin/server/cms/cda/CDACore.ts` | Consumer types → `GraphQLJSON` |

---

## Guarantees and non-goals

**Guarantees**

- Core pull cannot clobber host plugins or registry modules (outside `admin/`).
- Models/records live in the shared Supabase DB as data.
- Removing custom types = drop the registrar import (zero core edits).

**Out of seam scope today** (producer docs)

- Consumer-authored admin **routes**
- Per-type **CDA resolvers** / typed delivery beyond opaque JSON
- Replumbing core built-ins as plugins

**Not this ticket**

- Implementing the standings plugin on the host (execution follow-up)
- Media provider registration
- Cleaning junk demo models (`boom`, `testing`, …) — map #1 / out of scope here

---

## Bottom line

pghrugby’s “custom models” under the mounted core are **mostly already done as
data**. The only code seam for standings is registering the **`standings_table`
field-type plugin** from a host module outside `src/app/admin/**`, discovered by
a client registrar imported from the single root layout. Mechanism is documented
against **`core/v2`**; the first model’s registration path is unambiguous.

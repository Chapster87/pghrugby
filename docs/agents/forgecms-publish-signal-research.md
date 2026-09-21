# ForgeCMS publish signal — does the instance emit one?

Status: **researched** for
[Research: Can pghrugby-cms emit a publish-triggered signal for site revalidation?](https://github.com/Chapster87/pghrugby/issues/104)
on the wayfinder map. Feeds
[Task: Build the secret-gated on-demand revalidation route (#103)](https://github.com/Chapster87/pghrugby/issues/103).

> **Superseded.** This was researched against `forgecms@2.1.0`, where the finding was
> correct: the instance emitted nothing. As of **`forgecms@2.2.0`** the producer shipped
> an app-emitted publish signal (ADR-0009, `docs/WEBHOOKS.md`), so the ticket resolves to
> **yes**. Read §1–§5 as the 2.1.0 baseline — and note the shape shipped is the app-side
> one §5 recommended over the datastore trigger.

Question: does the standalone instance (`Chapster87/pghrugby-cms`, Railway)
expose a publish-triggered signal — a webhook, an outbound call, or an extension
hook — the site could subscribe to, so revalidation becomes automatic? The
producer's CDA interface is fixed and out of scope; this looks only at what the
_instance_ exposes.

Sources: fresh clones of `Chapster87/pghrugby-cms` at `main`
(`0498ad76a98944a2b60ff10deb6db696a973df52`, "Update forgecms to 2.1.0",
2026-09-18, marker `forgecms@2.1.0` / `substrateRevision 6c3c31a406f5de86`) and
`Chapster87/forgecms` at `main`
(`5a4a485609769b25ff9873f499970f89f03cc714`, "Release forgecms 2.1.0",
2026-09-18). Every path/line below was read in those trees.

---

## 1. Answer

**No.** The instance emits nothing on publish, and a consumer extension cannot
register anything that would.

- The generator-owned core exposes **no publish / afterSave / lifecycle hook**
  of any kind. There is no event, callback, or outbound call on the publish
  path; publishing is a direct browser-side `UPDATE` on the content table.
- `src/extensions/**` **cannot** subscribe to a publish, because the seam's only
  registerable units are a field-type plugin and a media provider, and route
  injection is explicitly out of scope.
- The producer's template has no hook either, so nothing arrives with a
  future `forgecms update`.

The one thing that must exist regardless — the site's secret-gated revalidation
route ([#103](https://github.com/Chapster87/pghrugby/issues/103)) — is the only
piece that can be built on. Whether an automatic trigger calls it is a separate
decision; see §5 for the datastore-level option that is _not_ an instance hook.

---

## 2. Does the owned core expose a publish hook, and what would it pass?

No hook exists, so there is nothing to pass.

**The seam's write surface is three `register*` functions and no callback.**
`src/seam/index.ts:21-25` exports exactly `registerFieldType`,
`registerClientMediaProvider`, and `registerServerMediaProvider`; the type
module `src/seam/types.ts` defines only `FieldTypePlugin`, `ClientMediaProvider`,
and `MediaServerProvider` (plus `StorageAdapter`). None carries a save, publish,
or lifecycle callback.

**Publishing is a table write from the browser, not a server event.**
`src/lib/client/data-service.ts:524-586` (`publishRecord`) runs a Supabase
`update` setting `status: "published"` and `published_at`, spread with the
working copy and clearing `_draft` (`:559-567`), then inserts an audit row
(`:570-576`). Unpublish is the mirror, setting `status: "draft"`
(`:594-615`). This matches
`docs/core/adr/0005-explicit-saves-with-version-history.md:17`: "Publish is a
state change, not a save... sets `status = 'published'` and `published_at`, and
clears `_draft`." The update and the audit insert are two separate round trips,
not one transaction.

**No configuration surface for a signal exists.** `src/lib/core-config.ts:13-60`
exposes only branding, the media-provider id, and the CDA settings toggles.
`.env.example` has no webhook/publish/outbound variable. A tree-wide search for
`webhook|afterSave|onPublish|publishHook|revalidat|outbound|pg_net|supabase_functions`
finds only the CDA guide's consumer-side `revalidate` fetch option
(`docs/CDA-GUIDE.md:308,323`) — a client fetch concern, not a CMS signal.

**The MCP server is not a signal.** `src/server/mcp/index.ts:38-110` offers
`get_records`, `get_record_by_id`, `create_record`, `update_record`,
`delete_record` — request/response only, no publish tool and no subscription.
The MCP write path also bypasses drafts, versions, and the audit log entirely
(ADR-0007).

**The producer ships no hook to inherit.** A search of the whole `forgecms`
template for the same terms finds no publish hook, webhook, or outbound call —
the only "webhook" hits are in an unrelated Stripe e-commerce roadmap doc
(`docs/plans/roadmap/ecommerce-roadmap.md`). The instance is regenerated from
that template on update, so a hook cannot appear from `forgecms update` either.

---

## 3. Can `src/extensions/**` register such a hook?

No. Three independent reasons, all structural:

1. **The consumer zone is only `src/extensions/**`plus`.env.local`**
(`docs/CONSUMER-ZONE.md:17-18`), and its recognized customization kinds are a
field type, a media provider, and config *content* read by a well-known path
(`:63-71`). Hooks are not among them.
2. **Route injection and consumer-authored CDA extensions are explicitly out of
   scope** for the seam (`docs/SEAM.md:181-188`), so a consumer cannot add the
   admin route or server module a publish handler would live in. `SEAM.md:15`
   states the seam is "code-only, additive" and exists only for a custom field
   type or media provider.
3. **The boundary is lint-enforced.** Under `src/extensions/**`, any `@/...`
   specifier other than `@/seam` is an error (`docs/SEAM.md:64-65`), so a
   consumer module cannot reach core's save path, registries, or the Supabase
   client.

Core reaches the zone only through the two composition roots that import the
entry points — `src/seam/client.ts:10` and `src/seam/server.ts:15-16`. A grep of
the whole owned region for imports of `extensions/` returns only those two plus
one unrelated component-local `extensions/cms-block`. There is no other
well-known code path into the zone, so nothing can be smuggled in beside the
supported registrations.

---

## 4. What the trigger would call

Unchanged by this ticket, and the only piece that must exist either way: the
secret-gated on-demand route from
[Task: Build the secret-gated on-demand revalidation route](https://github.com/Chapster87/pghrugby/issues/103),
gated by `REVALIDATE_SECRET` and invalidating the `cms-content` tag
(`src/lib/forgecms/execute-query.ts:3`) plus `datocms` via
`revalidateTag(tag, "max")`.

The manual trigger does not become automatic through any instance mechanism. If
the signal never exists, the manual path (curl / CLI alias / Netlify build hook)
is the permanent trigger, with the 1h `(core)` ISR floor from
[Grilling: Site build + CMS-outage posture after the split](https://github.com/Chapster87/pghrugby/issues/92)
bounding staleness.

---

## 5. Adjacent, labelled: a datastore-level signal (not an instance hook)

The publish _act_ is observable in the shared Supabase project even though the
instance does not announce it. This is recorded because the ticket's outcome is
to know whether the manual trigger is permanent — and a database-side trigger
would make it automatic without touching the instance or the generator.

- A draft-mode content table carries `status` (`draft`/`published`) and
  `published_at`, added by the substrate's `set_content_table_draft_mode`
  (`db/provision/core-substrate.sql:617-661`). The browser writes the transition
  directly (`src/lib/client/data-service.ts:563-564`).
- A single audit row with `action = 'publish'` is appended for every publish
  (`data-service.ts:570-576`; the editor's audit view distinguishes `publish` /
  `unpublish` at
  `src/app/editor/[model]/[id]/_components/audit-log/index.tsx:153-156`).

So a Supabase Database Webhook (an `AFTER INSERT` trigger on `public.audit_logs`
filtered to `action = 'publish'`, or a per-content-table `AFTER UPDATE` on the
`status` transition) calling the #103 route would give an automatic trigger
using only database objects in a project we already own.

Caveats, stated plainly:

- **This is not the instance emitting**, and the consumer seam neither covers nor
  sanctions it. It is DB-side machinery added out of band.
- Content tables are per-model and dynamic, so a per-table trigger must be
  installed per table; `audit_logs` is the single-table alternative.
- Supabase Database Webhooks are configured in the dashboard, so they are **not
  versioned in a repo**. The instance's `db/provision/**` is owned and would be
  overwritten by an update.
- The publish `UPDATE` and the audit `INSERT` are separate calls
  (`data-service.ts:559-576`), so a failed audit insert means a publish with no
  signal — bounded by the 1h ISR floor, but a real gap.
- **Unverified:** nothing here was exercised against the live database, and it is
  not established that Supabase webhooks are available on this project's plan.

Whether to pursue this is a decision for the map, not a fact for this ticket.

---

## 6. Unverified / open

- All instance facts are from the repo at `0498ad7` (`forgecms@2.1.0`), not from
  the running Railway service; the deployed build is asserted by the marker, not
  probed.
- The datastore-level option in §5 is a reading of the schema and write path, not
  a live test, and its plan/feature availability is unchecked.

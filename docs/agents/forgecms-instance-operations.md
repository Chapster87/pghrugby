# ForgeCMS instance operations — the pin, the update ritual, and what survives it

Status: **decided** 2026-09-21, for
[Grilling: Instance operations — generator pin, updates, and what survives them (#99)](https://github.com/Chapster87/pghrugby/issues/99)
on the wayfinder map
[Wayfinder map: Site uses external data from cms.pghrugby.com (#89)](https://github.com/Chapster87/pghrugby/issues/89).

The **instance** is `Chapster87/pghrugby-cms`. Companion documents:
[railway-inventory.md](./railway-inventory.md) (this repo — the platform surface) and,
inside the instance, its shipped `UPGRADING.md` (the generator's contract: read it,
never edit it — an update rewrites it).

Evidence base: the instance at `forgecms@2.2.0` / `substrateRevision 6c3c31a406f5de86`
(read locally at `C:\Repos\pghrugby-cms`), its own update history, and the generator's
source in the `forgecms` repo — `cli/lib/regions.mjs`, `cli/lib/deps.mjs`,
`cli/lib/ignorefile.mjs`, `cli/lib/operations.mjs`. Where the shipped `UPGRADING.md` and
the generator's code disagree, **the code wins**, and §4 and §9 note where.

---

## 1. Where the instance stands

- **Version** `forgecms@2.2.0`. The pin lives _only_ in `.forgecms.json`
  (`generatorVersion`, `substrateRevision`); that file is generator-owned state and is
  never hand-edited. `package.json`'s `version` is the club's own and stays `0.1.0`.
- **Updates already run, for real:** `2.0.0 → 2.0.1 → 2.1.0 → 2.2.0`, one commit each
  (`e48721e`, `0498ad7`, `0c8d220`) directly on `trunk`. The 2.2.0 commit carried
  `pnpm-lock.yaml` with it. A pre-2.2.0 database dump sits beside the checkout
  (`pghrugby-cms-pre-2.2.0.dump`).
- **Live** at `https://cms.pghrugby.com` on Railway; see
  [railway-inventory.md](./railway-inventory.md).
- So this document codifies practice that already works, rather than designing from
  scratch. The ticket that seeded it described the instance as `2.0.0`; that is stale.

## 2. The pin and the cadence

`npx forgecms@X.Y.Z update` makes the **invoked** version the target. The CLI contains no
"latest" resolution step at all, which is what makes an update reproducible: a rollback
is re-invoking the older version.

- **The club tracks a named version, invoked deliberately.** Never `@latest`.
- **Triggers, not a schedule.** A patch or minor when one is useful, after reading the
  release notes. A **major** only after `UPGRADING.md`'s named migration step has been
  read _and_ the database has been backed up — the substrate is forward-only, so a
  cross-major rollback is a restore, and the dump is the only rollback there is.
- No dependency on `.forgecms.json`'s content for the _decision_: the marker records what
  happened, it does not drive what to run next.

## 3. The update ritual

```sh
git add -A && git commit -m "checkpoint before forgecms update"   # makes revert a rollback
npx forgecms@X.Y.Z update --dry-run                               # what will move
npx forgecms@X.Y.Z update                                         # with the backup below, for a major
pnpm install                                                      # lockfile moves with the manifest
pnpm build                                                        # catch a broken update before committing
git add -A && git commit -m "Update forgecms to X.Y.Z"            # ONE commit: rewrite + lockfile
```

Three things make this non-negotiable rather than hygiene:

- **Railpack builds with `pnpm install --frozen-lockfile`.** A manifest that has drifted
  from the lockfile **fails the deploy build**, not just the local one. `pnpm install`
  before committing is what stops the next deploy breaking.
- **One commit per update, carrying the lockfile**, so the rewrite is reviewable as a
  diff and `git revert` undoes code and lockfile together.
- `--dry-run` **writes nothing**, but it is weaker than it looks: it reports only
  _counts_ of `package.json` changes (never which keys), it gives no file list for the
  owned region, and it **skips the clean-tree assertion** — so it can describe an update
  the real run would refuse. Treat it as a warning, not a gate.

A post-deploy check (Railway build green, an `x-api-key` CDA read still answered) belongs
to a **major** only. For a patch it is ceremony.

## 4. What an update does to the club's settings

The merge is programmatic and **always succeeds**. There is no git-style conflict to
resolve at update time — the only "conflict" is a **warning** printed by the run.

| The club's file / key                                         | What an update does                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json` — `dependencies`, `devDependencies`, `scripts` | Merged **key by key**. A key the club added survives silently. A value the club changed is kept, with a warning naming the key. A key the _release_ dropped is kept. A key the release still ships, which the club **deleted**, is silently **added back**. Dependencies are re-sorted alphabetically; `scripts` keeps the club's order.                                                                                                                            |
| `package.json` — `name`, `private`, `packageManager`, `pnpm`  | **Owned; the release's value wins.** A club edit here is overwritten with only a _count_ in the report and **no warning** — setting `name` to the club's name does nothing and says nothing.                                                                                                                                                                                                                                                                        |
| `package.json` — `engines`                                    | Owned, but the template ships **no value** for it, so it takes the warn-and-keep branch: the club's value survives and **warns on every update, forever**. The one owned key the template can never enforce.                                                                                                                                                                                                                                                        |
| `package.json` — `version`, `license`                         | `version` is the club's and is never overwritten. `license` is not owned; it arrived on the 2.1.0 update.                                                                                                                                                                                                                                                                                                                                                           |
| `.gitignore`                                                  | **Union merge, append-only.** Every line the club has is kept byte for byte. Every rule the release ships is guaranteed present, appended last when missing — which is why deleting a shipped rule is futile (it returns, and returns last) and overriding one means adding a later line. The tool **never removes a line**, so a rule left over from a retired template path lingers until someone prunes it by hand (as happened with `/cli/template/` at 2.0.1). |
| `.env.local`                                                  | Never read, never written.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/extensions/**`                                           | Never read, never written. Deletion here is permanent.                                                                                                                                                                                                                                                                                                                                                                                                              |
| Everything else under the owned roots                         | Cleared, then rewritten. Put nothing here that the club authored.                                                                                                                                                                                                                                                                                                                                                                                                   |
| `public/`, `docs/`                                            | **Write-over** roots: template files overwrite their copies, but a file the template does not ship is left alone. This is what preserves `docs/adr/**` and `docs/agents/**`.                                                                                                                                                                                                                                                                                        |

**The only safe place for a club setting in an owned key is nowhere.** If the club needs
a value the template owns, the answer is the platform, not the manifest — see §7.

## 5. The database

`forgecms update` converges the substrate through `exec_sql`, using
`SUPABASE_SERVICE_ROLE_KEY`. The club's decision:

- **The update converges, when the release names a substrate change**, and the marker's
  `substrateRevision` advances with it.
- **A fresh dump is a named precondition** for any run that converges — not a good
  intention. Necessary because the project is **shared** with the site, so convergence
  reaches the storefront's database too, and because the substrate is **forward-only**:
  applying an older release's SQL does not undo a newer one.
- **`--no-db` retires.** It was the discipline while the shared-project isolation guards
  were absent (`forgecms#88`); they landed as 2.1.0 and the substrate has since converged
  and been verified against the club's project. `--no-db` also has a mechanical cost: the
  marker only advances on a converging run, so skipping convergence makes every later
  update re-warn about the same pending change forever.

## 6. The manifest: what the deployment needs

**Nothing is added.** The Railway deploy needs `next build` and `next start`, and both
are template-owned and already present. Specifically:

- `scripts.build` / `scripts.start` — shipped by the template, merged key by key. Never
  edit them; a club edit would survive with a warning, and a deletion would be undone.
- `packageManager: pnpm@10.33.2` — owned, and Railpack honours it, which is what selects
  pnpm 10 over Railpack's own default of pnpm 9.
- **`sharp` is not a club dependency.** It arrives as `next`'s optional dependency
  (`^0.34.5`, resolved 0.34.5), and the template-owned `pnpm.onlyBuiltDependencies`
  already whitelists `sharp` (with `esbuild` and `unrs-resolver`) so pnpm 10 runs its
  install script. Adding it explicitly would duplicate `next`'s optional dep and earn a
  warning on every update.
- **Node is pinned by a root `.nvmrc`** — the one mechanism that is both honoured and
  silent, because a root file the generator does not ship is outside _every_ region, so
  no update sees it. Explicitly **not** `engines`: the template ships no `engines`, so a
  club value there only buys a permanent warning with no enforcement.

Railpack resolves Node from `RAILPACK_NODE_VERSION`, then `devEngines`/`engines`, then
`.nvmrc`, then `.node-version`, then `mise.toml`, and finally the alias `lts` — a moving
target with no floor. Never set two mechanisms at once: the idiomatic version files can
outrank the variable. `RAILPACK_NODE_VERSION` on the Railway service is the equivalent
platform-side alternative if the club would rather add no root file.

## 7. Platform or manifest

The boundary, as a rule:

> **Manifest for what upstream ships. Railway for everything else. Nothing configured in
> both.**

Applying it: the generator's contract (`.forgecms.json`, `UPGRADING.md`, the owned
region) is the manifest's business; the club's actual run-time configuration is the
platform's. The concrete surface lives in [railway-inventory.md](./railway-inventory.md).

Two consequences worth stating outright:

- **`NEXT_PUBLIC_*` must exist at build time**, not merely at run time — `next build`
  inlines them, and the build fails without them. That is a Railway service-variable
  concern, never a file in the repo.
- **Scheduled work is operator-side.** The audit-log retention prune is the worked
  example: it needs `SUPABASE_SERVICE_ROLE_KEY` and **refuses the app's `CMS_DB_KEY` by
  design**, because the credential that writes the log must not be able to delete it. So
  it can never run from the deployed app, and no update can express it. It is now
  scheduled **inside the database** with `pg_cron` — daily at 03:30 UTC, a 90-day window —
  the mechanism that needs no second copy of the master key and no extra service; see
  [railway-inventory.md](./railway-inventory.md) §6.

## 8. The operating habit

For whoever works in `pghrugby-cms`:

- **The owned region is read-only.** All of `src/**` except `src/extensions/**`, plus
  `db/provision/**`, `scripts/**`, the core assets in `public/**`, and the root configs.
  If a change seems to need an owned file, the change belongs in the consumer zone, or it
  is a forgecms ticket — never a local edit.
- **The consumer zone is yours and permanent.** `src/extensions/**` and `.env.local`; an
  update never touches them, and deletion there is not recoverable from the template.
- **Merged files are yours to add to, never to correct.** `package.json` and
  `.gitignore` keep club _additions_; they do not keep club _corrections_ to what the
  template owns.
- **A value inside an owned key is not yours** — it is overwritten silently.
- **When an update warns, there are two answers:** accept the release's value, or move
  the setting to the platform. There is no third answer, and "edit the owned file" is not
  one of them.
- **The instance's own docs are `CONTEXT.md` and `docs/adr/**`, and both survive every
update** — see ADR-0008 *Instance docs: core's record ships, the owner's does not*.
`docs/` is write-over, so a guide the club adds there survives too.

## 9. Corrections made alongside this decision

Two files in the instance contradicted the above and were corrected in the same pass,
because the habit is worthless in a repo that argues with it. Neither will ever be
corrected by an update:

- **`AGENTS.md`** — its region table claimed `CONTEXT.md` and `docs/**` are owned and
  cleared. It also still carried `--no-db` as "the discipline" and the line that the
  shared-project isolation guards "are not applied yet"; both were superseded by 2.1.0 /
  2.2.0. `AGENTS.md` sits outside every region, so only a human can fix it.
- **`CONTEXT.md`** — the same wrong region table in its _Repo Shape_ section, plus a
  dangling pointer to `docs/ROADMAP.md` (the instance has no such file) and a sentence
  describing forgecms's own repo rather than this instance.

The trap they set is worth naming: the 2.0.1 update rewrote `CONTEXT.md` (192 lines), and
2.1.0 stopped — because ADR-0008 reclassified it as the owner's. A reader trusting
`AGENTS.md` would author into a file they believed was owned, or avoid one they believed
was.

Two later corrections landed in that file, both the same class of stale instruction:

- the `pnpm approve-builds` note, superseded once the manifest began shipping
  `pnpm.onlyBuiltDependencies`; and
- the "delete the starter sample once you have your own registrations" line, replaced by
  the opposite decision — the sample is **kept deliberately** as the seam's worked
  reference, with its registrations left live and its no-op media stub named plainly, so
  that nothing looks like it depends on it.

## 10. Follow-ups

- **The `CONTEXT.md` in the instance still carries implementation prose** (Repo Shape,
  Runtime posture, Database posture, Deployment posture) that a domain doc arguably
  should not — `CONTEXT.md` is a glossary. Restructuring it is its own decision.
- **The instance has no working media provider**, so the media library has no storage
  backend. Raised on
  [Grilling: CMS runtime tuning — images, caching, and region (#100)](https://github.com/Chapster87/pghrugby/issues/100),
  which owns the media question. Provider choice is coupled to whether the public site
  consumes CMS image URLs —
  [Grilling: The site's CDA interface contract against an external CMS (#91)](https://github.com/Chapster87/pghrugby/issues/91).
- **Possible instance ADR** for the `pg_cron` schedule. Where the scheduler lives is an
  instance decision with a real trade-off (in-database cron against a Railway cron service
  against a Supabase Scheduled Edge Function), and the instance's own governance puts
  decisions in its `docs/adr/**`. Currently recorded here and in
  [railway-inventory.md](./railway-inventory.md) §6 only.

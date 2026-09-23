# Netlify deploy surface — what a fresh Netlify site needs for this repo

Status: **researched** for
[Research: What a fresh Netlify site needs for this repo](https://github.com/Chapster87/pghrugby/issues/111)
on the wayfinder map. Nothing here is actioned; the findings feed whatever
ticket wires up the site.

> **Measured later, 2026-09-23 — read this before trusting §4.** The site was stood up and the
> two claims this map inherited were tested for real
> ([detail](https://github.com/Chapster87/pghrugby/issues/113)).
>
> - **§4's "deploy-scoped" cache claim did NOT reproduce.** After a fresh deploy, pages cached
>   _before_ it were still served — `/club-bylaws` reported `Age: 3733` against a deploy two
>   minutes old, with `"Next.js"; hit; fwd=stale` and `"Netlify Durable"; fwd=bypass`. Caches
>   **survive deploys**. The `getDeployStore` reading below may describe a layer that is not on the
>   response path. Consequently the "a `revalidateTag` purge acts only within the deploy that wrote
>   the entry" note is **superseded**: the purge route is the only thing that invalidates an entry,
>   which makes it more important, not less. No cold-cache stampede occurs after a release.
> - **Confirmed from this document:** Next 16 support and auto-installation of the runtime, Node 24
>   as the image default, pnpm resolving to 10.x, the runtime being undeclarable, and
>   `revalidateTag(tag, { expire: 0 })` working on a real deploy.
> - **Resolved differently:** the `--shamefully-hoist` concern was moot — the site builds green on
>   an empty `.npmrc`. The `SECRETS_SCAN_OMIT_KEYS` placement was moot too; the file was deleted
>   and a clean scan (358 files, zero matches) was obtained without any omit list.

Question: what does a **fresh Netlify site** need in order to build and serve
the repository at the repo root — a Next.js App Router site that uses pnpm?

Repo facts taken as given (read in this working tree, not re-derived):
`package.json` (`next ^16.3.3`, `react ^19.2.3`, no `packageManager` field),
`pnpm-lock.yaml` (`lockfileVersion: '9.0'`), `.nvmrc` (`24`), an **empty**
`.npmrc`, `next.config.js` (CommonJS; `rewrites()`, `redirects()`,
`images.remotePatterns`, `typescript.ignoreBuildErrors`), and `netlify.toml`
whose only content is a `[build]` table holding `SECRETS_SCAN_OMIT_KEYS`.

Sources (all fetched **2026-09-22**; Netlify doc pages read as their Markdown
source by appending `.md` to the URL, per the convention the docs state on every
page):

- Netlify — [Next.js on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview)
- Netlify — [Framework build settings](https://docs.netlify.com/build/frameworks/overview)
- Netlify — [Available software at build time](https://docs.netlify.com/build/configure-builds/available-software-at-build-time)
- Netlify — [Manage build dependencies](https://docs.netlify.com/build/configure-builds/manage-dependencies)
- Netlify — [Secrets Controller](https://docs.netlify.com/build/environment-variables/secrets-controller)
- Netlify — [Caching overview](https://docs.netlify.com/build/caching/caching-overview)
- Netlify — [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs)
- Netlify — [File-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration)
- Netlify — [Local development with Netlify CLI](https://docs.netlify.com/api-and-cli-guides/cli-guides/local-development)
- Netlify — [Changelog](https://www.netlify.com/changelog/) (entry dated 2026-09-22)
- OpenNext — [Next.js on Netlify](https://opennext.js.org/netlify)
- `opennextjs/opennextjs-netlify` — [README](https://github.com/opennextjs/opennextjs-netlify/blob/main/README.md),
  [releases](https://github.com/opennextjs/opennextjs-netlify/releases),
  [source tree](https://github.com/opennextjs/opennextjs-netlify/tree/main/src),
  [test fixtures](https://github.com/opennextjs/opennextjs-netlify/tree/main/tests/fixtures)
- Next.js — [revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag),
  [Next.js 16](https://nextjs.org/blog/next-16)
- pnpm — [Reading `pnpm-lock.yaml`](https://pnpm.io/lockfile)

---

## Bottom line

**Next.js 16 is supported today, with no documented hard blocker.** The adapter
(`@netlify/plugin-nextjs`, publishing as the "Next.js Runtime" / OpenNext
adapter v5) carries Next-16-specific code, tests and merged fixes, and Netlify's
own 2026-09-22 security advisory directs Next.js-on-Netlify customers to Next
`16.3.6` — i.e. it treats 16.3.x as a supported, deployable version.

Required configuration for a fresh site, all documented:

1. **Build command `next build`, publish directory `.next`** — for SSR/hybrid
   Next.js sites. Not required in `netlify.toml` (Netlify suggests these on repo
   link), but they are the values a manual setup must use.
2. **Nothing else for the runtime itself.** The adapter installs automatically
   and must **not** be declared in `netlify.toml` — declaring it _pins_ it and
   opts out of the per-build auto-update.
3. **Node 24** — already satisfied by `.nvmrc`, which outranks `NODE_VERSION`.
4. **pnpm + Next.js hoisting.** The repo's `.npmrc` is empty, so the documented
   requirement (`PNPM_FLAGS=--shamefully-hoist`, or
   `public-hoist-pattern[]=*` in `.npmrc`) is **not** currently met. This is a
   real, documented gap for a pnpm Next.js site.
5. **Secrets-scanning config is an environment variable, not a `[build]` key.**
   The current `netlify.toml` puts `SECRETS_SCAN_OMIT_KEYS` directly under
   `[build]`, which is not where Netlify documents environment variables going.

Two things that must be settled by measurement, not inference:

- Whether the current `[build] SECRETS_SCAN_OMIT_KEYS = [...]` placement is
  ignored or is a configuration error. Either way the omit list is very likely
  **not** taking effect.
- RSC prefetch amplification on Next.js 16.3.x on Netlify
  ([#3573](https://github.com/opennextjs/opennextjs-netlify/issues/3573), open).

Also worth acting on before the first deploy: the repo pins `next: ^16.3.3`,
which resolves to a version below the `16.3.6` that Netlify's same-day advisory
recommends for a critical `ImageResponse` RCE (see §6).

### Confidence at a glance

| #   | Question                                            | Confidence                                        |
| --- | --------------------------------------------------- | ------------------------------------------------- |
| 1   | Runtime version / auto-install / defaults           | documented                                        |
| 2   | Node 24 and precedence                              | documented                                        |
| 3   | Which pnpm, and lockfile compatibility              | documented (residual gaps marked)                 |
| 4   | Cache handler, ISR, deploy scoping, `revalidateTag` | documented                                        |
| 5   | How secrets scanning matches                        | documented                                        |
| 6   | Next 16 App Router items                            | partly documented; version-specific gaps itemised |

---

## 1. Next.js runtime support

**Answer.** Netlify's Next.js Runtime v5 — the `@netlify/plugin-nextjs`
package, built on the OpenNext adapter — supports Next.js 16.x, including
16.3.x. It is **auto-installed**, so a repo with `next.config.js` and no
`[[plugins]]` entry needs no declaration; declaring it would pin the version and
stop the automatic upgrade. A `netlify.toml` is optional for Next.js sites and
harmless when minimal — but the current file's `[build]` key is not a key
Netlify documents. The defaults for a Next.js site are build command
`next build`, publish directory `.next`.

**Evidence.**

- Version support is expressed as an open-ended floor, not a matrix. The Netlify
  Next.js page says: "We actively maintain the adapter to support all Next.js
  versions starting from version 13.5 and, if you don't pin the version, we will
  automatically update the adapter to the latest version on each project build
  for you." The OpenNext page states the prerequisite as
  "Next.js version 13.5 and later (up to the latest stable version)". The
  adapter README's prerequisites are "Next.js 13.5 or later".
  ([Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview),
  [OpenNext](https://opennext.js.org/netlify),
  [README](https://github.com/opennextjs/opennextjs-netlify/blob/main/README.md))
- The support table marks **Turbopack — "Full Support (dev and build)"** and
  **Cache Components — "Full Support"**. Both are Next.js 16 features (Turbopack
  is Next 16's default bundler; Cache Components is Next 16's caching model), so
  the table cannot be read as pre-16.
  ([Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview),
  [Next.js 16](https://nextjs.org/blog/next-16))
- Next-16 work is visible in the adapter: PR
  [#3211](https://github.com/opennextjs/opennextjs-netlify/pull/3211) "fix:
  incorrect output path of middleware nft for Next.js 16" (merged 2025-10-27,
  six days after Next.js 16 shipped); PR
  [#3349](https://github.com/opennextjs/opennextjs-netlify/pull/3349) "fix:
  handle PPR shells for fully dynamic segments on Next.js 16.1.0+" (merged
  2026-01-05). The repo carries a Next-16-specific fixture suite at
  `tests/fixtures/next-16-tag-revalidation/` and integration test
  `tests/integration/cache-handler.test.ts`.
- The most recent adapter release before this note is **v5.16.0 (2026-09-17)**.
  ([releases](https://github.com/opennextjs/opennextjs-netlify/releases))
- Netlify's changelog entry dated **2026-09-22** tells customers to upgrade to
  "`next` 15.5.26 or later, or **16.3.6** or later, then redeploy" — a
  recommendation to Next 16 users of Netlify.
  ([changelog](https://www.netlify.com/changelog/))
- **Auto-install vs. declare.** "The Next.js Runtime installs automatically for
  new Next.js sites on Netlify." To pin it you install
  `@netlify/plugin-nextjs` **and** add `[[plugins]] package = ...` to
  `netlify.toml`; the docs frame that as "Reverting to an older adapter version
  / Not recommended … You'll be opting out of automatic updates and newer
  architecture improvements maintained through OpenNext."
  ([README](https://github.com/opennextjs/opennextjs-netlify/blob/main/README.md),
  [Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview))
  So: **not declaring the plugin is the correct state**, not an omission.
- **Defaults.** "When you link a repository for a Next.js project, Netlify
  provides a suggested build command and publish directory: `next build` and
  `.next`." For manual configuration Netlify's framework table gives, for
  "SSR or hybrid sites", **Build command `next build` / Publish directory
  `.next`**. The static-only variant (`next build && next export`, publish
  `out`, `NETLIFY_NEXT_PLUGIN_SKIP=true`) does not apply to this repo, which is
  SSR/hybrid.
  ([OpenNext](https://opennext.js.org/netlify),
  [Netlify](https://docs.netlify.com/build/frameworks/overview))
- **What the adapter provisions**, relevant to predictions about this repo's
  routes: "a serverless Netlify Function for handling: Server-Side Rendering
  (SSR), Incremental Static Regeneration (ISR), Partial Prerendering (PPR),
  Route handlers or API routes, and Server Actions", plus "a Netlify Edge
  function for fast execution of Next.js Middleware at the edge", plus the cache
  implementation and Image CDN wiring.
  ([Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview))
- **Is the current `netlify.toml` shape valid?** Netlify documents the keys the
  `[build]` table supports as exactly: "`base` … `publish` … `command` …
  `environment` … `processing`", and says for environment variables
  specifically: "If a key has a list of key/value pairs as its value, you can set
  that key in its own block like this: `[build.environment]`". It also warns the
  reverse direction: "File-based configuration settings take precedence … if you
  have conflicting configuration values, settings specified in `netlify.toml`
  override any corresponding settings in the Netlify UI."
  ([file-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration))
  `SECRETS_SCAN_OMIT_KEYS` is documented as an environment variable (§5), so the
  current placement is not the documented one.
- Why "an empty `netlify.toml` is not the same as a missing one": because
  `netlify.toml` overrides the UI for keys it sets, a _minimal_ file that sets
  nothing Netlify acts on leaves the UI's (and the framework detector's)
  settings in force. A file that sets a key Netlify does not recognise is a
  different situation — see the to-observe list.

**To be observed on a real deploy.** Whether an unrecognised key inside `[build]`
makes the deploy fail with a configuration error, is silently ignored, or is
warned about. How to observe: on the first deploy, read the deploy log for a
`netlify.toml` parse/validation warning, and confirm from the build log whether
`SECRETS_SCAN_OMIT_KEYS` is present in the build environment (`env | grep
SECRETS_SCAN` in the build command would show it; otherwise infer from whether a
secret hit still occurs).

---

## 2. Node version

**Answer.** Yes — Node **24** is the build image's _default_ version, so
`.nvmrc` is asking for something already preinstalled. Netlify reads **both**
`.nvmrc` (and `.node-version`) and the `NODE_VERSION` environment variable, and
they take precedence in this order: **`.nvmrc` → `.node-version` →
`NODE_VERSION` → the UI's Dependency management setting**. So with `.nvmrc`
containing `24`, a disagreeing `NODE_VERSION` would lose.

**Evidence.**

- "Node.js | Default version `24` | Available versions: Any version that `nvm`
  can install | Set the version using: In order of precedence: `.nvmrc` file,
  `.node-version` file, `NODE_VERSION` build environment variable, or the
  Dependency management section in the Netlify UI. For example, a node version
  set in `.nvmrc` will override the node version set in the Netlify UI."
  ([available software](https://docs.netlify.com/build/configure-builds/available-software-at-build-time))
- The image is Ubuntu 24.04 ("Noble Numbat") on that same page.
- Precedence is restated in the dependency-management doc: the UI "select from
  the major Node.js versions that Netlify currently supports … Note that a
  `NODE_VERSION` environment variable, `.node-version` file, or `.nvmrc` file
  will override this UI setting." It also explains the pinning behaviour that
  makes a fresh site safe: "A build's Node.js version is initially determined by
  the default version preinstalled on the site's selected build image. **We pin
  the site to that version** so your builds won't change even if the build
  image's defaults change." Node is fetched via `nvm` and cached when the
  requested version is not preinstalled.
  ([manage dependencies](https://docs.netlify.com/build/configure-builds/manage-dependencies))

**Consequence for this repo.** `.nvmrc` = `24` matches the current image default,
so it is belt-and-braces: it pins the major explicitly rather than relying on
the image default (and on the site-level pin taken at creation). Nothing needs
to change. Note the functions runtime "typically … automatically matches the
version used for the build", with `AWS_LAMBDA_JS_RUNTIME` as the override if a
different function runtime is ever needed.

---

## 3. pnpm resolution

**Answer.** With no `packageManager` field, Netlify installs a pnpm from
**Corepack's default for the selected image, currently `10.x`** — it does _not_
derive a version from the lockfile. That default is compatible with a
`lockfileVersion: '9.0'` lockfile in the sense that `9.0` is the schema pnpm's
own current docs show, and nothing in either project's docs describes a
mismatch. Netlify's docs do **not** state whether the install is run as a frozen
install. An empty `.npmrc` changes nothing about version selection — but it also
does not satisfy the documented pnpm+Next.js hoisting requirement.

**Evidence.**

- Trigger: "If your site's base directory includes a `pnpm-lock.yaml` file, we
  will run `pnpm install` to install the dependencies listed in your
  `package.json`." "Netlify supports pnpm for Node.js 16.9.0 and later."
  ([manage dependencies](https://docs.netlify.com/build/configure-builds/manage-dependencies))
- Version selection: pnpm's row in the tools table reads "Any version corepack
  can install. **Defaults to `10.x`** | `packageManager` field in your
  `package.json` file". The prose confirms the direction of the override: "To
  specify a pnpm version, you can edit your `package.json` file:
  `"packageManager": "pnpm@6.3.2"`. This tells Corepack to use and download your
  preferred pnpm version **instead of the default version that Netlify sets**."
  So the only documented input to the version choice is `packageManager`; the
  lockfile is not one.
  ([available software](https://docs.netlify.com/build/configure-builds/available-software-at-build-time),
  [manage dependencies](https://docs.netlify.com/build/configure-builds/manage-dependencies))
- Lockfile schema: pnpm's own lockfile documentation (version 12.x docs) shows
  `lockfileVersion: '9.0'` throughout its examples and states that "`lockfileVersion`
  … describes the schema of the entries inside a document, not how many
  documents the file contains". A `9.0` lockfile is therefore current, not
  legacy.
  ([pnpm](https://pnpm.io/lockfile))
- Frozen install: **not documented by Netlify.** The dependency-management page
  documents `NPM_FLAGS`, `PNPM_FLAGS`, `NPM_TOKEN`, `NPM_VERSION` and the pnpm
  range limitation from Corepack (`semver` ranges cannot be used in
  `packageManager`) — and says nothing about `--frozen-lockfile` or a lockfile
  drift policy. No claim should be carried over from other platforms on this
  point.
  ([manage dependencies](https://docs.netlify.com/build/configure-builds/manage-dependencies))
- **The real pnpm finding for this repo — hoisting.** Because this is Next.js
  **and** pnpm, OpenNext's pnpm section says "you must do one of the following":
  (a) "Set a `PNPM_FLAGS` environment variable with a value of
  `--shamefully-hoist`. This appends a `--shamefully-hoist` argument to the
  `pnpm install` command that Netlify runs", or (b) "Enable public hoisting by
  adding an `.npmrc` file in the root of your project with this content:
  `public-hoist-pattern[]=*`". Netlify's own page repeats this as "To avoid
  import issues with pnpm and these frameworks, use the `PNPM_FLAGS` environment
  variable and set it to `--shamefully-hoist`."
  ([OpenNext](https://opennext.js.org/netlify),
  [manage dependencies](https://docs.netlify.com/build/configure-builds/manage-dependencies))
  The repo's `.npmrc` exists but is **empty**, so neither branch is satisfied.
  Note the tension to resolve: _this_ is where `.npmrc` would matter, and also
  where a build-time environment variable would — and per §5/§1, a build
  environment variable belongs in `[build.environment]` in `netlify.toml` (or in
  the UI), not loose in `[build]`.

**To be observed on a real deploy.** (i) The exact pnpm version printed in the
build log (`pnpm --version` / the install banner) — expected `10.x`. (ii)
Whether the install is frozen and what it does on lockfile drift — observe by
reading the install command line in the build log. (iii) Whether the build
succeeds _without_ `--shamefully-hoist`; if it does, the documented requirement
is unsatisfied but not currently biting, which is worth knowing explicitly rather
than assuming.

---

## 4. Cache handler and ISR

**Answer.** What backs Next.js ISR / the Data Cache on Netlify is a
**deploy-scoped Netlify Blobs store** (`getDeployStore`), fronted by a
**request-scoped in-memory LRU cache** for the duration of a single invocation,
and by Netlify's CDN cache at the edge. So yes — there is a
deploy-scoped-vs-request-scoped distinction, and Netlify Blobs is involved.
**Nothing needs to be configured** to enable it: the adapter sets up "the
caching implementation for both the Next.js Full Route Cache and Data Cache, and
handles tag-based and path-based revalidation". Because the store is
deploy-scoped, **a new deploy starts with its own cache**: pre-rendered pages and
revalidated entries are regenerated on first access after a deploy, and a
`revalidateTag` purge only ever has to act within the deploy that wrote the
entry (plus a CDN tag purge). `revalidateTag`'s second argument — including
Next 16's `{ expire: 0 }` — is supported, and on-demand revalidation via a Route
Handler is a first-class, tested path.

**Evidence.**

- **The store is deploy-scoped.** The adapter's blob store helper calls
  `getDeployStore` from `@netlify/blobs`, and pins the region to `us-east-2`
  unless `USE_REGIONAL_BLOBS=TRUE` is set:
  `getDeployStore({ ...args, fetch: getFetchBeforeNextPatchedIt(), region:
process.env.USE_REGIONAL_BLOBS?.toUpperCase() === 'TRUE' ? undefined : 'us-east-2' })`.
  ([`src/run/storage/regional-blob-store.cts`](https://github.com/opennextjs/opennextjs-netlify/blob/main/src/run/storage/regional-blob-store.cts))
- **What "deploy-specific" means** (Netlify Blobs): "Opens a deploy-specific
  store for reading and writing blobs. **Data added to that store will be scoped
  to a specific deploy**, available on all deploy contexts…"; "Deploy deletion
  deletes deploy-specific stores only"; "**Deploy-specific stores** default to
  the same region your functions are configured to run in." The same page
  contrasts this with `getStore`, whose "data … will be persisted on new
  deploys".
  ([Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs))
  This is why the adapter pins `us-east-2`: to keep the cache co-located
  regardless of the site's functions region, with `USE_REGIONAL_BLOBS=TRUE` as
  the documented-in-code opt-out.
- **The request-scoped layer.** `src/run/storage/request-scoped-in-memory-cache.cts`
  implements an LRU whose entries "are scoped to request IDs"
  (keyed `${requestContext.requestID}:${key}`), plus a cross-request
  `Map` of weak references used only for conditional (ETag) gets. Its size
  default is `50 * 1024 * 1024 // 50MB, same as default Next.js config`, and it
  is settable from the Next config via
  `setInMemoryCacheMaxSizeFromNextConfig`. Its own comment frames it as
  optional: "using in-memory store is perf optimization not requirement".
  ([source](https://github.com/opennextjs/opennextjs-netlify/blob/main/src/run/storage/request-scoped-in-memory-cache.cts))
- **The handler set.** `src/run/handlers/` contains `cache.cts`,
  `tags-handler.cts` (the tag cache), and `use-cache-handler.ts`; the build side
  has `src/build/cache.ts`. The integration suite has
  `tests/integration/cache-handler.test.ts`, `revalidate-tags.test.ts` and
  `revalidate-path.test.ts`.
  ([tree](https://github.com/opennextjs/opennextjs-netlify/tree/main/src/run/handlers),
  [tests](https://github.com/opennextjs/opennextjs-netlify/tree/main/tests/integration))
- **No configuration required, and what the adapter wires.** "Configures the
  caching implementation for both the Next.js Full Route Cache and Data Cache,
  and handles tag-based and path-based revalidation"; "**Automatic fine-grained
  caching:** the adapter uses our fine-grained caching primitives to support the
  Next.js Full Route Cache and Data Cache. This means that static page responses
  are automatically cached at the edge and can be revalidated by path or by
  tag."
  ([Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview))
- **What a new deploy does to the cache, stated by Netlify.** For SSG:
  "Pre-rendered pages are stored in Next.js route cache, and fetched from the
  route cache by a function invocation when first accessed after a deploy."
  Separately, the CDN side: "all new deploys invalidate the cache for the given
  deploy context by default … This automation means that a cached asset may be
  invalidated despite the cache control headers indicating that the asset should
  still be considered fresh."
  ([Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview),
  [caching overview](https://docs.netlify.com/build/caching/caching-overview))
- **Netlify runtime 5.5.0+ uses the durable cache** for Next.js: "On Netlify,
  cacheable responses on sites using the Next Runtime 5.5.0 or later
  automatically use the durable cache."
  ([caching overview](https://docs.netlify.com/build/caching/caching-overview))
- **On-demand revalidation generally.** "On-demand and time-based
  revalidation: both the App Router and Pages Router support on-demand and
  time-based revalidation, allowing you to revalidate and regenerate content at
  any time after a deploy." Request-time purge mechanics on Netlify's side are
  the `purgeCache` helper / `purge` API, which purge by site or by cache tag, and
  which accept `deployAlias` / `domain` to target a deploy.
  ([Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview),
  [caching overview](https://docs.netlify.com/build/caching/caching-overview))
- **`revalidateTag(tag, { expire: 0 })` — supported, and tested against Next 16.**
  Next's own docs define the signature as
  `revalidateTag(tag: string, profile: string | { expire?: number }): void`, with
  `{ expire: 0 }` meaning "Stale content is never served, so the next request is
  a blocking revalidate/cache miss", and give the exact use case this repo has —
  a Route Handler called from outside a Server Action: "When the invalidation
  comes from outside a Server Action, for example a webhook or another service
  calling a Route Handler, `updateTag` is not available. Pass `{ expire: 0 }` to
  expire the data immediately." The adapter tracks this explicitly: fixture
  suite `tests/fixtures/next-16-tag-revalidation/` contains
  `app/api/revalidate-tag/route.ts`, `app/revalidate-tag-string-profile/`, and
  `app/revalidate-tag-explicit-inline-expire/` (the inline-object form), and
  release **v5.15.12 (2026-06-18)** landed "mark prerendered content as less
  stale now that **expire setting is enforced** for marking for blocking
  re-render" — i.e. the `expire` value is read, not ignored.
  ([Next.js](https://nextjs.org/docs/app/api-reference/functions/revalidateTag),
  [fixtures](https://github.com/opennextjs/opennextjs-netlify/tree/main/tests/fixtures/next-16-tag-revalidation),
  [releases](https://github.com/opennextjs/opennextjs-netlify/releases))
- **One operational constraint worth knowing for a CMS-driven revalidate route:**
  "Each cache tag or site can only be purged twice every 5 seconds. If you
  exceed this rate limit, you will receive a `429` response code."
  ([caching overview](https://docs.netlify.com/build/caching/caching-overview))
  A publish burst that calls a tag-purge route once per edited record can trip
  this.

**Consequence for this repo.** The `src/app/api/revalidate/route.ts` POST
handler calling `revalidateTag(tag, { expire: 0 })` is the shape Next documents
for an externally-triggered purge, and the adapter has fixture coverage for that
precise call on Next 16. Because the cache store is deploy-scoped, a purge does
not need to reach other deploys, and a new deploy does not inherit a stale
entry — which removes a class of "stale after deploy" bugs but also means the
cache is cold right after each deploy.

**To be observed on a real deploy.** (i) That `/api/revalidate` returns 200 and
that the tagged page changes on the next request. (ii) Whether a tag purge
serves stale-then-fresh or blocks, which is what `{ expire: 0 }` is meant to
decide — observable by timing two requests either side of a purge. (iii) Cold
cache behaviour on the first request after a deploy (expect a function
invocation to render, per the SSG note).

---

## 5. Secrets scanning

**Answer.** Netlify's secrets scanning matches **secret VALUES**, not environment
variable names. It scans every file in the build — code pulled from the repo
_and_ files generated during the build — looking for the values of environment
variables that have been explicitly flagged as secrets (and, independently,
values that its heuristic "smart detection" thinks look like secrets). A match
**fails the build**, before publish. A server-only secret whose value never
lands in any build file produces no match, so no omit configuration is needed
for it. `SECRETS_SCAN_OMIT_KEYS` is still the current, documented mechanism
(taking comma-separated **key names** to exclude from scanning), with
`SECRETS_SCAN_OMIT_PATHS`, `SECRETS_SCAN_ENABLED`,
`SECRETS_SCAN_SMART_DETECTION_ENABLED` and
`SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES` as the alternatives — but all of these
are **environment variables**, which is the catch for the current `netlify.toml`.

**Evidence.**

- Matching is by value: "This process scans your repository code and build output
  files for the existence of **secret values**. If the scanning process finds
  secret values, it fails the build and adds the location of the secret values to
  the deploy log. secret scanning happens before publish and deploy steps…"
  ([Secrets Controller](https://docs.netlify.com/build/environment-variables/secrets-controller))
- Scope: "secret scanning searches all files that are in your site's build,
  **including code pulled from the repo and files generated during the build**."
- Threshold and encodings: "secret scanning only searches for environment
  variable secret **values** that have more than four characters and are not
  booleans", and it searches permutations — "plaintext, base64-encoded,
  URI-encoded", plus multi-line values both as one line and in multi-line form,
  with a worked example (`SECRET_ALPHABET="abc\ndef\nghi"` matching four ways).
- Which values it looks for at all: those of variables flagged as secrets. "When
  you explicitly mark which environment variables have secret values, Netlify
  proactively protects your team with secret scanning." The flag is per variable
  (`Contains secret values` in the UI, `--secret` on `env:set`, `is_secret` on
  the API), and it is write-only and irreversible.
- The flag is what `SECRETS_SCAN_OMIT_KEYS` is about: "**`SECRETS_SCAN_OMIT_KEYS`:**
  default is _empty_. Set to a comma separated list of **key names** that should
  **not be scanned for** within this site or team." So the mechanism keys off the
  variable's _name_ to decide whose _value_ to stop looking for.
- Alternatives, verbatim defaults: "**`SECRETS_SCAN_ENABLED`:** default is
  `true`. Set to `false` to entirely disable all secret scanning protections for
  the site/team, including both smart detection and scanning for environment
  variables marked as secrets"; "**`SECRETS_SCAN_OMIT_PATHS`:** default is
  _empty_. Set to a comma separated list of file paths (relative to the
  repository root) that should not be scanned… Values can be substrings of paths
  or use a glob pattern format." For smart detection: turn it off with
  `SECRETS_SCAN_SMART_DETECTION_ENABLED=false`, or safelist false positives with
  `SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES` — and Netlify's guidance is the
  safelist: "Consider adding false positives to a safelist instead of turning off
  smart detection."
- Smart detection is a **separate** mechanism with no configuration: "Unlike
  Netlify's standard secret scanning, smart detection doesn't require any manual
  configuration or environment variables. When Netlify detects a potential
  secret … The build will automatically fail … The deploy log will identify the
  location of the exposed secret."
- **Placement.** These are environment variables — "set any of the following
  environment variables at the site or team level" — and per §1, environment
  variables in `netlify.toml` go under `[build.environment]` (or
  `[context.<ctx>.environment]`), while the `[build]` table's documented keys are
  `base`, `publish`, `command`, `environment`, `processing`. The current file
  puts `SECRETS_SCAN_OMIT_KEYS` directly under `[build]`.
  ([Secrets Controller](https://docs.netlify.com/build/environment-variables/secrets-controller),
  [file-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration))
- The docs also note the limits of a repo-side scanner, which is the situation
  the current `netlify.toml` comment is reasoning about: "there are secret values
  on Netlify that your code repo is unlikely to discover. For example, database
  passwords or server secret keys provided at runtime are unlikely to be in your
  code repository's list of secrets."

**Consequence for this repo.** If `RESEND_API_KEY` and `GOOGLE_CALENDAR_API_KEY`
are flagged as secrets on the new site and their values only ever exist in the
runtime environment (read in server code, never inlined), a match requires the
value to appear in a build file — so nothing should be flagged, and no omit entry
should be necessary. The omit list is therefore best treated as the belt the
existing comment says it is — but it must be declared as an environment variable
(`[build.environment]` or the UI/CLI) to be the belt it is meant to be. Note the
asymmetry the docs make explicit: _smart detection_ is always on and needs no
config, so a build can fail for a heuristically-detected secret even if no
variable is flagged, and the documented remedy there is the safelist variable,
not `SECRETS_SCAN_OMIT_KEYS`.

**To be observed on a real deploy.** (i) Whether the current `[build]` placement
is rejected, warned about, or silently ignored — read the deploy log for a
`netlify.toml` validation message. (ii) Whether the new site's variables are
actually flagged as secrets (that flag is a UI/API state, invisible from the
repo). (iii) Whether the first real build passes scanning with no omit in
effect. (iv) Whether smart detection fires on anything in the repo or in the
build output.

---

## 6. Other Next 16 App Router concerns

**Answer.** No `output` mode is required: Netlify's Next.js support is
zero-config, and the only documented `output`-related exception is static
export. `next/image` uses Netlify Image CDN by default, so
`images.remotePatterns` for `res.cloudinary.com` and `files.stripe.com` is the
supported configuration path (and the one Next 16 prefers over the deprecated
`images.domains`). Middleware is supported and runs as an Edge Function, with
route handlers and metadata routes covered by the same server function.
`netlify dev` is worth adopting for routing/redirect and edge behaviour, but it
is _not_ a faithful test of blob-backed caching. The real risks on Next 16.3.x
today are not missing features but two open behavioural items and one security
advisory — itemised below.

**Evidence and items.**

- **No `output` mode needed.** The Next.js page documents zero-configuration
  support and the adapter's provisioning; nothing requires `output: 'standalone'`
  or similar. The only related requirement is for static-only sites
  (`next export`, publish `out`, `NETLIFY_NEXT_PLUGIN_SKIP=true`), which does not
  apply here.
  ([Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview),
  [frameworks](https://docs.netlify.com/build/frameworks/overview))
- **Images.** "Image optimization: the `next/image` component uses Netlify Image
  CDN by default, to ensure your images are optimized and served in the most
  efficient format", and the support table lists Image Optimization as full
  support. `remotePatterns` is exercised by the adapter's own fixtures
  (`tests/fixtures/simple/app/image/remote-pattern-1`, `remote-pattern-2`, and
  `remote-domain` for the legacy `images.domains`), so both config shapes are
  covered. Next 16 **deprecates `images.domains` in favour of
  `images.remotePatterns`** — the repo already uses `remotePatterns`. Next 16
  also changes image defaults (`minimumCacheTTL` 60s → 4 hours,
  `imageSizes` drops `16`, `qualities` becomes `[75]`, `maximumRedirects` capped
  at 3) and requires `images.localPatterns` for local `src` with query strings —
  worth knowing, because `files.stripe.com` product images are resolved by
  expanding a Stripe Price's Product server-side and could hit redirects or a
  non-default `quality`.
  ([Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview),
  [Next.js 16](https://nextjs.org/blog/next-16))
- **Middleware / proxy.** Supported: "Middleware | ✓ | Full support. Implemented
  automatically via Edge Functions. Note there are some limitations, including a
  Node.js Middleware specific limitation." The documented limitations: SSR pages
  on the `edge` runtime "run in your functions region with the Node.js runtime,
  rather than in edge locations"; "Rewrites in Next.js configuration can't point
  to static files in the public directory" (**relevant here — `next.config.js`
  has `rewrites()`**); "Headers and redirects are evaluated after middleware,
  differing from stand-alone Next.js behavior"; and for Node.js Middleware,
  "C++ Addons are not supported" and "Filesystem is not supported".
  ([Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview))
  Next 16 renamed `middleware.ts` to `proxy.ts` (Node runtime by default, with
  `middleware.ts` deprecated but still available for edge cases). The adapter
  tracks this: fixtures include `proxy.ts` and `middleware-node.ts` variants, and
  v5.16.0's notes include "await the Node middleware require in the generated
  edge handler template".
  ([Next.js 16](https://nextjs.org/blog/next-16),
  [releases](https://github.com/opennextjs/opennextjs-netlify/releases),
  [fixtures](https://github.com/opennextjs/opennextjs-netlify/tree/main/tests/e2e))
  This repo has neither `middleware.ts` nor `proxy.ts` today, so this is forward
  looking.
- **Route handlers.** "Route Handlers | ✓ | Full Support", and the server
  function handles "Route handlers or API routes". The repo's
  `src/app/api/revalidate/route.ts` therefore lands on that function.
  ([Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview))
- **`robots.ts`.** Not named anywhere in Netlify's or OpenNext's Next.js
  documentation. Mechanically it is a metadata route emanating from the App
  Router, so it falls under route handlers/full support — but nothing states it
  explicitly. **To be observed on a real deploy:** `GET /robots.txt` returns 200
  with the expected body.
- **`netlify dev`.** Netlify Dev "automatically detects tools and frameworks like
  Gatsby, Hugo, Eleventy, Next.js, and more to configure a local development
  server that mimics the Netlify production environment", and for Next.js it
  "suggests a dev command and port: `next` and `3000`"; the repo's own dev script
  is `next dev -p 8000`, which would need `[dev] targetPort = 8000` (or the
  `--target-port` flag) to line up. It runs with the `dev` deploy context's
  environment variables, and `[dev]` cannot carry an `environment` key —
  `[context.dev.environment]` is the documented place.
  ([local development](https://docs.netlify.com/api-and-cli-guides/cli-guides/local-development),
  [file-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration),
  [OpenNext](https://opennext.js.org/netlify))
  **Caveat that limits its value here:** "Local development with Netlify Dev uses
  a sandboxed local store that does not support file-based uploads. You cannot
  read production data during local development." So `netlify dev` is worth
  adopting for redirect/rewrite/edge-function and env-var behaviour, but it will
  not reproduce the deploy-scoped Blobs caching from §4.
  ([Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs))

### Version-specific to Next 16 — the high-risk items

1. **RSC prefetch amplification on 16.3.x — OPEN, no confirmed fix.**
   [opennextjs-netlify#3573](https://github.com/opennextjs/opennextjs-netlify/issues/3573)
   (opened 2026-09-15, state `open`, last updated 2026-09-15): after upgrading a
   Next.js App Router site from 16.0.10 to **16.3.4** and deploying to Netlify,
   RSC prefetch requests for the same link multiply across reloads (4 → 20 → 60 →
   80 → apparent infinite loop), taking the reporter from ~200–300k to ~25M web
   requests/day and ~80–90GB/day bandwidth; `next start` locally does not
   reproduce it, and disabling `<Link prefetch>` stops it. The reporter's second
   comment adds that another production App Router app on **16.3.3** hosted on
   Azure "does not exhibit the issue", and a third, cross-repo data point
   (`opennextjs-cloudflare#1334`) suggests it is not Netlify-only. There is **no
   maintainer fix recorded on the issue**. Adjacent but distinct: PR
   [#3574](https://github.com/opennextjs/opennextjs-netlify/pull/3574) ("fix:
   preserve initURL", merged 2026-09-17, shipped in v5.16.0) fixes a _different_
   Next-16.3 symptom — RSC requests missing a matching `_rsc` param getting a 307
   whose `Location` is built from `initURL`, which sent browsers to an internal
   rewrite target when the `?_rsc` param was lost. Do **not** read #3574 as
   having fixed #3573; they are separate issues about the same RSC request path.
   **To be observed:** after the first deploy, load a page in a browser with the
   Network panel open and reload several times, counting requests for a given
   `?_rsc=` URL, and watch request/bandwidth counts in the Netlify UI. If it
   reproduces, the documented workaround is `prefetch={false}` on `<Link>`; the
   version-level workaround is pinning back to 16.0.x.
2. **Next 16.3 turns on `experimental.validateRSCRequestHeaders` by default, and
   the adapter needed a fix for it.** PR #3574's description states this
   explicitly and says the fix requires the adapter's `x-next-public-url` header
   handling and a matching `Netlify-Vary`. Because the repo does not pin the
   adapter (§1), a fresh site's builds get the fixed adapter automatically — but
   this is an argument _against_ ever pinning the adapter, and against pinning
   Next.js without checking the adapter's release notes. The repo's
   `next.config.js` `rewrites()` and `redirects()` make the rewrite-related part
   of this relevant.
   ([PR #3574](https://github.com/opennextjs/opennextjs-netlify/pull/3574))
3. **`instrumentation.ts` `register()` not invoked on cold start — OPEN.**
   [opennextjs-netlify#3503](https://github.com/opennextjs/opennextjs-netlify/issues/3503)
   (opened 2026-05-03, state `open`; reported on Next `^16.2.4` with
   `@netlify/plugin-nextjs ^5.15.10`): the Next.js instrumentation hook does not
   fire in the Netlify function bundle, so `Sentry.init()` from `register()` never
   runs; an explicit `Sentry.init()` in the route file works. Not currently
   relevant (the repo has no `instrumentation.ts`) but a blocker for adopting
   Sentry-style instrumentation on this stack.
4. **Security: a critical `ImageResponse` RCE**, patched in `next` **16.3.6**
   (and 15.5.26). Netlify's advisory is dated 2026-09-22 and says sites are
   affected only if they use `ImageResponse` **and** render untrusted input into
   it; on Netlify the impact is a crashed function invocation rather than code
   execution, but exploitation increases function cost, and "any publicly
   available deploy previews and branch deploys may remain vulnerable until they
   are automatically deleted". The repo's `next: ^16.3.3` range permits 16.3.6,
   but `^16.3.3` as written does not _require_ it — a lockfile pinned at 16.3.3–5
   would install a vulnerable version.
   ([changelog](https://www.netlify.com/changelog/))
5. **Already-fixed Next 16 items, for completeness.** The `cacheComponents`/
   PPR-shell build failure on Next 16.1.x
   ([#3344](https://github.com/opennextjs/opennextjs-netlify/issues/3344)) was
   fixed by [#3349](https://github.com/opennextjs/opennextjs-netlify/pull/3349),
   and the Next 16 middleware-nft output path by
   [#3211](https://github.com/opennextjs/opennextjs-netlify/pull/3211). Neither
   applies to this repo (no `cacheComponents`, no proxy/middleware), and both are
   in shipped releases.
6. **Where per-version gaps are recorded.** Netlify's Next.js page says "Open
   issues are documented in the end-to-end test report page" —
   `https://runtime-e2e-report.netlify.app/`. That report, not this note, is the
   authoritative per-feature/per-version matrix as Next.js releases move; the
   adapter repo also carries `e2e-report/` and `report/` with
   `test-results.json` and an issue feed.
   ([Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview))

---

## Could not be established from primary sources

Everything above is either cited or labelled. The following were **not**
answerable from Netlify's docs, OpenNext's docs, the adapter's source/releases,
Next.js's docs, or pnpm's docs, and are therefore left as measurements rather
than claims:

1. **What actually happens to `SECRETS_SCAN_OMIT_KEYS` when declared under
   `[build]`.** Netlify documents that it is an environment variable and
   documents where environment variables go; it does not document the handling of
   unrecognised `[build]` keys. _To be observed:_ deploy-log messages plus whether
   `SECRETS_SCAN_OMIT_KEYS` is present in the build environment.
2. **Whether Netlify runs `pnpm install` frozen, and its behaviour on lockfile
   drift.** _To be observed:_ the install command printed in the build log.
3. **The exact pnpm version selected for a repo with no `packageManager`.**
   Documented as "defaults to `10.x`", but the resolved patch version is not
   stated. _To be observed:_ the install/version banner in the build log.
4. **Whether this repo builds without `--shamefully-hoist`.** The requirement is
   documented for pnpm+Next.js; whether _this_ dependency graph trips it is not.
   _To be observed:_ a build with the flag absent.
5. **Whether `robots.ts` is served correctly.** No primary source names metadata
   routes. _To be observed:_ `GET /robots.txt`.
6. **Whether #3573 (RSC prefetch amplification) affects this repo.** _To be
   observed:_ reload counting as described in item 1 of §6.
7. **Whether the flagged-as-secret state exists for this site's variables.**
   Site-side state, not repo-side. _To be observed:_ Netlify UI
   `Contains secret values` on each variable, plus the first build's scan result.
8. **The current per-version support matrix.** The docs express support as
   "13.5 and later" with no matrix, and point at the E2E report. To answer
   version questions authoritatively, read
   `https://runtime-e2e-report.netlify.app/` at the time of asking.

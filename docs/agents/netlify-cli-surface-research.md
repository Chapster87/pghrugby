# Netlify CLI surface — what the CLI can own, and what it cannot

Status: **researched** for
[Research: What should the Netlify CLI own for this setup](https://github.com/Chapster87/pghrugby/issues/114)
on the wayfinder map. Nothing here is actioned; the findings feed whatever
ticket stands up the site.

Companion to [netlify-deploy-surface-research.md](./netlify-deploy-surface-research.md)
(issue #111), which owns the runtime/Node/pnpm/Blobs/secrets-matching ground.
This document does **not** re-derive those findings; it takes them as given and
answers the CLI-shaped questions: env as code, local pre-flight, deploy
mechanism, config as code, and the smallest reproducible command set.

Question: what should the Netlify CLI own in this setup, so configuration is
reproducible and reviewable rather than clicked into a dashboard — and what can
it **not** do, so we do not build a false sense of local parity?

Sources (all fetched **2026-09-22**). Netlify doc pages are cited as
`docs.netlify.com/...`; the Markdown source of any such page is available by
appending `.md` to its URL, per the note the docs carry on every page. CLI
reference pages are cited as `cli.netlify.com/commands/<name>/`. Source claims
cite the file in `netlify/cli` or `netlify/build` (the `@netlify/config` and
`@netlify/build-info` packages live in `netlify/build`); where a claim comes from
the **published, versioned** package rather than `main`, the version is named.

- Netlify docs — [Get started with environment variables](https://docs.netlify.com/build/environment-variables/get-started),
  [Environment variables overview](https://docs.netlify.com/build/environment-variables/overview),
  [Secrets Controller](https://docs.netlify.com/build/environment-variables/secrets-controller),
  [File-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration),
  [Manage build dependencies](https://docs.netlify.com/build/configure-builds/manage-dependencies),
  [Framework build settings](https://docs.netlify.com/build/frameworks/overview),
  [Next.js on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview),
  [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs),
  [Get started with Netlify CLI](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli),
  [Local development with Netlify CLI](https://docs.netlify.com/api-and-cli-guides/cli-guides/local-development),
  [Deploy overview](https://docs.netlify.com/deploy/deploy-overview),
  [Create deploys](https://docs.netlify.com/deploy/create-deploys),
  [Manage deploys](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview)
- Netlify CLI reference — [`env`](https://cli.netlify.com/commands/env/),
  [`deploy`](https://cli.netlify.com/commands/deploy/),
  [`build`](https://cli.netlify.com/commands/build/),
  [`dev`](https://cli.netlify.com/commands/dev/),
  [`sites`](https://cli.netlify.com/commands/sites/),
  [`status`](cli.netlify.com/commands/status/),
  [`api`](https://cli.netlify.com/commands/api/)
- `netlify/cli` — [`src/commands/deploy/deploy.ts`](https://github.com/netlify/cli/blob/main/src/commands/deploy/deploy.ts),
  [`src/commands/env/env-set.ts`](https://github.com/netlify/cli/blob/main/src/commands/env/env-set.ts),
  [`src/commands/env/env-import.ts`](https://github.com/netlify/cli/blob/main/src/commands/env/env-import.ts),
  [`src/lib/build.ts`](https://github.com/netlify/cli/blob/main/src/lib/build.ts),
  [`src/utils/build-info.ts`](https://github.com/netlify/cli/blob/main/src/utils/build-info.ts),
  [`docs/commands/deploy.md`](https://github.com/netlify/cli/blob/main/docs/commands/deploy.md)
- `netlify/build` — [`packages/build-info/src/frameworks/next.ts`](https://github.com/netlify/build/blob/main/packages/build-info/src/frameworks/next.ts),
  [`.../frameworks/framework.ts`](https://github.com/netlify/build/blob/main/packages/build-info/src/frameworks/framework.ts),
  [`.../settings/get-build-settings.ts`](https://github.com/netlify/build/blob/main/packages/build-info/src/settings/get-build-settings.ts),
  [`packages/config/src/parse.ts`](https://github.com/netlify/build/blob/main/packages/config/src/parse.ts),
  [`packages/config/src/path.ts`](https://github.com/netlify/build/blob/main/packages/config/src/path.ts),
  published [`@netlify/config@25.2.5`](https://cdn.jsdelivr.net/npm/@netlify/config@25.2.5/lib/path.js)

**Not inspected, because out of scope:** nothing was installed, no `netlify`
command was run, and no site was linked or authenticated. The CLI is not present
on this machine (`netlify --version` → `command not found`), so there is no local
`--help` capture to cite; every CLI claim below is from the published command
reference or the CLI's own source and generated docs.

---

## Bottom line

**The CLI can own almost all of the stand-up, with two exceptions that matter.**
`link`/`sites:create`, the whole env surface, the pre-flight build, and deploys
are all first-class documented commands. What the CLI cannot do — and what makes
a claim of "local parity" false — is twofold:

1. **A flagged secret cannot be read back, and its real value is not available to
   a local build.** Secret values are write-only and only unmasked to code running
   on Netlify, so `netlify build --context production` does not see the values the
   platform will inject. Anything that only fails with a real secret present cannot
   be caught locally. ([Secrets Controller](https://docs.netlify.com/build/environment-variables/secrets-controller))
2. **Branch deploys and Deploy Previews are git-integration features.** The CLI
   cannot create either; `--alias` is explicitly not a branch deploy. ([Create deploys](https://docs.netlify.com/deploy/create-deploys),
   [`deploy`](https://cli.netlify.com/commands/deploy/))

Everything else — including a *better than `pnpm build`* pre-flight, because
`netlify build` runs the same `@netlify/build` pipeline **and** the Next.js
Runtime adapter locally — is documented and reproducible.

### Confidence at a glance

| # | Question | Confidence |
| --- | --- | --- |
| 1 | Env as code: subset import, `--secret`, bulk unset/overwrite, read-back, deploy-time import | documented (two behaviours marked to be observed) |
| 2 | Pre-flight: what `netlify build` / `netlify dev` actually do | documented for the pipeline; adapter-parity of the *build* path documented from source; `dev` gaps documented |
| 3 | Deploy mechanism: atomicity, drafts, branch deploys, publishing | documented (CLI `--prod` deploy *context* marking marked to be observed) |
| 4 | Config as code: `netlify.toml` vs UI vs `next.config.js`; YAML/JSON | documented (YAML/JSON: documented as *not* supported by current source) |
| 5 | Recommendation and minimal command list | documented |

---

## 1. Env as code

**Answer.** A **curated file is required** — `env:import` takes a whole file and
has no key selector, and it cannot set scopes, contexts, or the secret flag. The
`--secret` flag on `env:set` marks a variable so its value is no longer readable,
and it is the flag that makes the secrets scanner look for that variable's *value*.
Bulk correction is possible (`env:import --replace-existing` replaces every site
variable; `env:unset` deletes one) but `--replace-existing` is destructive and
also drops secret flags. Values **are** listable back for audit — keys always, and
values for non-secret variables — but a variable flagged as a secret is write-only
outside the `dev` context, which is exactly the audit case we would want. Netlify's
own build system never reads `.env` files, and `netlify.toml`-declared variables do
not reach Functions/Edge Functions, so runtime secrets for this SSR app must live in
the site env store.

**Evidence.**

- **`env:import` has no subset selector.** The command takes one positional
  argument (`fileName`) and its only non-connection flags are `--json`,
  `--replace-existing`, `--filter`, `--debug`, `--auth`, `--site`. There is no
  `--key`, no glob, no `--context`, no `--scope`, and no `--secret`.
  ([`env`](https://cli.netlify.com/commands/env/)) It parses the file whole with
  `dotenv.parse(envFileContents)` and posts every key.
  ([`env-import.ts`](https://github.com/netlify/cli/blob/main/src/commands/env/env-import.ts))
  The docs state the same shape from the other side: "The imported variables are
  set to **all scopes** and with the **same value for all deploy contexts**", and
  the CLI "can only use it to import site environment variables".
  ([Get started with environment variables](https://docs.netlify.com/build/environment-variables/get-started))
  ⇒ **the subset must be curated outside Netlify**, in a file that contains only
  the keys from `docs/agents/environment-secrets-inventory.md` § 3.1.
- **`--secret` means "this value is no longer readable".** The flag's own help text
  is "Indicate whether the environment variable value can be read again", and the
  example `netlify env:set VAR_NAME --secret` is annotated "convert existing
  variable to secret". ([`env`](https://cli.netlify.com/commands/env/))
- **`--secret` is what makes the scanner scan a value.** "When you explicitly mark
  which environment variables have secret values, Netlify proactively protects your
  team with secret scanning. This process scans your repository code and build
  output files for the existence of secret values"; the scan searches for the
  *values* of variables so marked. Smart detection is the independent, always-on
  mechanism with "no manual configuration". ([Secrets Controller](https://docs.netlify.com/build/environment-variables/secrets-controller))
  ⇒ A variable imported by `env:import` and never flagged is **not** covered by
  value scanning (smart detection still applies). This is the mechanical reason
  the current `SECRETS_SCAN_OMIT_KEYS` question is coupled to how the vars are set.
- **`--secret` is enforced, not merely documented.** The CLI refuses a secret in
  the post-processing scope ("Secret values cannot be used within the post-processing
  scope"), refuses a secret value in the dev context or in `all`
  ("To set a secret environment variable value, please specify a non-development
  context with the `--context` flag"), and refuses context+scope together on an
  existing variable. Converting an existing variable to secret without a context
  logs "This secret's value will be empty in the dev context" and blanks the dev
  value. ([`env-set.ts`](https://github.com/netlify/cli/blob/main/src/commands/env/env-set.ts))
- **Secrets are write-only; non-secrets are readable.** "Secret values are
  write-only. After setting a value using the UI, CLI, or API, you will no longer
  have access to a human-readable version of the value"; "After an environment
  variable is flagged as a secret, you cannot remove the flag to reveal the
  secret's value"; "Our UI, CLI, and API won't return unmasked values of environment
  variable secrets for any deploy context besides `dev`". ([Secrets Controller](https://docs.netlify.com/build/environment-variables/secrets-controller))
  ⇒ **`env:list` is an audit tool only for non-secret variables.** For a flagged
  secret you get the key, scope and context shape, not the value. The one documented
  exception is a `dev`-context value, which is deliberately outside the policy —
  "only the value for the `dev` deploy context will be unmasked from the UI, CLI,
  and API". Note the overview's constraint that `Local development` values
  themselves "cannot be marked as secret". ([Environment variables overview](https://docs.netlify.com/build/environment-variables/overview))
- **Read-back and export are documented, with the caveat above.** `env:list` and
  `env:get` "include netlify.toml" in resolution and support `--context`, `--scope`,
  `--json`, `--plain`; `--plain` is the documented `.env` export path, e.g.
  `netlify env:list --plain --context production > .env`. The CLI "will not include
  raw, unmasked values of any environment variables marked as secret unless the
  `--context` is `dev`". ([`env`](https://cli.netlify.com/commands/env/),
  [Get started with environment variables](https://docs.netlify.com/build/environment-variables/get-started))
- **Bulk overwrite and delete exist, and one of them is a loaded gun.**
  `env:unset KEY` "removes it from the UI" and deletes the variable and its values
  from all deploy contexts (or one, with `--context`). `env:import <file>
  --replace-existing` deletes **all** existing site variables and keeps only the
  imported ones — the docs warn "will delete all existing variables". The source
  confirms the implementation deletes every existing key
  (`keysToDelete = options.replaceExisting ? envelopeKeys : ...`) and then creates
  the imported set. ([`env`](https://cli.netlify.com/commands/env/),
  [Get started with environment variables](https://docs.netlify.com/build/environment-variables/get-started),
  [`env-import.ts`](https://github.com/netlify/cli/blob/main/src/commands/env/env-import.ts))
  ⇒ Because `--replace-existing` deletes rather than updates, it also destroys
  **secret flags** (which cannot be re-derived, only re-set) and any variable that
  was not in the file. A drifted site is better corrected with `env:unset` for the
  specific wrong keys plus a merge-mode `env:import`.
- **There is no "import at build/deploy time" for the site.** Netlify's build system
  does not read `.env` files: "When you build on Netlify, the build system does not
  read `.env` files." Local builds are the exception — "For local builds, the Netlify
  CLI will read the `.env` files you have stored in your local environment."
  ([Get started with environment variables](https://docs.netlify.com/build/environment-variables/get-started))
  The nearest things to a build/deploy-time mechanism are, in order of usefulness
  here:
  - `netlify.toml` `[build.environment]` / `[context.<ctx>.environment]` — read at
    build time from the repo, **but** "environment variables created in a
    `netlify.toml` are not available to the deploy environment", and all such
    variables get "the **Builds** and **Post processing** scope" with no ability to
    set scopes, no secret flag, and no audit-log entry. ([File-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration),
    [Environment variables overview](https://docs.netlify.com/build/environment-variables/overview),
    [Manage deploys](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview))
  - `netlify deploy --env` / `--secret-env` — per-deploy variables, but "Applies to
    deployed functions only", and they require an account. ([`deploy`](https://cli.netlify.com/commands/deploy/))

**Consequence for this repo.** Curate a production-only file (e.g.
`.netlify/production.env`, gitignored alongside `.netlify/`) holding exactly the
§ 3.1 keys, and **exclude** the keys that must not reach the host
(`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_CMS_*`, `SANITY_VIEWER_TOKEN`). Then
flag the server-only secrets with `env:set KEY --secret`. Do not use
`--replace-existing` on a site that has already been configured.

**To be observed on a real site.** (i) Whether `env:set KEY --secret` on a variable
imported into `all` leaves the production value intact (source says it spreads the
`all` value to every non-dev context and blanks dev — this is reading code, not
running it). (ii) Whether `env:import` accepts a value containing a `#` or an
inline comment the way `dotenv.parse` does, for any key in § 3.1 whose value has
special characters.

---

## 2. Local pre-flight

**Answer.** `netlify build` is a **stronger pre-flight than `pnpm build`**: it runs
the same `@netlify/build` engine the platform uses, and framework detection
injects the `@netlify/plugin-nextjs` adapter as a default plugin, so the OpenNext
provisioning steps execute locally too. It is not full parity: it cannot see
unmasked secret values (see § 1), it does not reproduce Netlify's build image,
and it will not reproduce the deploy-scoped Blobs ISR cache. `netlify dev` is a
routing/framework-dev-server proxy, not an adapter emulator, and its Blobs store
is explicitly a sandbox that cannot read production data.

**Evidence.**

- **Same engine.** `netlify build` is documented as "Build on your local machine"
  to "mimic the behavior of running a build on Netlify — including Build Plugins".
  ([`build`](https://cli.netlify.com/commands/build/),
  [Get started with Netlify CLI](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli))
  The CLI implements it by calling `@netlify/build`'s `build()` with `mode: 'cli'`
  (`netlify deploy --build` uses the same code path via a shared `handleBuild`).
  ([`src/lib/build.ts`](https://github.com/netlify/cli/blob/main/src/lib/build.ts),
  [`deploy.ts`](https://github.com/netlify/cli/blob/main/src/commands/deploy/deploy.ts))
- **The adapter is injected locally, not just on the platform.** `netlify build`
  and `netlify deploy --build` call `detectFrameworkSettings(command, 'build')` and
  pass the result through `getDefaultConfig()`, which maps the framework's
  recommended plugins into `defaultConfig.plugins` with `origin: 'default'`.
  ([`deploy.ts`](https://github.com/netlify/cli/blob/main/src/commands/deploy/deploy.ts),
  [`utils/build-info.ts`](https://github.com/netlify/cli/blob/main/src/utils/build-info.ts))
  The settings object's `plugins_recommended` is populated straight from the
  framework detector (`plugins_recommended: framework.plugins || []`), and the
  Next.js detector's `detect()` pushes `'@netlify/plugin-nextjs'` unless
  `NETLIFY_NEXT_PLUGIN_SKIP` is set:
  `if (nodeVersion && gte(nodeVersion, '10.13.0') && !process.env.NETLIFY_NEXT_PLUGIN_SKIP) { this.plugins.push('@netlify/plugin-nextjs') }`.
  ([`get-build-settings.ts`](https://github.com/netlify/build/blob/main/packages/build-info/src/settings/get-build-settings.ts),
  [`frameworks/next.ts`](https://github.com/netlify/build/blob/main/packages/build-info/src/frameworks/next.ts))
  The same detector supplies the Next defaults applied locally —
  `build.command = 'next build'`, `build.directory = '.next'`.
  ([`frameworks/next.ts`](https://github.com/netlify/build/blob/main/packages/build-info/src/frameworks/next.ts);
  matching the documented values in [Framework build settings](https://docs.netlify.com/build/frameworks/overview))
  ⇒ On this repo, `netlify build` runs `next build` **plus** the runtime adapter's
  provisioning. `netlify build --dry` prints the stages and their behaviours
  without running them, which is the cheap way to confirm the plugin list.
- **What it cannot fix.** (i) Local builds do not get unmasked secrets: "Using the
  CLI to do a production build with `netlify build` won't include the raw, unmasked
  values. Per the policy, only code running on our systems have access to the
  unmasked value." ([Secrets Controller](https://docs.netlify.com/build/environment-variables/secrets-controller))
  (ii) `netlify build` runs on *your* machine's Node, and the docs warn "make sure
  the Node.js version installed in your local environment matches the version set
  for your build on Netlify. If the versions don't match, you may encounter errors"
  ([Manage build dependencies](https://docs.netlify.com/build/configure-builds/manage-dependencies),
  [Get started with Netlify CLI](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli)) —
  `.nvmrc` is `24`, so `nvm use` before building.
  (iii) A local build's adapter resolution is against npm at that moment; the
  platform auto-updates the adapter per build when it is not pinned.
  ([Next.js on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview))
- **Context default differs between the two commands.** `netlify build`'s `--context`
  defaults to "the value of CONTEXT or `production`"; `netlify deploy`'s defaults to
  `dev`. ([`build`](https://cli.netlify.com/commands/build/),
  [`deploy`](https://cli.netlify.com/commands/deploy/)) Since env values are resolved
  per context, a bare `netlify deploy --build` builds against `dev` values unless
  `--context production` is passed. Watch this one.
- **`netlify dev` is a proxy, not the adapter.** It "provides a proxy server that
  includes edge logic for custom headers and redirects, environment variables, and
  Netlify Functions" and "automatically detects tools and frameworks like Gatsby,
  Hugo, Eleventy, Next.js" to run their own dev server; for Next.js the detector's
  dev command is `next`, port 3000, and Netlify Dev proxies to it. ([Local development with Netlify CLI](https://docs.netlify.com/api-and-cli-guides/cli-guides/local-development),
  [`frameworks/next.ts`](https://github.com/netlify/build/blob/main/packages/build-info/src/frameworks/next.ts))
  The adapter is described purely as deploy-time provisioning — "When you deploy a
  Next.js project on Netlify, the adapter automatically provisions a serverless
  Netlify Function for handling: SSR, ISR, PPR, Route handlers … and Server Actions."
  ([Next.js on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview))
  ⇒ `netlify dev` gives you Netlify-shaped routing and env, but it is Next's dev
  server underneath; it is not evidence that a server function will behave.
- **Blobs are a sandbox locally, and that is explicit.** "Local development with
  Netlify Dev uses a sandboxed local store that does not support file-based uploads.
  **You cannot read production data during local development.**" ([Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs))
  Combined with the ISR finding in the sibling doc (deploy-scoped Blobs store), the
  deploy-scoped ISR cache cannot be reproduced locally, and `netlify dev` cannot be
  used to validate revalidation behaviour. Use `netlify dev --context production`
  for routing/redirects rather than for cache semantics.
- **Recommended way to detect build failures before pushing.** Ordered, cheapest
  first: `netlify build --dry` (stages/plugins, no work) → `netlify build` (full
  `@netlify/build` pipeline including the adapter) → `netlify deploy --build`
  (draft URL; the deploy is cancelled automatically if the build fails — the CLI
  creates the deploy, runs the build, and calls `cancelDeploy` on error). ([`deploy`](https://cli.netlify.com/commands/deploy/),
  [`deploy.ts`](https://github.com/netlify/cli/blob/main/src/commands/deploy/deploy.ts))
  Only the last of these exercises upload, functions bundling, edge-function
  bundling and Blobs upload.

**To be observed on a first real build.** (i) That the adapter version resolved
locally equals the version the platform's auto-install picks — compare
`netlify build --dry` / local output against the first deploy log's plugin
version. (ii) Whether `netlify build` needs network access to resolve site info
(it takes `--offline`, which "Disables any features that require network access")
and what it silently omits when offline. ([`build`](https://cli.netlify.com/commands/build/))

---

## 3. Deploy mechanism

**Answer.** A CLI deploy is the same kind of object as a git deploy and is atomic
by the same rule, and it can publish to production (`--prod`). It deploys to a
random draft URL by default; `--alias` names the draft URL but explicitly does
**not** create a branch deploy. Branch deploys and Deploy Previews require the git
integration — there is no CLI equivalent. Publishing is per-deploy, so "the site
serves from a green deploy" does not *require* git; but the CLI respects the
site's auto-publishing lock, and the features people mean by that phrase (branch
deploys, previews, production-branch semantics, rollback) assume git.

**Evidence.**

- **Atomicity is a platform property, not a git property.** "Netlify enforces a
  strict concept of atomic deploys… Instead of pushing individual files to Netlify,
  you always create a new deploy… No changes go live on your site's public URL
  before all changes have been uploaded." ([Deploy overview](https://docs.netlify.com/deploy/deploy-overview))
  The same doc's deploy list, deploy log, deploy summary and permissions sections
  are written for every deploy, and automatic cleanup covers "deploys triggered by
  either source control changes, the Netlify UI or CLI, manual uploads, or
  third-party integrations" ([Manage deploys](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview)).
- **Draft by default, published with `--prod`.** "By default, the `deploy` command
  deploys to a unique *draft* URL for previewing and testing"; `--alias=YOUR_ALIAS`
  customizes the subdomain; "To do a *production* deploy to your main site URL, use
  the `--prod` flag". ([Get started with Netlify CLI](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli))
  The CLI reference summarises it as "Creates a draft deploy by default. Use `--prod`
  to deploy directly to your live site." ([`deploy`](https://cli.netlify.com/commands/deploy/))
- **`--alias` is not a branch deploy, and branch deploys are git-only.** "`alias`
  doesn't create a branch deploy and can't be used in conjunction with the branch
  subdomain feature"; "Ensure the string you use after `--alias=` doesn't match any
  existing branch names… To create a branch deploy, use [continuous deployment]".
  ([`deploy`](https://cli.netlify.com/commands/deploy/),
  [Get started with Netlify CLI](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli))
  Branch deploys "Requires setup in Netlify UI" and Deploy Previews are built from
  "pull/merge requests and agent runs". ([Deploy overview](https://docs.netlify.com/deploy/deploy-overview))
- **The CLI respects the auto-publishing lock.** Before a production deploy the CLI
  checks `siteData.published_deploy.locked`; if locked it refuses unless the caller
  uses `--prod-if-unlocked`, and interactively offers `api.unlockDeploy` ("Auto
  publishing" has been enabled"). ([`deploy.ts`](https://github.com/netlify/cli/blob/main/src/commands/deploy/deploy.ts);
  the flag is documented as "Deploy to production if unlocked, create a draft
  otherwise" in [`deploy`](https://cli.netlify.com/commands/deploy/))
  Locking itself is a UI action — "You can lock a deploy by disabling auto
  publishing… select **Lock to stop auto publishing**". ([Manage deploys](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview))
  ⇒ "the site serves from a green deploy" holds for CLI deploys, with the lock as
  the brake; but rollback-to-previous and unlock are UI operations, so the full
  release-management loop still assumes the dashboard. Note the documented
  interaction: "If your Netlify site is connected to a Git repository and has auto
  publishing turned on, any new Git-triggered production deploys will overwrite the
  previously rolled back version." (same page)
- **A CLI deploy does support the Next.js runtime.** The deploy command "Upload
  static files, functions, and edge functions", and the CLI runs `blobs_upload` as
  a core step (`runCoreSteps(['blobs_upload'])`, i.e. the deploy store's contents
  are uploaded from the local build) plus edge-function bundling. ([`deploy`](https://cli.netlify.com/commands/deploy/),
  [`deploy.ts`](https://github.com/netlify/cli/blob/main/src/commands/deploy/deploy.ts))
  Independently, Netlify documents CLI deploys as a supported path for the
  Next.js-specific skew-protection feature: "Skew protection works with CLI deploys
  starting with Netlify CLI version 23.11.0 and above." ([Deploy overview](https://docs.netlify.com/deploy/deploy-overview))
  ⇒ Neither the git/CDN path nor the adapter is CLI-blocked. Manual deploys are the
  documented mechanism when "builds are stopped". ([Get started with Netlify CLI](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli))
- **There is a bridge to the platform build.** `--trigger` "Trigger a new build of
  your project on Netlify without uploading local files"; the CLI implements it as
  `api.createSiteBuild`, and on 404 tells you to "rerun `netlify link` and make sure
  that your project has CI configured". ([`deploy`](https://cli.netlify.com/commands/deploy/),
  [`deploy.ts`](https://github.com/netlify/cli/blob/main/src/commands/deploy/deploy.ts))
  This is the command that moves the build onto Netlify's image while staying at the
  terminal — the closest thing to parity for a git-less setup.

**To be observed on a real deploy.** (i) Whether a CLI `--prod` deploy is recorded
with the `production` deploy context. The create call passes only `draft` and
`branch` (`const draft = options.draft || (!deployToProduction && !alias)`), so the
context is server-assigned; the docs define a "production deploy" as "a deploy from
the production branch", which a CLI deploy has no branch for.
([`deploy.ts`](https://github.com/netlify/cli/blob/main/src/commands/deploy/deploy.ts),
[Deploy overview](https://docs.netlify.com/deploy/deploy-overview))
This matters for contextual env values, so check the deploy's context in the UI
after the first `--prod`. (ii) Whether the deploy-request permission policy applies
to CLI deploys — the docs scope it to "changes pushed to private repositories from
recognized authors" and name production/branch/preview deploys, not CLI deploys.
([Deploy overview](https://docs.netlify.com/deploy/deploy-overview))
(iii) `--draft` and `--branch` exist in the CLI source (`options.draft`,
`options.branch`) but are **not** in the published flag list for `deploy`; do not
rely on either until observed. ([`deploy.ts`](https://github.com/netlify/cli/blob/main/src/commands/deploy/deploy.ts),
  [`deploy`](https://cli.netlify.com/commands/deploy/))

---

## 4. Config as code

**Answer.** `netlify.toml` is the **only** config file Netlify's current config
library looks for; `netlify.yaml`/`netlify.yml`/`netlify.json` are not supported
by `@netlify/config@25.2.5`, whose parser is TOML-only and whose filename constant
is literally `netlify.toml`. Yes, `netlify.toml` can hold environment variables,
under `[build.environment]` and `[context.<ctx>.environment]` — but for this stack
it should hold none of the runtime secrets, because those variables are invisible
to Functions/Edge Functions and cannot be scoped or flagged. The build command,
publish directory and Node pin should stay out of `netlify.toml` entirely: the
platform defaults plus repo files already agree, and restating them only adds a
place to drift. `next.config.js` keeps `rewrites()`, `redirects()` and
`images.remotePatterns`; none of that should be duplicated in `netlify.toml`.

**Evidence.**

- **TOML only, and only `netlify.toml`.** The published parser is TOML-specific —
  "Load the configuration file and parse it (TOML)" — and the path resolver's
  filename constant is `const FILENAME = 'netlify.toml'`, with the search only ever
  resolving that one name (the "Look for several file extensions for `netlify.*`"
  comment is not backed by the code, which does `resolve(cwd, FILENAME)` and
  `existsSync`). ([`@netlify/config@25.2.5` `lib/parse.js`](https://cdn.jsdelivr.net/npm/@netlify/config@25.2.5/lib/parse.js),
  [`lib/path.js`](https://cdn.jsdelivr.net/npm/@netlify/config@25.2.5/lib/path.js);
  source: [`packages/config/src/parse.ts`](https://github.com/netlify/build/blob/main/packages/config/src/parse.ts),
  [`packages/config/src/path.ts`](https://github.com/netlify/build/blob/main/packages/config/src/path.ts))
  The docs agree by omission and by framing: the page is titled "File-based
  configuration", describes `netlify.toml` throughout, and offers no alternative
  filename; the `@netlify/config` README lists exactly one file-based option,
  "In a `netlify.toml` file in the repository root directory or site `base`
  directory". ([File-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration),
  [@netlify/config README](https://github.com/netlify/build/blob/main/packages/config/README.md))
  ⇒ **`netlify.toml`, not YAML/JSON.** (The package still depends on `yaml`, so I
  would not assert that no historical format is parsed anywhere — see "to be
  observed".)
- **Env vars in `netlify.toml`: yes, in the environment tables.** `[build]`'s
  documented keys are `base`, `publish`, `command`, `environment`, `processing`;
  `environment` is a key/value table, settable as its own block
  (`[build.environment] VARIABLE = "value"`), and `[context.<ctx>.environment]`
  does the same per deploy context. ([File-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration))
  ⇒ The current file's `SECRETS_SCAN_OMIT_KEYS` under `[build]` is in the wrong
  place for a variable; the sibling doc owns that finding and it is not re-derived
  here.
- **But those variables cannot reach this app's runtime.** Two documented limits,
  both fatal for a Next.js SSR site: "Note that environment variables created in a
  `netlify.toml` are not available to the deploy environment", and the
  configuration-method comparison shows `Available to Functions, Edge Functions, and
  On-demand Builders` ticked only for UI/CLI/API, with all config-file variables
  getting "the **Builds** and **Post processing** scope" and no scope control.
  ([Manage deploys](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview),
  [Environment variables overview](https://docs.netlify.com/build/environment-variables/overview),
  [Get started with environment variables](https://docs.netlify.com/build/environment-variables/get-started))
  Also: "Using environment variables directly as values in your `netlify.toml`
  isn't supported" (`key = "$VAR"` does not interpolate), and `netlify.toml` settings
  override UI/CLI/API settings of the same key — so a repo-side declaration can
  silently shadow a site-level one. ([File-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration),
  [Environment variables overview](https://docs.netlify.com/build/environment-variables/overview))
- **Build command, publish directory, Node pin: all already defaulted.** Next.js
  "SSR or hybrid" defaults are documented as build command `next build`, publish
  directory `.next`, and "Netlify automatically detects and configures your project
  based on the framework you're using"; the local detector supplies the same two
  values as `defaultConfig` (origin `'default'`). ([Framework build settings](https://docs.netlify.com/build/frameworks/overview),
  [`utils/build-info.ts`](https://github.com/netlify/cli/blob/main/src/utils/build-info.ts))
  Node is pinned by `.nvmrc` (`24`), which per the docs overrides the UI setting,
  and `NODE_VERSION` likewise; the build image default is the fallback. ([Manage build dependencies](https://docs.netlify.com/build/configure-builds/manage-dependencies))
  ⇒ Nothing needs restating. If a value is ever restated, remember that a
  repo-side setting wins over the UI, so the TOML becomes the source of truth and
  the UI silently stops mattering — which is fine for `publish`/`command`, and
  dangerous for anything with a secret in it.
- **Not everything is file-configurable.** "There are also certain settings that you
  can only configure using the Netlify UI, CLI, or API. The `netlify.toml` file is
  not a fully comprehensive configuration method." ([File-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration))
  The named UI-only items relevant here are branch-deploy controls, Deploy Preview
  controls, auto publishing/lock, the production branch, build image selection, and
  the sensitive-variable policy. ([Deploy overview](https://docs.netlify.com/deploy/deploy-overview),
  [Manage deploys](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview),
  [Get started with environment variables](https://docs.netlify.com/build/environment-variables/get-started))
- **Anything without a first-class command is still scriptable.** "The `api`
  command will let you call any Netlify open API methods" (`netlify api --list`,
  `netlify api getSite --data '{ "site_id": "123456" }'`). ([`api`](https://cli.netlify.com/commands/api/))
  This is the honest fallback for UI-only settings — but it is an untyped escape
  hatch, not reproducible configuration, so it should not be dressed up as parity.

**To be observed on a real site.** (i) Whether a stray `netlify.yaml`/`netlify.json`
is ignored silently or produces a warning — observable by placing one with a
deliberately wrong `publish` and confirming it has no effect on `netlify build --dry`.
(ii) Whether the platform buildbot surfaces a validation error for the current
`[build]`-level `SECRETS_SCAN_OMIT_KEYS` (the sibling doc flags this; the deploy log
is the observation point).

---

## 5. Recommendation — CLI-owned vs dashboard-only

**CLI-owned (reproducible, reviewable):** authentication, site creation and
linking, the whole environment-variable surface, the pre-flight build, local dev,
draft and production deploys, triggering a platform build, and any inspection
(`status`, `env:list`, `sites:list`).

**Dashboard-required (or dashboard-cleanest):** the git integration itself (repo
authorisation — `netlify init` opens a browser for that), branch-deploy and
Deploy Preview controls, auto publishing / lock / unlock, the production branch
selection, rollback ("Publish Deploy"), build image selection, the
sensitive-variable policy, and browsing Blobs.

**The smallest set that reproduces the full configuration on a fresh site.**
Run from the repo root, after `nvm use`. `npx` is used deliberately: the CLI is
not a dependency of this repo, and pinning it in `devDependencies` would put a
deploy tool in the runtime dependency graph (and `package.json` has no
`packageManager` field, per the repo facts).

```sh
# ── 0. Authenticate once (browser). Stores a token in the CLI's global config.
npx netlify-cli@latest login

# ── 1. Create the site and link this directory in one step.
#      sites:create "Create a blank project that isn't associated with any git
#      remote. Will link the project to the current working directory."
npx netlify-cli@latest sites:create --name pghrugby --account-slug <TEAM_SLUG>

#    …or, if the site already exists in the dashboard, link instead:
#      npx netlify-cli@latest link

# ── 2. Curate the production env file OUTSIDE the repo's .env.local.
#      Exactly the § 3.1 keys, nothing else. Keep it gitignored with .netlify/.
#      Then import it. No --replace-existing on a configured site.
npx netlify-cli@latest env:import .netlify/production.env

# ── 3. Flag the values that must be secrets. No value, no --context needed;
#      per-variable, irreversible. Skip any key you want to be able to read back.
npx netlify-cli@latest env:set STRIPE_SECRET_KEY --secret
npx netlify-cli@latest env:set STRIPE_WEBHOOK_SECRET --secret
npx netlify-cli@latest env:set SUPABASE_SERVICE_ROLE_KEY --secret
npx netlify-cli@latest env:set DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN --secret
npx netlify-cli@latest env:set DATOCMS_DRAFT_CONTENT_CDA_TOKEN --secret
npx netlify-cli@latest env:set DATOCMS_CMA_TOKEN --secret
npx netlify-cli@latest env:set CMS_API_TOKEN --secret
npx netlify-cli@latest env:set RESEND_API_KEY --secret
npx netlify-cli@latest env:set GOOGLE_CALENDAR_API_KEY --secret
npx netlify-cli@latest env:set REVALIDATE_SECRET --secret
npx netlify-cli@latest env:set CMS_WEBHOOK_SECRET --secret

# ── 4. Audit what landed. Keys for everything; values only for non-secrets.
#      (Secrets print masked outside the dev context.)
npx netlify-cli@latest env:list --context production
npx netlify-cli@latest status

# ── 5. Pre-flight. --dry shows stages/plugins; the real build runs the same
#      @netlify/build pipeline the platform does, including the Next.js adapter.
npx netlify-cli@latest build --dry
npx netlify-cli@latest build

# ── 6. Local dev (Netlify-shaped routing; sandboxed Blobs store).
npx netlify-cli@latest dev

# ── 7. Deploy. Draft first, then publish. --context production matters: the
#      deploy command's env context defaults to `dev`.
npx netlify-cli@latest deploy --build --context production
npx netlify-cli@latest deploy --build --context production --prod

# ── 8. Hand the build to Netlify's image without pushing (optional).
npx netlify-cli@latest deploy --trigger
```

**Must happen in the UI (or needs interactive browser auth):**

- Every step in § 5 is CLI-runnable **except** the git integration's repo
  authorisation, if continuous deployment is wanted. `netlify init` is the CLI
  command, but for GitHub it "will need access to create a deploy key and a webhook
  on the repository" and "you'll be prompted to log in to your GitHub account",
  which is a browser flow. ([Get started with Netlify CLI](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli))
- Branch deploys, Deploy Preview controls, auto publishing/lock, production branch,
  build image, sensitive-variable policy: dashboard. ([Deploy overview](https://docs.netlify.com/deploy/deploy-overview),
  [Manage deploys](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview),
  [Get started with environment variables](https://docs.netlify.com/build/environment-variables/get-started))

---

## Could not be established from primary sources

1. **Whether a CLI `--prod` deploy carries the `production` deploy context.**
   Not stated in the CLI reference, and the source passes only `draft` and `branch`.
   This determines which contextual env values apply at runtime, so it is worth
   checking before trusting a CLI-driven release. *Observe:* run one
   `netlify deploy --build --context production --prod` and read the deploy's context
   in the UI, or `npx netlify-cli@latest api getSite --data '{"site_id":"…"}'` and
   inspect `published_deploy`.
2. **Whether `netlify.yaml` / `netlify.yml` / `netlify.json` are parsed at all by
   the current release.** `@netlify/config@25.2.5`'s published code resolves only
   `netlify.toml` and parses only TOML, but the package still ships `yaml` as a
   dependency and a stale-looking comment claims otherwise. *Observe:* place a
   `netlify.yaml` with a wrong `publish` next to `netlify.toml` and diff
   `netlify build --dry` output with and without it.
3. **Whether `--replace-existing` removes variables that are flagged secret, and
   whether that is refused or silent.** The source deletes every existing key and
   the flag cannot be re-derived, but no doc addresses the secret case. *Observe:*
   on a throwaway site, import, flag one key, re-import with `--replace-existing`,
   and inspect `env:list`.
4. **Whether the deploy-request (unrecognised-author) policy applies to CLI
   deploys.** The docs describe it for git-triggered deploys and build hooks only.
   *Observe:* check whether a production deploy from the CLI lands as **Pending
   approval** on a private-repo site.
5. **Whether `--draft` and `--branch` are supported flags for `deploy`.** Present in
   the CLI source, absent from the published flag list. *Observe:* `npx netlify-cli@latest
   help deploy` once the CLI is installed.
6. **Anything about a live site at all** — the site does not exist and this research
   ran no commands against Netlify. Every "to be observed" item above needs a linked
   site and one deploy.

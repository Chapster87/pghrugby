Status: **live** · the post-deploy production smoke, added #130

# Production smoke

Answers one question after a deploy ships: **is the live site broken right now?**
Where the pure and integration layers catch regressions before merge, this is the
backstop that catches a deploy that went out broken, or a regression that only
appears once real infrastructure (CDN, DNS, TLS, live CMS) is in the path.

Decided by [map #126](https://github.com/Chapster87/pghrugby/issues/126)
decision 4; built under [#130](https://github.com/Chapster87/pghrugby/issues/130).

## The suite

`e2e/production-smoke.spec.ts` (Playwright, Chromium). It asserts that the home
page and a PDP render, that the cart page boots and its client JavaScript runs,
and that no site-origin console error occurs.

**Read-only by contract.** The suite may navigate and assert; it must never write
an order or hit a mutating endpoint. A `page.route` guard aborts any non-GET
request to Stripe or Supabase and fails the run, so the contract is enforced
rather than promised.

## How it is triggered

Two paths, deliberately redundant:

1. **A production deploy.** Netlify's *deploy succeeded* outgoing webhook reaches
   `netlify/functions/dispatch-smoke.mjs`, which verifies Netlify's JWS and calls
   GitHub's **workflow-dispatch** API. That endpoint needs a token scoped to
   *Actions: write* only — unlike `repository_dispatch`, which needs
   *Contents: write* and could push code.
2. **An hourly schedule.** A backstop so a dead webhook, function, or token
   degrades to "the smoke runs late", never "the smoke never runs".

Netlify's outgoing webhook cannot set an `Authorization` header, which is why a
function sits in the middle instead of calling GitHub directly.

## Netlify-side setup (owner)

- **Token**: create a fine-grained PAT scoped to this repo with **Actions: write**
  (and nothing else). Store it in Netlify as `GITHUB_DISPATCH_TOKEN`.
- **Notification**: *Project configuration → Notifications → Deploy notifications
  → Add notification → HTTP Post Request*, on **Deploy succeeded**, pointed at
  `https://<site>/.netlify/functions/dispatch-smoke`, with a **JWS secret**. Store
  the same secret in Netlify as `NETLIFY_WEBHOOK_SECRET`.
- **Optional**: `SMOKE_BASE_URL` to override the origin the smoke targets.

## Origin

The smoke targets the app's production origin — `https://next.pghrugby.com`
until the apex cutover ([ADR-0001](../adr/0001-two-branch-release-topology-and-site-origins.md));
`pghrugby.com` is still the legacy WordPress site. Change the default in
`playwright.config.ts` and the workflow's `base_url` when the cutover lands.

## Running it locally

```bash
pnpm exec playwright install chromium   # once
pnpm test:smoke                          # targets next.pghrugby.com
SMOKE_BASE_URL=https://example.test pnpm test:smoke
```

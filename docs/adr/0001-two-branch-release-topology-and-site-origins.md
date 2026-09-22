# Two-branch release topology and the site's deploy origins

Netlify's production deploy builds **`main`**, the release branch; **`trunk`** is the
integration branch where feature branches pool and are verified, promoted to `main` by a
`trunk → main` pull request. `trunk` is enabled as a **branch deploy**, which is not cosmetic:
Netlify gates Deploy Previews on the pull request's base branch being either the production
branch or a branch with branch deploys enabled, so without it a PR into `trunk` gets no preview
at all. The site's pre-cutover origin is **`next.pghrugby.com`**, an unproxied Cloudflare CNAME
onto the production deploy.

## Considered options

- **A branded `trunk` environment at `staging.pghrugby.com`.** Rejected as impossible rather
  than undesirable: Netlify derives a branch deploy's custom hostname from the branch name
  (`trunk.pghrugby.com`), so the literal label `staging` would need a branch named `staging`
  plus NS delegation of that name to Netlify DNS — breaking both the Cloudflare-managed zone
  and the repo's established `trunk` convention.
- **`staging.pghrugby.com` as a production alias.** Rejected on naming, not shape: a hostname
  that serves production content must not be called staging, since every later session reading
  it would infer the wrong thing. `next.` says what it is — the next site, not yet at the apex.

## Consequences

- `NEXT_PUBLIC_BASE_URL` is inlined at **build** time, so it is set per Netlify deploy context:
  the chosen origin for `production` and `branch-deploy`, the host-published `DEPLOY_PRIME_URL`
  for `deploy-preview` (whose origin is per-pull-request and cannot be inlined), and a hard
  throw when none resolves. The `URL`/`DEPLOY_PRIME_URL` fallback in `src/lib/util/env.ts`
  exists for exactly that preview case.
- **Only `production` ever goes live on Stripe.** Branch deploys and previews stay on test
  Stripe permanently, including after cutover — a preview that can take real money is a preview
  nobody dares open.
- The `trunk` branch deploy is publicly reachable and, unlike a preview, is **not**
  `noindex`ed by the platform, so it carries an explicit `X-Robots-Tag` header of its own.
- After cutover `next.pghrugby.com` becomes a **domain alias** and Netlify canonical-redirects
  it to the apex; it does not keep serving an independent copy.
- GitHub's default branch is `trunk`, so pull requests and their previews target it by default.
  This is independent of Netlify's production branch, which stays `main`.

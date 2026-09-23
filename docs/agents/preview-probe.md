# Preview probe (throwaway)

Opened by [issue #113](https://github.com/Chapster87/pghrugby/issues/113) to make Netlify build a
**Deploy Preview** off `trunk`, so two things can be observed that no other environment can answer:

1. whether a preview's resolved deploy context is `deploy-preview`, and
2. whether `DEPLOY_PRIME_URL` reaches a **serverless function's runtime**, not just the build.

`src/lib/util/env.ts` resolves a preview's origin from `DEPLOY_PRIME_URL`, because a preview's
origin is per-pull-request and cannot be inlined. If that variable is absent at runtime, a dynamic
route on a preview throws rather than emitting a wrong URL.

**Nothing here is meant to merge.** The PR is closed and this branch deleted once observed.

# Image rendering: `next/image` for content, raw `<img>` only for beacons

Status: **decided 2026-09-24**, for
[Decide how the site renders images: `next/image` vs raw `<img>` (#110)](https://github.com/Chapster87/pghrugby/issues/110).

Follow-up to the lint cleanup in #109, which left 10 `@next/next/no-img-element`
warnings visible on purpose: one open decision, not ten bugs. This records the
decision so it is not re-litigated.

## 1. The decision

**Render content images through `next/image`.** The 8 ForgeCMS team-logo call
sites cited in the issue are migrated. Two remain raw `<img>`, each with an
inline `eslint-disable-next-line` and a stated reason — the rule stays on
everywhere else rather than being scoped off wholesale.

## 2. Why the logos are safe to migrate

The issue left the host of ForgeCMS `team_logo.url` values open, because
`next/image` throws at runtime for a host missing from `images.remotePatterns`
and migrating blind would break the logos on the live site. The host is
**Cloudinary** (`res.cloudinary.com`), and it is already allow-listed:

- **Verified against the live data** (2026-09-24): the instance's `teams` table
  holds 60 rows, 59 with a `team_logo.url`, and all 59 resolve to a **single**
  host — `res.cloudinary.com`. No other host appears.
- `pghrugby-cms` [ADR-0003](https://github.com/Chapster87/pghrugby-cms/blob/trunk/docs/adr/0003-media-provider-cloudinary.md)
  makes Cloudinary the instance's media provider and records that "the site needs
  **no change** — `res.cloudinary.com` is already in `pghrugby`'s
  `images.remotePatterns`".
- Independently, `src/components/competition/scheduleTable/index.tsx` and
  `standingsTable/index.tsx` already render the same `team_logo.url` values
  through `next/image` today, so the path is exercised in production rather than
  merely allow-listed on paper.

No `remotePatterns` change was needed. `next.config.js` still lists only
`res.cloudinary.com` (Cloudinary/CDA assets) and `files.stripe.com` (Stripe
product images).

## 3. What was migrated

Both wrappers are fixed-size, positioned containers — `.teamLogo` is
`position: relative` with a set `width`/`height` — which is exactly the shape
`fill` requires.

- `src/components/competition/countdown/index.tsx` — 4 logos. `fill`, with
  `sizes="64px"` matching the 4rem wrapper, keeping the existing
  `clsx(s.fullSizeImage, s.objectContain)` classes.
- `src/components/sidebar/_components/matches/match.tsx` — 4 logos. `fill`, with
  `sizes="50px"` matching the 50px wrapper, and a new `.objectContain` module
  class. The previous `w-full h-full object-contain` classes were dead — there is
  no Tailwind in this repo — so nothing rendered at the intended size; the
  migration is also what makes the logos actually fit their wrapper.

`fill` + `sizes` was chosen over explicit `width`/`height` because the wrappers
are square while the logos are not, so the intrinsic ratio is not the rendered
box; `object-fit: contain` inside a sized parent is the honest description. This
mirrors the existing `fill` usage in `src/app/(core)/[slug]/page.tsx`.

## 4. What stays raw

| Path                                                         | What                       | Why                                                                                                                                                                                           |
| ------------------------------------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/(core)/membership/_components/tier-table/index.tsx` | PayPal 1×1 tracking pixel  | A beacon, not content. `next/image` would add an optimizer round-trip to a 1×1 GIF.                                                                                                           |
| `src/components/cloudinary-image-renderer.tsx`               | Unknown-dimension fallback | `next/image` needs `width`/`height`, or `fill` inside a sized positioned parent; neither is available when the CMS asset's dimensions are unknown. Cloudinary already serves these optimized. |

Both carry an inline `eslint-disable-next-line @next/next/no-img-element`
alongside the reason, so `pnpm lint` stays at zero warnings without the rule
being switched off for files that do not need it.

## 5. Consequences

- `pnpm lint` is clean with the rule still active (verified 2026-09-24, alongside
  `npx tsc --noEmit` and `pnpm build`); a new raw `<img>` fails the build's lint
  step unless someone disables it deliberately and says why.
- Netlify Image CDN now serves these logos rather than Cloudinary's own delivery
  URL for the two migrated surfaces. Cloudinary already optimized the originals,
  so the win is responsive `srcset` + modern formats at the edge, not raw bytes.
- The `/placeholder.svg` fallback used by both migrated call sites **does not
  exist in `public/`** (there are no SVGs there, and it has never been
  committed). That is pre-existing and untouched here, but it is reachable: the
  one `teams` row without a logo is the `TBD` placeholder team, so any match with
  a TBD side renders a broken logo today. Worth its own ticket.

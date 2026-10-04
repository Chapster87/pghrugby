import { expect, test as base, type TestInfo } from "@playwright/test"

/**
 * Production smoke — the post-deploy "is the live site broken right now?" check
 * (map #126, decision 4; ticket #130).
 *
 * What it proves
 *   - The key pages render: the home page and at least one product detail page
 *     (a clean-URL PDP such as `/dues`, which rewrites to `/product/[slug]`).
 *   - `/cart` boots and its client JavaScript actually ran. The minicart flyout
 *     is opened by a mount effect (`setOpen(true)` in a `useEffect`), so the
 *     dialog appearing after load is proof of hydration, not server markup.
 *   - No errors originate from the site's own origin (console errors and
 *     uncaught exceptions are collected on every test, not a dedicated one).
 *   - Nothing reaches Stripe or Supabase with a mutating method.
 *
 * The read-only contract
 *   The smoke drives a real browser against a deployed site, so it must never be
 *   able to change anything. It only navigates and asserts. A `page.route` guard
 *   aborts any non-GET/HEAD/OPTIONS request aimed at Stripe or Supabase and
 *   records the violation so the test fails. There is no code path in this file
 *   that writes to Stripe or Supabase.
 *
 * Console-error policy
 *   Third-party scripts (analytics, CDN, embeds) log errors we cannot fix, and
 *   failing on them would make this smoke flaky and useless as a release gate.
 *   Errors are therefore attributed by origin: an error whose source is the
 *   site's own origin fails the test, while third-party noise is reported as a
 *   test annotation and otherwise ignored. An uncaught exception, or an error we
 *   cannot attribute to a third party, is treated as ours and fails.
 */

/** Used only if the config supplies no baseURL; mirrors playwright.config.ts. */
const SITE_FALLBACK = "https://pghrugby.com"

/** Hosts that must never receive a write from the smoke. */
const GUARDED_HOST = /(?:^|\.)(?:stripe\.com|supabase\.co|supabase\.in)$/i

/** The only methods the read-only contract permits. */
const READ_ONLY_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

const URL_PATTERN = /https?:\/\/[^\s)"']+/g

type Violation = { method: string; url: string }

type SmokeState = {
  /** Non-read-only requests the guard aborted (must stay empty). */
  violations: Violation[]
  /** Errors attributed to the site's own origin (must stay empty). */
  siteErrors: string[]
  /** Errors attributable to a third party (reported, not fatal). */
  thirdPartyErrors: string[]
}

/** Parse a URL's origin, tolerating non-http schemes and malformed strings. */
function originOf(url: string | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

/**
 * Classify an error message by the origins its text names. A message naming the
 * site origin is ours; one naming only other origins is theirs; one naming no
 * origin at all is unattributable, and therefore treated as ours.
 */
function classify(text: string, siteOrigin: string): "site" | "third-party" {
  const origins = new Set<string>()
  for (const match of text.matchAll(URL_PATTERN)) {
    const origin = originOf(match[0])
    if (origin) origins.add(origin)
  }
  if (origins.has(siteOrigin)) return "site"
  if (origins.size > 0) return "third-party"
  return "site"
}

/**
 * Per-test harness: installs the network guard and the error collectors, hands
 * the collected state to the test, then asserts the two invariants that must
 * hold for every page we touch.
 */
export const test = base.extend<{ smoke: SmokeState }>({
  // `provide` is Playwright's positional `use` callback; named away from `use`
  // so the react-hooks lint rule does not read it as a hook call.
  smoke: async ({ page, baseURL }, provide, testInfo: TestInfo) => {
    const siteOrigin = new URL(baseURL ?? SITE_FALLBACK).origin
    const state: SmokeState = {
      violations: [],
      siteErrors: [],
      thirdPartyErrors: [],
    }

    page.on("console", (message) => {
      if (message.type() !== "error") return

      // `location()` names the source file, which is the reliable way to tell a
      // site-origin error from a third-party one. Fall back to scraping the
      // message text when the location carries no usable origin.
      const location = message.location()?.url
      const locationOrigin = originOf(location)
      const entry = location
        ? `${message.text()} — ${location}`
        : message.text()
      const ours = locationOrigin
        ? locationOrigin === siteOrigin
        : classify(message.text(), siteOrigin) === "site"

      ;(ours ? state.siteErrors : state.thirdPartyErrors).push(entry)
    })

    page.on("pageerror", (error) => {
      const text = `${error.name}: ${error.message}\n${error.stack ?? ""}`
      const bucket =
        classify(text, siteOrigin) === "site"
          ? state.siteErrors
          : state.thirdPartyErrors
      bucket.push(text)
    })

    // The hard network guard. Only Stripe and Supabase are inspected for a
    // mutating method; everything else (same-origin API reads, CDN assets,
    // analytics beacons) is allowed through untouched.
    await page.route("**/*", async (route) => {
      const request = route.request()
      const method = request.method().toUpperCase()
      const host = new URL(request.url()).hostname

      if (GUARDED_HOST.test(host) && !READ_ONLY_METHODS.has(method)) {
        state.violations.push({ method, url: request.url() })
        await route.abort("blockedbyclient")
        return
      }

      await route.continue()
    })

    await provide(state)

    if (state.thirdPartyErrors.length > 0) {
      testInfo.annotations.push({
        type: "third-party console error (not fatal)",
        description: state.thirdPartyErrors.join("\n"),
      })
    }

    expect(
      state.violations,
      "read-only contract violated: a mutating request reached a guarded host"
    ).toEqual([])
    expect(
      state.siteErrors,
      "the site logged errors from its own origin"
    ).toEqual([])
  },
})

test.describe("production smoke", () => {
  test("the home page renders", async ({ page }) => {
    const response = await page.goto("/")

    expect(response?.ok(), `GET / returned ${response?.status()}`).toBeTruthy()
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()
    // The header chrome, addressed by role rather than copy.
    await expect(
      page.getByRole("link", { name: "View Homepage" })
    ).toBeVisible()
  })

  test("a product detail page renders", async ({ page }) => {
    // `/dues` is a clean-URL PDP (`next.config.js` rewrites it to
    // `/product/dues`). Reserved slug, so it cannot be shadowed by a page.
    const response = await page.goto("/dues")

    expect(
      response?.ok(),
      `GET /dues returned ${response?.status()}`
    ).toBeTruthy()
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Add to cart" })
    ).toBeVisible()
  })

  test("the cart page boots and its client JavaScript runs", async ({
    page,
  }) => {
    const response = await page.goto("/cart")

    expect(
      response?.ok(),
      `GET /cart returned ${response?.status()}`
    ).toBeTruthy()

    // Rendered state: the route's own heading, from the server HTML. It is a
    // plain locator rather than a role query because the flyout's modal marks
    // the rest of the page `aria-hidden`, hiding it from the accessibility tree
    // while it stays visually present.
    await expect(page.locator("h1", { hasText: "Cart" })).toBeVisible()

    // Proof that client JS ran: the minicart flyout is opened by the page's
    // mount effect, so its dialog only exists in the DOM after hydration — it
    // is absent from the raw server HTML. A fresh context has an empty cart, so
    // the flyout shows its empty state.
    const flyout = page.getByRole("dialog", { name: "Your cart" })
    await expect(flyout).toBeVisible()
    await expect(flyout.getByText("Nothing here yet")).toBeVisible()
  })
})

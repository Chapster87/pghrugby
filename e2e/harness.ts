import { expect, type Frame, type Page } from "@playwright/test"

import { E2E_SUPABASE_URL, E2E_SERVICE_ROLE_KEY } from "./stack-env"

/**
 * Shared E2E harness for the local buy path (#76): the loopback guard, a
 * PostgREST reader, and the Stripe embedded-Checkout driver. Every buy spec uses
 * these rather than re-implementing them, so the safety check and the flaky-part
 * mitigations live in exactly one place.
 */

export { E2E_SUPABASE_URL, E2E_SERVICE_ROLE_KEY }

/**
 * Re-asserts, in-process, that the Supabase this spec queries directly is
 * loopback. Global setup already guards the app; this guards the reader. It must
 * stay **first** in every spec and must never be weakened.
 */
export function assertLoopback(): void {
  expect(
    /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(E2E_SUPABASE_URL),
    `refusing to run: E2E_SUPABASE_URL is "${E2E_SUPABASE_URL}", not loopback`
  ).toBe(true)
}

/** A row read straight out of the local PostgREST, as the service role. */
export async function select<T>(table: string, query: string): Promise<T[]> {
  const res = await fetch(`${E2E_SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: E2E_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${E2E_SERVICE_ROLE_KEY}`,
    },
  })
  if (!res.ok) {
    throw new Error(
      `select ${table} failed (${res.status}): ${await res
        .text()
        .catch(() => "")}`
    )
  }
  return res.json() as Promise<T[]>
}

/**
 * Candidate selectors per Stripe field. The card fields live directly in the
 * `embedded-checkout-inner` frame as `#cardNumber` / `#cardExpiry` / `#cardCvc`
 * / `#billingName` / `#billingPostalCode`; the alternate selectors cover other
 * embedded-Checkout versions. `phone` renders only when Link's "Save my
 * information" section is present, and is required when it is.
 */
const STRIPE_FIELDS: Record<string, string[]> = {
  email: ["input#email", 'input[name="email"]', 'input[type="email"]'],
  number: [
    "input#cardNumber",
    'input[name="cardnumber"]',
    'input[autocomplete="cc-number"]',
  ],
  expiry: [
    "input#cardExpiry",
    'input[name="exp-date"]',
    'input[autocomplete="cc-exp"]',
  ],
  cvc: ["input#cardCvc", 'input[name="cvc"]', 'input[autocomplete="cc-csc"]'],
  name: [
    "input#billingName",
    'input[name="name"]',
    'input[autocomplete="cc-name"]',
  ],
  postal: [
    "input#billingPostalCode",
    'input[name="postal"]',
    'input[autocomplete="postal-code"]',
  ],
  phone: [
    "input#phoneNumber",
    'input[name="phoneNumber"]',
    'input[type="tel"]',
  ],
}

/** Stripe's frames in the page's frame tree (nested card frames included). */
function stripeFrames(page: Page): Frame[] {
  return page
    .frames()
    .filter((frame) => /stripe\.(com|network)/.test(frame.url()))
}

/**
 * Whether a field's typed value actually took. Numeric fields are compared on
 * their digits only (Stripe formats `4242 4242 4242 4242`, `12 / 34`, etc.);
 * everything else only needs to be non-empty.
 */
function valueStuck(expected: string, actual: string): boolean {
  const want = expected.replace(/\D/g, "")
  if (want.length > 0) return actual.replace(/\D/g, "") === want
  return actual.trim().length > 0
}

/**
 * Fills the first matching selector that exists and is editable, **verifying
 * the value took** and retrying until it does. A single fill can race a field
 * that is still mounting or a Link-driven re-render, which is what left a card
 * field empty on an otherwise successful run.
 */
async function fillVerified(
  page: Page,
  selectors: string[],
  value: string,
  timeout = 60_000
): Promise<boolean> {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    for (const frame of stripeFrames(page)) {
      for (const selector of selectors) {
        const locator = frame.locator(selector).first()
        try {
          if (
            (await locator.count()) === 0 ||
            !(await locator.isVisible()) ||
            !(await locator.isEditable())
          ) {
            continue
          }
          // Bounded so a covered stray input cannot burn the whole action budget.
          await locator.fill(value, { timeout: 5_000 })
          if (valueStuck(value, await locator.inputValue({ timeout: 2_000 }))) {
            return true
          }
        } catch {
          // Detached/transitioning frame — try the next candidate, then loop.
        }
      }
    }
    await page.waitForTimeout(150)
  }
  return false
}

/**
 * Turns Link's "Save my information" toggle off, polling for the control rather
 * than reading it once: it mounts late, and while it is on Stripe renders a
 * **required** phone field that otherwise blocks submission. Returns once the
 * toggle is confirmed off (or after the window if the toggle never appears).
 */
async function ensureLinkSaveOff(
  page: Page,
  innerFrame: () => Frame | undefined
): Promise<void> {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    const box = innerFrame()?.locator("#enableStripePass")
    try {
      if (box && (await box.count()) > 0) {
        if (!(await box.isChecked())) return
        await box.uncheck({ timeout: 5_000 })
        if (!(await box.isChecked())) return
      }
    } catch {
      // Not actionable yet — retry.
    }
    await page.waitForTimeout(200)
  }
}

/**
 * Clicks Pay until Checkout leaves the page. A single click can be dropped
 * while Stripe settles its validation state, so this re-clicks — but only while
 * the button is actually **enabled**: Stripe disables it while a payment is in
 * flight, so this can never double-submit.
 */
async function submitPayment(
  page: Page,
  innerFrame: () => Frame | undefined
): Promise<void> {
  const deadline = Date.now() + 75_000
  let clicks = 0
  while (
    Date.now() < deadline &&
    clicks < 3 &&
    !/\/checkout\/success/.test(page.url())
  ) {
    const byTestId = innerFrame()?.locator(
      '[data-testid="hosted-payment-submit-button"]'
    )
    let button: ReturnType<Page["locator"]> | undefined
    if (byTestId && (await byTestId.count().catch(() => 0)) > 0) {
      button = byTestId.first()
    } else {
      for (const frame of stripeFrames(page)) {
        const candidate = frame.getByRole("button", { name: /^pay$/i }).first()
        if ((await candidate.count().catch(() => 0)) > 0) {
          button = candidate
          break
        }
      }
    }

    if (!button) {
      await page.waitForTimeout(1_000)
      continue
    }
    if (await button.isEnabled().catch(() => false)) {
      // Short settle so the click doesn't race the field fills above.
      await page.waitForTimeout(500)
      await button.click({ timeout: 10_000 }).catch(() => undefined)
      clicks += 1
    }
    await page.waitForTimeout(3_000)
  }
  if (clicks === 0) {
    throw new Error("Stripe embedded Checkout: no Pay button found")
  }
}

/** Fills the embedded Checkout form and submits it with a Stripe test card. */
export async function payWithTestCard(page: Page): Promise<void> {
  // The embedded Checkout iframes mount after the client secret is fetched and
  // Stripe.js loads; wait for Stripe's frame rather than a fixed delay.
  await expect
    .poll(() => stripeFrames(page).length, { timeout: 60_000 })
    .toBeGreaterThan(0)

  const innerFrame = () =>
    page.frames().find((f) => f.url().includes("embedded-checkout-inner"))
  const field = (name: keyof typeof STRIPE_FIELDS) => STRIPE_FIELDS[name]

  expect(
    await fillVerified(page, field("email"), "jane.buyer@example.com")
  ).toBe(true)

  // Link's "Save my information" adds a required phone field; turn it off first,
  // before the card fields exist, so a re-render can't drop what we typed.
  await ensureLinkSaveOff(page, innerFrame)

  // The payment methods render as a radio list with Card collapsed. Its own
  // button is a hidden overlay, so the visible, clickable target is the row
  // container (`card-accordion-item`).
  if (!(await fillVerified(page, field("number"), "4242424242424242", 3_000))) {
    const inner = innerFrame()
    if (inner) {
      const container = inner
        .locator('[data-testid="card-accordion-item"]')
        .first()
      await container.scrollIntoViewIfNeeded().catch(() => undefined)
      await container.click({ timeout: 10_000 }).catch(() => undefined)
    }
  }
  expect(
    await fillVerified(page, field("number"), "4242424242424242", 30_000)
  ).toBe(true)

  // Every card field is re-read until its value sticks: a fill can race the
  // card form mounting (this is what left the CVC empty).
  expect(await fillVerified(page, field("expiry"), "1234", 30_000)).toBe(true)
  expect(await fillVerified(page, field("cvc"), "123", 30_000)).toBe(true)
  // Name-on-card and ZIP are present on some configurations; fill when shown.
  await fillVerified(page, field("name"), "Jane Buyer", 5_000)
  await fillVerified(page, field("postal"), "15213", 15_000)

  // If Link's phone field is present it is required — fill it (country code
  // defaults to US). It is absent when "Save my information" stayed off.
  const phone = innerFrame()?.locator("#phoneNumber")
  if (phone && (await phone.count().catch(() => 0)) > 0) {
    expect(await fillVerified(page, field("phone"), "2015550123", 30_000)).toBe(
      true
    )
  }

  // A late re-render can flip the Link toggle back on; confirm it is off and
  // re-verify the required card fields immediately before submitting.
  await ensureLinkSaveOff(page, innerFrame)
  for (const [name, value] of [
    ["number", "4242424242424242"],
    ["expiry", "1234"],
    ["cvc", "123"],
  ] as const) {
    expect(await fillVerified(page, field(name), value, 15_000)).toBe(true)
  }

  await submitPayment(page, innerFrame)
}

/**
 * Fills the golf DataCollector and ticks its Mulligan add-on. Leaves the page
 * on the PDP, ready for the caller to click "Add to cart" (kept separate so a
 * light shape check can add without a full registration fill if it wants).
 */
export async function fillGolfRegistrationAndMulligan(page: Page): Promise<void> {
  await page.locator("#pdp-golf-outing-captainName").fill("Jane Captain")
  await page
    .locator("#pdp-golf-outing-captainEmail")
    .fill("jane.buyer@example.com")
  await page.getByLabel("Golfer name 1").fill("Mike Golfer")

  await page
    .locator('[class*="addonRow"]', { hasText: "Mulligan" })
    .getByRole("checkbox")
    .check()
}

/**
 * Fills the Steel City 7s DataCollector (its four required fields). The page is
 * a `variation`, so a division must be chosen before this.
 */
export async function fillSc7sCollector(page: Page): Promise<void> {
  await page.locator("#pdp-steel-city-7s-contactName").fill("Alex Contact")
  await page
    .locator("#pdp-steel-city-7s-contactEmail")
    .fill("alex@example.com")
  await page.locator("#pdp-steel-city-7s-teamName").fill("Forge Old Boys")
  await page.locator("#pdp-steel-city-7s-refundAgreement").check()
}

/**
 * Opens a `variation` PDP's option select (Radix) and chooses the first enabled
 * option. Returns the option's text so the caller can assert on it.
 *
 * @param page - The page on the PDP.
 * @param triggerId - The select trigger's id (e.g. `dues-primary`).
 * @returns The chosen option's label.
 */
export async function chooseFirstVariation(
  page: Page,
  triggerId: string
): Promise<string> {
  await page.locator(`#${triggerId}`).click()
  const option = page.locator('[role="option"]:not([data-disabled])').first()
  await expect(option).toBeVisible()
  const label = (await option.innerText()).trim()
  await option.click()
  return label
}

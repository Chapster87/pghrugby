import { expect, test } from "@playwright/test"

import {
  assertLoopback,
  fillGolfRegistrationAndMulligan,
  payWithTestCard,
  select,
} from "./harness"

/**
 * The canonical E2E buy path (#76): a golf registration with its collector
 * fields plus an add-on, added from the PDP, through the minicart flyout, into
 * the real **Stripe test-mode embedded Checkout**, to the success page — then
 * the resulting rows are asserted in the **local ephemeral Supabase**.
 *
 * This is the single-line scenario. The mixed cart is `mixed-cart.spec.ts`; the
 * three PDP shapes are `pdp-shapes.spec.ts`. The shared harness (loopback guard,
 * PostgREST reader, Stripe driver) lives in `harness.ts`.
 *
 * The golf collector fields were confirmed against the **prerendered** page
 * (`.next/server/app/product/golf-outing.html`), not the docs: the authored set
 * is `captainName` + `captainEmail` + a repeatable `golfers` — there is no
 * `teamName` on this collector.
 */

test("a golf registration + add-on buys through Stripe test mode", async ({
  page,
}) => {
  assertLoopback()

  // -- PDP: fill the golf registration's collector fields + select an add-on --
  await page.goto("/golf-outing")
  await fillGolfRegistrationAndMulligan(page)
  await page.getByRole("button", { name: "Add to cart" }).click()

  // -- Minicart flyout: assert the group landed, then hand off to Checkout ---
  const flyout = page.getByRole("dialog", { name: "Your cart" })
  await expect(flyout).toBeVisible()
  await expect(flyout.getByText("Golf Outing Registration")).toBeVisible()
  await expect(flyout.getByText("Mulligan", { exact: false })).toBeVisible()

  await flyout.getByRole("button", { name: "Checkout" }).click()

  // -- Checkout page: the browser cart is origin-scoped, so this must be the
  //    same origin Stripe returns to. Capture the cartRef it built against. ---
  await page.waitForURL(/\/checkout\?cartRef=/, { timeout: 60_000 })
  const cartRef = new URL(page.url()).searchParams.get("cartRef")
  expect(cartRef).toBeTruthy()

  await payWithTestCard(page)

  // -- Success page: recordOrder runs server-side and writes the rows --------
  await page.waitForURL(/\/checkout\/success\?session_id=/, { timeout: 90_000 })
  await expect(
    page.getByRole("heading", { name: /order confirmed/i })
  ).toBeVisible({ timeout: 60_000 })

  const sessionId = new URL(page.url()).searchParams.get("session_id")
  expect(sessionId).toBeTruthy()

  // -- Local Supabase: the three families of rows, and their links -----------
  const filter = `session_id=eq.${encodeURIComponent(sessionId!)}`

  // The success page writes synchronously, but poll briefly in case the page's
  // fast-path insert raced the response the browser received.
  await expect
    .poll(async () => (await select("orders", filter)).length, {
      timeout: 30_000,
    })
    .toBe(1)

  const [order] = await select<{ families: string[]; session_id: string }>(
    "orders",
    filter
  )
  expect(order.families).toContain("golf")

  const lines = await select<{
    id: string
    line_index: number
    sku: string | null
    family: string | null
    source_pdp: string | null
    parent_line_id: string | null
  }>("order_lines", `${filter}&order=line_index.asc`)

  expect(lines.length).toBe(2)
  const [primary, addonLine] = lines
  expect(primary.family).toBe("golf")
  expect(primary.source_pdp).toBe("golf-outing")
  expect(primary.parent_line_id).toBeNull()
  // The add-on row points back at the primary it was added with.
  expect(addonLine.parent_line_id).toBe(primary.id)

  const registrations = await select<{
    id: string
    line_id: string
    answers: Record<string, unknown>
    summary: string | null
  }>("order_registrations", filter)

  expect(registrations.length).toBe(1)
  expect(registrations[0].line_id).toBe(primary.id)
  expect(registrations[0].answers).toMatchObject({
    captainName: "Jane Captain",
    captainEmail: "jane.buyer@example.com",
    golfers: ["Mike Golfer"],
  })

  // The cart snapshot `recordOrder` re-joined is the checkout-time truth.
  const carts = await select<{ cart_ref: string; entries: unknown[] }>(
    "carts",
    `cart_ref=eq.${encodeURIComponent(cartRef!)}`
  )
  expect(carts.length).toBe(1)
  expect(carts[0].entries.length).toBeGreaterThanOrEqual(2)
})

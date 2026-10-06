import { expect, test } from "@playwright/test"

import {
  assertLoopback,
  chooseFirstVariation,
  fillGolfRegistrationAndMulligan,
  payWithTestCard,
  select,
} from "./harness"

/**
 * The mixed cart, bought through the real flow (#76, phase 2).
 *
 * One browser cart spanning four pages — a golf registration with its add-on,
 * a pig-roast ticket (quantity-bearing), a season-dues line, and a preset
 * donation — checked out together through the minicart flyout and the real
 * Stripe test-mode embedded Checkout, then asserted in local Supabase.
 *
 * The point is that the order carries the **distinct families** it touched and
 * that the child rows are right: one `order_lines` row per priced line, the
 * add-on linked to its primary, and the registration tied to the golf line.
 *
 * Shape routes (authoring names → real routes):
 *   golf-outing-2026        → /golf-outing        (simple + collector)
 *   annual-forge-pig-roast  → /pig-roast          (simple, quantity-bearing)
 *   steel-city-7s-2026      → /steel-city-7s      (variation + collector)
 *   dues                    → /dues               (variation)
 *   the preset ladder       → /donate             (variation + any-amount)
 */

type OrderLine = {
  id: string
  line_index: number
  description: string | null
  quantity: number
  family: string | null
  source_pdp: string | null
  parent_line_id: string | null
}

test("a mixed cart buys through Stripe test mode and lands its families", async ({
  page,
}) => {
  assertLoopback()

  // -- golf registration + add-on (simple + collector) ----------------------
  await page.goto("/golf-outing")
  await fillGolfRegistrationAndMulligan(page)
  await page.getByRole("button", { name: "Add to cart" }).click()
  let flyout = page.getByRole("dialog", { name: "Your cart" })
  await expect(flyout.getByText("Golf Outing Registration")).toBeVisible()

  // -- pig-roast ticket (simple, quantity-bearing) --------------------------
  await page.goto("/pig-roast")
  await page.locator('input[name="quantity"]').fill("2")
  await page.getByRole("button", { name: "Add to cart" }).click()
  flyout = page.getByRole("dialog", { name: "Your cart" })
  await expect(
    flyout.getByText("Annual Forge Pig Roast Ticket")
  ).toBeVisible()

  // -- season dues (variation) ---------------------------------------------
  await page.goto("/dues")
  await chooseFirstVariation(page, "dues-primary")
  await page.getByRole("button", { name: "Add to cart" }).click()
  flyout = page.getByRole("dialog", { name: "Your cart" })
  await expect(flyout.getByText(/Season Dues/)).toBeVisible()

  // -- preset donation (variation) -----------------------------------------
  await page.goto("/donate")
  await chooseFirstVariation(page, "donate-primary")
  await page.getByRole("button", { name: "Add to cart" }).click()
  flyout = page.getByRole("dialog", { name: "Your cart" })

  // The one add-to-cart per page gives one card per group; all four are here.
  await expect(flyout.getByText("Golf Outing Registration")).toBeVisible()
  await expect(flyout.getByText("Mulligan", { exact: false })).toBeVisible()
  await expect(
    flyout.getByText("Annual Forge Pig Roast Ticket")
  ).toBeVisible()
  await expect(flyout.getByText(/Season Dues/)).toBeVisible()
  await expect(flyout.getByText("Club donation", { exact: false })).toBeVisible()

  await flyout.getByRole("button", { name: "Checkout" }).click()

  await page.waitForURL(/\/checkout\?cartRef=/, { timeout: 60_000 })
  const cartRef = new URL(page.url()).searchParams.get("cartRef")
  expect(cartRef).toBeTruthy()

  await payWithTestCard(page)

  await page.waitForURL(/\/checkout\/success\?session_id=/, { timeout: 90_000 })
  await expect(
    page.getByRole("heading", { name: /order confirmed/i })
  ).toBeVisible({ timeout: 60_000 })

  const sessionId = new URL(page.url()).searchParams.get("session_id")
  expect(sessionId).toBeTruthy()
  const filter = `session_id=eq.${encodeURIComponent(sessionId!)}`

  await expect
    .poll(async () => (await select("orders", filter)).length, {
      timeout: 30_000,
    })
    .toBe(1)

  const [order] = await select<{ families: string[] }>("orders", filter)
  // Distinct families across every line, in first-seen order: golf first, then
  // the pig-roast ticket (events), the dues line, and the donation.
  expect([...order.families].sort()).toEqual([
    "donation",
    "dues",
    "events",
    "golf",
  ])

  const lines = await select<OrderLine>(
    "order_lines",
    `${filter}&order=line_index.asc`
  )
  // One row per priced line: registration, mulligan, pig-roast, dues, donation.
  expect(lines.length).toBe(5)

  const registration = lines.find((l) =>
    l.description?.includes("Golf Outing Registration")
  )
  const mulligan = lines.find((l) => l.description?.includes("Mulligan"))
  const pigRoast = lines.find((l) => l.family === "events")
  const dues = lines.find((l) => l.family === "dues")
  const donation = lines.find((l) => l.family === "donation")

  expect(registration?.family).toBe("golf")
  expect(registration?.parent_line_id).toBeNull()
  // The add-on points back at the golf primary it was added with.
  expect(mulligan?.family).toBe("golf")
  expect(mulligan?.parent_line_id).toBe(registration?.id)

  // The quantity-bearing ticket came through at its buyer-set quantity.
  expect(pigRoast?.description).toContain("Pig Roast")
  expect(pigRoast?.quantity).toBe(2)

  expect(dues?.description).toMatch(/Season Dues/)
  expect(donation?.description).toContain("Club donation")

  const registrations = await select<{ line_id: string }>(
    "order_registrations",
    filter
  )
  expect(registrations.length).toBe(1)
  expect(registrations[0].line_id).toBe(registration?.id)

  const carts = await select<{ cart_ref: string; entries: unknown[] }>(
    "carts",
    `cart_ref=eq.${encodeURIComponent(cartRef!)}`
  )
  expect(carts.length).toBe(1)
  expect(carts[0].entries.length).toBeGreaterThanOrEqual(5)
})

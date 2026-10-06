import { expect, test } from "@playwright/test"

import {
  assertLoopback,
  chooseFirstVariation,
  fillGolfRegistrationAndMulligan,
  fillSc7sCollector,
} from "./harness"

/**
 * The three PDP shapes (#76, phase 2) — a light check each: the page renders,
 * its shape-specific control works, and add-to-cart lands the line in the
 * minicart flyout. These deliberately do **not** run a Stripe purchase; one
 * full buy per scenario type is enough, so the mixed cart (and the phase-1
 * buy-path) carry the checkout cost.
 *
 * The ticket's authoring names map to the real routes:
 *   golf-outing-2026       → /golf-outing   (simple, quantity-bearing, collector)
 *   annual-forge-pig-roast → /pig-roast     (simple, quantity-bearing, no collector)
 *   steel-city-7s-2026     → /steel-city-7s (variation + collector)
 *
 * There is no fourth "any amount" shape among those three: the pay-what-you-want
 * affordance lives on `/donate` beside the preset ladder, as its own standalone
 * session, and is not a PDP buy-box shape.
 */

test("golf-outing: simple + collector, add-to-cart opens the flyout", async ({
  page,
}) => {
  assertLoopback()

  await page.goto("/golf-outing")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await expect(page.getByRole("button", { name: "Add to cart" })).toBeVisible()
  // A collector page renders the registration form.
  await expect(page.getByText("Registration details")).toBeVisible()

  await fillGolfRegistrationAndMulligan(page)
  await page.getByRole("button", { name: "Add to cart" }).click()

  const flyout = page.getByRole("dialog", { name: "Your cart" })
  await expect(flyout.getByText("Golf Outing Registration")).toBeVisible()
  await expect(flyout.getByText("Mulligan", { exact: false })).toBeVisible()
})

test("annual-forge-pig-roast: a quantity-bearing ticket adds with its quantity", async ({
  page,
}) => {
  assertLoopback()

  await page.goto("/pig-roast")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await expect(page.getByRole("button", { name: "Add to cart" })).toBeVisible()

  // No collector on this shape; the shape difference is the quantity stepper.
  const quantity = page.locator('input[name="quantity"]')
  await expect(quantity).toBeVisible()
  await quantity.fill("2")

  await page.getByRole("button", { name: "Add to cart" }).click()

  const flyout = page.getByRole("dialog", { name: "Your cart" })
  await expect(
    flyout.getByText("Annual Forge Pig Roast Ticket")
  ).toBeVisible()
  // The buyer-set quantity rides into the cart.
  await expect(flyout.locator('input[name="quantity"]')).toHaveValue("2")
})

test("steel-city-7s: a variation + collector page adds the chosen division", async ({
  page,
}) => {
  assertLoopback()

  await page.goto("/steel-city-7s")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  // A variation page starts with no option chosen and renders the collector.
  await expect(page.getByText("Choose an option")).toBeVisible()
  await expect(page.getByText("Registration details")).toBeVisible()

  // The option label carries a price suffix (" — $400.00"); the flyout names the
  // line by its catalog label, so compare on the part before the dash.
  const chosen = await chooseFirstVariation(page, "steel-city-7s-primary")
  const divisionLabel = chosen.split(" — ")[0]

  await fillSc7sCollector(page)
  await page.getByRole("button", { name: "Add to cart" }).click()

  const flyout = page.getByRole("dialog", { name: "Your cart" })
  await expect(flyout.getByText(divisionLabel)).toBeVisible()
  await expect(flyout.getByText("Forge Old Boys")).toBeVisible()
})

import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright config for the post-deploy production smoke (map #126 decision 4).
 *
 * Unlike the Vitest layers, this drives a real browser against a *deployed* site
 * — production by default. `SMOKE_BASE_URL` overrides the target; the CI workflow
 * passes it. The suite is read-only by contract (see the spec's network guard).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // A stray `test.only` must never silently shrink the smoke on CI.
  forbidOnly: !!process.env.CI,
  // One retry on CI: a cold CDN edge should not read as an outage.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    // The app's production origin is `next.pghrugby.com` until the apex cutover
    // (ADR-0001); `pghrugby.com` is still the legacy WordPress site. Becomes the
    // apex when the cutover lands. The CI workflow overrides this per run.
    baseURL: process.env.SMOKE_BASE_URL ?? "https://next.pghrugby.com",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})

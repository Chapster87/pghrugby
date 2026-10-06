import { defineConfig, devices } from "@playwright/test"

import { E2E_BASE_URL, E2E_PORT, e2eWebServerEnv } from "./e2e/stack-env"

/**
 * Playwright config for the local E2E buy path (#76, the testing-foundation map
 * #126's E2E child).
 *
 * Unlike the production smoke (`playwright.config.ts`), this drives the **real
 * buy flow in a browser against the app running locally**: the local ephemeral
 * Supabase stack (#129, `scripts/db/stack.mjs`) and Stripe **test mode**.
 *
 * `next build` then `next start` — prod-faithful, not `next dev`. The build
 * reads DatoCMS/ForgeCMS (so the CMS vars must be present; CI supplies them as
 * job env, locally `.env.local` is loaded by Next) and inlines `NEXT_PUBLIC_*`.
 * `webServer.env` is what forces the loopback Supabase URL, `STRIPE_ENV=test`,
 * and the matching `NEXT_PUBLIC_BASE_URL` for **both** build and start; a value
 * already on the process beats `.env.local`. See `e2e/stack-env.ts`.
 *
 * `globalSetup` starts the stack and runs the loopback guard; `globalTeardown`
 * stops it. Every spec in `./e2e` is run except the remote read-only smoke,
 * which is a separate config against a deployed site and is never repurposed
 * here.
 *
 * Serial (`workers: 1`): the buy specs drive real Stripe Checkout sessions, and
 * a flaky gate is worse than a slower one. The suite is small enough that the
 * wall-clock cost is modest.
 */
export default defineConfig({
  testDir: "./e2e",
  testIgnore: "**/production-smoke.spec.ts",
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // A prod build and a real Stripe round trip; the default 30s is far too tight.
  timeout: 120_000,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
    // A hard cap on any single action, so an unreachable Stripe control cannot
    // silently consume the whole test timeout.
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chromium",
        // Headed, deliberately. Stripe's bot mitigation serves an hCaptcha
        // challenge to a headless browser and never lets the real embedded
        // Checkout complete; a headed browser passes it invisibly. On Linux CI
        // this needs a display — the workflow runs under `xvfb-run`.
        headless: false,
        // Standard switches a real-browser E2E needs to reach the real form
        // (nothing about Checkout itself is stubbed).
        launchOptions: {
          args: ["--disable-blink-features=AutomationControlled"],
        },
      },
    },
  ],
  webServer: {
    command: "pnpm build && pnpm start",
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env.CI,
    // A DatoCMS/ForgeCMS-backed `next build` is measured in minutes, not seconds.
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
    env: e2eWebServerEnv,
  },
})

const c = require("ansi-colors")

// Core runtime envs for the single Next.js app (see
// docs/agents/environment-secrets-inventory.md § 3.1). Missing keys are
// warnings, not fatal: local dev legitimately runs with a partial .env.local
// (e.g. live webhook secret pending). Deployments validate envs at their own
// hosting layer.
const requiredEnvs = [
  { key: "NEXT_PUBLIC_BASE_URL", description: "Site base URL" },
  {
    key: "STRIPE_SECRET_KEY",
    description:
      "Stripe secret key (STRIPE_SECRET_KEY_LIVE/_TEST or canonical)",
  },
  {
    key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    description:
      "Stripe publishable key (…_LIVE/_TEST or canonical); legacy NEXT_PUBLIC_STRIPE_KEY is dropped",
  },
  { key: "NEXT_PUBLIC_SUPABASE_URL", description: "Supabase project URL" },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    description: "Supabase service-role key (orders)",
  },
  {
    key: "DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN",
    description: "DatoCMS CDA token (published content)",
  },
  {
    key: "FORGECMS_API_URL",
    description: "ForgeCMS Content Delivery API URL",
  },
  {
    key: "FORGECMS_API_TOKEN",
    description: "ForgeCMS Content Delivery API token",
  },
  {
    key: "NEXT_PUBLIC_SANITY_PROJECT_ID",
    description:
      "Sanity project id (nav/footer/posts until the Sanity teardown)",
  },
]

function checkEnvVariables() {
  const missingEnvs = requiredEnvs.filter(function (env) {
    return !process.env[env.key]
  })

  if (missingEnvs.length > 0) {
    console.warn(
      c.yellow.bold(
        "\n⚠️  Missing environment variables (dev will still run)\n"
      )
    )

    missingEnvs.forEach(function (env) {
      console.warn(c.yellow(`  ${c.bold(env.key)}`))
      if (env.description) {
        console.warn(c.dim(`    ${env.description}`))
      }
    })
    console.warn("")
  }
}

module.exports = checkEnvVariables

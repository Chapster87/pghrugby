/**
 * Generate the DatoCMS GraphQL schema for gql.tada.
 * Reads the CDA token from the environment — never hardcode tokens in package.json.
 *
 * Usage (from pghrugby/nextjs):
 *   pnpm generate-schema
 * with DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN set in .env.local (or the shell).
 */
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

/**
 * Load KEY=VALUE pairs from a .env file into process.env (no overwrite).
 * @param {string} filePath
 */
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return
  const text = readFileSync(filePath, "utf8")
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

loadEnvFile(resolve(root, ".env.local"))
loadEnvFile(resolve(root, ".env"))

const token =
  process.env.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN ||
  process.env.DATOCMS_CMA_TOKEN ||
  process.env.DATOCMS_API_TOKEN

if (!token) {
  console.error(
    "Missing DatoCMS token. Set DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN in .env.local (or DATOCMS_CMA_TOKEN / DATOCMS_API_TOKEN)."
  )
  process.exit(1)
}

const result = spawnSync(
  "pnpm",
  [
    "gql-tada",
    "generate",
    "schema",
    "https://graphql.datocms.com/",
    "--header",
    `Authorization: Bearer ${token}`,
    "--output",
    "./schema.graphql",
  ],
  { cwd: root, stdio: "inherit", shell: true }
)

process.exit(result.status ?? 1)

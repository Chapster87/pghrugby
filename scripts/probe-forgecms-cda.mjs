/**
 * Probe the ForgeCMS Content Delivery API — published versus preview.
 *
 * Runs one GraphQL document twice: once on the delivery key (published content),
 * and — when `CMS_PREVIEW_TOKEN` is set — once on the preview key with the
 * preview arguments set. The difference between the two is the whole point: the
 * CDA forces `preview` / `includeDrafts` off for any credential but the preview
 * key, so this is the end-to-end check that a local draft read works and that
 * the arguments are honoured. A query that looks identical both times is not
 * proof of the opposite; it means the record has no staged edit to show yet.
 *
 * Run from the repo root:
 *   pnpm probe:cda                          # the built-in linktree probe
 *   pnpm probe:cda path/to/query.graphql    # any document
 *
 * A supplied document may declare `$preview` and `$includeDrafts`; each is
 * supplied only when the document declares it, because an operation must use
 * every variable it defines. Keys come from the environment and are never
 * printed.
 */
import { readFile } from "node:fs/promises"

const url = process.env.CMS_GRAPHQL_URL
const deliveryKey = process.env.CMS_API_TOKEN
const previewKey = process.env.CMS_PREVIEW_TOKEN

/**
 * The default probe: `linktree` is a draft-capable singleton the site actually
 * reads (`src/app/(core)/links/links.query.ts`), and `top_links` is where a
 * staged edit shows up — a saved-but-unpublished link appears in the preview
 * read and not in the published one. `updated_at` is the row's system column and
 * does *not* move when a draft is saved (staged values live in `_draft`), so it
 * is context rather than the tell.
 */
const DEFAULT_DOCUMENT = `query LinktreeProbe($preview: Boolean = false) {
  _heartbeat
  linktree(preview: $preview) {
    id
    updated_at
    top_links
    club_info
  }
}`

/**
 * Posts a document to the CDA and prints the raw answer.
 *
 * @param label - The heading to print above the result.
 * @param key - The value for `x-api-key`.
 * @param preview - Whether this is the staged read, used to fill any declared
 *   `$preview` / `$includeDrafts` variable.
 * @returns The HTTP status and the parsed body, the latter null when the
 *   response was not JSON.
 */
async function run(label, key, preview) {
  const variables = {}
  if (declares("preview")) variables.preview = preview
  if (declares("includeDrafts")) variables.includeDrafts = preview

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key },
    body: JSON.stringify({ query: document, variables }),
  })

  const body = await response.json().catch(() => null)

  console.log(`\n=== ${label} ===`)
  console.log(
    `HTTP ${response.status}` +
      (response.status === 401 ? " — key refused by the CDA" : "")
  )
  console.log(JSON.stringify(body, null, 2))

  return { status: response.status, body }
}

/** Whether the document declares a variable, so we only send what it uses. */
function declares(name) {
  return new RegExp(`\\$${name}\\b`).test(document)
}

const document =
  process.argv[2] != null
    ? await readFile(process.argv[2], "utf8")
    : DEFAULT_DOCUMENT

if (!url) {
  console.error("CMS_GRAPHQL_URL is unset — nothing to probe.")
  process.exitCode = 1
} else if (!deliveryKey) {
  console.error(
    "CMS_API_TOKEN is unset — the CDA authorizes nobody without it."
  )
  process.exitCode = 1
} else {
  console.log(`Probing ${url}`)
  console.log(
    `Keys: delivery ${deliveryKey ? "present" : "missing"}, ` +
      `preview ${previewKey ? "present" : "missing"}`
  )

  const published = await run("PUBLISHED (delivery key)", deliveryKey, false)

  if (!previewKey) {
    console.log(
      "\nNo preview read: set CMS_PREVIEW_TOKEN in .env.local to compare " +
        "staged content (the value must match the instance's Railway variable)."
    )
  } else {
    const previewRead = await run("PREVIEW (preview key)", previewKey, true)

    if (published.status === 401 || previewRead.status === 401) {
      console.log(
        "\nA key was refused. The preview key must match the instance's " +
          "CMS_PREVIEW_TOKEN exactly, and an unset preview key authorizes no " +
          "draft read at all."
      )
    } else if (
      JSON.stringify(published.body) === JSON.stringify(previewRead.body)
    ) {
      console.log(
        "\nIndistinguishable. Either the record is published with no staged " +
          "edit, or the key is not being honoured — save a change without " +
          "publishing and re-run to tell the two apart."
      )
    } else {
      console.log(
        "\nThe preview read differs — the preview key is honoured and the " +
          "arguments took effect."
      )
    }
  }
}

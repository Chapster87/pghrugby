// Probe the ForgeCMS GraphQL API and dump the schema model list.
// Reads CMS_GRAPHQL_URL / CMS_API_TOKEN from .env.local.
// Usage: node scripts/forgecms-introspect.mjs [--types | --fields]
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const env = parseEnv(fs.readFileSync(path.join(root, ".env.local"), "utf8"))

const url = env.CMS_GRAPHQL_URL
const token = env.CMS_API_TOKEN

if (!url) {
  console.error(
    "CMS_GRAPHQL_URL is not set in .env.local " +
      "(e.g. https://cms.pghrugby.com/api/graphql)"
  )
  process.exit(1)
}

const mode = process.argv[2] ?? "--fields"

async function main() {
  const introspection = `
    query Introspection {
      __schema {
        queryType { name }
        types {
          name
          kind
          fields(includeDeprecated: true) {
            name
            isDeprecated
            type { name kind ofType { name kind ofType { name kind } } }
          }
        }
      }
    }
  `

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": token,
    },
    body: JSON.stringify({ query: introspection }),
  })

  console.log(`HTTP ${res.status} — ${url}`)
  if (!res.ok) {
    console.log(await res.text())
    return
  }

  const json = await res.json()
  if (json.errors) {
    console.log(JSON.stringify(json.errors, null, 2))
    return
  }

  const types = json.data.__schema.types
  // Drop internal/object-helper boilerplate to keep output scannable.
  const internal =
    /(__|Mutation|Subscription|Node|String|Int|Float|Boolean|ID|JSON|Date|DateTime|Time|Upload|GraphQL|Query$|_Input|_Payload|_Filters|_Field|_Args|_DynamicZone|_Entity|_Meta|_RelationInput|_ListFilters|Pagination|FilterInput|SortInput|PublicationState|_PageInfo|_FiltersInput|_Link|_Scalar)/

  const relevant = types
    .filter((t) => t.kind !== "SCALAR" && t.kind !== "INPUT_OBJECT")
    .filter((t) => !internal.test(t.name))

  if (mode === "--types") {
    for (const t of relevant) {
      console.log(`${t.kind.padEnd(13)} ${t.name}`)
    }
    return
  }

  for (const t of relevant) {
    console.log(`\n${t.kind} ${t.name}`)
    for (const f of t.fields ?? []) {
      if (f.isDeprecated) continue
      const tName = leafName(f.type)
      console.log(`  ${f.name}: ${tName}`)
    }
  }
}

function leafName(type) {
  let cur = type
  let wrap = ""
  while (cur) {
    if (cur.kind === "LIST") wrap += "[]"
    cur = cur.ofType
  }
  return `${type.name ?? ""}${wrap}`
}

function parseEnv(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    out[m[1]] = m[2]
  }
  return out
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

/**
 * Ad-hoc PostgREST query CLI for the shared pghrugby/ForgeCMS database.
 *
 * Lets you inspect any table (website `orders`/`carts` or ForgeCMS content /
 * registry) without writing a script. Run from the repo root:
 *
 *   node --env-file=.env.local scripts/supabase-query.mjs matches
 *   node --env-file=.env.local scripts/supabase-query.mjs matches "select=*&limit=5"
 *   node --env-file=.env.local scripts/supabase-query.mjs matches "select=id" --count
 *   node --env-file=.env.local scripts/supabase-query.mjs models "select=table_name,friendly_name"
 *
 * Prints rows as a table. With `--count`, prints the total row count instead.
 */
import { count, select } from "./lib/supabase.mjs"

const [table, paramsArg, flag] = process.argv.slice(2)

if (!table) {
  console.error(
    "Usage: node --env-file=.env.local scripts/supabase-query.mjs <table> [params] [--count]"
  )
  process.exit(1)
}

const params = paramsArg ?? "select=*"

try {
  if (flag === "--count") {
    const total = await count(table)
    console.log(`${table}: ${total} rows`)
  } else {
    const rows = await select(table, params)
    if (!rows || rows.length === 0) {
      console.log(`${table}: no rows`)
    } else {
      console.table(rows)
    }
  }
} catch (err) {
  console.error(err.message)
  process.exit(1)
}

/**
 * Inspect the ForgeCMS side of the shared Supabase database.
 *
 * ForgeCMS is a metadata-driven CMS: `public.models` names the content tables
 * and `public.fields` defines their columns. This probe lists the models,
 * prints the field shape for the competition tables, and counts existing rows
 * so we can size the SportsPress backfill.
 *
 * Run from the repo root:
 *   node --env-file=.env.local scripts/inspect-forgecms.mjs
 */
import { count, select } from "./lib/supabase.mjs"

// 1. All models (content tables), sorted.
const models = await select(
  "models",
  "select=id,table_name,slug,friendly_name,is_singleton&order=table_name.asc"
)
console.log("\n=== MODELS ===")
console.table(
  models.map((m) => ({
    table: m.table_name,
    slug: m.slug,
    friendly: m.friendly_name,
    singleton: m.is_singleton,
  }))
)

// 2. Field shape for the competition models of interest.
const targets = ["matches", "standings", "teams", "leagues", "seasons", "divisions"]
for (const table of targets) {
  const model = models.find((m) => m.table_name === table)
  if (!model) {
    console.log(`\n=== ${table}: NO MODEL REGISTERED ===`)
    continue
  }
  const fields = await select(
    "fields",
    `model_id=eq.${model.id}&select=slug,field_label,field_type,is_required,is_system,is_computed&order=ui_order.asc`
  )
  console.log(`\n=== FIELD SHAPE: ${table} (${model.slug}) ===`)
  console.table(
    fields.map((f) => ({
      slug: f.slug,
      type: f.field_type,
      label: f.field_label,
      required: f.is_required,
      system: f.is_system,
      computed: f.is_computed,
    }))
  )
}

// 3. Row counts for the content tables.
console.log("\n=== ROW COUNTS ===")
for (const table of targets) {
  const total = await count(table)
  console.log(`${table}: ${total}`)
}

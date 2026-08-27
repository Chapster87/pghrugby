/**
 * PROTOTYPE — DatoCMS product & taxonomy models for the Stripe-backed store.
 * Throwaway by design; answers the question on ticket
 * "Prototype: DatoCMS product and taxonomy models" (wayfinder map #1):
 *
 *   How should DatoCMS model products (editorial content keyed to Stripe
 *   prices) plus the flow-group taxonomy for the catalog UI, as the interim
 *   home for product content?
 *
 * This module is the PORTABLE part of the prototype: the model definitions can
 * be lifted into a `datocms` CLI migration (or `datocms-cma` script) and the
 * GraphQL strings show the fragments the flow page will spread once the models
 * exist and `pnpm generate-schema` has been re-run. The TUI shell in run.ts is
 * throwaway.
 *
 * Shape sources:
 * - Existing DatoCMS page-shaped models (page / homepage) — the flow group
 *   model inherits their "base structure" (title, slug, canonicalUrl,
 *   Cloudinary featuredImage JSON, flat meta* SEO fields, structured-text
 *   content with the shared image/gallery/video blocks).
 * - `src/app/(core)/[slug]` route — the template the flow page route follows.
 * - `src/lib/checkout/catalog.ts` — the server-authoritative price catalog the
 *   DatoCMS records key into.
 * - `docs/agents/stripe-catalog-spec.md` §4 (SKU scheme) and the catalog-UI
 *   grilling resolution (flow-group taxonomy, add-ons as separate records).
 */

/* ------------------------------------------------------------------ */
/* Toggles — the decisions to react to                                */
/* ------------------------------------------------------------------ */

export type ToggleState = {
  /**
   * The Stripe seam on product records.
   * - "sku": product records carry the stable Stripe product id; the server
   *   catalog resolves sku -> current price id. Price rotation = code change.
   * - "priceId": records carry the literal Stripe Price id; DatoCMS becomes
   *   the price source. Price rotation = content edit + republish.
   */
  seam: "sku" | "priceId"
  /**
   * How a flow group composes products + add-ons.
   * - "flowItem": an inline `flow_item_block` (product link + kind) per row.
   * - "twoLinks": two link fields on the group (products, addonProducts).
   */
  addonShape: "flowItem" | "twoLinks"
  /**
   * How registration forms are modeled.
   * - "rehome": plain rehome of Sanity formType (flat field list).
   * - "repeatable": adds `repeatable` to form_field_block so a field repeats
   *   per unit (golfers on the golf flow).
   */
  formShape: "rehome" | "repeatable"
}

export const DEFAULT_TOGGLES: ToggleState = {
  seam: "sku",
  addonShape: "flowItem",
  formShape: "repeatable",
}

/* ------------------------------------------------------------------ */
/* Model definitions (DatoCMS JSON-schema shape, compact)             */
/* ------------------------------------------------------------------ */

export type FieldSpec = {
  apiKey: string
  label: string
  fieldType: string
  required?: boolean
  hint?: string
  validators?: Record<string, unknown>
  appearance?: Record<string, unknown>
  fieldset: string
}

export type ModelSpec = {
  name: string
  apiKey: string
  kind: "model" | "block"
  hint?: string
  attributes?: Record<string, unknown>
  fields: FieldSpec[]
}

/**
 * Build the model list. Some fields flip on/off with the toggles, so this is
 * a function of the current ToggleState rather than a static array.
 */
export function modelSpecs(t: ToggleState): ModelSpec[] {
  const productFields: FieldSpec[] = [
    {
      apiKey: "title",
      label: "Title",
      fieldType: "string",
      required: true,
      fieldset: "Content",
    },
    {
      apiKey: "sku",
      label: "SKU",
      fieldType: "string",
      required: true,
      hint: "Stable Stripe product id (dues-fall, golf-outing-mulligan, sc7s-mens-open). The taxonomy anchor cart, orders, and sessions key off; never changes once a Stripe product exists.",
      validators: {
        unique: {},
        format: {
          custom_pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
          description:
            "Lowercase letters/digits with hyphens, e.g. sc7s-womens-social",
        },
      },
      fieldset: "Content",
    },
    ...(t.seam === "sku"
      ? [
          {
            apiKey: "priceId",
            label: "Stripe Price id (resolved server-side)",
            fieldType: "string",
            required: false,
            hint: "Seam = sku: leave blank; src/lib/checkout/catalog.ts resolves sku -> live price. Fill only to pin a price for this record (rare override).",
            validators: {
              format: {
                custom_pattern: "^price_[A-Za-z0-9]+$",
                description: "Stripe Price id, e.g. price_1U8sVr...",
              },
            } as Record<string, unknown>,
            fieldset: "Content",
          } satisfies FieldSpec,
        ]
      : [
          {
            apiKey: "priceId",
            label: "Stripe Price id",
            fieldType: "string",
            required: true,
            hint: "Seam = priceId: this record is the price source. Rotating a price (new season year, rate change) means editing + republishing this record.",
            validators: {
              format: {
                custom_pattern: "^price_[A-Za-z0-9]+$",
                description: "Stripe Price id, e.g. price_1U8sVr...",
              },
            } as Record<string, unknown>,
            fieldset: "Content",
          } satisfies FieldSpec,
        ]),
    {
      apiKey: "shortDescription",
      label: "Short description",
      fieldType: "text",
      required: false,
      hint: "One-sentence option copy rendered in the flow selector / option list.",
      fieldset: "Content",
    },
    {
      apiKey: "longDescription",
      label: "Long description",
      fieldType: "text",
      required: false,
      hint: "Longer option detail rendered on the flow page. Markdown.",
      fieldset: "Content",
    },
    {
      apiKey: "media",
      label: "Media",
      fieldType: "json",
      required: false,
      hint: "Cloudinary media JSON — image or video (resource_type: image | video). Render via @/utils/cloudinary. Replaces the page model's image-only featuredImage.",
      fieldset: "Content",
    },
  ]

  const flowItemBlock: FieldSpec[] = [
    {
      apiKey: "product",
      label: "Product",
      fieldType: "link",
      required: true,
      hint: "The product record this row offers. Price stays in Stripe; the record only adds editorial content.",
      validators: { item_item_type: { item_types: ["product"] } },
      fieldset: "Composition",
    },
    {
      apiKey: "kind",
      label: "Kind",
      fieldType: "string",
      required: true,
      hint: "primary = the main buyable option (dues season, SC7s division); addon = optional extra line item (mulligan, drink band, additional side).",
      validators: { enum: { values: ["primary", "addon"] } },
      appearance: {
        editor: "string_select",
        parameters: {
          options: [
            { label: "Primary", value: "primary" },
            { label: "Add-on", value: "addon" },
          ],
        },
      },
      fieldset: "Composition",
    },
    {
      apiKey: "label",
      label: "Label override",
      fieldType: "string",
      required: false,
      hint: "Optional selector label when the product title isn't right (e.g. 'Division' vs 'Side').",
      fieldset: "Composition",
    },
  ]

  const flowGroupFields: FieldSpec[] = [
    {
      apiKey: "title",
      label: "Title",
      fieldType: "string",
      required: true,
      fieldset: "Content",
    },
    {
      apiKey: "slug",
      label: "Slug",
      fieldType: "slug",
      required: true,
      hint: "Clean public URL (/dues, /golf-outing, /steel-city-7s, /donate). beforeFiles rewrite target for internal /product/[handle].",
      validators: {
        slug_title_field: { title_field_id: "title" },
        slug_format: { predefined_pattern: "webpage_slug" },
        unique: {},
      },
      fieldset: "Content",
    },
    {
      apiKey: "canonicalUrl",
      label: "Canonical URL",
      fieldType: "string",
      required: false,
      validators: { format: { predefined_pattern: "url" } },
      fieldset: "Content",
    },
    {
      apiKey: "description",
      label: "Description",
      fieldType: "text",
      required: false,
      hint: "Page intro copy rendered under the H1 on the flow page.",
      fieldset: "Content",
    },
    {
      apiKey: "media",
      label: "Media",
      fieldType: "json",
      required: false,
      hint: "Cloudinary media JSON — image or video (resource_type: image | video). Render via @/utils/cloudinary.",
      fieldset: "Content",
    },
    {
      apiKey: "content",
      label: "Content",
      fieldType: "structured_text",
      required: false,
      hint: "Long-form page body. Reuses the shared image/gallery/video blocks so the [slug] route's BlocksFragment renderer works unchanged.",
      validators: {
        structured_text_blocks: {
          item_types: [
            "external_image_block",
            "image_block",
            "image_gallery_block",
            "video_block",
          ],
        },
        structured_text_inline_blocks: { item_types: [] },
        structured_text_links: { item_types: [] },
      },
      fieldset: "Content",
    },
    ...(t.addonShape === "flowItem"
      ? ([
          {
            apiKey: "flowItems",
            label: "Flow items",
            fieldType: "rich_text",
            required: true,
            hint: "Curated, ordered composition of the flow's products and add-ons. Drag to reorder; the page renders it as the option selector.",
            validators: {
              rich_text_blocks: { item_types: ["flow_item_block"] },
              size: { min: 1, max: 30 },
            },
            fieldset: "Store",
          },
        ] satisfies FieldSpec[])
      : ([
          {
            apiKey: "products",
            label: "Products",
            fieldType: "links",
            required: true,
            hint: "The buyable options (dues seasons, SC7s divisions, donation presets).",
            validators: { items_item_type: { item_types: ["product"] } },
            fieldset: "Store",
          },
          {
            apiKey: "addonProducts",
            label: "Add-on products",
            fieldType: "links",
            required: false,
            hint: "Optional extra line items composed into the same session (mulligan, drink band, additional side).",
            validators: { items_item_type: { item_types: ["product"] } },
            fieldset: "Store",
          },
        ] satisfies FieldSpec[])),
    {
      apiKey: "form",
      label: "Registration form",
      fieldType: "link",
      required: false,
      hint: "Payload shape for flows that carry a registration (golf: captain + golfers; SC7s: team + contact). Dues/donations leave empty.",
      validators: { item_item_type: { item_types: ["form"] } },
      fieldset: "Store",
    },
    {
      apiKey: "metaTitle",
      label: "Meta title",
      fieldType: "string",
      required: false,
      fieldset: "SEO",
    },
    {
      apiKey: "metaDescription",
      label: "Meta description",
      fieldType: "text",
      required: false,
      fieldset: "SEO",
    },
    {
      apiKey: "metaKeywords",
      label: "Meta keywords",
      fieldType: "string",
      required: false,
      fieldset: "SEO",
    },
    {
      apiKey: "metaRobots",
      label: "Meta robots",
      fieldType: "string",
      required: false,
      fieldset: "SEO",
    },
    {
      apiKey: "metaImage",
      label: "Meta image",
      fieldType: "json",
      required: false,
      hint: "Cloudinary JSON, as on page/homepage.",
      fieldset: "SEO",
    },
  ]

  const formFieldBlock: FieldSpec[] = [
    {
      apiKey: "label",
      label: "Label",
      fieldType: "string",
      required: true,
      fieldset: "Field",
    },
    {
      apiKey: "fieldName",
      label: "Field name",
      fieldType: "string",
      required: true,
      hint: "The payload key stored in the orders table registration JSONB.",
      validators: {
        format: {
          custom_pattern: "^[a-z][A-Za-z0-9]*$",
          description: "camelCase, e.g. captainName",
        },
      },
      fieldset: "Field",
    },
    {
      apiKey: "fieldType",
      label: "Field type",
      fieldType: "string",
      required: true,
      validators: {
        enum: { values: ["text", "email", "textarea", "select", "checkbox"] },
      },
      appearance: {
        editor: "string_select",
        parameters: {
          options: [
            { label: "Text", value: "text" },
            { label: "Email", value: "email" },
            { label: "Textarea", value: "textarea" },
            { label: "Select", value: "select" },
            { label: "Checkbox", value: "checkbox" },
          ],
        },
      },
      fieldset: "Field",
    },
    {
      apiKey: "required",
      label: "Required",
      fieldType: "boolean",
      required: false,
      appearance: {
        editor: "boolean_radio_group",
        parameters: {
          positive_radio: { label: "Yes", hint: "Block checkout until filled" },
          negative_radio: { label: "No" },
        },
      },
      fieldset: "Field",
    },
    {
      apiKey: "options",
      label: "Options",
      fieldType: "text",
      required: false,
      hint: "One option per line. Only used when field type is select.",
      fieldset: "Field",
    },
    {
      apiKey: "placeholder",
      label: "Placeholder",
      fieldType: "string",
      required: false,
      fieldset: "Field",
    },
    ...(t.formShape === "repeatable"
      ? ([
          {
            apiKey: "repeatable",
            label: "Repeat per unit",
            fieldType: "boolean",
            required: false,
            hint: "Repeat this field once per purchased unit (e.g. one golfer name row per golfer on the golf flow).",
            appearance: {
              editor: "boolean_radio_group",
              parameters: {
                positive_radio: {
                  label: "Yes",
                  hint: "Renders N times, N = quantity",
                },
                negative_radio: { label: "No" },
              },
            },
            fieldset: "Field",
          } satisfies FieldSpec,
        ] satisfies FieldSpec[])
      : []),
  ]

  const formFields: FieldSpec[] = [
    {
      apiKey: "title",
      label: "Title",
      fieldType: "string",
      required: true,
      fieldset: "Content",
    },
    {
      apiKey: "formFields",
      label: "Form fields",
      fieldType: "rich_text",
      required: false,
      hint: "Ordered field list. The renderer draws captain/contact fields once and repeatable fields once per unit.",
      validators: {
        rich_text_blocks: { item_types: ["form_field_block"] },
        size: { min: 0, max: 50 },
      },
      fieldset: "Content",
    },
  ]

  return [
    {
      name: "🏷️ Product",
      apiKey: "product",
      kind: "model",
      hint: "One record per Stripe product that needs editorial content. Thin by design — prices live in Stripe, composition lives in flow groups.",
      attributes: {
        draft_mode_active: true,
        collection_appearance: "table",
        title_field: "title",
        presentation_title_field: "title",
        excerpt_field: "shortDescription",
      },
      fields: productFields,
    },
    {
      name: "🎯 Flow group",
      apiKey: "flowGroup",
      kind: "model",
      hint: "The catalog taxonomy — replaces the removed /collections and /categories archives. One record per buyable flow page (dues, golf, SC7s, donate). Inherits the page model's base structure.",
      attributes: {
        draft_mode_active: true,
        collection_appearance: "table",
        title_field: "title",
        presentation_title_field: "title",
        excerpt_field: "metaDescription",
      },
      fields: flowGroupFields,
    },
    {
      name: "📋 Form",
      apiKey: "form",
      kind: "model",
      hint: "Registration payload shape (rehome of Sanity formType). Referenced by flow groups that carry a form.",
      attributes: {
        draft_mode_active: true,
        collection_appearance: "table",
        title_field: "title",
        presentation_title_field: "title",
      },
      fields: formFields,
    },
    {
      name: "🛒 Flow item",
      apiKey: "flow_item_block",
      kind: "block",
      hint: "Inline composition row inside a flow group: one product + whether it's a primary option or an add-on.",
      fields: flowItemBlock,
    },
    {
      name: "🖊️ Form field",
      apiKey: "form_field_block",
      kind: "block",
      hint: "One input in a registration form.",
      fields: formFieldBlock,
    },
  ]
}

/* ------------------------------------------------------------------ */
/* Catalog cases — the real records the models must represent         */
/* ------------------------------------------------------------------ */

export type FormFieldSpec = {
  label: string
  fieldName: string
  fieldType: string
  required: boolean
  options?: string[]
  repeatable?: boolean
}

export type CatalogCase = {
  id: string
  label: string
  flowGroup: { title: string; slug: string; description: string }
  products: {
    sku: string
    title: string
    description: string
    kind: "primary" | "addon"
  }[]
  form?: { title: string; fields: FormFieldSpec[] }
  note?: string
}

export const CASES: CatalogCase[] = [
  {
    id: "dues",
    label: "Season dues",
    flowGroup: {
      title: "Season Dues",
      slug: "dues",
      description:
        "Annual club dues by season. Pick your season and check out.",
    },
    products: [
      {
        sku: "dues-fall",
        title: "Fall 2026 Season Dues",
        description: "Competitive cycle dues — Fall.",
        kind: "primary",
      },
      {
        sku: "dues-spring",
        title: "Spring Season Dues",
        description: "Competitive cycle dues — Spring.",
        kind: "primary",
      },
      {
        sku: "dues-summer",
        title: "Summer Season Dues",
        description: "Competitive cycle dues — Summer.",
        kind: "primary",
      },
    ],
    note: "One record per season product (Stripe's rule: distinct options = distinct products). The season selector renders the 3 primaries; no form, no add-ons.",
  },
  {
    id: "golf",
    label: "Golf outing",
    flowGroup: {
      title: "Golf Outing",
      slug: "golf-outing",
      description:
        "Annual golf outing at Blackhawk GC. Register golfers, add mulligans or the drink band.",
    },
    products: [
      {
        sku: "golf-outing-registration",
        title: "Golf Outing Registration",
        description: "$110 per golfer, includes food and drink.",
        kind: "primary",
      },
      {
        sku: "golf-outing-mulligan",
        title: "Mulligan (4 + contest entry)",
        description: "4 mulligans + 1 contest entry.",
        kind: "addon",
      },
      {
        sku: "golf-outing-drink-band",
        title: "All You Can Drink",
        description: "Drink band for the outing.",
        kind: "addon",
      },
    ],
    form: {
      title: "Golf Outing — Captain & players",
      fields: [
        {
          label: "Captain name",
          fieldName: "captainName",
          fieldType: "text",
          required: true,
        },
        {
          label: "Captain email",
          fieldName: "captainEmail",
          fieldType: "email",
          required: true,
        },
        {
          label: "Golfer name",
          fieldName: "golfers",
          fieldType: "text",
          required: true,
          repeatable: true,
        },
      ],
    },
    note: "Registration is one line item × N golfers; add-ons are fixed-price extras in the same session. The repeatable golfer field tracks quantity.",
  },
  {
    id: "sc7s",
    label: "Steel City 7s",
    flowGroup: {
      title: "Steel City 7s",
      slug: "steel-city-7s",
      description:
        "Register a team for Steel City 7s. Pick a division, optionally add a side.",
    },
    products: [
      {
        sku: "sc7s-mens-open",
        title: "Men's Open",
        description: "Open division.",
        kind: "primary",
      },
      {
        sku: "sc7s-mens-social",
        title: "Men's Social",
        description: "Social division.",
        kind: "primary",
      },
      {
        sku: "sc7s-mens-super-social",
        title: "Men's Super Social",
        description: "Super social division.",
        kind: "primary",
      },
      {
        sku: "sc7s-womens-open",
        title: "Women's Open",
        description: "Open division.",
        kind: "primary",
      },
      {
        sku: "sc7s-womens-social",
        title: "Women's Social",
        description: "Social division.",
        kind: "primary",
      },
      {
        sku: "sc7s-mens-additional-side",
        title: "Men's Additional Side",
        description: "Second side for a men's team.",
        kind: "addon",
      },
      {
        sku: "sc7s-womens-additional-side",
        title: "Women's Additional Side",
        description: "Second side for a women's team.",
        kind: "addon",
      },
    ],
    form: {
      title: "SC7s — Team registration",
      fields: [
        {
          label: "Team name",
          fieldName: "teamName",
          fieldType: "text",
          required: true,
        },
        {
          label: "Contact name",
          fieldName: "contactName",
          fieldType: "text",
          required: true,
        },
        {
          label: "Contact email",
          fieldName: "contactEmail",
          fieldType: "email",
          required: true,
        },
      ],
    },
    note: "Division is the primary selector (qty 1); additional sides are add-ons. 7 product records — one per Stripe division product.",
  },
  {
    id: "donations",
    label: "Donations",
    flowGroup: {
      title: "Donate",
      slug: "donate",
      description: "Support Pittsburgh Forge Rugby Club.",
    },
    products: [
      {
        sku: "donation-club-preset-10",
        title: "Club donation — $10",
        description: "",
        kind: "primary",
      },
      {
        sku: "donation-club-preset-25",
        title: "Club donation — $25",
        description: "",
        kind: "primary",
      },
      {
        sku: "donation-club-preset-50",
        title: "Club donation — $50",
        description: "",
        kind: "primary",
      },
      {
        sku: "donation-pass-the-hat",
        title: "Pass the Hat Fund — $1",
        description: "Teammate hardship fund.",
        kind: "primary",
      },
    ],
    note: "Presets bundle with any flow. Pay-what-you-want (donation-club-any, custom_unit_amount) is sole-line-item-only and deferred to its own ticket — not modeled yet. Brendel scholarship stays on its Payment Link (membership-family decision).",
  },
  {
    id: "events",
    label: "Event tickets (not yet wired)",
    flowGroup: {
      title: "Forge Day at the Ballpark",
      slug: "ballpark-day",
      description:
        "One-off fundraisers recorded in the Stripe catalog but not yet flow-wired.",
    },
    products: [
      {
        sku: "ballpark-day-adult",
        title: "Forge Day at the Ballpark — Adult",
        description: "",
        kind: "primary",
      },
      {
        sku: "ballpark-ticket-16-under",
        title: "Forge Day at the Ballpark — 16 & Under",
        description: "",
        kind: "primary",
      },
      {
        sku: "nfl-survivor-pool-ticket",
        title: "NFL Survivor Pool — Ticket",
        description: "",
        kind: "primary",
      },
      {
        sku: "nfl-survivor-pool-insurance",
        title: "NFL Survivor Pool — Insurance",
        description: "",
        kind: "addon",
      },
      {
        sku: "steel-city-7s-bar-crawl",
        title: "Steel City 7s Bar Crawl",
        description: "",
        kind: "primary",
      },
      {
        sku: "annual-forge-pig-roast",
        title: "Annual Forge Pig Roast Ticket",
        description: "",
        kind: "primary",
      },
    ],
    note: "Proof the model accepts future flows without a schema change: create product records, compose a flow group, done. (Exact flows/URLs TBD in implementation.)",
  },
]

/* ------------------------------------------------------------------ */
/* Rendering helpers                                                   */
/* ------------------------------------------------------------------ */

const BOLD = "\x1b[1m"
const DIM = "\x1b[2m"
const RESET = "\x1b[0m"

export function renderModels(t: ToggleState): string {
  const lines: string[] = []
  for (const m of modelSpecs(t)) {
    lines.push(
      `${BOLD}${m.kind === "model" ? "MODEL" : "BLOCK"} ▸ ${m.name}${RESET} ` +
        `${DIM}(${m.apiKey})${RESET}`
    )
    if (m.hint) lines.push(`  ${DIM}${m.hint}${RESET}`)
    if (m.kind === "model" && m.attributes) {
      const attrs = Object.entries(m.attributes)
        .filter(([, v]) => v !== false && v !== undefined)
        .map(([k]) => k.replace(/_/g, " "))
        .join(" · ")
      if (attrs) lines.push(`  ${DIM}flags: ${attrs}${RESET}`)
    }
    const sets = new Map<string, FieldSpec[]>()
    for (const f of m.fields) {
      if (!sets.has(f.fieldset)) sets.set(f.fieldset, [])
      sets.get(f.fieldset)!.push(f)
    }
    for (const [setName, fields] of sets) {
      lines.push(`  ${BOLD}# ${setName}${RESET}`)
      for (const f of fields) {
        const v = f.validators
          ? " · " + Object.keys(f.validators).join(" · ")
          : ""
        const req = f.required ? "required" : "optional"
        lines.push(
          `  - ${BOLD}${f.apiKey}${RESET} ${DIM}(${f.fieldType}, ${req}${v})${RESET}`
        )
        if (f.hint) lines.push(`      ${DIM}${f.hint}${RESET}`)
      }
    }
    lines.push("")
  }
  return lines.join("\n")
}

export function renderRecordsForCase(c: CatalogCase, t: ToggleState): string {
  const lines: string[] = []
  const flowGroup = c.flowGroup
  lines.push(
    `${BOLD}FLOW GROUP ▸ ${flowGroup.title}${RESET} ${DIM}(flowGroup/${flowGroup.slug})${RESET}`
  )
  lines.push(
    `  slug          ${flowGroup.slug}   ${DIM}// rewrite target: /product/${flowGroup.slug} -> /${flowGroup.slug}${RESET}`
  )
  lines.push(`  description   ${flowGroup.description.slice(0, 72)}…`)

  if (t.addonShape === "flowItem") {
    lines.push(`  flowItems     ${c.products.length} rows (ordered)`)
    for (const p of c.products) {
      lines.push(
        `    - ${BOLD}${p.kind}${RESET} ${p.sku} ${DIM}-> "${p.title}"${RESET}`
      )
    }
  } else {
    const primaries = c.products.filter((p) => p.kind === "primary")
    const addons = c.products.filter((p) => p.kind === "addon")
    lines.push(`  products      ${primaries.map((p) => p.sku).join(", ")}`)
    lines.push(`  addonProducts ${addons.map((p) => p.sku).join(", ") || "—"}`)
  }

  if (c.form) {
    lines.push(`  form          ${c.form.title}`)
    for (const f of c.form.fields) {
      const repeat =
        f.repeatable && t.formShape === "repeatable"
          ? ` ${DIM}(× N)${RESET}`
          : ""
      lines.push(
        `    - ${f.fieldType} ${BOLD}${f.fieldName}${RESET} ${
          f.required ? "req" : "opt"
        }${repeat}`
      )
    }
  }

  lines.push("")
  lines.push(`${BOLD}PRODUCT RECORDS ▸ ${c.products.length}${RESET}`)
  for (const p of c.products) {
    const seam =
      t.seam === "sku"
        ? "priceId: (resolved in catalog.ts)"
        : "priceId: price_…"
    lines.push(
      `  - ${BOLD}${p.sku}${RESET} ${DIM}(${p.kind}, title: "${p.title}", ${seam})${RESET}`
    )
  }
  if (c.note) lines.push(`\n  ${DIM}${c.note}${RESET}`)
  return lines.join("\n")
}

/* ------------------------------------------------------------------ */
/* GraphQL — fragments + page query (gql.tada style)                  */
/* ------------------------------------------------------------------ */

export function renderGraphQL(c: CatalogCase, t: ToggleState): string {
  const flowItemSel =
    t.addonShape === "flowItem"
      ? `flowItems {
        blocks {
          ... on FlowItemBlockRecord {
            ...FlowItemFragment
          }
        }
      }`
      : `products {
        ...ProductFragment
      }
      addonProducts {
        ...ProductFragment
      }`

  const productSeamField = t.seam === "sku" ? "sku\n  priceId" : "priceId"

  const formFieldRepeat = t.formShape === "repeatable" ? "\n  repeatable" : ""

  const flowItemFragment =
    t.addonShape === "flowItem"
      ? `
fragment FlowItemFragment on FlowItemBlockRecord {
  kind
  label
  product {
    ...ProductFragment
  }
}
`
      : ""

  return `/* GraphQL */ // co-located: src/app/(core)/product/[handle]/flow.query.ts
// Once the models exist: pnpm generate-schema, then import { graphql } from "@/lib/datocms/graphql".

fragment ProductFragment on ProductRecord {
  title
  ${productSeamField}
  shortDescription
  longDescription
  media
}
${flowItemFragment}
fragment FormFieldFragment on FormFieldBlockRecord {
  label
  fieldName
  fieldType
  required
  options${formFieldRepeat}
}

fragment FormFragment on FormRecord {
  title
  formFields {
    blocks {
      ... on FormFieldBlockRecord {
        ...FormFieldFragment
      }
    }
  }
}

export const flowGroupSlugs = graphql(\`
  query FlowGroupSlugsQuery {
    allFlowGroups(filter: { _status: { eq: published } }) {
      slug
    }
  }
\`)

export const flowQuery = graphql(
  \`
  query FlowQuery($slug: String!) {
    flowGroup(filter: { slug: { eq: $slug } }) {
      title
      slug
      canonicalUrl
      description
      media
      metaTitle
      metaDescription
      metaKeywords
      metaRobots
      metaImage
      content {
        value
        blocks {
          ...BlocksFragment
        }
      }
      ${flowItemSel}
      form {
        ...FormFragment
      }
    }
  }
\`,
  [BlocksFragment, FlowItemFragment, FormFieldFragment, FormFragment, ProductFragment]
)
`
}

/* ------------------------------------------------------------------ */
/* Session build check — proves the seam resolves to a Checkout Session */
/* ------------------------------------------------------------------ */

export type LineItem = {
  sku: string
  label: string
  unitAmount: number
  priceId?: string
  quantity: string
}

export function sessionBuildForCase(
  c: CatalogCase,
  t: ToggleState
): { lineItems: LineItem[]; warnings: string[] } {
  const lineItems: LineItem[] = []
  const warnings: string[] = []
  for (const p of c.products) {
    if (p.kind === "addon") continue
    const item = findCatalogItem(p.sku)
    if (!item) {
      warnings.push(
        `No catalog entry for ${p.sku} — model renders, but the session builder can't resolve a price yet.`
      )
      continue
    }
    lineItems.push({
      sku: item.sku,
      label: item.label,
      unitAmount: item.unitAmount,
      priceId:
        t.seam === "priceId"
          ? "(from DatoCMS record — rotation = content edit)"
          : item.priceId,
      quantity: c.id === "golf" ? "× N golfers" : "× 1",
    })
  }
  const addons = c.products.filter((p) => p.kind === "addon")
  for (const p of addons) {
    const item = findCatalogItem(p.sku)
    lineItems.push({
      sku: item?.sku ?? p.sku,
      label: item?.label ?? p.title,
      unitAmount: item?.unitAmount ?? 0,
      priceId: t.seam === "priceId" ? "(from DatoCMS record)" : item?.priceId,
      quantity: "× 1 (optional)",
    })
  }
  return { lineItems, warnings }
}

/**
 * Minimal sku lookup mirroring src/lib/checkout/catalog.ts — kept local so
 * this prototype module stays standalone; the real flow page imports the
 * catalog directly.
 */
function findCatalogItem(
  sku: string
):
  | { sku: string; label: string; unitAmount: number; priceId?: string }
  | undefined {
  // Flat registry of the provisioned live catalog (see docs/agents/stripe-catalog-spec.md).
  const FLAT: Record<
    string,
    { label: string; unitAmount: number; priceId?: string }
  > = {
    "dues-fall": {
      label: "Fall 2026 Season Dues",
      unitAmount: 25000,
      priceId: "price_1U8sVq…",
    },
    "dues-spring": {
      label: "Spring Season Dues",
      unitAmount: 20000,
      priceId: "price_1U8sVr…",
    },
    "dues-summer": {
      label: "Summer Season Dues",
      unitAmount: 10000,
      priceId: "price_1U8sVr…",
    },
    "golf-outing-registration": {
      label: "Golf Outing Registration",
      unitAmount: 11000,
      priceId: "price_1U8sVr…",
    },
    "golf-outing-mulligan": {
      label: "Golf Outing — Mulligan (4 + contest entry)",
      unitAmount: 3000,
      priceId: "price_1U8sVs…",
    },
    "golf-outing-drink-band": {
      label: "Golf Outing — All You Can Drink",
      unitAmount: 3000,
      priceId: "price_1U8sVs…",
    },
    "sc7s-mens-open": {
      label: "SC7s Men's Open",
      unitAmount: 40000,
      priceId: "price_1U8sVt…",
    },
    "sc7s-mens-social": {
      label: "SC7s Men's Social",
      unitAmount: 40000,
      priceId: "price_1U8sVt…",
    },
    "sc7s-mens-super-social": {
      label: "SC7s Men's Super Social",
      unitAmount: 40000,
      priceId: "price_1U8sVt…",
    },
    "sc7s-womens-open": {
      label: "SC7s Women's Open",
      unitAmount: 40000,
      priceId: "price_1U8sVu…",
    },
    "sc7s-womens-social": {
      label: "SC7s Women's Social",
      unitAmount: 40000,
      priceId: "price_1U8sVu…",
    },
    "sc7s-mens-additional-side": {
      label: "SC7s Men's Additional Side",
      unitAmount: 37500,
      priceId: "price_1U8sVv…",
    },
    "sc7s-womens-additional-side": {
      label: "SC7s Women's Additional Side",
      unitAmount: 37500,
      priceId: "price_1U8sVv…",
    },
    "donation-club-preset-10": {
      label: "Club donation — $10",
      unitAmount: 1000,
      priceId: "price_1U8sVv…",
    },
    "donation-club-preset-25": {
      label: "Club donation — $25",
      unitAmount: 2500,
      priceId: "price_1U8sVw…",
    },
    "donation-club-preset-50": {
      label: "Club donation — $50",
      unitAmount: 5000,
      priceId: "price_1U8sVw…",
    },
    "donation-pass-the-hat": {
      label: "Pass the Hat Fund — $1",
      unitAmount: 100,
      priceId: "price_1U8sVw…",
    },
    "ballpark-day-adult": {
      label: "Forge Day at the Ballpark — Adult",
      unitAmount: 4000,
      priceId: "price_1U8sVx…",
    },
    "ballpark-ticket-16-under": {
      label: "Forge Day at the Ballpark — 16 & Under",
      unitAmount: 3500,
      priceId: "price_1U8sVx…",
    },
    "nfl-survivor-pool-ticket": {
      label: "NFL Survivor Pool — Ticket",
      unitAmount: 2000,
      priceId: "price_1U8sVx…",
    },
    "nfl-survivor-pool-insurance": {
      label: "NFL Survivor Pool — Insurance",
      unitAmount: 1000,
      priceId: "price_1U8sVy…",
    },
    "steel-city-7s-bar-crawl": {
      label: "Steel City 7s Bar Crawl",
      unitAmount: 500,
      priceId: "price_1U8sVy…",
    },
    "annual-forge-pig-roast": {
      label: "Annual Forge Pig Roast Ticket",
      unitAmount: 2500,
      priceId: "price_1U8sVz…",
    },
  }
  const hit = FLAT[sku]
  return hit ? { sku, ...hit } : undefined
}

export function renderSessionBuild(c: CatalogCase, t: ToggleState): string {
  const { lineItems, warnings } = sessionBuildForCase(c, t)
  const lines: string[] = [
    `${BOLD}SESSION BUILD ▸ ${c.flowGroup.title}${RESET} ${DIM}(seam=${t.seam})${RESET}`,
  ]
  for (const li of lineItems) {
    const amount = `$${(li.unitAmount / 100).toFixed(2)}`
    lines.push(`  - ${BOLD}${li.sku}${RESET} ${amount} ${li.quantity}`)
    lines.push(`      ${DIM}${li.label}${RESET}`)
    lines.push(`      ${DIM}${li.priceId}${RESET}`)
  }
  for (const w of warnings) lines.push(`  ${BOLD}! ${w}${RESET}`)
  return lines.join("\n")
}

/* ------------------------------------------------------------------ */
/* Route skeleton — inspired by src/app/(core)/[slug]/page.tsx        */
/* ------------------------------------------------------------------ */

export function renderRouteSkeleton(): string {
  return `// src/app/(core)/product/[handle]/page.tsx — inspired by (core)/[slug]/page.tsx
// The handle route exists so beforeFiles rewrites can map /product/<slug> -> /<slug>.
// Content comes from the flow group record, not per-product records.

export async function generateStaticParams() {
  const { allFlowGroups: data } = await executeQuery(flowGroupSlugs, {
    includeDrafts: false,
  })
  return data
}

export async function generateMetadata({ params }, parent) {
  const { slug } = await params
  const { isEnabled } = await draftMode()
  const { flowGroup } = await executeQuery(flowQuery, {
    variables: { slug },
    excludeInvalid: false,
    includeDrafts: isEnabled,
  })
  if (!flowGroup) return {}
  // mirror [slug]: metaTitle || \`${"${flowGroup.title}"} | Pittsburgh Forge Rugby Club\`,
  // metaDescription, canonicalUrl || url, metaImage[0].url for OG/twitter, JSON-LD.
  ...
}

export default async function FlowPage({ params }) {
  const { slug } = await params
  const { isEnabled } = await draftMode()
  const { flowGroup } = await executeQuery(flowQuery, {
    variables: { slug },
    excludeInvalid: false,
    includeDrafts: isEnabled,
    baseEditingUrl: true,
  })
  if (!flowGroup) notFound()

  return (
    <SidebarLayout>
      <article>
        <h1>{flowGroup.title}</h1>
        <p>{flowGroup.description}</p>

        {/* option selector: primaries + add-ons + quantity, built from flowItems */}
        <FlowSelector items={flowGroup.flowItems} />

        {/* registration form, when the flow has one */}
        {flowGroup.form && <RegistrationForm form={flowGroup.form} />}

        {/* page body: same blocks as [slug] — reuse the renderBlock switch */}
        <StructuredText data={flowGroup.content} renderBlock={renderBlock} />
      </article>
    </SidebarLayout>
  )
}
`
}

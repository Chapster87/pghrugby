/**
 * The browser-held cart's entry model — the shape the PDP, the minicart flyout,
 * the checkout-session build, and the order record all key off.
 *
 * A cart is a **flat, ordered list of entries** (add order, never re-keyed):
 *
 * - `PricedLine` — one sku and a buyer-set quantity; the **only** kind that
 *   becomes a Stripe line item.
 * - `CollectorEntry` — a DataCollector's answers for one add: the "faux line
 *   item" that renders and behaves like a line but carries no sku and no price.
 *
 * A primary line's add-ons and its collector entry link back through
 * `parentId`; `groupRef` is a display-only grouping/provenance tag, never an
 * identity key. See `docs/agents/cart-line-model.md` and
 * `docs/agents/registration-editing.md` § 7.
 *
 * Deliberately **not** `server-only`: the client cart store imports these
 * types, and the order-row builders (and the round-trip script) share them.
 */

/**
 * The fields every collector field carries: its API key, its label, and whether an
 * answer is required.
 */
type CollectorFieldBase = {
  /** The field's API key — the key its answer is stored under in `answers`. */
  name: string
  label: string
  required?: boolean
}

/** Repeat behaviour, shared by the free-input fields — the only ones that repeat. */
type Repeatable = {
  placeholder?: string
  repeatable?: boolean
  /** Repeat cap for a repeatable field — mirrors `quantity -> rows`. */
  max?: number
}

/** A single-line text input. */
export type TextCollectorField = CollectorFieldBase &
  Repeatable & {
    type: "text"
  }

/** A multi-line text input. */
export type TextareaCollectorField = CollectorFieldBase &
  Repeatable & {
    type: "textarea"
  }

/** An email input. */
export type EmailCollectorField = CollectorFieldBase &
  Repeatable & {
    type: "email"
  }

/** A one-of-`options` dropdown. */
export type SelectCollectorField = CollectorFieldBase & {
  type: "select"
  placeholder?: string
  options: string[]
}

/** A one-of-`options` radio group. */
export type RadioCollectorField = CollectorFieldBase & {
  type: "radio"
  placeholder?: string
  options: string[]
}

/** A single boolean tick — the only field with nothing beyond the shared three. */
export type CheckboxCollectorField = CollectorFieldBase & {
  type: "checkbox"
}

/** The free-input family: what a text box renders, and the only fields that repeat. */
export type FreeInputCollectorField =
  | TextCollectorField
  | TextareaCollectorField
  | EmailCollectorField

/** The choice family: the fields whose answer is one of `options`. */
export type ChoiceCollectorField = SelectCollectorField | RadioCollectorField

/**
 * A DataCollector field definition, snapshotted onto a collector entry at add-time.
 *
 * One member per DatoCMS block — the block **is** the field type — so a consumer
 * must narrow before reading `options` (choice blocks only) or
 * `placeholder`/`repeatable`/`max` (free-input blocks only). The discriminant keeps
 * the six values the old `field_type` string used, because
 * `order_registrations.fields` is a persisted snapshot of the old shape and must
 * keep parsing.
 */
export type CollectorField =
  | FreeInputCollectorField
  | ChoiceCollectorField
  | CheckboxCollectorField

/** Narrows a field to the free-input family — the fields a text box renders. */
export function isFreeInputField(
  field: CollectorField
): field is FreeInputCollectorField {
  return (
    field.type === "text" || field.type === "textarea" || field.type === "email"
  )
}

/** Narrows a field to the choice family — the fields that pick one of `options`. */
export function isChoiceField(
  field: CollectorField
): field is ChoiceCollectorField {
  return field.type === "select" || field.type === "radio"
}

/**
 * Narrows a field to one that renders repeatable rows.
 *
 * `quantity -> rows` reads this: the rows that mirror a registration's quantity
 * are the repeatable free-input fields and nothing else.
 */
export function isRepeatableField(
  field: CollectorField
): field is FreeInputCollectorField & { repeatable: true } {
  return isFreeInputField(field) && field.repeatable === true
}

/** A priced line — one sku, a buyer-set quantity, the only kind Stripe bills. */
export type PricedLine = {
  /** Stable client-generated id (uuid), assigned at add-time. */
  id: string
  kind: "product"
  sku: string
  quantity: number
  /**
   * Whether the product renders a quantity control, snapshotted from the PDP's
   * `quantity_bearing` at add-time.
   *
   * Display-only, like a collector entry's `fields`: the flyout needs it to pick
   * a stepper over `Qty. N`, and re-fetching DatoCMS per line would put a content
   * token in the browser. The server still enforces availability and clamps the
   * quantity at session build.
   */
  quantityBearing?: boolean
  /** PDP slug the entry was added from — a reporting tag, never an identity key. */
  sourcePdp: string
  /** The add-to-cart action that created the entry; groups display only. */
  groupRef: string
  /** On an add-on: the `id` of the primary line it was added with. */
  parentId?: string
}

/** The DataCollector answers for one add — a "faux line item" with no sku or price. */
export type CollectorEntry = {
  id: string
  kind: "collector"
  /** The DatoCMS `data_collector` record id. */
  collectorRef: string
  /** The raw DataCollector payload, keyed by field name. */
  answers: Record<string, unknown>
  /** Snapshot of the collector's field definitions, taken at add-time. */
  fields: CollectorField[]
  sourcePdp: string
  groupRef: string
  /** The primary priced line this registration belongs to. */
  parentId: string
}

export type CartEntry = PricedLine | CollectorEntry

/** Narrows a cart entry to a priced line. */
export function isPricedLine(entry: CartEntry): entry is PricedLine {
  return entry.kind === "product"
}

/** Narrows a cart entry to a collector entry. */
export function isCollectorEntry(entry: CartEntry): entry is CollectorEntry {
  return entry.kind === "collector"
}

/** The priced lines of an entry list, in cart order — the Stripe line items. */
export function pricedLines(
  entries: CartEntry[] | null | undefined
): PricedLine[] {
  return (entries ?? []).filter(isPricedLine)
}

/**
 * Parses an untrusted entry list — `localStorage`, or the POST body of the
 * checkout snapshot — into cart entries, dropping anything malformed.
 *
 * A boundary parser rather than a cast: the cart survives reloads and a round
 * trip through the browser, so a truncated write or a stale shape must degrade
 * to "fewer lines" and never to a crash or a phantom charge. Only the shape is
 * checked here; skus and quantities are judged against the catalog and DatoCMS
 * by the server when it quotes the cart (`resolveCartFromEntries`), which
 * refuses an unusable line with a per-line error.
 *
 * @param value - The untrusted value.
 * @returns The parsable entries, in order; `[]` when nothing parses.
 */
export function parseCartEntries(value: unknown): CartEntry[] {
  if (!Array.isArray(value)) return []

  const entries: CartEntry[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue
    const entry = raw as Record<string, unknown>
    const id = typeof entry.id === "string" ? entry.id : ""
    const groupRef = typeof entry.groupRef === "string" ? entry.groupRef : ""
    const sourcePdp = typeof entry.sourcePdp === "string" ? entry.sourcePdp : ""
    if (!id) continue

    if (entry.kind === "product") {
      const sku = typeof entry.sku === "string" ? entry.sku : ""
      if (!sku) continue
      entries.push({
        id,
        kind: "product",
        sku,
        quantity: typeof entry.quantity === "number" ? entry.quantity : 1,
        quantityBearing: entry.quantityBearing === true,
        sourcePdp,
        groupRef,
        parentId:
          typeof entry.parentId === "string" ? entry.parentId : undefined,
      })
      continue
    }

    if (entry.kind === "collector") {
      const parentId = typeof entry.parentId === "string" ? entry.parentId : ""
      if (!parentId) continue
      entries.push({
        id,
        kind: "collector",
        collectorRef:
          typeof entry.collectorRef === "string" ? entry.collectorRef : "",
        answers:
          entry.answers && typeof entry.answers === "object"
            ? (entry.answers as Record<string, unknown>)
            : {},
        fields: Array.isArray(entry.fields)
          ? (entry.fields as CollectorField[])
          : [],
        sourcePdp,
        groupRef,
        parentId,
      })
    }
  }

  return entries
}

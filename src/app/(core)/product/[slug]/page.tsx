import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { draftMode } from "next/headers"

import SidebarLayout from "@/layouts/sidebar"
import { executeQuery } from "@/lib/datocms/executeQuery"
import { ResultOf } from "@/lib/datocms/graphql"
import type { ProductPriceRecord } from "@/lib/checkout/cart-pricing"
import {
  findCatalogItem,
  findCatalogItemsForProduct,
} from "@/lib/checkout/catalog"
import type { CollectorField } from "@/lib/checkout/cart-entries"
import { resolveLineDisplay } from "@/lib/checkout/price-display"
import type { CloudinaryImage } from "@/types/datocms"
import { getBaseURL } from "@/lib/util/env"

import PdpLayout from "./_components/pdp-layout"
import PdpPanelContent from "./_components/pdp-panels"
import type {
  PdpEventMeta,
  PdpLine,
  PdpPanel,
  PdpPanelKind,
  PdpPhoto,
  PdpProductType,
  PdpViewModel,
} from "./_data/types"
import {
  productDetailPageQuery,
  productDetailPageSlugs,
} from "./product-detail-page.query"

import contentStyles from "@/styles/content.module.css"
import s from "./styles.module.css"

type PdpQuery = NonNullable<
  ResultOf<typeof productDetailPageQuery>["productDetailPage"]
>

type PageProps = {
  params: Promise<{ slug: string }>
}

/**
 * Generate the static params for the storefront PDPs.
 * Always use published content here.
 */
export async function generateStaticParams() {
  const { allProductDetailPages } = await executeQuery(productDetailPageSlugs, {
    includeDrafts: false,
  })
  return allProductDetailPages
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { isEnabled } = await draftMode()
  const { slug } = await params

  const { productDetailPage } = await executeQuery(productDetailPageQuery, {
    variables: { slug },
    includeDrafts: isEnabled,
  })

  if (!productDetailPage) return {}

  // The clean URL, not the internal /product/<slug> route: the rewrite in
  // `next.config.js` serves this page at the root slug and the internal path
  // 308-redirects here, so the root slug is the canonical address.
  const canonical = new URL(`/${slug}`, getBaseURL()).toString()

  return {
    title: `${productDetailPage.title} | Pittsburgh Forge Rugby Club`,
    description: productDetailPage.shortDescription ?? undefined,
    alternates: { canonical },
    openGraph: { url: canonical },
  }
}

/** The page's `product_type`, narrowed to the three the buy box renders. */
function toProductType(value: string | null): PdpProductType {
  return value === "variation" || value === "grouped" ? value : "simple"
}

/** A `product_tab`'s `tab`, narrowed. An unrecognised value files as `other`. */
function toPanelKind(value: string | null): PdpPanelKind {
  return value === "description" ||
    value === "includes" ||
    value === "goodToKnow" ||
    value === "other"
    ? value
    : "other"
}

/** An ISO instant as a club-local date ("October 2, 2026"), or null if unparseable. */
function formatClubDate(value: string): string | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleDateString("en-US", {
    // A `date_time` is an absolute instant, so it is pinned to the club's zone
    // rather than rendered in whatever zone the server happens to run in.
    timeZone: "America/New_York",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * The buy box's date / location line, or null when the page sets neither half.
 *
 * Resolved here rather than in the layout because the layout is a client
 * component: a date formatted on both sides hydrates mismatched as soon as the
 * browser's locale or timezone differs from the server's
 * (`_data/types.ts` `PdpEventMeta`).
 */
function toEventMeta(
  startsAt: string | null,
  location: string | null
): PdpEventMeta | null {
  const date = startsAt ? formatClubDate(startsAt) : null
  if (!date && !location) return null

  return { date, location }
}

/**
 * The authored panel set, rendered and filtered.
 *
 * The renderer enumerates the `tabs` field rather than naming panels of its own,
 * so a panel with nothing to show is never built and adding one needs no code
 * (`docs/pdp-to-minicart-to-checkout-spec.md` § 5.6). The one exception is the
 * Description tab: with no content of its own it falls back to the primary
 * product's copy, which is what lets the full description stay on the product
 * without being authored twice.
 */
function toPanels(
  tabs: PdpQuery["tabs"],
  fallbackDescription: string | null
): PdpPanel[] {
  const panels: PdpPanel[] = []

  for (const tab of tabs) {
    const kind = toPanelKind(tab.tab)
    const title = tab.title ?? ""

    if (tab.content) {
      panels.push({
        id: tab.id,
        kind,
        title,
        content: <PdpPanelContent content={tab.content} />,
      })
      continue
    }

    if (kind === "description" && fallbackDescription) {
      panels.push({
        id: tab.id,
        kind,
        title,
        content: <p>{fallbackDescription}</p>,
      })
    }
  }

  return panels
}

/** A DataCollector's `options` text (one per line) as a select's option list. */
function parseOptions(value: string | null): string[] | undefined {
  const options = (value ?? "")
    .split("\n")
    .map((option) => option.trim())
    .filter(Boolean)
  return options.length > 0 ? options : undefined
}

/** The DatoCMS form fields as the collector entry's add-time field snapshot. */
function toFields(collector: PdpQuery["dataCollectors"][number] | undefined) {
  return (collector?.formFields ?? [])
    .map(
      (field): CollectorField => ({
        name: field.fieldName ?? "",
        label: field.label ?? field.fieldName ?? "",
        type: field.fieldType ?? "text",
        required: field.required ?? undefined,
        repeatable: field.repeatable ?? undefined,
        max: field.max ?? undefined,
        options: parseOptions(field.options),
        placeholder: field.placeholder ?? undefined,
      })
    )
    .filter((field) => field.name.length > 0)
}

/**
 * A product record's buyable lines.
 *
 * The amount and label come from the checkout catalog — the same map the server
 * bills from — so the PDP can never advertise a price the session build won't
 * charge. A product whose exact sku is not in the catalog expands to its
 * variant skus (the fixed-amount donation presets), which keeps a
 * variant-priced product sellable; a product with neither renders nothing
 * rather than an unpriced row.
 *
 * `compareAtAmount` starts null: a sale is a Stripe fact, so the display pass in
 * the page resolves it afterwards.
 */
function toLines(product: PdpQuery["primaryProducts"][number]): PdpLine[] {
  const sku = product.sku ?? ""
  if (!sku) return []

  const exact = findCatalogItem(sku)
  const items = exact ? [exact] : findCatalogItemsForProduct(sku)

  return items.map((item) => ({
    sku: item.sku,
    label: item.label,
    unitAmount: item.unitAmount,
    compareAtAmount: null,
    quantityBearing: product.quantityBearing ?? false,
    inStock: product.inStock ?? true,
  }))
}

/** The CMS records a page's lines price against, as `cart-pricing` reads them. */
function toRecords(
  products: PdpQuery["primaryProducts"]
): Map<string, ProductPriceRecord> {
  const records = new Map<string, ProductPriceRecord>()
  for (const product of products) {
    const sku = product.sku ?? ""
    if (!sku) continue
    records.set(sku, {
      sku,
      inStock: product.inStock ?? true,
      priceId: product.priceId,
      salePriceId: product.salePriceId,
      saleStartsAt: product.saleStartsAt,
      saleEndsAt: product.saleEndsAt,
    })
  }
  return records
}

/**
 * A Product Detail Page.
 *
 * Assembles the view model server-side — content plus catalog prices — and hands
 * it to the interactive layout. Draft/preview parity matches every other page
 * (`includeDrafts` + `baseEditingUrl`).
 */
export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params
  const { isEnabled: isDraftModeEnabled } = await draftMode()

  const { productDetailPage } = await executeQuery(productDetailPageQuery, {
    variables: { slug },
    includeDrafts: isDraftModeEnabled,
    baseEditingUrl: true,
  })

  if (!productDetailPage) {
    notFound()
  }

  const photos: PdpPhoto[] = productDetailPage.gallery.map((item) => ({
    id: item.id,
    alt: item.alt ?? "",
    desktop: (item.desktopMedia as CloudinaryImage | null) ?? null,
    mobile: (item.mobileMedia as CloudinaryImage | null) ?? null,
  }))

  const primaryLines = productDetailPage.primaryProducts.flatMap((product) =>
    toLines(product)
  )
  const addonLines = productDetailPage.addonProducts.flatMap((product) =>
    toLines(product)
  )

  // A sale amount lives in Stripe, so the display is resolved once for every sku
  // the page sells and folded onto the lines the catalog priced.
  const display = await resolveLineDisplay(
    [...primaryLines, ...addonLines].map((line) => line.sku),
    toRecords([
      ...productDetailPage.primaryProducts,
      ...productDetailPage.addonProducts,
    ])
  )
  const withDisplay = (line: PdpLine): PdpLine => {
    const shown = display.get(line.sku)
    return shown
      ? {
          ...line,
          unitAmount: shown.unitAmount,
          compareAtAmount: shown.compareAtAmount,
        }
      : line
  }

  const collector = productDetailPage.dataCollectors[0]

  const product: PdpViewModel = {
    slug,
    title: productDetailPage.title ?? slug,
    shortDescription: productDetailPage.shortDescription,
    event: toEventMeta(
      productDetailPage.eventStartsAt,
      productDetailPage.eventLocation
    ),
    productType: toProductType(productDetailPage.productType),
    photos,
    primaries: primaryLines.map(withDisplay),
    addons: addonLines.map(withDisplay),
    panels: toPanels(
      productDetailPage.tabs,
      productDetailPage.primaryProducts[0]?.description ?? null
    ),
    collectorRef: collector?.id ?? "",
    fields: toFields(collector),
  }

  return (
    <SidebarLayout>
      <article className={`${contentStyles.contentBlock} ${s.pageContent}`}>
        <PdpLayout product={product} />
      </article>
    </SidebarLayout>
  )
}

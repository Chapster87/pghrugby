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
import type {
  PdpLine,
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
    description: productDetailPage.description ?? undefined,
    alternates: { canonical },
    openGraph: { url: canonical },
  }
}

/** The page's `product_type`, narrowed to the three the buy box renders. */
function toProductType(value: string | null): PdpProductType {
  return value === "variation" || value === "grouped" ? value : "simple"
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
    note: product.shortDescription || null,
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
    shortDescription: productDetailPage.description,
    longDescription:
      productDetailPage.primaryProducts[0]?.longDescription ?? null,
    productType: toProductType(productDetailPage.productType),
    photos,
    primaries: primaryLines.map(withDisplay),
    addons: addonLines.map(withDisplay),
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

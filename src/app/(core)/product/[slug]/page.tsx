import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { draftMode } from "next/headers"
import SidebarLayout from "@/layouts/sidebar"
import { executeQuery } from "@/lib/datocms/executeQuery"
import {
  productDetailPageQuery,
  productDetailPageSlugs,
} from "./product-detail-page.query"
import { findCatalogItemsForProduct } from "@/lib/checkout/catalog"
import storefrontCatalog from "@/lib/checkout/storefront-catalog.json"
import { ResultOf } from "@/lib/datocms/graphql"
import PdpCheckoutForm, {
  type PdpField,
  type PdpProduct,
} from "./checkout-form"

import contentStyles from "@/styles/content.module.css"
import s from "./styles.module.css"

type PdpQuery = NonNullable<
  ResultOf<typeof productDetailPageQuery>["productDetailPage"]
>

type PageProps = {
  params: Promise<{ slug: string }>
}

type ManifestProduct = {
  sku: string
  label: string
  wcSlug: string | null
  pdp: string | null
  kind: "primary" | "addon"
}

const manifest = storefrontCatalog as {
  flows: { slug: string; title: string }[]
  products: ManifestProduct[]
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

  return {
    title: `${productDetailPage.title} | Pittsburgh Forge Rugby Club`,
    description: productDetailPage.description ?? undefined,
  }
}

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

  // Resolve each linked product against the manifest (kind) and the Stripe
  // catalog (selectable options + prices). Products not in the catalog render
  // no options — the page still shows their editorial copy.
  const kindBySku = new Map(manifest.products.map((p) => [p.sku, p.kind]))
  const products: PdpProduct[] = productDetailPage.pageComponents
    .filter((c) => c.__typename === "ProductRecord")
    .map((p) => ({
      title: p.title ?? p.sku ?? "",
      sku: p.sku ?? "",
      shortDescription: p.shortDescription ?? null,
      longDescription: p.longDescription ?? null,
      kind: kindBySku.get(p.sku ?? "") ?? "primary",
      options: findCatalogItemsForProduct(p.sku ?? "").map((o) => ({
        sku: o.sku,
        label: o.label,
        unitAmount: o.unitAmount,
      })),
    }))

  const collector = productDetailPage.pageComponents.find(
    (c) => c.__typename === "DataCollectorRecord"
  )
  const fields: PdpField[] = (collector?.formFields ?? []).map((f) => ({
    label: f.label ?? f.fieldName ?? "",
    fieldName: f.fieldName ?? "",
    fieldType: f.fieldType ?? "text",
    required: f.required,
    options: f.options ?? null,
    placeholder: f.placeholder ?? null,
    repeatable: f.repeatable,
    max: f.max,
  }))

  return (
    <SidebarLayout>
      <article className={`${contentStyles.contentBlock} ${s.pageContent}`}>
        <div className={s.pdpGrid}>
          <div className={s.pdpMain}>
            <h1 className={s.title}>{productDetailPage.title}</h1>
            {productDetailPage.description && (
              <p className={s.intro}>{productDetailPage.description}</p>
            )}
            <PdpCheckoutForm pdp={slug} products={products} fields={fields} />
          </div>
        </div>
      </article>
    </SidebarLayout>
  )
}

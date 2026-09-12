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

  // Resolve the PDP's curated buckets against the Stripe catalog (selectable
  // options + prices). Products not in the catalog render no options — the page
  // still shows their editorial copy.
  const toPdpProduct = (
    kind: "primary" | "addon",
    product: PdpQuery["primaryProducts"][number]
  ): PdpProduct => ({
    title: product.title ?? product.sku ?? "",
    sku: product.sku ?? "",
    shortDescription: product.shortDescription ?? null,
    longDescription: product.longDescription ?? null,
    kind,
    options: findCatalogItemsForProduct(product.sku ?? "").map((option) => ({
      sku: option.sku,
      label: option.label,
      unitAmount: option.unitAmount,
    })),
  })

  const products: PdpProduct[] = [
    ...productDetailPage.primaryProducts.map((product) =>
      toPdpProduct("primary", product)
    ),
    ...productDetailPage.addonProducts.map((product) =>
      toPdpProduct("addon", product)
    ),
  ]

  const collector = productDetailPage.dataCollectors[0]
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

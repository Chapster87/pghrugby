import React, { Suspense } from "react"
import type { Metadata, ResolvingMetadata } from "next"
import SidebarLayout from "@/layouts/sidebar"
import ProductName from "./_components/product-name"
import ImageGallery from "./_components/image-gallery"

import ProductActions from "@modules/products/components/product-actions"
import RelatedProducts from "@modules/products/components/related-products"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import ProductActionsWrapper from "@modules/products/templates/product-actions-wrapper"
import { draftMode } from "next/headers"
import { getProductByHandle, listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import { client } from "@sanity/lib/client"
import { productContentQuery } from "./product.content.query"
import { parseSanityImageRef } from "@/sanity/lib/utils"

import contentStyles from "@/styles/content.module.css"
import s from "./styles.module.css"

type Props = {
  params: { countryCode: string; handle: string }
}

const countryCode = process.env.NEXT_PUBLIC_MEDUSA_DEFAULT_COUNTRY_CODE ?? "us"

/**
 * Generate the static params for the product page.
 * Always use published content here.
 */
export async function generateStaticParams() {
  try {
    const countryCodes = await listRegions().then((regions) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )

    if (!countryCodes) {
      return []
    }

    const promises = countryCodes.map(async (country) => {
      const { response } = await listProducts({
        countryCode: country,
        queryParams: { limit: 100, fields: "handle" },
      })

      return {
        country,
        products: response.products,
      }
    })

    const countryProducts = await Promise.all(promises)

    return countryProducts
      .flatMap((countryData) =>
        countryData.products.map((product) => ({
          countryCode: countryData.country,
          handle: product.handle,
        }))
      )
      .filter((param) => param.handle)
  } catch (error) {
    console.error(
      `Failed to generate static paths for product pages: ${
        error instanceof Error ? error.message : "Unknown error"
      }.`
    )
    return []
  }
}

export async function generateMetadata(
  props: { params: { countryCode: string; handle: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await props.params
  const { isEnabled } = await draftMode()
  const { handle, countryCode } = resolvedParams
  const region = await getRegion(countryCode)

  if (!region) {
    notFound()
  }

  const { product } = await getProductByHandle(handle, countryCode)

  if (!product) {
    notFound()
  }

  const productContent = await client.fetch(
    productContentQuery,
    { slug: product.handle },
    isEnabled
      ? {
          perspective: "previewDrafts",
          useCdn: false,
          stega: true,
        }
      : undefined
  )

  // Normalize SEO fields to undefined if null
  const rawSeo =
    (productContent?.seo as {
      title?: string | null
      description?: string | null
      canonicalUrl?: string | null
      ogTitle?: string | null
      ogDescription?: string | null
      ogUrl?: string | null
      ogImage?: string | null
      twitterTitle?: string | null
      twitterDescription?: string | null
      twitterImage?: string | null
    }) || {}
  const seo: {
    title?: string
    description?: string
    canonicalUrl?: string
    ogTitle?: string
    ogDescription?: string
    ogUrl?: string
    ogImage?: string
    twitterTitle?: string
    twitterDescription?: string
    twitterImage?: string
  } = {
    title: rawSeo?.title ?? undefined,
    description: rawSeo?.description ?? undefined,
    canonicalUrl: rawSeo?.canonicalUrl ?? undefined,
    ogTitle: rawSeo?.ogTitle ?? undefined,
    ogDescription: rawSeo?.ogDescription ?? undefined,
    ogUrl: rawSeo?.ogUrl ?? undefined,
    ogImage: rawSeo?.ogImage ?? undefined,
    twitterTitle: rawSeo?.twitterTitle ?? undefined,
    twitterDescription: rawSeo?.twitterDescription ?? undefined,
    twitterImage: rawSeo?.twitterImage ?? undefined,
  }

  // Handle ogImage as either a string or Sanity image object
  let ogImageUrl: string | undefined = undefined
  if (seo?.ogImage) {
    if (
      typeof seo.ogImage === "object" &&
      seo.ogImage !== null &&
      "asset" in seo.ogImage
    ) {
      ogImageUrl = parseSanityImageRef(
        (seo.ogImage as { asset: { _ref: string } }).asset._ref
      )
    } else if (typeof seo.ogImage === "string") {
      ogImageUrl = seo.ogImage
    }
  }

  // Build canonical URL using current URL and handle
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/product/${handle}`

  return {
    title: seo?.title
      ? `${seo.title} | Pittsburgh Forge Rugby Club`
      : `${product?.title} | Pittsburgh Forge Rugby Club`,
    description: seo?.description || product?.description || "",
    authors: [{ name: "Pittsburgh Forge Rugby Club" }],
    alternates: {
      canonical: seo?.canonicalUrl || url.toString(),
    },
    openGraph: {
      title: seo?.ogTitle || seo?.title || product?.title,
      description:
        seo?.ogDescription ??
        seo?.description ??
        product?.description ??
        undefined,
      url: seo?.ogUrl || url.toString(),
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
      type: "website",
    },
    twitter: {
      title:
        seo?.twitterTitle ||
        seo?.title ||
        product?.title ||
        "Pittsburgh Forge Rugby Club",
      description:
        seo?.twitterDescription ||
        seo?.description ||
        product?.description ||
        `${product?.title} | Pittsburgh Forge Rugby Club`,
      images: seo.twitterImage
        ? [{ url: seo.twitterImage }]
        : ogImageUrl
        ? [{ url: ogImageUrl }]
        : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    category: "product",
  } satisfies Metadata
}

// JSON-LD schema.org structured data for products
function generateProductStructuredData(
  product: any,
  productContent: any,
  region: any
) {
  if (!product) return null

  // Calculate price from variants
  const price = product.variants?.[0]?.calculated_price?.calculated_amount || 0
  const currency = region?.currency_code || "USD"

  // Handle ogImage as either a string or Sanity image object
  const seo = productContent?.seo || {}
  let ogImageUrl: string = product.thumbnail || "https://pghrugby.com/logo.png"
  if (seo?.ogImage) {
    if (
      typeof seo.ogImage === "object" &&
      seo.ogImage !== null &&
      "asset" in seo.ogImage
    ) {
      ogImageUrl =
        parseSanityImageRef(
          (seo.ogImage as { asset: { _ref: string } }).asset._ref
        ) || ogImageUrl
    } else if (typeof seo.ogImage === "string") {
      ogImageUrl = seo.ogImage
    }
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productContent.title,
    description: productContent.description || "",
    image: ogImageUrl,
    brand: {
      "@type": "Brand",
      name: "Pittsburgh Forge Rugby Club",
    },
    offers: {
      "@type": "Offer",
      price: (price / 100).toFixed(2), // Convert cents to dollars
      priceCurrency: currency.toUpperCase(),
      availability:
        product.variants?.[0]?.inventory_quantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "Pittsburgh Forge Rugby Club",
      },
    },
    category:
      product.categories?.[0]?.name || "Rugby Related Events & Products",
    sku: product.variants?.[0]?.sku || product.id,
    url: `https://pghrugby.com/product/${product.handle}`,
    manufacturer: {
      "@type": "Organization",
      name: "Pittsburgh Forge Rugby Club",
    },
  }
}

export default async function ProductPage(props: {
  params: { countryCode: string; handle: string }
}) {
  const resolvedParams = await props.params
  const { countryCode, handle } = resolvedParams
  const { isEnabled } = await draftMode()
  const region = await getRegion(countryCode)

  if (!region) {
    notFound()
  }

  const { product: pricedProduct } = await getProductByHandle(
    handle,
    countryCode
  )

  if (!pricedProduct) {
    notFound()
  }

  const slug = pricedProduct.handle

  const productContentData = await client.fetch(
    productContentQuery,
    { slug },
    isEnabled
      ? {
          perspective: "previewDrafts",
          useCdn: false,
          stega: true,
        }
      : undefined
  )

  // Generate structured data for SEO
  const structuredData = generateProductStructuredData(
    pricedProduct,
    productContentData,
    region
  )

  return (
    <SidebarLayout>
      <div className={`${contentStyles.contentBlock} ${s.productPage}`}>
        {/* Structured data for SEO */}
        {structuredData && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
        )}
        <div className={s.productMain}>
          <ImageGallery images={pricedProduct?.images || []} />
          <div className={s.productDetails}>
            <ProductName
              product={pricedProduct}
              productData={productContentData as any}
            />
            <p>Need to add short/long description</p>
            <div className={s.productActions}>
              <Suspense
                fallback={
                  <ProductActions
                    disabled={true}
                    product={pricedProduct}
                    region={region}
                  />
                }
              >
                <ProductActionsWrapper id={pricedProduct.id} region={region} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
      <div className={`${contentStyles.siteContainer} ${s.relatedProducts}`}>
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={pricedProduct} countryCode={countryCode} />
        </Suspense>
      </div>
    </SidebarLayout>
  )
}

import React, { Suspense } from "react"
import type { Metadata, ResolvingMetadata } from "next"
import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import ProductActionsWrapper from "@modules/products/templates/product-actions-wrapper"
import { draftMode } from "next/headers"
import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import { client } from "../../../../sanity/lib/client"
import { resolveOpenGraphImage } from "@/sanity/lib/utils"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
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
  props: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { isEnabled } = await draftMode()
  const params = await props.params
  const { handle } = params
  const region = await getRegion(countryCode)

  if (!region) {
    notFound()
  }

  // Get all products and filter by handle (since handle query param isn't supported)
  const { response } = await listProducts({
    countryCode: countryCode,
    queryParams: { limit: 100 },
  })

  const product = response.products.find((p) => p.handle === handle)

  if (!product) {
    notFound()
  }

  const previousImages = (await parent).openGraph?.images || []
  const ogImage = resolveOpenGraphImage(product?.thumbnail)

  // Build canonical URL using current URL and handle
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/product/${handle}`

  // Format date for structured data if available
  const publishDate = product?.created_at
    ? new Date(product.created_at).toISOString()
    : undefined
  const modifiedDate = product?.updated_at
    ? new Date(product.updated_at).toISOString()
    : undefined

  return {
    title: product?.title
      ? `${product.title} | Pittsburgh Forge Rugby Club`
      : "Pittsburgh Forge Rugby Club",
    description:
      product?.description || `${product?.title} | Pittsburgh Forge Rugby Club`,
    authors: [{ name: "Pittsburgh Forge Rugby Club" }],
    alternates: {
      canonical: url.toString(),
    },
    openGraph: {
      title: product?.title || "Pittsburgh Forge Rugby Club",
      description:
        product?.description ||
        `${product?.title} | Pittsburgh Forge Rugby Club`,
      type: "website",
      images: ogImage ? [ogImage, ...previousImages] : previousImages,
      url: url.toString(),
      siteName: "Pittsburgh Forge Rugby Club",
    },
    twitter: {
      card: "summary_large_image",
      title: product?.title || "Pittsburgh Forge Rugby Club",
      description:
        product?.description ||
        `${product?.title} | Pittsburgh Forge Rugby Club`,
      images: ogImage ? [ogImage] : undefined,
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
function generateProductStructuredData(product: any, region: any) {
  if (!product) return null

  // Calculate price from variants
  const price = product.variants?.[0]?.calculated_price?.calculated_amount || 0
  const currency = region?.currency_code || "USD"

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description || "",
    image: product.thumbnail || "",
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

export default async function ProductPage(props: Props) {
  const params = await props.params
  const { isEnabled } = await draftMode()
  const region = await getRegion(countryCode)

  if (!region) {
    notFound()
  }

  const pricedProduct = await listProducts({
    countryCode: countryCode,
    queryParams: { limit: 100 },
  }).then(({ response }) =>
    response.products.find((p) => p.handle === params.handle)
  )

  if (!pricedProduct) {
    notFound()
  }

  // alternatively, you can filter the content by the language
  const sanity = (await client.getDocument(pricedProduct.id))?.specs[0]

  // Generate structured data for SEO
  const structuredData = generateProductStructuredData(pricedProduct, region)

  return (
    <div>
      {/* Structured data for SEO */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <div
        className="2xl:container px-[12] flex flex-col sm:flex-row sm:items-start py-6 relative"
        data-testid="product-container"
      >
        <div className="flex flex-col sm:sticky sm:top-48 sm:py-0 sm:max-w-[300px] w-full py-8 gap-y-6">
          <ProductInfo product={pricedProduct} sanity={sanity} />
          <ProductTabs product={pricedProduct} />
        </div>
        <div className="block w-full relative">
          <ImageGallery images={pricedProduct?.images || []} />
        </div>
        <div className="flex flex-col sm:sticky sm:top-48 sm:py-0 sm:max-w-[300px] w-full py-8 gap-y-12">
          <ProductOnboardingCta />
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
      <div
        className="2xl:container px-[12] my-16 sm:my-32"
        data-testid="related-products-container"
      >
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={pricedProduct} countryCode={countryCode} />
        </Suspense>
      </div>
    </div>
  )
}

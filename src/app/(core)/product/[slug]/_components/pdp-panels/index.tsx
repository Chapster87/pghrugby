import { StructuredText } from "react-datocms"

import CloudinaryImageRenderer from "@/components/cloudinary-image-renderer"
import { readFragment, type ResultOf } from "@/lib/datocms/graphql"
import type { CloudinaryImage } from "@/types/datocms"
import { getCloudinaryImageProps } from "@/utils/cloudinary"
import { fileFieldFragment } from "@fragments/blocks"

import type { productDetailPageQuery } from "../../product-detail-page.query"

/** One panel block's Structured Text document, as the query reads it. */
type TabContent = NonNullable<
  ResultOf<typeof productDetailPageQuery>["productDetailPage"]
>["tabs"][number]["content"]

/** One embedded block inside a panel body. */
type TabBlock = NonNullable<TabContent>["blocks"][number]

/**
 * One panel's body.
 *
 * A tab's `content` is Structured Text, so it renders through the same
 * `StructuredText` + `renderBlock` switch the page bodies use — the four shared
 * embed blocks, which is exactly what the field's validators allow
 * (`docs/pdp-to-minicart-to-checkout-spec.md` § 4.7).
 *
 * Server-rendered on purpose: a panel body is static content, so keeping it here
 * means only the tab strip reaches the browser, and the PDP's client bundle never
 * carries `react-datocms`.
 *
 * The switch mirrors the one in `src/app/(core)/[slug]/page.tsx`, with one
 * deliberate difference: every image goes through `CloudinaryImageRenderer`, which
 * falls back to a plain responsive `<img>` when the dimensions are unknown. The
 * page-body switch renders a bare `next/image` without `width`/`height` for the
 * asset-backed cases, which throws for an asset carrying neither.
 */
export default function PdpPanelContent({ content }: { content: TabContent }) {
  if (!content) return null

  return (
    <StructuredText
      data={content}
      renderBlock={({ record }) => {
        const block = record as TabBlock

        switch (block.__typename) {
          case "ExternalImageBlockRecord": {
            if (block.cloudinary) {
              const image = block.cloudinary as CloudinaryImage
              return (
                <CloudinaryImageRenderer
                  src={image.secure_url}
                  alt={image.public_id}
                  width={image.width}
                  height={image.height}
                />
              )
            }

            if (block.url) {
              const image = getCloudinaryImageProps(block.url)
              return (
                <CloudinaryImageRenderer
                  src={image.url}
                  alt=""
                  width={image.width}
                  height={image.height}
                />
              )
            }

            return null
          }

          case "ImageBlockRecord": {
            if (!block.asset) return null
            const asset = readFragment(fileFieldFragment, block.asset)
            return (
              <CloudinaryImageRenderer
                src={asset.url}
                alt={asset.alt ?? ""}
                width={asset.width}
                height={asset.height}
              />
            )
          }

          case "ImageGalleryBlockRecord":
            return (
              <div>
                {block.assets.map((maskedAsset) => {
                  const asset = readFragment(fileFieldFragment, maskedAsset)
                  return (
                    <CloudinaryImageRenderer
                      key={asset.id}
                      src={asset.url}
                      alt={asset.alt ?? ""}
                      width={asset.width}
                      height={asset.height}
                    />
                  )
                })}
              </div>
            )

          case "VideoBlockRecord": {
            if (!block.asset) return null
            const asset = readFragment(fileFieldFragment, block.asset)
            return <video controls src={asset.url} />
          }

          default:
            return null
        }
      }}
    />
  )
}

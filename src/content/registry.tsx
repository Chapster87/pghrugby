import type { ComponentType, ReactElement } from "react"

import type { ContentBlock, ContentBlockKind } from "@/content/model"

import ImageBlockView from "./_components/image"
import ImageGalleryBlockView from "./_components/image-gallery"
import LinkButtonBlockView from "./_components/link-button"
import VideoBlockView from "./_components/video"

/** A component that renders exactly one canonical block kind. */
type BlockRenderer<K extends ContentBlockKind> = ComponentType<{
  block: Extract<ContentBlock, { kind: K }>
}>

/**
 * Every canonical block kind and the component that renders it.
 *
 * The mapped annotation is the point: adding a kind to `ContentBlock` fails to
 * compile until its component is registered here, so the registry cannot fall
 * behind the model. This is the one place that has to know the full set.
 */
const blockRegistry: { [K in ContentBlockKind]: BlockRenderer<K> } = {
  image: ImageBlockView,
  imageGallery: ImageGalleryBlockView,
  video: VideoBlockView,
  linkButton: LinkButtonBlockView,
}

/**
 * Render one canonical block.
 *
 * The assertion is unavoidable: TypeScript cannot correlate an indexed component
 * with the narrowed block, because the registry's value type is a union of
 * components with different props. The mapped annotation above is what keeps it
 * honest — every kind has a component of the right shape.
 *
 * @param block - The canonical block to render.
 * @returns The block's element.
 */
export function renderBlock(block: ContentBlock): ReactElement {
  const Component = blockRegistry[
    block.kind
  ] as unknown as BlockRenderer<ContentBlockKind>

  return <Component block={block} />
}

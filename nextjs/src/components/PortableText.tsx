"use client"

import {
  PortableText as PT,
  type PortableTextComponents,
} from "@portabletext/react"
import type { PortableTextBlock } from "next-sanity"
import Image from "next/image"
import s from "./PortableText.module.css"

// Import your custom block/object components here as you build them
// import ImageWithCaption from "./ImageWithCaption"
// import Columns from "./Columns"

// Helper to convert Sanity image asset._ref to CDN URL
function sanityImageUrl(ref: string, width = 800, height = 600) {
  if (!ref) return ""
  // Example ref: "image-abc123-800x600-png"
  const [, id, size, format] = ref.split("-")
  return `https://cdn.sanity.io/images/${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}/production/${id}-${size}.${format}?w=${width}&h=${height}&fit=max`
}

/**
 * MediaText: Renders an image and rich text side by side.
 * @param {object} value - The media text data.
 * @returns {JSX.Element | null} The rendered media text or null.
 */
function MediaText({ value }: { value: any }) {
  if (!value) return null
  const imageUrl = value.image?.asset?._ref
    ? sanityImageUrl(value.image.asset._ref, 400, 300)
    : value.image?.asset?.url
  return (
    <div className={s.mediaText}>
      {imageUrl && (
        <div className={s.mediaTextImgContainer}>
          <Image
            src={imageUrl}
            alt={value.image?.alt || ""}
            width={400}
            height={300}
            className={s.mediaTextImg}
          />
        </div>
      )}
      {value.text && (
        <div className={s.mediaTextContent}>
          <PT value={value.text} components={components} />
        </div>
      )}
    </div>
  )
}

/**
 * ButtonBlock: Renders a single button.
 * @param {object} value - The button data.
 * @returns {JSX.Element | null} The rendered button or null.
 */
function ButtonBlock({ value }: { value: any }) {
  return (
    <a
      href={value?.url || "#"}
      className={value?.style || s.buttonBlock}
      target={value?.target || "_self"}
      rel={
        value?.rel ||
        (value?.target === "_blank" ? "noopener noreferrer" : undefined)
      }
    >
      {value?.text || "Button"}
    </a>
  )
}

/**
 * ButtonGroup: Renders a group of buttons.
 * @param {object} value - The button group data.
 * @returns {JSX.Element | null} The rendered button group or null.
 */
function ButtonGroup({ value }: { value: any }) {
  if (!Array.isArray(value?.buttons)) return null
  return (
    <div className={s.buttonGroup}>
      {value.buttons.map((btn: any, idx: number) =>
        btn ? <ButtonBlock key={btn._key || idx} value={btn} /> : null
      )}
    </div>
  )
}

/**
 * ImageWithCaption: Renders an image with an optional caption.
 * @param {object} value - The image data.
 * @returns {JSX.Element | null} The rendered image with caption or null.
 */
function ImageWithCaption({ value }: { value: any }) {
  if (!value) return null
  const imageUrl = value.asset?._ref
    ? sanityImageUrl(value.asset._ref, value.width || 800, value.height || 600)
    : value.url
  if (!imageUrl) return null
  return (
    <figure className={s.imageWithCaptionFigure}>
      <Image
        src={imageUrl}
        alt={value.alt || value.caption || ""}
        width={value.width || 800}
        height={value.height || 600}
        style={{ maxWidth: "100%", height: "auto" }}
        className={s.imageWithCaptionImg}
      />
      {value.caption && (
        <figcaption className={s.imageWithCaptionFigcaption}>
          {value.caption}
        </figcaption>
      )}
    </figure>
  )
}

// Define custom renderers for your Sanity schema types
const components: PortableTextComponents = {
  types: {
    // Custom blocks/objects
    blockGroup: BlockGroup,
    button: ButtonBlock,
    buttonGroup: ButtonGroup,
    mediaText: MediaText,
    imageWithCaption: ImageWithCaption,
    // columns: Columns,
    image: ({ value }) => {
      const imageUrl = value?.asset?._ref
        ? sanityImageUrl(value.asset._ref, 800, 600)
        : value?.asset?.url
      return imageUrl ? (
        <Image
          src={imageUrl}
          alt={value.alt || ""}
          width={800}
          height={600}
          style={{ maxWidth: "100%", height: "auto" }}
          className={s.imageWithCaptionImg}
        />
      ) : null
    },
  },
  // You can also customize marks, block, list, etc. here
}

/**
 * BlockGroup: Renders a group of blocks recursively.
 * @param {object} value - The block group data.
 * @returns {JSX.Element | null} The rendered block group or null.
 */
function BlockGroup({ value }: { value: any }) {
  if (!Array.isArray(value?.children)) return null
  return (
    <div className={s.blockGroup}>
      <PT value={value.children} components={components} />
    </div>
  )
}

type PortableTextProps = {
  value: PortableTextBlock[]
  className?: string
}

export default function PortableText({ value, className }: PortableTextProps) {
  if (!value || value.length === 0) return null

  return (
    <div className={className}>
      <PT value={value} components={components} />
    </div>
  )
}

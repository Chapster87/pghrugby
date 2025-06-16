"use client"

import {
  PortableText as PT,
  type PortableTextComponents,
} from "@portabletext/react"
import type { PortableTextBlock } from "next-sanity"
import Image from "next/image"

// Import your custom block/object components here as you build them
// import ImageWithCaption from "./ImageWithCaption"
// import Columns from "./Columns"

// MediaText: renders an image and rich text side by side
function MediaText({ value }: { value: any }) {
  if (!value) return null
  return (
    <div className="flex flex-col md:flex-row gap-4 items-start my-4">
      {value.image?.asset && value.image.asset.url && (
        <div className="max-w-xs w-full">
          <Image
            src={value.image.asset.url}
            alt={value.image.alt || ""}
            width={400}
            height={300}
            className="object-contain w-full h-auto"
          />
        </div>
      )}
      {value.text && (
        <div className="flex-1">
          <PT value={value.text} components={components} />
        </div>
      )}
    </div>
  )
}

// ButtonBlock: renders a single button
function ButtonBlock({ value }: { value: any }) {
  return (
    <a
      href={value?.url || "#"}
      className={
        value?.style ||
        "inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      }
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

// ButtonGroup: renders a group of buttons
function ButtonGroup({ value }: { value: any }) {
  if (!Array.isArray(value?.buttons)) return null
  return (
    <div className="flex flex-wrap gap-2 my-2">
      {value.buttons.map((btn: any, idx: number) =>
        btn ? <ButtonBlock key={btn._key || idx} value={btn} /> : null
      )}
    </div>
  )
}

// ImageWithCaption: renders an image with an optional caption
function ImageWithCaption({ value }: { value: any }) {
  if (!value?.asset?.url) return null
  return (
    <figure className="my-6">
      <Image
        src={value.asset.url}
        alt={value.alt || value.caption || ""}
        width={value.width || 800}
        height={value.height || 600}
        style={{ maxWidth: "100%", height: "auto" }}
        className="rounded"
      />
      {value.caption && (
        <figcaption className="text-center text-sm text-gray-500 mt-2">
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
    image: ({ value }) =>
      value?.asset?.url ? (
        <Image
          src={value.asset.url}
          alt={value.alt || ""}
          width={800}
          height={600}
          style={{ maxWidth: "100%", height: "auto" }}
        />
      ) : null,
  },
  // You can also customize marks, block, list, etc. here
}

// BlockGroup: renders a group of blocks recursively
function BlockGroup({ value }: { value: any }) {
  if (!Array.isArray(value?.children)) return null
  return (
    <div className="block-group my-4">
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

"use client"

import { PortableText as PT } from "@portabletext/react"
import type { PortableTextBlock } from "next-sanity"

type PortableTextProps = {
  value: PortableTextBlock[]
  className?: string
}

export default function PortableText({ value, className }: PortableTextProps) {
  if (!value || value.length === 0) return null

  return (
    <div className={className}>
      <PT value={value} />
    </div>
  )
}

import React from "react"
import { PortableText } from "@portabletext/react"
import Link from "@components/link"

import type { PortableTextMarkComponentProps } from "@portabletext/react"

const myPortableTextComponents = {
  marks: {
    left: ({ children }: any) => (
      <span className="block text-left">{children}</span>
    ),
    center: ({ children }: any) => (
      <span className="block text-center w-full">{children}</span>
    ),
    right: ({ children }: any) => (
      <span className="block text-right">{children}</span>
    ),
    textColor: ({
      children,
      value,
    }: PortableTextMarkComponentProps<{ _type: string; value?: string }>) => (
      <span style={{ color: value?.value }}>{children}</span>
    ),
    highlightColor: ({
      children,
      value,
    }: PortableTextMarkComponentProps<{ _type: string; value?: string }>) => (
      <span style={{ background: value?.value }}>{children}</span>
    ),
  },
  block: {
    "h1-lg": ({ children }: any) => <h1 className="h1-lg">{children}</h1>,
  },
}

interface PageBuilderProps {
  data: any[]
}

const renderModule = (item: any) => {
  switch (item._type) {
    case "heading":
    case "richText":
      const style: React.CSSProperties = {}
      if (item.spacing_top > 0) {
        style.paddingTop = `${item.spacing_top}px`
      }
      if (item.spacing_bottom > 0) {
        style.paddingBottom = `${item.spacing_bottom}px`
      }
      if (item.gap > 0) {
        style.display = "grid"
        style.gap = `${item.gap}px`
      }

      return (
        <div key={item._key} style={style}>
          {item.content.map((block: any, idx: number) => (
            <PortableText
              key={block._key || idx}
              value={[block]}
              components={myPortableTextComponents}
            />
          ))}
        </div>
      )
    case "linkGroup":
      if (!Array.isArray(item.links)) return null
      return (
        <div
          key={item._key}
          className={`link-group my-4 flex gap-4 ${
            item.alignment === "center"
              ? "justify-center"
              : item.alignment === "right"
              ? "justify-end"
              : "justify-start"
          }`}
        >
          {item.links.map((link: any, idx: number) => {
            const route = link?.route
            const isProduct = link?.reference?._type === "product"
            const isPost = link?.reference?._type === "post"
            const url =
              route || // Prioritize route if defined
              (link?.reference?.slug?.current
                ? isProduct
                  ? `/product/${link.reference.slug.current}`
                  : isPost
                  ? `/post/${link.reference.slug.current}`
                  : `/${link.reference.slug.current}`
                : "#")
            return (
              <Link
                href={url}
                key={link._key || idx}
                buttonStyle={link.asButton}
                openInNewTab={link.openInNewTab}
              >
                {link.text}
              </Link>
            )
          })}
        </div>
      )
    default:
      return null
  }
}

const PageBuilder: React.FC<PageBuilderProps> = ({ data }) => {
  return <div>{data.map((item) => renderModule(item))}</div>
}

export default PageBuilder

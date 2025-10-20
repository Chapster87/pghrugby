import React from "react"
import { PortableText } from "@portabletext/react"
import Link from "@components/link"

import type { PortableTextMarkComponentProps } from "@portabletext/react"

const myPortableTextComponents = {
  marks: {
    left: ({ children }: any) => <div className="text-left">{children}</div>,
    center: ({ children }: any) => (
      <div className="text-center w-full">{children}</div>
    ),
    right: ({ children }: any) => <div className="text-right">{children}</div>,
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
}

interface PageBuilderProps {
  data: any[]
}

const renderModule = (item: any) => {
  switch (item._type) {
    case "heading":
    case "richText":
      return (
        <div key={item._key}>
          {item.content.map((block: any) => (
            <PortableText
              key={block._key}
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
          {item.links.map((link: any) => {
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
                key={link._key}
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

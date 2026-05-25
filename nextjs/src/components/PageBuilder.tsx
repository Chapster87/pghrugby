import React from "react"
import { PortableText } from "@portabletext/react"
import Link from "@components/link"
import { urlBuilder } from "@/lib/util/url"
import clsx from "clsx"

import type { PortableTextMarkComponentProps } from "@portabletext/react"

import s from "./PageBuilder.module.css"

const myPortableTextComponents = {
  marks: {
    left: ({ children }: any) => (
      <span className={s.textAlignLeft}>{children}</span>
    ),
    center: ({ children }: any) => (
      <span className={s.textAlignCenter}>{children}</span>
    ),
    right: ({ children }: any) => (
      <span className={s.textAlignRight}>{children}</span>
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

      const justifyClass =
        item.alignment === "center"
          ? s.justifyCenter
          : item.alignment === "right"
          ? s.justifyEnd
          : s.justifyStart

      return (
        <div key={item._key} className={clsx(s.linkGroup, justifyClass)}>
          {item.links.map((link: any, idx: number) => {
            const route = link?.route
            const url =
              route || // Prioritize route if defined
              (link?.reference?.slug?.current
                ? urlBuilder(link.reference._type, link.reference.slug.current)
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

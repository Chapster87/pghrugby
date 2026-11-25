import { ArrowUpRight } from "lucide-react"
import Link from "next/link"

import Heading from "@/components/typography/heading"
import Text from "@/components/typography/text"

import s from "./style.module.css"

/**
 * The 404 body shared by every `not-found.tsx` boundary.
 *
 * Chrome (header/footer) is supplied by whichever layout wraps the boundary:
 * the root `not-found` composes `SiteChrome` itself, while the route-group
 * boundaries inherit it from their group layout. This component is body only.
 */
export default function NotFoundContent() {
  return (
    <div className={s.wrapper}>
      <Heading level="h1">Page not found</Heading>
      <Text>The page you tried to access does not exist.</Text>
      <Link className={s.link} href="/">
        <span className={s.linkText}>Go to frontpage</span>
        <ArrowUpRight className={s.arrowIcon} aria-hidden />
      </Link>
    </div>
  )
}

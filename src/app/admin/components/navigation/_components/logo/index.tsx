import Link from "next/link"
import { cmsPath } from "../../../../lib/cms-path"
import { coreConfig } from "../../../../lib/core-config"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import s from "./styles.module.css"

const productName = coreConfig.branding.productName

/** Two-letter monogram used as the collapsed/rail brand mark. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
}

export default function Logo({ showText = true }) {
  return (
    <>
      <Link href={cmsPath("/editor")} className={s.navbarBrand}>
        <span aria-hidden="true" className={s.logoMark}>
          {initials(productName)}
        </span>
        {showText ? (
          <p className={s.logoText}>{productName}</p>
        ) : (
          <VisuallyHidden>{productName}</VisuallyHidden>
        )}
      </Link>
    </>
  )
}

import { ArrowUpRightMini } from "@medusajs/icons"
import LocalizedClientLink from "../localized-client-link"
import s from "./style.module.css"

type InteractiveLinkProps = {
  href: string
  children?: React.ReactNode
  onClick?: () => void
}

const InteractiveLink = ({
  href,
  children,
  onClick,
  ...props
}: InteractiveLinkProps) => {
  return (
    <LocalizedClientLink
      className={s.link}
      href={href}
      onClick={onClick}
      {...props}
    >
      <span className={s.linkText}>{children}</span>
      <ArrowUpRightMini
        className={s.arrowIcon}
        color="var(--color-interactive)"
      />
    </LocalizedClientLink>
  )
}

export default InteractiveLink

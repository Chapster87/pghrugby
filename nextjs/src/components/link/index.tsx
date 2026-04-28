import React from "react"
import NextLink from "next/link"
import clsx from "clsx"
import buttonStyles from "../button/styles.module.css"
import s from "./styles.module.css"

type LinkProps = {
  children: React.ReactNode
  href: string
  variant?: "primary" | "secondary"
  size?: "small" | "default" | "large"
  className?: string
  openInNewTab?: boolean
  buttonStyle?: boolean
} & React.AnchorHTMLAttributes<HTMLAnchorElement>

const Link: React.FC<LinkProps> = ({
  children,
  href,
  variant = "primary",
  size = "default",
  className,
  openInNewTab = false,
  buttonStyle = false,
  ...props
}) => {
  const classes = clsx(
    buttonStyle
      ? [buttonStyles.base, buttonStyles[variant], buttonStyles[size]]
      : s.link,
    className
  )

  return (
    <NextLink
      href={href}
      className={classes}
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
      {...props}
    >
      {children}
    </NextLink>
  )
}

export default Link

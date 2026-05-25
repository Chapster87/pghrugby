import { ArrowUpRightMini } from "@medusajs/icons"
import { Text } from "@medusajs/ui"
import { Metadata } from "next"
import Link from "next/link"
import s from "./not-found.module.css"

export const metadata: Metadata = {
  title: "404",
  description: "Something went wrong",
}

export default function NotFound() {
  return (
    <div className={s.wrapper}>
      <h1 className={s.heading}>Page not found</h1>
      <p className={s.description}>
        The page you tried to access does not exist.
      </p>
      <Link className={s.link} href="/">
        <Text className={s.linkText}>Go to frontpage</Text>
        <ArrowUpRightMini
          className={s.arrowIcon}
          color="var(--fg-interactive)"
        />
      </Link>
    </div>
  )
}

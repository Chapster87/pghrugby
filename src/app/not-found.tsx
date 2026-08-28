import { ArrowUpRight } from "lucide-react"
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
        <span className={s.linkText}>Go to frontpage</span>
        <ArrowUpRight className={s.arrowIcon} aria-hidden />
      </Link>
    </div>
  )
}

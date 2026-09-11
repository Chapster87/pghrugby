"use client"

import { usePathname } from "next/navigation"
import Navigation from "../navigation"
import Header from "../header"
import BreakpointIndicator from "../breakpoint-indicator"
import { isAuthPath } from "../../lib/is-auth-path"
import s from "./style.module.css"

/**
 * Chooses between the full admin chrome and the locked-down auth shell.
 * Auth routes stay mount-scoped (tokens, font) but hide nav/header chrome.
 */
export default function AdminFrame({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  if (isAuthPath(pathname)) {
    return <div className={s.authSite}>{children}</div>
  }

  return (
    <div className={s.site}>
      <BreakpointIndicator />
      <Navigation />
      <div className={s.primary}>
        <Header />
        <main className={s.content}>{children}</main>
      </div>
    </div>
  )
}

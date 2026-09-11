"use client"

import clsx from "clsx"
import Breadcrumbs from "../../../breadcrumbs"
import s from "./style.module.css"

type TitleBarProps = {
  className?: string
}

export default function TitleBar({ className = "" }: TitleBarProps) {
  return (
    <div className={clsx(s.titleBar, className)}>
      <Breadcrumbs hideOnRoot />
    </div>
  )
}

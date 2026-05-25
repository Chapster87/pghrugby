import { clx } from "@medusajs/ui"

import s from "./style.module.css"

const Divider = ({ className }: { className?: string }) => (
  <div className={clx(s.divider, className)} />
)

export default Divider

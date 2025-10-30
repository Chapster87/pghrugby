import { ChevronLeft, ChevronRight } from "lucide-react"
import clsx from "clsx"
import s from "./styles.module.css"

export function Arrow({ direction }: { direction: "left" | "right" }) {
  return (
    <div
      className={`${s.arrow} ${
        direction === "left" ? s.arrowPrev : s.arrowNext
      }`}
    >
      {direction === "left" ? (
        <ChevronLeft size={26} />
      ) : (
        <ChevronRight size={26} />
      )}
    </div>
  )
}

export function Dot({ current }: { current?: boolean }) {
  return <div className={clsx(s.dot, { [s.current]: current })}></div>
}

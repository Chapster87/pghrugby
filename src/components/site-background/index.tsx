import s from "./style.module.css"
import Skyline from "@svg/skyline/Skyline"

export default function SiteBackground() {
  return (
    <div className={s.siteBackground}>
      <div className={s.bgOverlay} />
      <Skyline />
    </div>
  )
}

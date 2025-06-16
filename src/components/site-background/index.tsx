import s from "./style.module.css"

export default function SiteBackground() {
  return (
    <div className={s.siteBackground}>
      <div className={s.bgOverlay} />
    </div>
  )
}

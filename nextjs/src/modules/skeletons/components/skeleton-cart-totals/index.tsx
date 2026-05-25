import s from "./style.module.css"

const SkeletonCartTotals = ({ header = true }) => {
  return (
    <div className={s.container}>
      {header && <div className={s.headerSkeleton}></div>}
      <div className={s.row}>
        <div className={s.itemSkeletonLarge}></div>
        <div className={s.itemSkeletonLarge}></div>
      </div>

      <div className={s.marginRow}>
        <div className={s.itemSkeletonMedium}></div>
        <div className={s.itemSkeletonMedium}></div>
      </div>

      <div className={s.row}>
        <div className={s.itemSkeletonSmall}></div>
        <div className={s.itemSkeletonXSmall}></div>
      </div>

      <div className={s.divider}></div>

      <div className={s.row}>
        <div className={s.totalSkeletonLarge}></div>
        <div className={s.totalSkeletonMedium}></div>
      </div>
    </div>
  )
}

export default SkeletonCartTotals

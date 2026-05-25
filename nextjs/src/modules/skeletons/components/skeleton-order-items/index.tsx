import s from "./style.module.css"

const SkeletonOrderItems = () => {
  return (
    <div className={s.container}>
      {[1, 2, 3].map((i) => (
        <div key={i} className={s.itemWrapper}>
          <div className={s.imageSkeleton}></div>
          <div className={s.infoRow}>
            <div className={s.infoWrapper}>
              <div className={s.titleSkeleton}></div>
              <div className={s.subtitleSkeleton}></div>
              <div className={s.descriptionSkeleton}></div>
            </div>
            <div className={s.priceSkeleton}></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default SkeletonOrderItems

import s from "./style.module.css"

const SkeletonOrderConfirmedHeader = () => {
  return (
    <div className={s.container}>
      <div className={s.titleSkeleton}></div>
      <div className={s.headerSkeleton}></div>
      <div className={s.infoWrapper}>
        <div className={s.dateSkeleton}></div>
        <div className={s.orderNumberSkeleton}></div>
      </div>
    </div>
  )
}

export default SkeletonOrderConfirmedHeader

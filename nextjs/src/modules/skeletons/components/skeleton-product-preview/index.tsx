import s from "./style.module.css"

const SkeletonProductPreview = () => {
  return (
    <div className={s.container}>
      <div className={s.imageSkeleton} />
      <div className={s.infoWrapper}>
        <div className={s.titleSkeleton}></div>
        <div className={s.priceSkeleton}></div>
      </div>
    </div>
  )
}

export default SkeletonProductPreview

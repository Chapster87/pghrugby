import s from "./style.module.css"

const SkeletonCardDetails = () => {
  return (
    <div className={s.container}>
      <div className={s.labelSkeleton}></div>
      <div className={s.inputSkeleton} />
    </div>
  )
}

export default SkeletonCardDetails

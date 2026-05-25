import s from "./style.module.css"

const SkeletonCodeForm = () => {
  return (
    <div className={s.container}>
      <div className={s.labelSkeleton}></div>
      <div className={s.inputWrapper}>
        <div className={s.inputSkeleton}></div>
        <div className={s.buttonSkeleton}></div>
      </div>
    </div>
  )
}

export default SkeletonCodeForm

import s from "./style.module.css"

const ErrorMessage = ({
  error,
  "data-testid": dataTestid,
}: {
  error?: string | null
  "data-testid"?: string
}) => {
  if (!error) {
    return null
  }

  return (
    <div className={s.error} data-testid={dataTestid}>
      <span>{error}</span>
    </div>
  )
}

export default ErrorMessage

import s from "./style.module.css"

const Radio = ({
  checked,
  "data-testid": dataTestId,
}: {
  checked: boolean
  "data-testid"?: string
}) => {
  return (
    <>
      <button
        type="button"
        role="radio"
        aria-checked="true"
        data-state={checked ? "checked" : "unchecked"}
        className={s.radioWrapper}
        data-testid={dataTestId || "radio-button"}
      >
        <div className={s.radioInner}>
          {checked && (
            <span
              data-state={checked ? "checked" : "unchecked"}
              className={s.radioDotWrapper}
            >
              <div className={s.radioDot}></div>
            </span>
          )}
        </div>
      </button>
    </>
  )
}

export default Radio

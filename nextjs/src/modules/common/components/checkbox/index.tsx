import { Checkbox, Label } from "@medusajs/ui"
import React from "react"

import s from "./style.module.css"

type CheckboxProps = {
  checked?: boolean
  onChange?: () => void
  label: string
  title?: string
  name?: string
  "data-testid"?: string
}

const CheckboxWithLabel: React.FC<CheckboxProps> = ({
  checked = true,
  onChange,
  label,
  title,
  name,
  "data-testid": dataTestId,
}) => {
  return (
    <div className={s.container}>
      <Checkbox
        className={s.checkbox}
        id="checkbox"
        role="checkbox"
        type="button"
        title={title}
        checked={checked}
        aria-checked={checked}
        onClick={onChange}
        name={name}
        data-testid={dataTestId}
      />
      <Label htmlFor="checkbox" className={s.label} size="large">
        {label}
      </Label>
    </div>
  )
}

export default CheckboxWithLabel

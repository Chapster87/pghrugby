import { Label } from "@medusajs/ui"
import React, { useEffect, useImperativeHandle, useState } from "react"

import Eye from "@modules/common/icons/eye"
import EyeOff from "@modules/common/icons/eye-off"

import s from "./style.module.css"

type InputProps = Omit<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
  "placeholder"
> & {
  label: string
  errors?: Record<string, unknown>
  touched?: Record<string, unknown>
  name: string
  topLabel?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ type, name, label, touched, required, topLabel, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [inputType, setInputType] = useState(type)

    useEffect(() => {
      if (type === "password" && showPassword) {
        setInputType("text")
      }

      if (type === "password" && !showPassword) {
        setInputType("password")
      }
    }, [type, showPassword])

    useImperativeHandle(ref, () => inputRef.current!)

    return (
      <div className={s.container}>
        {topLabel && <Label className={s.topLabel}>{topLabel}</Label>}
        <div className={s.inputWrapper}>
          <input
            type={inputType}
            name={name}
            placeholder=" "
            required={required}
            className={s.input}
            {...props}
            ref={inputRef}
          />
          <label
            htmlFor={name}
            onClick={() => inputRef.current?.focus()}
            className={s.floatingLabel}
          >
            {label}
            {required && <span className={s.requiredStar}>*</span>}
          </label>
          {type === "password" && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={s.passwordButton}
            >
              {showPassword ? <Eye /> : <EyeOff />}
            </button>
          )}
        </div>
      </div>
    )
  }
)

Input.displayName = "Input"

export default Input

import { ChevronUpDown } from "@medusajs/icons"
import {
  SelectHTMLAttributes,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import s from "./style.module.css"

export type NativeSelectProps = {
  placeholder?: string
  errors?: Record<string, unknown>
  touched?: Record<string, unknown>
} & SelectHTMLAttributes<HTMLSelectElement>

const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  (
    { placeholder = "Select...", defaultValue, className, children, ...props },
    ref
  ) => {
    const innerRef = useRef<HTMLSelectElement>(null)
    const [isPlaceholder, setIsPlaceholder] = useState(false)

    useImperativeHandle<HTMLSelectElement | null, HTMLSelectElement | null>(
      ref,
      () => innerRef.current
    )

    useEffect(() => {
      if (innerRef.current && innerRef.current.value === "") {
        setIsPlaceholder(true)
      } else {
        setIsPlaceholder(false)
      }
    }, [innerRef.current?.value])

    return (
      <div>
        <div
          onFocus={() => innerRef.current?.focus()}
          onBlur={() => innerRef.current?.blur()}
          className={`${s.wrapper} ${className} ${
            isPlaceholder ? s.placeholder : ""
          }`}
        >
          <select
            ref={innerRef}
            defaultValue={defaultValue}
            {...props}
            className={s.select}
          >
            <option disabled value="">
              {placeholder}
            </option>
            {children}
          </select>
          <span className={s.iconContainer}>
            <ChevronUpDown />
          </span>
        </div>
      </div>
    )
  }
)

NativeSelect.displayName = "NativeSelect"

export default NativeSelect

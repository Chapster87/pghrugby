import React from "react"
import s from "./styles.module.css"

type ButtonProps = {
  children: React.ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary"
  size?: "small" | "default" | "large"
  disabled?: boolean
  className?: string
  isLoading?: boolean
  beforeText?: React.ReactNode
  afterText?: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = "primary",
  size = "default",
  disabled = false,
  isLoading = false,
  className,
  beforeText,
  afterText,
  ...props
}) => {
  const classes = [
    s.base,
    s[variant],
    s[size],
    disabled && s.disabled,
    isLoading && s.loading,
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <button
      onClick={onClick}
      className={classes}
      disabled={disabled || isLoading}
      {...props}
    >
      {beforeText && <span className={s["iconBefore"]}>{beforeText}</span>}
      {isLoading ? <span className={s.spinner}></span> : children}
      {afterText && <span className={s["iconAfter"]}>{afterText}</span>}
    </button>
  )
}

export default Button

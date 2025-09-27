import React from "react"
import s from "./styles.module.css"

type ButtonProps = {
  children: React.ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary"
  size?: "small" | "large"
  disabled?: boolean
  className?: string
  isLoading?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = "primary",
  size = "large",
  disabled = false,
  isLoading = false,
  className,
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
      {isLoading ? <span className={s.spinner}></span> : children}
    </button>
  )
}

export default Button

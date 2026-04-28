"use client"

import Button from "@/components/button"
import React from "react"
import { useFormStatus } from "react-dom"

export function SubmitButton({
  children,
  className,
  "data-testid": dataTestId,
}: {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "transparent" | "danger" | null
  className?: string
  "data-testid"?: string
}) {
  const { pending } = useFormStatus()

  return (
    <Button
      size="small"
      className={className}
      type="submit"
      isLoading={pending}
      variant="secondary"
      data-testid={dataTestId}
    >
      {children}
    </Button>
  )
}

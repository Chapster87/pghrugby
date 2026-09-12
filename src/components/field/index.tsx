"use client"

import * as FormPrimitive from "@radix-ui/react-form"
import clsx from "clsx"
import React from "react"

import s from "./style.module.css"

/**
 * A form field. Radix `Form.Field`, pre-styled — supplies the `name`, validity
 * state, and label/control wiring. Must sit inside a `Form.Root`. Wrap a
 * `Field.Label`, a `Field.Control`, and any `Field.Message`s:
 *
 * ```tsx
 * <Field.Root name="email">
 *   <Field.Label required>Email</Field.Label>
 *   <Field.Control asChild>
 *     <input type="email" required />
 *   </Field.Control>
 *   <Field.Message match="valueMissing">Please enter your email</Field.Message>
 * </Field.Root>
 * ```
 */
const Root = React.forwardRef<
  React.ComponentRef<typeof FormPrimitive.Field>,
  React.ComponentPropsWithoutRef<typeof FormPrimitive.Field>
>(({ className, ...props }, ref) => (
  <FormPrimitive.Field
    ref={ref}
    className={clsx(s.field, className)}
    {...props}
  />
))
Root.displayName = "Field.Root"

type LabelProps = React.ComponentPropsWithoutRef<typeof FormPrimitive.Label> & {
  /**
   * Mark the field as required with a trailing asterisk. Visual only — the
   * control still needs its own `required` attribute for validation.
   */
  required?: boolean
}

/** The field's label. Radix `Form.Label`, pre-styled. */
const Label = React.forwardRef<
  React.ComponentRef<typeof FormPrimitive.Label>,
  LabelProps
>(({ className, required = false, children, ...props }, ref) => (
  <FormPrimitive.Label
    ref={ref}
    className={clsx(s.label, className)}
    {...props}
  >
    {children}
    {required && (
      <span className={s.requiredMark} aria-hidden>
        {" *"}
      </span>
    )}
  </FormPrimitive.Label>
))
Label.displayName = "Field.Label"

/**
 * The field's control. Radix `Form.Control`, pre-styled — renders an `<input>`
 * by default, or styles the slotted element with `asChild` (input, textarea, or
 * select).
 */
const Control = React.forwardRef<
  React.ComponentRef<typeof FormPrimitive.Control>,
  React.ComponentPropsWithoutRef<typeof FormPrimitive.Control>
>(({ className, ...props }, ref) => (
  <FormPrimitive.Control
    ref={ref}
    className={clsx(s.control, className)}
    {...props}
  />
))
Control.displayName = "Field.Control"

/** A validation message. Radix `Form.Message`, pre-styled. */
const Message = React.forwardRef<
  React.ComponentRef<typeof FormPrimitive.Message>,
  React.ComponentPropsWithoutRef<typeof FormPrimitive.Message>
>(({ className, ...props }, ref) => (
  <FormPrimitive.Message
    ref={ref}
    className={clsx(s.message, className)}
    {...props}
  />
))
Message.displayName = "Field.Message"

const Field = { Root, Label, Control, Message }

export default Field

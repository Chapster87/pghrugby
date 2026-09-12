"use client"

import * as FormPrimitive from "@radix-ui/react-form"
import clsx from "clsx"
import React from "react"

import s from "./style.module.css"

/**
 * The form. Radix `Form.Root`, pre-styled — compose the parts and pass props;
 * never pass classes. Wrap `Field.Root`s and a `Form.Submit` inside it.
 */
const Root = React.forwardRef<
  React.ComponentRef<typeof FormPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof FormPrimitive.Root>
>(({ className, ...props }, ref) => (
  <FormPrimitive.Root
    ref={ref}
    className={clsx(s.root, className)}
    {...props}
  />
))
Root.displayName = "Form.Root"

/**
 * The submit control. Radix `Form.Submit`, unstyled — pair it with `asChild` and
 * the shared Button:
 *
 * ```tsx
 * <Form.Submit asChild>
 *   <Button>Send</Button>
 * </Form.Submit>
 * ```
 */
const Submit = FormPrimitive.Submit

/** The rendered validity state. Radix `Form.ValidityState` (render prop). */
const ValidityState = FormPrimitive.ValidityState

const Form = { Root, Submit, ValidityState }

export default Form

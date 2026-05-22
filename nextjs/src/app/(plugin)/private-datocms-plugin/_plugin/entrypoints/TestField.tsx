"use client"

import { useState, useEffect } from "react"
import { Canvas, TextInput } from "datocms-react-ui"

export default function TestField({ ctx }: { ctx: any }) {
  const [internalValue, setInternalValue] = useState(ctx.value || "")

  useEffect(() => {
    setInternalValue(ctx.value || "")
  }, [ctx.value])

  const handleChange = (newValue: string) => {
    setInternalValue(newValue)
    ctx.setFieldValue(ctx.field.attributes.api_key, newValue)
  }

  return (
    <Canvas ctx={ctx}>
      <TextInput
        value={internalValue}
        onChange={handleChange}
        placeholder="Type something..."
      />
    </Canvas>
  )
}

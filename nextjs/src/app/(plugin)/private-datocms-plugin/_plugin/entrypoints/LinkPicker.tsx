"use client"

import { useMemo } from "react"
import { type RenderFieldExtensionCtx } from "datocms-plugin-sdk"
import {
  Button,
  ButtonGroup,
  Canvas,
  FieldGroup,
  Form,
  TextInput,
} from "datocms-react-ui"

type LinkValue = {
  label?: string
  type?: "url" | "record"
  url?: string
  recordId?: string
  recordType?: string
}

type Props = {
  ctx: RenderFieldExtensionCtx
}

import { useState, useEffect } from "react"

export default function LinkPicker({ ctx }: { ctx: any }) {
  // Use local state to handle immediate UI updates
  const [internalValue, setInternalValue] = useState<LinkValue>(() => {
    const rawValue = ctx.value
    if (typeof rawValue === "string" && rawValue) {
      try {
        return JSON.parse(rawValue) as LinkValue
      } catch {
        return {} as LinkValue
      }
    }
    return (rawValue || {}) as LinkValue
  })

  // Sync internal state with external value changes (e.g. from other users or undos)
  useEffect(() => {
    const rawValue = ctx.value
    let parsedValue: LinkValue = {}
    if (typeof rawValue === "string" && rawValue) {
      try {
        parsedValue = JSON.parse(rawValue)
      } catch {}
    } else if (rawValue && typeof rawValue === "object") {
      parsedValue = rawValue
    }

    // Only update if it's actually different to avoid focus loss
    if (JSON.stringify(parsedValue) !== JSON.stringify(internalValue)) {
      setInternalValue(parsedValue)
    }
  }, [ctx.value])

  const updateValue = (delta: Partial<LinkValue>) => {
    const newValue = { ...internalValue, ...delta }
    setInternalValue(newValue)
    ctx.setFieldValue(JSON.stringify(newValue))
  }

  const handleSelectRecord = async () => {
    try {
      // Based on the 'Invalid arguments' error when passing an object,
      // and the 'Model ID' error when passing an object,
      // it is possible this version of the SDK expects NO arguments,
      // or it is encountering a conflict with the current editing session.
      // We'll try the most minimal call possible.
      const record: any = await ctx.selectItem()

      if (record) {
        const newValue = {
          ...internalValue,
          recordId: record.id,
          recordType: record.type,
          label:
            internalValue.label ||
            record.attributes?.title ||
            record.attributes?.name ||
            "View Record",
        }
        setInternalValue(newValue)
        await ctx.setFieldValue(JSON.stringify(newValue))
      }
    } catch (err) {
      console.error("Error selecting record:", err)
    }
  }

  return (
    <Canvas ctx={ctx}>
      <Form>
        <FieldGroup>
          <TextInput
            id="label"
            name="label"
            label="Button Label"
            value={internalValue.label || ""}
            onChange={(val) => updateValue({ label: val })}
            placeholder="e.g. Shop Now"
          />
        </FieldGroup>

        <FieldGroup>
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "bold",
              }}
            >
              Link Type
            </label>
            <ButtonGroup>
              <Button
                buttonType={
                  internalValue.type === "url" || !internalValue.type
                    ? "primary"
                    : undefined
                }
                onClick={() => updateValue({ type: "url" })}
              >
                Link to URL
              </Button>
              <Button
                buttonType={
                  internalValue.type === "record" ? "primary" : undefined
                }
                onClick={() => updateValue({ type: "record" })}
              >
                Link to DatoCMS record
              </Button>
            </ButtonGroup>
          </div>

          {internalValue.type === "url" || !internalValue.type ? (
            <TextInput
              id="url"
              name="url"
              label="URL"
              value={internalValue.url || ""}
              onChange={(val) => updateValue({ url: val })}
              placeholder="https://example.com"
            />
          ) : (
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                }}
              >
                Selected Record
              </label>
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "#f3f3f3",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                >
                  {internalValue.recordId
                    ? `Record ID: ${internalValue.recordId}`
                    : "No record selected"}
                </div>
                <Button
                  onClick={handleSelectRecord}
                  buttonType="primary"
                  buttonSize="s"
                >
                  {internalValue.recordId ? "Change Record" : "Select Record"}
                </Button>
              </div>
            </div>
          )}
        </FieldGroup>
      </Form>
    </Canvas>
  )
}

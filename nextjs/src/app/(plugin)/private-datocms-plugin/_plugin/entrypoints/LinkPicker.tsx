"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { type RenderFieldExtensionCtx } from "datocms-plugin-sdk"
import {
  Button,
  ButtonGroup,
  ButtonGroupButton,
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

export default function LinkPicker({ ctx }: { ctx: any }) {
  const parseValue = (value: any): LinkValue => {
    if (typeof value === "string" && value) {
      try {
        return JSON.parse(value) as LinkValue
      } catch {
        return {} as LinkValue
      }
    }
    if (value && typeof value === "object") {
      return value as LinkValue
    }
    return {} as LinkValue
  }

  const [internalValue, setInternalValue] = useState<LinkValue>(() =>
    parseValue(ctx.value)
  )
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncStatus, setLastSyncStatus] = useState<
    "success" | "error" | null
  >(null)

  const internalValueRef = useRef<LinkValue>(internalValue)
  useEffect(() => {
    internalValueRef.current = internalValue
  }, [internalValue])

  const lastSentValueRef = useRef<string>(JSON.stringify(parseValue(ctx.value)))

  const debounceSaveRef = useRef<NodeJS.Timeout | null>(null)

  const isSavingRef = useRef(false)

  const saveToDato = useCallback(
    async (value: LinkValue, force: boolean = false) => {
      // The 409 Conflict error in the logs means DatoCMS is already processing a save
      // for this editing session. We must drop overlapping requests.
      if (isSavingRef.current && !force) {
        console.log("LinkPicker: Save already in progress, dropping request.")
        return
      }

      try {
        const newValueStr = JSON.stringify(value)
        if (!force && newValueStr === lastSentValueRef.current) return

        isSavingRef.current = true
        setIsSyncing(true)

        const valueToSave = JSON.stringify(value)
        lastSentValueRef.current = newValueStr

        // REFINED API KEY LOGIC: In Structured Text blocks,
        // the apiKey is often passed to setFieldValue to target the specific field in the block node.
        const apiKey = ctx.field?.attributes?.api_key || "link"

        console.log("LinkPicker: Attempting save...", { apiKey })

        // ALWAYS pass apiKey if we have it, even if setFieldValue is traditionally called without it.
        // Some SDK versions in blocks REQUIRE the key to map to the correct JSON property.
        await ctx.setFieldValue(apiKey, valueToSave)

        setLastSyncStatus("success")
        if (ctx.toggleDirty) await ctx.toggleDirty(true)
        if (ctx.updateHeight) await ctx.updateHeight()
      } catch (err: any) {
        if (err?.reqResMeta?.res?.status === 409) {
          console.warn("LinkPicker: 409 Conflict detected. DatoCMS is busy.")
          // Drop the 'lastSent' so we can retry, but stay 'saving' for the cooldown
          lastSentValueRef.current = ""
        } else {
          setLastSyncStatus("error")
          console.error("LinkPicker: Save error", err)
        }
      } finally {
        // Cool-down to prevent immediate overlapping requests
        setTimeout(() => {
          setIsSyncing(false)
          isSavingRef.current = false
        }, 2000) // Even longer cooldown for stability

        setTimeout(() => setLastSyncStatus(null), 3000)
      }
    },
    [ctx]
  )

  useEffect(() => {
    const externalValue = parseValue(ctx.value)
    const externalValueStr = JSON.stringify(externalValue)

    const isExternalEmpty = !ctx.value || externalValueStr === "{}"
    const isInternalNotEmpty =
      internalValueRef.current &&
      JSON.stringify(internalValueRef.current) !== "{}"

    // If DatoCMS has a value, but it's different from our internal state,
    // and we aren't currently saving, we should trust the external value (CMS truth)
    if (
      !isExternalEmpty &&
      !isSavingRef.current &&
      externalValueStr !== JSON.stringify(internalValue)
    ) {
      console.log("LinkPicker: Adopting CMS value", externalValue)
      setInternalValue(externalValue)
      lastSentValueRef.current = externalValueStr
      return
    }

    // PROTECTION: Only re-sync if the CMS value is TRULY empty and we have data
    // Add a delay to re-sync to let any 409s clear or session finalize
    if (isExternalEmpty && isInternalNotEmpty && !isSavingRef.current) {
      const timer = setTimeout(() => {
        // Re-check after delay
        if (!ctx.value && !isSavingRef.current) {
          console.log("LinkPicker: Re-syncing to overcome DatoCMS reset...")
          saveToDato(internalValueRef.current, true)
        }
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [ctx.value, saveToDato])

  const updateValue = useCallback(
    (delta: Partial<LinkValue>) => {
      setInternalValue((prev) => {
        const newValue = { ...prev, ...delta }

        // INCREASE DEBOUNCE: The UNMANAGED_EDIT_CONFLICT (409) indicates
        // DatoCMS is extremely sensitive to overlapping session updates.
        // 1000ms ensures we aren't fighting the CMS during active typing.
        if (debounceSaveRef.current) clearTimeout(debounceSaveRef.current)
        debounceSaveRef.current = setTimeout(() => {
          saveToDato(newValue)
        }, 1000)

        return newValue
      })
    },
    [saveToDato]
  )

  useEffect(() => {
    const hideOverlays = () => {
      const selectors = [
        "nextjs-portal",
        "__next-prerender-indicator",
        ".nextjs-static-indicator",
        "[data-nextjs-toast-wrapper]",
        "div[shadow-root]",
      ]
      selectors.forEach((s) => {
        const els = document.querySelectorAll(s)
        els.forEach((el) => {
          ;(el as HTMLElement).style.display = "none"
          ;(el as HTMLElement).style.opacity = "0"
          ;(el as HTMLElement).style.pointerEvents = "none"
        })
      })
    }
    hideOverlays()
    const interval = setInterval(hideOverlays, 1000)
    ctx.startAutoResizer()
    return () => clearInterval(interval)
  }, [ctx])

  const [selectedRecordTitle, setSelectedRecordTitle] = useState<string>("")
  const [modelName, setModelName] = useState<string>("")
  const [recordPath, setRecordPath] = useState<string>("")

  const getPathFromSlug = (slug: string) => {
    if (!slug) return ""
    const isHome = slug === "home" || slug === "homepage" || slug === "index"
    return isHome ? "/" : `/${slug}`
  }

  useEffect(() => {
    const fetchRecordInfo = () => {
      if (internalValue.recordId) {
        const allTypes = Object.values(ctx.itemTypes || {})
        const itemType: any = allTypes.find(
          (t: any) => String(t.id) === String(internalValue.recordType)
        )
        if (itemType) setModelName(itemType.attributes.name)

        const items = ctx.items || {}
        const cachedRecord = items[internalValue.recordId]

        if (cachedRecord) {
          setSelectedRecordTitle(
            cachedRecord.attributes?.title ||
              cachedRecord.attributes?.name ||
              ""
          )
          setRecordPath(getPathFromSlug(cachedRecord.attributes?.slug))
        } else if (internalValue.label) {
          setSelectedRecordTitle(internalValue.label)
        }
      } else {
        setSelectedRecordTitle("")
        setModelName("")
        setRecordPath("")
      }
    }
    fetchRecordInfo()
  }, [
    internalValue.recordId,
    internalValue.recordType,
    ctx.items,
    ctx.itemTypes,
    internalValue.label,
  ])

  const handleSelectRecord = async (specificApiKey?: string) => {
    try {
      const allowedApiKeys = specificApiKey
        ? [specificApiKey]
        : ["page", "homepage"]
      const itemTypes = Object.values(ctx.itemTypes) as any[]
      const itemTypeIds = itemTypes
        .filter(
          (type: any) =>
            type?.attributes?.api_key &&
            allowedApiKeys.includes(type.attributes.api_key)
        )
        .map((type: any) => type.id)

      const targetModelId = itemTypeIds[0]
      if (!targetModelId) return

      const record: any = await ctx.selectItem(targetModelId, {
        multiple: false,
      })

      if (record) {
        const newTitle =
          record.attributes?.title || record.attributes?.name || "View Record"
        const newSlug = record.attributes?.slug || ""
        const newPath = getPathFromSlug(newSlug)

        const itemType: any = Object.values(ctx.itemTypes).find(
          (t: any) => String(t.id) === String(record.itemType)
        )
        if (itemType) setModelName(itemType.attributes.name)

        setSelectedRecordTitle(newTitle)
        setRecordPath(newPath)

        updateValue({
          recordId: record.id,
          recordType: record.itemType,
          label:
            !internalValue.label || internalValue.label === selectedRecordTitle
              ? newTitle
              : internalValue.label,
          type: "record",
        })
      }
    } catch (err) {
      console.error("Error selecting record:", err)
    }
  }

  return (
    <Canvas ctx={ctx}>
      <Form>
        <FieldGroup>
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: 14,
                fontWeight: "bold",
              }}
            >
              Link Text (Label)
            </label>
            <TextInput
              id="label"
              name="label"
              value={internalValue.label || ""}
              onChange={(val) => updateValue({ label: val })}
              placeholder="e.g. Read more"
            />
          </div>
        </FieldGroup>

        <FieldGroup>
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: 14,
                fontWeight: "bold",
              }}
            >
              Link Type
            </label>
            <ButtonGroup>
              <ButtonGroupButton
                onClick={() => updateValue({ type: "url" })}
                selected={internalValue.type === "url" || !internalValue.type}
              >
                External URL
              </ButtonGroupButton>
              <ButtonGroupButton
                onClick={() => updateValue({ type: "record" })}
                selected={internalValue.type === "record"}
              >
                DatoCMS Record
              </ButtonGroupButton>
            </ButtonGroup>
          </div>

          {internalValue.type === "url" || !internalValue.type ? (
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: 14,
                  fontWeight: "bold",
                }}
              >
                URL
              </label>
              <TextInput
                id="url"
                name="url"
                value={internalValue.url || ""}
                onChange={(val) => updateValue({ url: val })}
                placeholder="https://pghrugby.com/..."
              />
            </div>
          ) : (
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: 14,
                  fontWeight: "bold",
                }}
              >
                Selected Record
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "#f9f9f9",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                >
                  {internalValue.recordId ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: "bold",
                          fontSize: "14px",
                          color: "#000",
                        }}
                      >
                        {selectedRecordTitle}
                      </span>
                      <span style={{ fontSize: "12px", color: "#666" }}>
                        {modelName}
                        {recordPath ? ` • ${recordPath}` : ""}
                      </span>
                    </div>
                  ) : (
                    <span style={{ color: "#999", fontSize: "13px" }}>
                      No record selected
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    minWidth: "140px",
                  }}
                >
                  <Button
                    onClick={() => handleSelectRecord("page")}
                    buttonType="primary"
                    buttonSize="s"
                    fullWidth
                  >
                    Pick Page
                  </Button>
                  <Button
                    onClick={() => handleSelectRecord("homepage")}
                    buttonType="muted"
                    buttonSize="s"
                    fullWidth
                  >
                    Pick Homepage
                  </Button>
                </div>
              </div>
            </div>
          )}
        </FieldGroup>

        <div
          style={{
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid #eee",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: "12px", color: "#666" }}>
            {isSyncing ? (
              <span>Syncing to DatoCMS...</span>
            ) : lastSyncStatus === "success" ? (
              <span style={{ color: "#2d7ff9" }}>✓ Changes synced</span>
            ) : lastSyncStatus === "error" ? (
              <span style={{ color: "#e6433f" }}>× Sync failed</span>
            ) : (
              <span>All changes synced</span>
            )}
          </div>
          <Button
            buttonSize="s"
            onClick={() => saveToDato(internalValue, true)}
            disabled={isSyncing}
          >
            {isSyncing ? "Saving..." : "Force Sync"}
          </Button>
        </div>
      </Form>
    </Canvas>
  )
}

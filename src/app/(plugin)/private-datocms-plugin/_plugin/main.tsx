/*
 * Entry point for a DatoCMS plugin.
 */

"use client"

import { useEffect } from "react"
import { connect, type RenderFieldExtensionCtx } from "datocms-plugin-sdk"
import ConfigScreen from "./entrypoints/ConfigScreen"
import LinkPicker from "./entrypoints/LinkPicker"
import TestField from "./entrypoints/TestField"
import { render } from "./utils/render"
import "datocms-react-ui/styles.css"

export type PluginEntryProps = {
  onConnect: (ctx: any) => void
}

export default function PluginEntry({ onConnect }: PluginEntryProps) {
  useEffect(() => {
    let isConnected = false

    connect({
      renderConfigScreen(ctx: any) {
        if (!isConnected) {
          isConnected = true
          onConnect(ctx)
        }
        render(<ConfigScreen ctx={ctx} />)
      },

      manualFieldExtensions() {
        return [
          {
            id: "link-picker",
            name: "Custom Link Picker",
            type: "editor",
            fieldTypes: ["json", "string"],
          },
          {
            id: "test-field",
            name: "Simple Test Field",
            type: "editor",
            fieldTypes: ["json", "string"],
          },
        ]
      },

      renderFieldExtension(
        fieldExtensionId: string,
        ctx: RenderFieldExtensionCtx
      ) {
        if (!isConnected) {
          isConnected = true
          onConnect(ctx)
        }
        // if (fieldExtensionId === "link-picker") {
        //   render(<LinkPicker ctx={ctx} />)
        // }
        if (fieldExtensionId === "test-field") {
          render(<TestField ctx={ctx} />)
        }
      },

      /**
       * Handle external field changes (including resets during save cycles).
       * This is the bridge between the DatoCMS state and the React component.
       */
      onFieldValueChange(value: any, ctx: RenderFieldExtensionCtx) {
        console.log("Plugin: onFieldValueChange", value)
        // Note: The LinkPicker component also listens to ctx.value via useEffect,
        // but this hook ensures the SDK protocol is followed for state updates.
      },

      buildItemPresentationInfo(item: any, ctx: any) {
        return {
          title:
            item.attributes.title ||
            item.attributes.name ||
            `Record ${item.id}`,
          subtitle: item.meta.status,
          icon: "link",
        }
      },
    } as any)
  }, [onConnect])

  return null
}

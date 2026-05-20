/*
 * Entry point for a DatoCMS plugin. The connect() call registers every hook the
 * plugin implements. Each render hook receives a context object (ctx) that
 * provides access to plugin parameters, the current user/role, and helpers.
 *
 * This template provides a clean starting point for implementing various hooks.
 * For an overview of all available hooks:
 * https://www.datocms.com/docs/plugin-sdk/what-hooks-are
 */

"use client"

import { useEffect } from "react"
import { connect } from "datocms-plugin-sdk"
import ConfigScreen from "./entrypoints/ConfigScreen"
import LinkPicker from "./entrypoints/LinkPicker"
import { render } from "./utils/render"
import "datocms-react-ui/styles.css"

export type PluginEntryProps = {
  onConnect: (ctx: any) => void
}

export default function PluginEntry({ onConnect }: PluginEntryProps) {
  useEffect(() => {
    let isConnected = false

    connect({
      /**
       * Renders the settings page for the plugin under Settings > Plugins.
       */
      renderConfigScreen(ctx: any) {
        if (!isConnected) {
          isConnected = true
          onConnect(ctx)
        }
        render(<ConfigScreen ctx={ctx} />)
      },

      /**
       * Declare which field extensions or sidebar panels this plugin provides.
       */
      manualFieldExtensions() {
        return [
          {
            id: "link-picker",
            name: "Custom Link Picker",
            type: "editor",
            fieldTypes: ["json", "string"],
          },
        ]
      },

      /**
       * Renders a custom field extension or addon UI.
       */
      renderFieldExtension(fieldExtensionId: string, ctx: any) {
        if (!isConnected) {
          isConnected = true
          onConnect(ctx)
        }
        if (fieldExtensionId === "link-picker") {
          render(<LinkPicker ctx={ctx} />)
        }
      },

      /**
       * Renders a sidebar panel in the record editing form.
       */
      renderItemFormSidebarPanel(sidebarPanelId: string, ctx: any) {
        if (!isConnected) {
          isConnected = true
          onConnect(ctx)
        }
        // render(<MySidebarComponent ctx={ctx} />)
      },

      /* @TODO: Implement specific hooks like renderStructuredTextLinkMetadataForm if needed */
    } as any)
  }, [onConnect])

  return null
}

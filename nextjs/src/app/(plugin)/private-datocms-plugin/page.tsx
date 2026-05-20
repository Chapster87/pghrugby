/*
 * This page is rendered inside a DatoCMS iframe as a private plugin. It must be
 * a bare HTML shell — no site layout, no site CSS — because the plugin SDK
 * manages its own styling via the <Canvas> component.
 *
 * To install this plugin in your DatoCMS project, go to Configuration > Plugins,
 * create a new private plugin, and point it to the URL of this page
 * (e.g. https://your-site.com/private-datocms-plugin).
 *
 * For more information on private plugins:
 * https://www.datocms.com/docs/plugin-sdk/build-your-first-plugin#install-your-plugin-in-the-datocms-web-app
 */

"use client"

import { useEffect, useState } from "react"
import { Canvas } from "datocms-react-ui"
import PluginEntry from "./_plugin/main"

export default function PrivatePluginPage() {
  const [ctx, setCtx] = useState<any>(null)
  const [isIframe, setIsIframe] = useState<boolean | null>(null)

  useEffect(() => {
    setIsIframe(window.self !== window.top)
  }, [])

  if (isIframe === false) {
    return (
      <div style={{ padding: "24px", fontFamily: "sans-serif" }}>
        <h1>DatoCMS Private Plugin</h1>
        <p>This page is intended to be rendered within a DatoCMS iframe.</p>
      </div>
    )
  }

  if (isIframe === null) {
    return null
  }

  return (
    <>
      <div id="root" />
      <PluginEntry onConnect={setCtx} />
      {ctx && <Canvas ctx={ctx}>{null}</Canvas>}
    </>
  )
}

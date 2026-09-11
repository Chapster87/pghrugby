/**
 * Layout for the `(plugin)` route group (the private DatoCMS plugin page). No
 * <html>/<body> here — the root layout owns the document shell; this is a
 * pass-through so the plugin page renders under the single root layout.
 */
export default function PluginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

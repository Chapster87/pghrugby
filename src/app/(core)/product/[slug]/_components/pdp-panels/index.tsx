import { toRichText } from "@/content/datocms/adapter"
import RenderContent from "@/content/render-content"
import type { ResultOf } from "@/lib/datocms/graphql"

import type { productDetailPageQuery } from "../../product-detail-page.query"

/** One panel block's Structured Text document, as the query reads it. */
type TabContent = NonNullable<
  ResultOf<typeof productDetailPageQuery>["productDetailPage"]
>["tabs"][number]["content"]

/**
 * One panel's body.
 *
 * A tab's `content` is Structured Text, so it renders through the shared
 * `RenderContent` — the same canonical blocks the page bodies use, which is
 * exactly what the field's validators allow
 * (`docs/pdp-to-minicart-to-checkout-spec.md` § 4.7).
 *
 * Server-rendered on purpose: a panel body is static content, so keeping it here
 * means only the tab strip reaches the browser, and the PDP's client bundle never
 * carries `react-datocms`.
 *
 * The shared `image` block preserves the safety the old switch provided by hand:
 * `next/image` when the source knows both dimensions, a plain responsive `<img>`
 * otherwise. The tab strip itself is panel composition, not block content, and
 * stays out of the block registry.
 */
export default function PdpPanelContent({ content }: { content: TabContent }) {
  return <RenderContent content={toRichText(content)} />
}

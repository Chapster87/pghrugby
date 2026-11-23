import type { ComponentProps, ReactElement, ReactNode } from "react"
import Link from "next/link"
import { StructuredText, renderNodeRule } from "react-datocms/structured-text"
import type { Link as LinkNode } from "datocms-structured-text-utils"

/** What `StructuredText` accepts as its document. */
type StructuredTextData = ComponentProps<typeof StructuredText>["data"]

/** The node-rule list `StructuredText` accepts. */
type NodeRules = NonNullable<
  ComponentProps<typeof StructuredText>["customNodeRules"]
>

/**
 * Whether a node is a link.
 *
 * The `Link` type is imported type-only from `datocms-structured-text-utils`,
 * which is a transitive dependency: a type-only import is erased at compile
 * time, so nothing resolves it at runtime.
 *
 * @param node - Any DAST node.
 * @returns Whether the node is a link.
 */
function isLinkNode(node: { type: string }): node is LinkNode {
  return node.type === "link"
}

/**
 * The default rules mapping a document onto the design system.
 *
 * Links become `next/link`, so an internal link navigates client-side and an
 * external one opens in a new tab with a safe `rel`. Headings, paragraphs, lists
 * and quotes are deliberately left to the global `.prose` stylesheet: it already
 * owns that type scale, and swapping in `Heading`/`Text` here would change the
 * rendered output of every migrated route — a regression a migration must not
 * introduce.
 */
const defaultNodeRules: NodeRules = [
  renderNodeRule(isLinkNode, ({ node, children, key }) => {
    const isExternal =
      /^https?:\/\//i.test(node.url) || node.url.startsWith("//")

    return (
      <Link
        key={key}
        href={node.url}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
      >
        {children as ReactNode}
      </Link>
    )
  }),
]

type RenderRichTextProps = {
  /** The source CMS's own document, passed through untouched. */
  document: unknown
  /** Resolve one embedded block by its source record. */
  renderBlock: (record: {
    id: string
    __typename?: string
  }) => ReactElement | null
  /** Extra rules for a block that needs different treatment for one node kind. */
  customNodeRules?: NodeRules
}

/**
 * Render a rich-text document.
 *
 * This is the DatoCMS document renderer: `StructuredText` is what understands
 * the DAST shape. When ForgeCMS arrives it gets its own document renderer, and
 * the node rules above are the part that stays shared.
 *
 * The document is cast rather than validated. It is opaque in the canonical
 * model by design — normalizing a full rich-text AST buys little — so this is
 * the boundary where the source's shape is trusted.
 *
 * @param props.document - The source document.
 * @param props.renderBlock - Resolves an embedded block by its source record.
 * @param props.customNodeRules - Extra rules appended to the defaults.
 * @returns The rendered document, inside the global prose styles.
 */
export default function RenderRichText({
  document,
  renderBlock,
  customNodeRules,
}: RenderRichTextProps) {
  return (
    <div className="prose">
      <StructuredText
        data={document as StructuredTextData}
        customNodeRules={
          customNodeRules
            ? [...defaultNodeRules, ...customNodeRules]
            : defaultNodeRules
        }
        renderBlock={({ record }) =>
          renderBlock(record as { id: string; __typename?: string })
        }
      />
    </div>
  )
}

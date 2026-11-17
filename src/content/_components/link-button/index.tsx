import Link from "@/components/link"
import type { LinkButtonBlock } from "@/content/model"

import s from "./styles.module.css"

/** The variants the shared `Link` component understands. */
const VARIANTS = ["primary", "secondary"] as const

/** The sizes the shared `Link` component understands. */
const SIZES = ["small", "default", "large"] as const

/**
 * Narrow a source-supplied string to one of a known set.
 *
 * The canonical model keeps `variant` and `size` as plain strings because the
 * source owns the vocabulary; this is where that vocabulary is checked against
 * what the design system can actually render. An unknown value falls back to the
 * default rather than reaching the component and producing no class at all.
 *
 * @param value - The source-supplied value, or null.
 * @param allowed - The values the component accepts.
 * @param fallback - The value to use when `value` is not allowed.
 * @returns A value the component accepts.
 */
function narrow<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T
): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/**
 * A call-to-action link.
 *
 * The adapter guarantees `label` and `href` are present, so this never renders
 * an empty button.
 *
 * @param props.block - The canonical link button block.
 * @returns The link, styled as a button.
 */
export default function LinkButtonBlockView({
  block,
}: {
  block: LinkButtonBlock
}) {
  return (
    <p className={s.row}>
      <Link
        href={block.href}
        variant={narrow(block.variant, VARIANTS, "primary")}
        size={narrow(block.size, SIZES, "default")}
        openInNewTab={block.openInNewTab}
        buttonStyle
      >
        {block.label}
      </Link>
    </p>
  )
}

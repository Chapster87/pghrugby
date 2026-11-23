import s from "./styles.module.css"

/**
 * The placeholder for content nothing can render.
 *
 * Rendered only in a non-production runtime — see `render-content.tsx`. It is
 * deliberately visible: a block that silently disappears is a gap nobody notices
 * until it is on a live page, whereas a labelled gap is noticed at authoring
 * time, which is when it can be fixed.
 *
 * @param props.label - What could not be rendered, e.g. a block kind or a record
 *   model. Shown verbatim so it can be matched against the schema.
 * @returns The placeholder.
 */
export default function UnknownBlock({ label }: { label: string }) {
  return (
    <div className={s.unknown} role="note">
      <span className={s.label}>Unrendered content</span>
      <code className={s.kind}>{label}</code>
    </div>
  )
}

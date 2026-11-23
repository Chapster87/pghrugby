import { decode } from "html-entities"

/**
 * Plain text from CMS-authored HTML.
 *
 * `wpexcerpt` and similar fields arrive as rendered HTML, but metadata and
 * excerpts need plain text. The formatter strips tags and comments, decodes the
 * character references that survive into a description, and trims. It never
 * rewrites the words themselves, so Content-Link stega — invisible characters
 * appended to every string on a draft read — passes through untouched.
 */

/** An HTML comment, which carries no text. */
const COMMENT = /<!--[\s\S]*?-->/g

/**
 * A tag. Requiring a letter, `/`, or `!` after `<` keeps prose like
 * `5 < 10 > 3` from being mistaken for markup.
 */
const TAG = /<\/?[a-zA-Z][^>]*>/g

/**
 * Strip HTML tags and decode character references.
 *
 * The entity table is `html-entities`'s, not ours: HTML5 defines thousands of
 * named references, and a hand-rolled map silently leaks the ones it forgot.
 * Tags are removed before entities are decoded, so encoded markup
 * (`&lt;script&gt;`) stays visible as text rather than turning into a tag that
 * the next pass would strip.
 *
 * @param html - The HTML string to strip, if any.
 * @returns The plain-text content, trimmed, or an empty string.
 */
export function toPlainText(html?: string | null): string {
  if (!html) return ""

  const text = html.replace(COMMENT, "").replace(TAG, "")

  return decode(text, { level: "html5" }).trim()
}

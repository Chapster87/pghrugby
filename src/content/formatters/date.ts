/**
 * Date formatting for CMS timestamps.
 *
 * The routes format dates inline today, with `toLocaleDateString()` picking up
 * whatever locale and time zone the runtime happens to have. These formatters pin
 * both, so a date renders the same on a laptop and on the build image.
 */

/** The site's only locale. */
const LOCALE = "en-US"

/**
 * The default display format: the numeric date the routes render today.
 *
 * `timeZone: "UTC"` is deliberate. CMS timestamps are UTC, and formatting in the
 * runtime's zone would shift a date across midnight depending on where the build
 * ran.
 */
const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "UTC",
}

/**
 * Parse a CMS timestamp.
 *
 * @param value - An ISO timestamp, or null/undefined when the field is empty.
 * @returns The date, or null when there is no valid date.
 */
function parse(value: string | null | undefined): Date | null {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Format a CMS timestamp for display.
 *
 * @param value - An ISO timestamp, or null/undefined when the field is empty.
 * @param options - Overrides for the display format; the time zone stays UTC.
 * @returns The formatted date, or an empty string when there is no valid date.
 */
export function formatDate(
  value?: string | null,
  options: Intl.DateTimeFormatOptions = DEFAULT_OPTIONS
): string {
  const date = parse(value)
  if (!date) return ""

  return date.toLocaleDateString(LOCALE, { ...options, timeZone: "UTC" })
}

/**
 * Convert a CMS timestamp to the ISO form machine-readable attributes need
 * (`<time dateTime>`, JSON-LD).
 *
 * @param value - An ISO timestamp, or null/undefined when the field is empty.
 * @returns The ISO timestamp, or an empty string when there is no valid date.
 */
export function toIsoDate(value?: string | null): string {
  const date = parse(value)
  return date ? date.toISOString() : ""
}

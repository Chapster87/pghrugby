import colors from "./colors"
import logos from "./logos"
import typography from "./typography"

import type { StyleGuideSection } from "./types"

/**
 * The styleguide registry. Sections render on the single landing page in this
 * order, so adding a design-brief section is one import plus one array entry.
 */
export const sections: StyleGuideSection[] = [colors, logos, typography]

/**
 * PROTOTYPE TUI — throwaway shell around the portable module in ./models.ts.
 * Run: pnpm prototype:datocms-models   (from pghrugby/nextjs)
 *
 * Drive the proposed DatoCMS product/taxonomy models through the real catalog
 * cases and react to the three open seams (keying, add-on composition, form
 * shape). Keys act instantly — no Enter needed.
 *
 * The interesting moments are the ones that feel wrong — that's the prototype
 * earning its keep.
 */

import { createInterface } from "node:readline/promises"
import {
  CASES,
  DEFAULT_TOGGLES,
  renderGraphQL,
  renderModels,
  renderRecordsForCase,
  renderRouteSkeleton,
  renderSessionBuild,
  type ToggleState,
} from "./models"

const BOLD = "\x1b[1m"
const DIM = "\x1b[2m"
const RESET = "\x1b[0m"

const t = { ...DEFAULT_TOGGLES }
let selected = 0
let showModels = false
let showRoute = false
let lastAction = "welcome — press a key to start"

function setLast(action: string) {
  lastAction = action
}

function keyingLabel() {
  return t.seam === "sku"
    ? "sku (catalog.ts resolves the live price)"
    : "priceId (DatoCMS is the price source)"
}
function addonLabel() {
  return t.addonShape === "flowItem"
    ? "flow_item_block rows"
    : "two link fields (products + addonProducts)"
}
function formLabel() {
  return t.formShape === "repeatable" ? "generic + repeatable" : "plain rehome"
}

/** Returns false when the user quits. */
function handleKey(ch: string): boolean {
  if (ch === "q") return false
  if (/^[1-5]$/.test(ch)) {
    selected = Number(ch) - 1
    setLast(`case ▸ ${CASES[selected].label}`)
  } else if (ch === "k") {
    t.seam = t.seam === "sku" ? "priceId" : "sku"
    setLast(`keying seam ▸ ${keyingLabel()}`)
  } else if (ch === "a") {
    t.addonShape = t.addonShape === "flowItem" ? "twoLinks" : "flowItem"
    setLast(`add-on composition ▸ ${addonLabel()}`)
  } else if (ch === "f") {
    t.formShape = t.formShape === "repeatable" ? "rehome" : "repeatable"
    setLast(`form shape ▸ ${formLabel()}`)
  } else if (ch === "m") {
    showModels = !showModels
    setLast(showModels ? "models ▸ shown" : "models ▸ hidden")
  } else if (ch === "r") {
    showRoute = !showRoute
    setLast(showRoute ? "route skeleton ▸ shown" : "route skeleton ▸ hidden")
  } else {
    return true
  }
  return true
}

function frame(): string {
  const c = CASES[selected]
  const parts: string[] = [
    `${BOLD}PROTOTYPE ▸ DatoCMS product & taxonomy models${RESET}`,
    `${DIM}Question: how should DatoCMS model products + flow-group taxonomy for the Stripe-backed store?${RESET}`,
    "",
    `${BOLD}CONFIG${RESET}  keying: ${keyingLabel()}   |   add-ons: ${addonLabel()}   |   forms: ${formLabel()}`,
    `${BOLD}LAST${RESET}   ${lastAction}`,
    "",
    `${BOLD}CASE ▸ ${c.label}${RESET}  ${DIM}(${selected + 1}/${
      CASES.length
    })${RESET}`,
    "",
    renderRecordsForCase(c, t),
    "",
    renderSessionBuild(c, t),
    "",
    `${BOLD}GRAPHQL ${DIM}(${c.flowGroup.slug})${RESET}`,
    renderGraphQL(c, t),
  ]

  if (showModels) {
    parts.push("", `──── ${BOLD}MODELS${RESET} ────`, renderModels(t))
  }
  if (showRoute) {
    parts.push(
      "",
      `──── ${BOLD}ROUTE SKELETON${RESET} ${DIM}(inspired by (core)/[slug])${RESET} ────`,
      renderRouteSkeleton()
    )
  }

  parts.push(
    "",
    `${BOLD}KEYS${RESET} (act instantly — no Enter)`,
    `  ${BOLD}1-5${RESET} case (dues / golf / SC7s / donations / events)`,
    `  ${BOLD}k${RESET} keying seam   ${BOLD}a${RESET} add-on shape   ${BOLD}f${RESET} form shape`,
    `  ${BOLD}m${RESET} models       ${BOLD}r${RESET} route skeleton    ${BOLD}q${RESET} quit`,
    ""
  )
  return parts.join("\n")
}

function redraw() {
  console.clear()
  console.log(frame())
}

function exitTui() {
  try {
    process.stdin.setRawMode(false)
  } catch {
    /* stdin wasn't a TTY */
  }
  process.stdin.pause()
  process.exit(0)
}

/** Raw keypress mode — instant response. Falls back to line mode when stdin isn't a TTY. */
function main() {
  try {
    let raw = false
    try {
      process.stdin.setRawMode(true)
      raw = true
    } catch {
      raw = false
    }
    process.stdin.resume()
    process.stdin.setEncoding("utf8")

    if (raw) {
      process.stdin.on("data", (buf: Buffer) => {
        const s = buf.toString("utf8")
        if (s === "\u0003") exitTui() // Ctrl+C
        for (const ch of s) {
          // Skip Enter, arrows, and other escape-sequence characters.
          if (ch === "\r" || ch === "\n" || ch === "\x1b") continue
          if (!handleKey(ch)) {
            exitTui()
            return
          }
        }
        redraw()
      })
    } else {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      })
      void (async () => {
        for (;;) {
          const rawLine = (await rl.question("> ")).trim().toLowerCase()
          if (!rawLine) continue
          if (!handleKey(rawLine[0])) break
          redraw()
        }
        rl.close()
      })()
    }

    redraw()
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

main()

import type { StyleGuideSection } from "../types"
import s from "./style.module.css"

type Swatch = {
  name: string
  token: string
}

type ColorGroup = {
  name: string
  swatches: Swatch[]
}

// Curated from src/styles/variables.css — the source of truth. Tokens are
// resolved at render time, so a swatch always tracks the variable's value.
const colorGroups: ColorGroup[] = [
  {
    name: "Brand",
    swatches: [
      { name: "Gold", token: "--color-gold" },
      { name: "Gold 100", token: "--color-gold-100" },
      { name: "Gold 200", token: "--color-gold-200" },
      { name: "Gold 300", token: "--color-gold-300" },
      { name: "Gold 400", token: "--color-gold-400" },
      { name: "Gold 500", token: "--color-gold-500" },
      { name: "Gold 600", token: "--color-gold-600" },
      { name: "Gold 700", token: "--color-gold-700" },
      { name: "Gold 800", token: "--color-gold-800" },
      { name: "Gold 900", token: "--color-gold-900" },
    ],
  },
  {
    name: "Neutrals",
    swatches: [
      { name: "White", token: "--color-white" },
      { name: "Grey 100", token: "--color-grey-100" },
      { name: "Grey 200", token: "--color-grey-200" },
      { name: "Grey 300", token: "--color-grey-300" },
      { name: "Grey 400", token: "--color-grey-400" },
      { name: "Grey 500", token: "--color-grey-500" },
      { name: "Grey 600", token: "--color-grey-600" },
      { name: "Grey 700", token: "--color-grey-700" },
      { name: "Grey 800", token: "--color-grey-800" },
      { name: "Grey 900", token: "--color-grey-900" },
      { name: "Black", token: "--color-black" },
    ],
  },
  {
    name: "Semantic",
    swatches: [
      { name: "Success", token: "--color-success" },
      { name: "Warning", token: "--color-warning" },
      { name: "Danger", token: "--color-danger" },
      { name: "Info", token: "--color-info" },
    ],
  },
]

/**
 * The palette as swatch cards, grouped brand / neutrals / semantic.
 */
function ColorSpecimens() {
  return (
    <>
      {colorGroups.map((group) => (
        <div key={group.name} className={s.group}>
          <h3 className={s.groupTitle}>{group.name}</h3>
          <ul className={s.swatches}>
            {group.swatches.map((swatch) => (
              <li key={swatch.token} className={s.swatch}>
                <span
                  className={s.chip}
                  style={{ backgroundColor: `var(${swatch.token})` }}
                  aria-hidden
                />
                <span className={s.swatchName}>{swatch.name}</span>
                <code className={s.swatchToken}>{swatch.token}</code>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}

const colorsSection: StyleGuideSection = {
  id: "colors",
  title: "Colors",
  description:
    "The palette, as defined in src/styles/variables.css — the source of truth.",
  render: () => <ColorSpecimens />,
}

export default colorsSection

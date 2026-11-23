import type { Demo } from "../types"
import ColumnsSpecimens from "./specimens"

const columnsDemo: Demo = {
  id: "columns",
  title: "Columns",
  description:
    "The generic columns block: two bodies side by side, split and gap presets, and an empty column that holds its cell.",
  render: () => <ColumnsSpecimens />,
}

export default columnsDemo

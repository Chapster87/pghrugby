import type { Demo } from "../types"
import DialogSpecimens from "./specimens"

const dialogDemo: Demo = {
  id: "dialog",
  title: "Dialog",
  description:
    "The shared Dialog wrapper: trigger, overlay, panel, title, and close.",
  render: () => <DialogSpecimens />,
}

export default dialogDemo

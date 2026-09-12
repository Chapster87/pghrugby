import type { Demo } from "../types"
import ButtonSpecimens from "./specimens"

const buttonDemo: Demo = {
  id: "button",
  title: "Button",
  description:
    "The shared Button wrapper across variants, sizes, icon slots, and states.",
  render: () => <ButtonSpecimens />,
}

export default buttonDemo

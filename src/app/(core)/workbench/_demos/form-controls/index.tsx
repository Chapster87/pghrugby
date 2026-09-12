import type { Demo } from "../types"
import FormControlsSpecimens from "./specimens"

const formControlsDemo: Demo = {
  id: "form-controls",
  title: "Form controls",
  description:
    "Text fields, select, checkbox, radio, and switch — wrappers where built, raw Radix elsewhere.",
  render: () => <FormControlsSpecimens />,
}

export default formControlsDemo

import { ArrowRight, Pizza } from "lucide-react"

import Button from "@components/button"
import Specimen from "@components/showcase/specimen"

import type { Demo } from "../types"

/**
 * Specimens for the shared Button wrapper: every variant, size, icon slot, and
 * state the control exposes, so each can be exercised in isolation.
 */
function ButtonSpecimens() {
  return (
    <>
      <Specimen label="Variants">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
      </Specimen>

      <Specimen label="Sizes">
        <Button size="small">Small</Button>
        <Button size="default">Default</Button>
        <Button size="large">Large</Button>
      </Specimen>

      <Specimen label="Icon slots">
        <Button beforeText={<Pizza />}>Before</Button>
        <Button afterText={<ArrowRight />}>After</Button>
        <Button beforeText={<Pizza />} afterText={<ArrowRight />}>
          Both
        </Button>
      </Specimen>

      <Specimen label="States">
        <Button>Default</Button>
        <Button disabled>Disabled</Button>
        <Button isLoading>Loading</Button>
      </Specimen>

      <Specimen label="Unstyled">
        <Button unstyled>Unstyled button</Button>
      </Specimen>
    </>
  )
}

const buttonDemo: Demo = {
  id: "button",
  title: "Button",
  description:
    "The shared Button wrapper across variants, sizes, icon slots, and states.",
  render: () => <ButtonSpecimens />,
}

export default buttonDemo

import { Suspense } from "react"

import type { Demo } from "../types"
import CardSliderPrototype from "./specimens"

/**
 * PROTOTYPE — throwaway. UI variations of the homepage "Latest Content" slider,
 * including an image-less cut. See `specimens.tsx` for the question and the
 * variant list; switch with `?variant=` or the floating bar.
 */
const cardSliderHomeDemo: Demo = {
  id: "card-slider-home",
  title: "Homepage card slider (prototype)",
  description:
    "Throwaway UI prototype: four variants of the homepage Latest Content slider, incl. an image-less cut.",
  render: () => (
    <Suspense fallback={null}>
      <CardSliderPrototype />
    </Suspense>
  ),
}

export default cardSliderHomeDemo

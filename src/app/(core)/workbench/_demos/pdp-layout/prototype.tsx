"use client"

import clsx from "clsx"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FIXTURES, fixtureBySlug } from "./data"
import PdpLayout from "./pdp-layout"
import s from "./style.module.css"

/**
 * PROTOTYPE — the chosen PDP layout, retained as the implementation reference
 * from wayfinder ticket #62. Rendered against three fixtures via
 * `?product=<slug>`. Dev-only; no cart API, no DatoCMS.
 *
 * @returns The fixture toggle and the rendered layout.
 */
export default function PdpLayoutPrototype() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const product = fixtureBySlug(searchParams.get("product") ?? "") ?? FIXTURES[0]

  const setProduct = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("product", slug)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className={s.prototype}>
      <div className={s.toolbar}>
        <span className={s.toolbarLabel}>Fixture</span>
        <div className={s.toggle}>
          {FIXTURES.map((fixture) => (
            <button
              key={fixture.slug}
              type="button"
              className={clsx(
                s.toggleButton,
                fixture.slug === product.slug && s.toggleButtonActive
              )}
              aria-pressed={fixture.slug === product.slug}
              onClick={() => setProduct(fixture.slug)}
            >
              {fixture.shortLabel}
            </button>
          ))}
        </div>
        <p className={s.toolbarHint}>
          Direction B, refined: side-by-side buy box, DataCollector above the
          single add-to-cart, no bottom add-to-cart, tabbed description below.
          Switch fixtures to see the same format carry a collector-less ticket
          and a multi-primary variation.
        </p>
      </div>

      <PdpLayout key={product.slug} product={product} />
    </div>
  )
}

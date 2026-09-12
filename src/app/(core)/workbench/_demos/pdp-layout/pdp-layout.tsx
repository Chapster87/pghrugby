import { useRef, useState, type MouseEvent } from "react"
import clsx from "clsx"
import { ChevronLeft, ChevronRight } from "lucide-react"
import * as Tabs from "@radix-ui/react-tabs"

import Checkbox from "@components/checkbox"

import { money, type PdpFixture } from "./data"
import { usePdpSelection } from "./selection"
import {
  AddToCartButton,
  FieldInputs,
  LinePrice,
  Photo,
  PrimarySelect,
  QuantityStepper,
  SinglePrimaryLine,
  SoldOutBadge,
} from "./parts"
import s from "./style.module.css"

/**
 * PROTOTYPE — the chosen PDP layout (direction "side-by-side"), retained as the
 * reference for implementation. Side-by-side gallery + buy box above the fold, a
 * carousel for weak imagery, the DataCollector in the buy box above the single
 * add-to-cart button, and the bottom reserved for a tabbed description.
 *
 * @param props.product - The fixture to render.
 */
export default function PdpLayout({ product }: { product: PdpFixture }) {
  const sel = usePdpSelection(product)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [tab, setTab] = useState("description")
  const descriptionRef = useRef<HTMLDivElement>(null)
  const photos = product.photos

  const step = (delta: number) =>
    setPhotoIndex((index) => (index + delta + photos.length) % photos.length)

  const goToDescription = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    setTab("description")
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    descriptionRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    })
  }

  return (
    <div className={s.pdpB}>
      <div className={s.topB}>
        <div className={s.carouselB}>
          <Photo
            photo={photos[photoIndex]}
            tone={photoIndex}
            className={s.carouselImageB}
          />
          {photos.length > 1 && (
            <>
              <button
                type="button"
                className={clsx(s.carouselNavB, s.carouselPrevB)}
                onClick={() => step(-1)}
                aria-label="Previous photo"
              >
                <ChevronLeft size={24} aria-hidden />
              </button>
              <button
                type="button"
                className={clsx(s.carouselNavB, s.carouselNextB)}
                onClick={() => step(1)}
                aria-label="Next photo"
              >
                <ChevronRight size={24} aria-hidden />
              </button>
              <div className={s.dotsB}>
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    type="button"
                    className={clsx(
                      s.dotB,
                      index === photoIndex && s.dotActiveB
                    )}
                    onClick={() => setPhotoIndex(index)}
                    aria-label={`Photo ${index + 1} of ${photos.length}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className={s.buyBoxB}>
          <header>
            <h1 className={s.title}>{product.title}</h1>
            <p className={s.tagline}>{product.tagline}</p>
            <p className={s.shortDescription}>{product.shortDescription}</p>
            <a
              href="#pdp-full-description"
              className={s.descriptionLink}
              onClick={goToDescription}
            >
              Read the full description
              <span aria-hidden className={s.descriptionLinkArrow}>
                ↓
              </span>
            </a>
          </header>

          {product.primaries.length === 1 ? (
            <SinglePrimaryLine
              line={product.primaries[0]}
              qty={sel.primaryQty}
              setQty={sel.setPrimaryQty}
            />
          ) : (
            <>
              <PrimarySelect
                primaries={product.primaries}
                value={sel.primaryId}
                onChange={sel.setPrimaryId}
                label="Division"
                idPrefix="pdp"
              />
              {sel.primary && (
                <SinglePrimaryLine
                  line={sel.primary}
                  qty={sel.primaryQty}
                  setQty={sel.setPrimaryQty}
                />
              )}
            </>
          )}

          {product.addons.length > 0 && (
            <div className={s.addonsB}>
              <span className={s.miniLabel}>Add-ons</span>
              {product.addons.map((line) => {
                const state = sel.addons[line.id]
                return (
                  <div
                    key={line.id}
                    className={clsx(s.addonRowB, !line.inStock && s.lineDisabled)}
                  >
                    <Checkbox.Label className={s.addonLabelB}>
                      <Checkbox.Root
                        checked={state?.selected ?? false}
                        onCheckedChange={(checked) =>
                          sel.setAddon(line.id, checked === true)
                        }
                        disabled={!line.inStock}
                      >
                        <Checkbox.Indicator />
                      </Checkbox.Root>
                      <span className={s.lineName}>{line.label}</span>
                    </Checkbox.Label>
                    {line.inStock ? (
                      <LinePrice line={line} />
                    ) : (
                      <SoldOutBadge />
                    )}
                    {line.inStock &&
                      state?.selected &&
                      line.quantityBearing && (
                        <QuantityStepper
                          qty={state.qty}
                          setQty={(qty) => sel.setAddonQty(line.id, qty)}
                        />
                      )}
                  </div>
                )
              })}
            </div>
          )}

          {product.fields.length > 0 && (
            <div className={s.buyBlock}>
              <span className={s.miniLabel}>Registration details</span>
              <FieldInputs
                fields={product.fields}
                values={sel.values}
                setValue={sel.setValue}
                repeatables={sel.repeatables}
                setRepeatableRow={sel.setRepeatableRow}
                addRepeatableRow={sel.addRepeatableRow}
                removeRepeatableRow={sel.removeRepeatableRow}
                idPrefix="pdp"
              />
            </div>
          )}

          <div className={s.totalRow}>
            <span>Total</span>
            <span>{money(sel.total)}</span>
          </div>
          <AddToCartButton
            size="large"
            disabled={sel.lines.length === 0}
            lineCount={sel.lines.length}
          />
        </div>
      </div>

      <div
        ref={descriptionRef}
        id="pdp-full-description"
        className={s.descriptionAnchor}
      >
        <Tabs.Root value={tab} onValueChange={setTab} className={s.tabs}>
          <Tabs.List className={s.tabList} aria-label="Event details">
            <Tabs.Trigger value="description" className={s.tabTrigger}>
              Description
            </Tabs.Trigger>
            <Tabs.Trigger value="includes" className={s.tabTrigger}>
              Includes
            </Tabs.Trigger>
            <Tabs.Trigger value="good-to-know" className={s.tabTrigger}>
              Good to know
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="description" className={s.tabPanel}>
            <p className={s.description}>{product.description}</p>
          </Tabs.Content>
          <Tabs.Content value="includes" className={s.tabPanel}>
            <ul className={s.includesList}>
              {product.includes.map((item) => (
                <li key={item} className={s.includesItem}>
                  {item}
                </li>
              ))}
            </ul>
          </Tabs.Content>
          <Tabs.Content value="good-to-know" className={s.tabPanel}>
            <p className={s.description}>{product.goodToKnow}</p>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  )
}

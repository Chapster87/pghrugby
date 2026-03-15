"use client"

import * as Popover from "@radix-ui/react-popover"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import Thumbnail from "@modules/products/components/thumbnail"
import Link from "@components/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import s from "./style.module.css"

const MiniCart = ({
  cart: cartState,
}: {
  cart?: HttpTypes.StoreCart | null
}) => {
  const [activeTimer, setActiveTimer] = useState<NodeJS.Timeout | null>(null)
  const [cartDropdownOpen, setCartDropdownOpen] = useState(false)

  const open = () => setCartDropdownOpen(true)
  const close = () => setCartDropdownOpen(false)

  const totalItems =
    cartState?.items?.reduce((acc, item) => {
      return acc + item.quantity
    }, 0) || 0

  const subtotal = cartState?.subtotal ?? 0
  const itemRef = useRef<number>(totalItems || 0)

  const timedOpen = () => {
    open()
    const timer = setTimeout(close, 5000)
    setActiveTimer(timer)
  }

  const openAndCancel = () => {
    if (activeTimer) {
      clearTimeout(activeTimer)
      setActiveTimer(null)
    }
    open()
  }

  useEffect(() => {
    return () => {
      if (activeTimer) {
        clearTimeout(activeTimer)
      }
    }
  }, [activeTimer])

  const pathname = usePathname()

  useEffect(() => {
    if (itemRef.current !== totalItems && !pathname.includes("/cart")) {
      timedOpen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalItems, itemRef.current])

  return (
    <div className={s.container}>
      <Popover.Root open={cartDropdownOpen} onOpenChange={setCartDropdownOpen}>
        <Popover.Trigger asChild>
          <button
            className={s.trigger}
            onMouseEnter={openAndCancel}
            onMouseLeave={close}
          >
            <Link
              href="/cart"
              data-testid="nav-cart-link"
              className={s.link}
            >{`Cart (${totalItems})`}</Link>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className={`${s.slideDownAndFade} ${s.content}`}
            data-testid="nav-cart-dropdown"
            onMouseEnter={openAndCancel}
            onMouseLeave={close}
            sideOffset={0}
            align="end"
          >
            <div className={s.header}>
              <h3 className={s.title}>Cart</h3>
            </div>
            {cartState && cartState.items?.length ? (
              <>
                <div className={s.items}>
                  {cartState.items
                    .sort((a, b) => {
                      return (a.created_at ?? "") > (b.created_at ?? "")
                        ? -1
                        : 1
                    })
                    .map((item) => (
                      <div
                        className={s.item}
                        key={item.id}
                        data-testid="cart-item"
                      >
                        <Link
                          href={`/product/${item.product_handle}`}
                          className={s.itemThumbnail}
                        >
                          <Thumbnail
                            thumbnail={item.thumbnail}
                            images={item.variant?.product?.images}
                            size="square"
                          />
                        </Link>
                        <div className={s.itemContent}>
                          <div className={s.itemHeader}>
                            <div className={s.itemInfo}>
                              <div className={s.itemDetails}>
                                <h3 className={s.itemTitle}>
                                  <Link
                                    href={`/product/${item.product_handle}`}
                                    data-testid="product-link"
                                  >
                                    {item.title}
                                  </Link>
                                </h3>
                                <LineItemOptions
                                  variant={item.variant}
                                  data-testid="cart-item-variant"
                                  data-value={item.variant}
                                />
                                <span
                                  data-testid="cart-item-quantity"
                                  data-value={item.quantity}
                                >
                                  Quantity: {item.quantity}
                                </span>
                              </div>
                              <div className={s.itemPrice}>
                                <LineItemPrice
                                  item={item}
                                  style="tight"
                                  currencyCode={cartState.currency_code}
                                />
                              </div>
                            </div>
                          </div>
                          <DeleteButton
                            id={item.id}
                            className={s.itemRemove}
                            data-testid="cart-item-remove-button"
                          >
                            Remove
                          </DeleteButton>
                        </div>
                      </div>
                    ))}
                </div>
                <div className={s.footer}>
                  <div className={s.subtotal}>
                    <span className={s.subtotalLabel}>
                      Subtotal{" "}
                      <span className={s.subtotalTax}>(excl. taxes)</span>
                    </span>
                    <span
                      className={s.subtotalValue}
                      data-testid="cart-subtotal"
                      data-value={subtotal}
                    >
                      {convertToLocale({
                        amount: subtotal,
                        currency_code: cartState.currency_code,
                      })}
                    </span>
                  </div>
                  <Link href="/cart">
                    <Button
                      className={s.goToCartButton}
                      size="large"
                      data-testid="go-to-cart-button"
                    >
                      Go to cart
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div>
                <div className={s.empty}>
                  <div className={s.emptyIcon}>
                    <span>0</span>
                  </div>
                  <span>Your shopping bag is empty.</span>
                  <div>
                    <Link href="/store">
                      <>
                        <span className={s.srOnly}>
                          Go to all products page
                        </span>
                        <Button onClick={close}>Explore products</Button>
                      </>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}

export default MiniCart
"use client"

import { useCallback, useState } from "react"

import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js"

import Button from "@components/button"
import Dialog from "@components/dialog"
import { stripePromise } from "@/lib/checkout/stripe-client"

import type { PdpAnyAmount } from "../../_data/types"
import s from "./style.module.css"

/**
 * The line that says the donation is not part of the cart. Stated twice — beside
 * the CTA and again inside the dialog — because both are the moment the buyer
 * commits, so it lives here rather than repeating as a literal.
 */
const SEPARATE_PAYMENT_NOTE =
  "This donation goes through on its own — your cart is not included."

/**
 * The Donate page's standalone pay-what-you-want affordance.
 *
 * A distinct control beside the preset ladder — never a cart primary and never a
 * cart line. Clicking it opens **its own** Checkout Session (a sole-line
 * `custom_unit_amount` Price, quantity 1, no discounts), mounted in a dialog
 * here. The browser cart is never read, written, or cleared, so it proceeds
 * whether or not the cart holds anything, and the buyer can check the cart out
 * afterwards (`docs/agents/donations-in-mixed-carts.md` § 3).
 *
 * The session is built server-side by
 * `POST /api/checkout/donations/any-amount`; the secret is fetched here and
 * passed as `clientSecret` rather than through `options.fetchClientSecret`,
 * because a failure has to be shown to the buyer and that callback has no error
 * surface of its own.
 *
 * A client component because it mounts Stripe.js. It receives no credential —
 * the amount input, and the Price it is captured against, stay inside Stripe.
 */
export default function AnyAmountDonation({
  offering,
}: {
  offering: PdpAnyAmount
}) {
  const [open, setOpen] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const start = useCallback(async () => {
    setStarting(true)
    setProblem(null)
    try {
      const res = await fetch("/api/checkout/donations/any-amount", {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) {
        setProblem(data.error ?? "Could not start the donation checkout")
        return
      }
      setClientSecret(data.clientSecret)
    } catch {
      setProblem("Network error starting the donation checkout")
    } finally {
      setStarting(false)
    }
  }, [])

  // The session is created on first open, not on render: a page view must not
  // mint a Checkout Session, and a re-open reuses the one already built.
  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next && !clientSecret && !starting) void start()
  }

  return (
    <section className={s.block} aria-label="Give any amount">
      <div className={s.head}>
        <span className={s.title}>{offering.label}</span>
        <p className={s.note}>{SEPARATE_PAYMENT_NOTE}</p>
      </div>

      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Trigger asChild>
          <Button
            variant="secondary"
            size="large"
            className={s.button}
            disabled={!offering.available}
          >
            Give any amount
          </Button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content className={s.dialog}>
            <Dialog.Title className={s.dialogTitle}>
              {offering.label}
            </Dialog.Title>
            <Dialog.Description className={s.dialogNote}>
              {SEPARATE_PAYMENT_NOTE}
            </Dialog.Description>
            <Dialog.Close />

            {!stripePromise ? (
              <p className={s.problem}>
                Stripe is not configured — set
                NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your environment.
              </p>
            ) : problem ? (
              <div className={s.problemBlock}>
                <p className={s.problem}>{problem}</p>
                <Button variant="secondary" size="small" onClick={start}>
                  Try again
                </Button>
              </div>
            ) : starting || !clientSecret ? (
              <p className={s.hint}>Loading checkout…</p>
            ) : (
              <div className={s.frame}>
                <EmbeddedCheckoutProvider
                  stripe={stripePromise}
                  options={{ clientSecret }}
                >
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {!offering.available && (
        <p className={s.note}>
          Any-amount giving isn’t available right now — use the presets above.
        </p>
      )}
    </section>
  )
}

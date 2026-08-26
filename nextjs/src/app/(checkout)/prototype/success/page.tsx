import { Suspense } from "react"

import {
  ORDER_STATES,
  VariantA,
  VariantB,
  VariantC,
  type OrderState,
} from "./variants"
import { PrototypeSwitcher } from "./prototype-switcher"

import s from "./styles.module.css"

/**
 * PROTOTYPE — throwaway route (/prototype/success) for the Stripe edge-cases
 * return-page states. Three layout variants of /checkout/success, switchable
 * via ?variant=A|B|C, driven through the (session_status, payment_status)
 * combinations the deferred events produce via ?state=. Delete this route once
 * a variant wins and fold it into the real /checkout/success page.
 *
 * The variants render fixture data — the real page keeps its DB read via
 * getOrder/recordOrder.
 */

export default async function PrototypeSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string; state?: string }>
}) {
  const params = await searchParams
  const variant = (params.variant ?? "A").toUpperCase()
  const state = ORDER_STATES.includes(params.state as OrderState)
    ? (params.state as OrderState)
    : "paid"

  return (
    <>
      <div className={s.innerBody}>
        {variant === "A" && <VariantA state={state} />}
        {variant === "B" && <VariantB state={state} />}
        {variant === "C" && <VariantC state={state} />}
      </div>

      {process.env.NODE_ENV !== "production" && (
        <Suspense fallback={null}>
          <PrototypeSwitcher variant={variant} state={state} />
        </Suspense>
      )}
    </>
  )
}

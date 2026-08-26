import type { OrderRecord } from "./record-order"

/**
 * Return-page state machine, lifted from the Stripe edge-cases prototype
 * (`src/lib/prototype-events/events-logic.ts`). Maps an order row to what
 * /checkout/success should show — branched on session status first, then
 * payment_status (per the locked design: paid/refunded → confirmed,
 * open → not completed, expired → expired view, missing row → not found).
 */

export type ReturnState =
  | "confirmed"
  | "refunded"
  | "partial-refunded"
  | "processing"
  | "unpaid"
  | "expired"
  | "not-completed"
  | "not-found"

export type ReturnTone = "success" | "warning" | "danger" | "info" | "neutral"

/** Icon key for the renderer; the page maps it to a lucide component. */
export type ReturnIcon =
  | "check"
  | "clock"
  | "x-circle"
  | "alert-triangle"
  | "alert-circle"
  | "rotate-ccw"
  | "search-x"

export type ReturnView = {
  state: ReturnState
  /** Short status label for the order receipt's status row. */
  label: string
  heading: string
  message: string
  tone: ReturnTone
  icon: ReturnIcon
  ctaLabel: string
  ctaHref: string
}

/** The view for an order row — or the not-found view when there is no row. */
export function returnPageView(order: OrderRecord | null): ReturnView {
  if (!order) {
    return {
      state: "not-found",
      label: "Not found",
      heading: "Order not found",
      message:
        "We couldn't find an order for that session. Check your email for a confirmation, or try again.",
      tone: "neutral",
      icon: "search-x",
      ctaLabel: "Back to cart",
      ctaHref: "/cart",
    }
  }

  const { session_status, payment_status, refund_status } = order

  if (session_status !== "complete") {
    if (session_status === "expired") {
      return {
        state: "expired",
        label: "Expired",
        heading: "Checkout session expired",
        message:
          "The checkout session expired before payment was completed. Build the cart again and try once more.",
        tone: "danger",
        icon: "alert-triangle",
        ctaLabel: "Back to cart",
        ctaHref: "/cart",
      }
    }
    return {
      state: "not-completed",
      label: "Not completed",
      heading: "Payment not completed",
      message: `Session status is “${session_status}” (payment status: ${payment_status}). The payment did not finish — go back and try again.`,
      tone: "warning",
      icon: "alert-circle",
      ctaLabel: "Back to cart",
      ctaHref: "/cart",
    }
  }

  switch (payment_status) {
    case "paid":
      if (refund_status === "refunded" || refund_status === "partial") {
        return {
          state: refund_status === "refunded" ? "refunded" : "partial-refunded",
          label: refund_status === "refunded" ? "Refunded" : "Partially refunded",
          heading: "Order refunded",
          message: `This order was refunded ${
            refund_status === "refunded" ? "in full" : "partially"
          }. Check the Stripe Dashboard or your email for details.`,
          tone: "neutral",
          icon: "rotate-ccw",
          ctaLabel: "Back to the club site",
          ctaHref: "/",
        }
      }
      return {
        state: "confirmed",
        label: "Paid",
        heading: "Thank you — order confirmed",
        message:
          "Your payment went through. A confirmation is on its way to your email.",
        tone: "success",
        icon: "check",
        ctaLabel: "Back to the club site",
        ctaHref: "/",
      }
    case "processing":
      // Today's page showed "order confirmed" here — wrong for delayed methods.
      return {
        state: "processing",
        label: "Processing",
        heading: "Payment received — confirming",
        message:
          "Your payment is processing and will confirm shortly — bank transfers can take 1–3 business days. You'll get an email when it lands.",
        tone: "info",
        icon: "clock",
        ctaLabel: "Back to the club site",
        ctaHref: "/",
      }
    case "no_payment_required":
      return {
        state: "confirmed",
        label: "No payment required",
        heading: "Thank you — order confirmed",
        message: "No payment was required for this order.",
        tone: "success",
        icon: "check",
        ctaLabel: "Back to the club site",
        ctaHref: "/",
      }
    case "unpaid":
      return {
        state: "unpaid",
        label: "Unpaid",
        heading: "Payment failed",
        message:
          "The delayed payment didn't complete after checkout. Please try again.",
        tone: "danger",
        icon: "x-circle",
        ctaLabel: "Try again from the cart",
        ctaHref: "/cart",
      }
    default:
      return {
        state: "not-completed",
        label: "Not completed",
        heading: "Payment not completed",
        message: `Session status is “${session_status}” (payment status: ${payment_status}).`,
        tone: "warning",
        icon: "alert-circle",
        ctaLabel: "Back to cart",
        ctaHref: "/cart",
      }
  }
}

import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import { HttpTypes } from "@medusajs/types"
import Addresses from "@modules/checkout/components/addresses"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"
import Shipping from "@modules/checkout/components/shipping"

export default async function CheckoutForm({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) {
  if (!cart) {
    return null
  }

  // Only fetch shipping methods if cart has a shipping address
  // Medusa requires the shipping address to determine available options based on service zones
  const shippingMethods = cart.shipping_address
    ? await listCartShippingMethods(cart.id)
    : null

  const paymentMethods = await listCartPaymentMethods(cart.region?.id ?? "")

  return (
    <div className="w-full grid grid-cols-1 gap-y-8">
      <Addresses cart={cart} customer={customer} />

      {shippingMethods && shippingMethods.length > 0 && (
        <Shipping cart={cart} availableShippingMethods={shippingMethods} />
      )}

      {paymentMethods && paymentMethods.length > 0 && (
        <Payment cart={cart} availablePaymentMethods={paymentMethods} />
      )}

      <Review cart={cart} />
    </div>
  )
}

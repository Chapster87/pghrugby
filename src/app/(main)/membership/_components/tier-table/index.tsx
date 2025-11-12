import Text from "@/components/typography/text"
import * as Form from "@radix-ui/react-form"
import VenmoDialog from "../venmo-dialog"
import s from "./style.module.css"

export default function TierTable({
  hostedBtnId,
  tierName,
  annualDonation,
  benefits,
  subscriptions,
}: {
  hostedBtnId: string
  tierName?: string
  annualDonation?: string
  benefits?: string[]
  subscriptions?: { label: string; value: string }[]
}) {
  return (
    <table className={`${s.membershipTable}`}>
      <thead>
        <tr>
          <th colSpan={3}>
            <Text>{tierName}</Text>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr className={s.tierRow}>
          <td className={`${s.tierCell} ${s.annualDonation}`}>
            <Text>
              <strong>Annual Donation:</strong>
              <br />
              {annualDonation}
            </Text>
          </td>
          <td className={`${s.tierCell} ${s.benefits}`}>
            <Text>
              <strong>Benefits:</strong>
            </Text>
            <ul>
              {benefits &&
                benefits.map((benefit, index) => (
                  <li key={index}>
                    <Text>{benefit}</Text>
                  </li>
                ))}
            </ul>
          </td>
          <td align="center" className={`${s.tierCell} ${s.paymentOptions}`}>
            <Form.Root
              action="https://www.paypal.com/cgi-bin/webscr"
              method="post"
              target="_top"
              className={`FormRoot ${s.paypalForm}`}
            >
              <input name="cmd" type="hidden" value="_s-xclick" />
              <input
                name="hosted_button_id"
                type="hidden"
                value={hostedBtnId}
              />
              <input name="on0" type="hidden" value={tierName} />
              <div className={s.tierLabel}>
                <strong>{tierName}</strong>
              </div>
              <div className={s.paypalSubPicker}>
                {Array.isArray(subscriptions) && (
                  <Form.Field
                    name="sub-tier"
                    className={`FormField ${s.subSelect}`}
                  >
                    <Form.Control asChild>
                      <select name="os0" className="FormSelect">
                        {subscriptions.map((sub, index) => (
                          <option key={index} value={sub.value}>
                            {sub.label}
                          </option>
                        ))}
                      </select>
                    </Form.Control>
                  </Form.Field>
                )}
              </div>
              <input name="currency_code" type="hidden" value="USD" />
              <input
                className={s.paypalButton}
                alt="PayPal - The safer, easier way to pay online!"
                name="submit"
                src="/images/venmo/donate-paypal.webp"
                type="image"
              />
              <img
                src="https://www.paypalobjects.com/en_US/i/scr/pixel.gif"
                alt=""
                width="1"
                height="1"
              />
            </Form.Root>
            <div className="w-100 text-center">
              <span className="">OR</span>
            </div>
            <VenmoDialog />
          </td>
        </tr>
      </tbody>
    </table>
  )
}

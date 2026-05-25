import { HttpTypes } from "@medusajs/types"
import s from "./style.module.css"

type LineItemOptionsProps = {
  variant: HttpTypes.StoreProductVariant | undefined
  "data-testid"?: string
  "data-value"?: HttpTypes.StoreProductVariant
}

const LineItemOptions = ({
  variant,
  "data-testid": dataTestid,
  "data-value": dataValue,
}: LineItemOptionsProps) => {
  return (
    <span data-testid={dataTestid} data-value={dataValue} className={s.options}>
      Variant: {variant?.title}
    </span>
  )
}

export default LineItemOptions

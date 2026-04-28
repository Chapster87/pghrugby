import Text from "@/components/typography/text"
import lineStyles from "../line-item/styles.module.css"
import s from "./styles.module.css"

const SkeletonLineItem = () => {
  return (
    <tr>
      <td>
        <div className={lineStyles.itemInfo}>
          <div className={`${lineStyles.itemImg} ${s.lineImg}`} />
          <div className={s.lineItemDetails}>
            <div className={`${lineStyles.itemTitle} ${s.lineTitle}`}>
              &nbsp;
            </div>
            <Text className={`${lineStyles.itemSubtitle} ${s.lineSubtitle}`}>
              &nbsp;
            </Text>
          </div>
        </div>
      </td>
      <td>
        <div className={s.center}>
          <div className={s.price} />
        </div>
      </td>
      <td>
        <div className={s.center}>
          <div className={s.quantityBox} />
        </div>
      </td>
      <td>
        <div className={s.center}>
          <div className={s.price} />
        </div>
      </td>
    </tr>
  )
}

export default SkeletonLineItem

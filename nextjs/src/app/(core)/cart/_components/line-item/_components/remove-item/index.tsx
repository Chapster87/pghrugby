import { deleteLineItem } from "@lib/data/cart"
import { Spinner } from "@medusajs/icons"
import { useState } from "react"
import Button from "@components/button"
import s from "./styles.module.css"
import { TrashIcon } from "lucide-react"

export default function RemoveItem({
  id,
  children,
}: {
  id: string
  children?: React.ReactNode
  className?: string
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    await deleteLineItem(id).catch((err) => {
      setIsDeleting(false)
    })
  }

  return (
    <div>
      <Button className={s.remove} onClick={() => handleDelete(id)} unstyled>
        <span className={s.icon}>
          {isDeleting ? (
            <Spinner className="animate-spin" />
          ) : (
            <TrashIcon size={18} />
          )}
        </span>
        <span>{children}</span>
      </Button>
    </div>
  )
}

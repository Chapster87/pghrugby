import { deleteLineItem } from "@lib/data/cart"
import { Spinner, Trash } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { useState } from "react"

import s from "./style.module.css"

const DeleteButton = ({
  id,
  children,
  className,
}: {
  id: string
  children?: React.ReactNode
  className?: string
}) => {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    await deleteLineItem(id).catch((err) => {
      setIsDeleting(false)
    })
  }

  return (
    <div className={clx(s.container, className)}>
      <button className={s.button} onClick={() => handleDelete(id)}>
        {isDeleting ? <Spinner className={s.spinner} /> : <Trash />}
        <span>{children}</span>
      </button>
    </div>
  )
}

export default DeleteButton

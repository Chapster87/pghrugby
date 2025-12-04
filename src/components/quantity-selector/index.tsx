"use client"

import React, { useRef } from "react"
import { Minus, Plus } from "lucide-react"
import Button from "@components/button"
import s from "./styles.module.css"

interface QuantitySelectorProps {
  quantity: number
  setQuantity:
    | React.Dispatch<React.SetStateAction<number>>
    | ((qty: number) => void)
  index?: number
  [x: string]: any
}

export default function QuantitySelector({
  quantity = 1,
  setQuantity,
  index,
  ...props
}: QuantitySelectorProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleIncrement = () => {
    if (inputRef.current) {
      inputRef.current.stepUp()
      setQuantity(Number(inputRef.current.value))
    }
  }

  const handleDecrement = () => {
    if (inputRef.current) {
      inputRef.current.stepDown()
      setQuantity(Number(inputRef.current.value))
    }
  }

  return (
    <div className={s.quantitySelector} {...props}>
      <Button
        className={`${s.button} ${s.decreaseBtn}`}
        variant="primary"
        onClick={handleDecrement}
      >
        <Minus />
      </Button>
      <input
        name={`${index !== undefined ? `quantity-${index}` : "quantity"}`}
        ref={inputRef}
        type="number"
        min="1"
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        className={`FormInput ${s.input}`}
      />
      <Button
        className={`${s.button} ${s.increaseBtn}`}
        variant="primary"
        onClick={handleIncrement}
      >
        <Plus />
      </Button>
    </div>
  )
}

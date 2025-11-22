"use client"

import React, { useRef } from "react"
import s from "./styles.module.css"

interface QuantityInputProps {
  quantity: number
  setQuantity: React.Dispatch<React.SetStateAction<number>>
}

const QuantityInput: React.FC<QuantityInputProps> = ({
  quantity,
  setQuantity,
}) => {
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
    <div className="flex items-center">
      <button
        onClick={handleDecrement}
        className="px-3 py-1 border border-gray-300 rounded-l-md"
      >
        -
      </button>
      <input
        ref={inputRef}
        type="number"
        min="1"
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        className={`w-12 text-center border-t border-b border-gray-300 ${s.input}`}
      />
      <button
        onClick={handleIncrement}
        className="px-3 py-1 border border-gray-300 rounded-r-md"
      >
        +
      </button>
    </div>
  )
}

export default QuantityInput

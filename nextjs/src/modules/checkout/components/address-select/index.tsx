import { Listbox, Transition } from "@headlessui/react"
import { ChevronUpDown } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { Fragment, useMemo } from "react"

import Radio from "@modules/common/components/radio"
import compareAddresses from "@lib/util/compare-addresses"
import { HttpTypes } from "@medusajs/types"

import s from "./style.module.css"

type AddressSelectProps = {
  addresses: HttpTypes.StoreCustomerAddress[]
  addressInput: HttpTypes.StoreCartAddress | null
  onSelect: (
    address: HttpTypes.StoreCartAddress | undefined,
    email?: string
  ) => void
}

const AddressSelect = ({
  addresses,
  addressInput,
  onSelect,
}: AddressSelectProps) => {
  const handleSelect = (id: string) => {
    const savedAddress = addresses.find((a) => a.id === id)
    if (savedAddress) {
      onSelect(savedAddress as HttpTypes.StoreCartAddress)
    }
  }

  const selectedAddress = useMemo(() => {
    return addresses.find((a) => compareAddresses(a, addressInput))
  }, [addresses, addressInput])

  return (
    <Listbox onChange={handleSelect} value={selectedAddress?.id}>
      <div className={s.container}>
        <Listbox.Button
          className={s.button}
          data-testid="shipping-address-select"
        >
          {({ open }) => (
            <>
              <span className={s.buttonText}>
                {selectedAddress
                  ? selectedAddress.address_1
                  : "Choose an address"}
              </span>
              <ChevronUpDown
                className={clx(s.chevron, {
                  [s.chevronOpen]: open,
                })}
              />
            </>
          )}
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options
            className={s.options}
            data-testid="shipping-address-options"
          >
            {addresses.map((address) => {
              return (
                <Listbox.Option
                  key={address.id}
                  value={address.id}
                  className={s.option}
                  data-testid="shipping-address-option"
                >
                  <div className={s.optionContent}>
                    <Radio
                      checked={selectedAddress?.id === address.id}
                      data-testid="shipping-address-radio"
                    />
                    <div className={s.optionInfo}>
                      <span className={s.optionName}>
                        {address.first_name} {address.last_name}
                      </span>
                      {address.company && (
                        <span className={s.optionCompany}>
                          {address.company}
                        </span>
                      )}
                      <div className={s.optionAddress}>
                        <span>
                          {address.address_1}
                          {address.address_2 && (
                            <span>, {address.address_2}</span>
                          )}
                        </span>
                        <span>
                          {address.postal_code}, {address.city}
                        </span>
                        <span>
                          {address.province && `${address.province}, `}
                          {address.country_code?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Listbox.Option>
              )
            })}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  )
}

export default AddressSelect

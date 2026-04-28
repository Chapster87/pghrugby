"use client"

import { useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import Button from "@/components/button"
import Text from "@/components/typography/text"
import Image from "next/image"
import { X } from "lucide-react"
import dialogStyles from "@/styles/components/dialog.module.css"
import s from "./style.module.css"

export default function VenmoDialog() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger>
        <Button unstyled>
          <Image
            className={s.venmoLogo}
            src="/images/venmo/venmo-logo.webp"
            alt="Pay With Venmo"
            width={400}
            height={100}
          />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={dialogStyles.overlay} />
        <Dialog.Content
          className={dialogStyles.content}
          style={{ maxWidth: 500 }}
        >
          <Dialog.Title className={dialogStyles.title}>
            How to Pay with Venmo
          </Dialog.Title>
          <Dialog.Close asChild>
            <Button aria-label="Close Dialog" className={dialogStyles.close}>
              <X />
            </Button>
          </Dialog.Close>
          <div className={dialogStyles.body}>
            <Text className={s.intro}>
              Follow these steps to pay with Venmo:
            </Text>
            <ol>
              <li>
                <div className="d-flex flex-column">
                  <p className="mb-2">
                    <a
                      className="link-secondary"
                      href="https://venmo.com/pghrugby"
                      target="_blank"
                    >
                      Open Venmo by clicking here
                    </a>
                    , or scanning the following QR code:
                  </p>
                  <div className={s.venmoQr}>
                    <a href="https://venmo.com/pghrugby" target="_blank">
                      <Image
                        className={s.venmoQrImg}
                        src="/images/venmo/venmo-qr.png"
                        alt="Venmo Logo"
                        width={300}
                        height={367}
                      />
                    </a>
                  </div>
                </div>
              </li>
              <li>Verify that @pghrugby is the recipient</li>
              <li>
                <div className="d-flex flex-column">
                  <p className="mb-2">
                    Enter the donation amount you wish to contribute and the
                    reason for payment: i.e.
                    <strong>Club Membership - Reward Tier</strong>
                  </p>
                  <div className={s.venmoAmount}>
                    <Image
                      className={s.venmoAmountImg}
                      src="/images/venmo/venmo-amount-and-desc.png"
                      alt="Venmo Payment Details"
                      width={500}
                      height={1083}
                    />
                  </div>
                </div>
              </li>
              <li>
                <div className="d-flex flex-column">
                  <p className="mb-2">
                    If you would like to make a recurring payment, tap the
                    "Schedule" button in the bottom left. Then choose a
                    frequency &amp; occurs date. Tap "Save" when finished.
                  </p>
                  <div className={s.venmoSchedule}>
                    <Image
                      className={s.venmoScheduleImg}
                      src="/images/venmo/venmo-schedule1.png"
                      alt="Venmo Schedule Payment"
                      width={500}
                      height={1083}
                    />
                    <Image
                      className={s.venmoScheduleImg}
                      src="/images/venmo/venmo-schedule2.png"
                      alt="Venmo Schedule Payment"
                      width={500}
                      height={1083}
                    />
                  </div>
                </div>
              </li>
              <li>Click "Pay" to complete the transaction</li>
            </ol>
            <div className={dialogStyles.footer}>
              <Dialog.Close asChild>
                <Button
                  aria-label="Close Dialog"
                  className={dialogStyles.closeBottom}
                >
                  Close
                </Button>
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

import { Dialog, Transition } from "@headlessui/react"
import React, { Fragment } from "react"

import s from "./style.module.css"

import { ModalProvider, useModal } from "@lib/context/modal-context"
import X from "@modules/common/icons/x"

type ModalProps = {
  isOpen: boolean
  close: () => void
  size?: "small" | "medium" | "large"
  search?: boolean
  children: React.ReactNode
  "data-testid"?: string
}

const Modal = ({
  isOpen,
  close,
  size = "medium",
  search = false,
  children,
  "data-testid": dataTestId,
}: ModalProps) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-75" onClose={close}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className={s.dialogOverlay} />
        </Transition.Child>

        <div className={s.modalContainer}>
          <div
            className={`${s.panelWrapper} ${
              !search ? s.panelWrapperCenter : s.panelWrapperStart
            }`}
          >
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                data-testid={dataTestId}
                className={`${s.dialogPanel} ${
                  size === "small"
                    ? s.dialogPanelSmall
                    : size === "medium"
                    ? s.dialogPanelMedium
                    : s.dialogPanelLarge
                } ${search ? s.dialogPanelTransparent : s.dialogPanelWhite}`}
              >
                <ModalProvider close={close}>{children}</ModalProvider>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

const Title: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { close } = useModal()

  return (
    <Dialog.Title className={s.titleWrapper}>
      <div className={s.titleText}>{children}</div>
      <div>
        <button onClick={close} data-testid="close-modal-button">
          <X size={20} />
        </button>
      </div>
    </Dialog.Title>
  )
}

const Description: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Dialog.Description className={s.descriptionWrapper}>
      {children}
    </Dialog.Description>
  )
}

const Body: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className={s.bodyWrapper}>{children}</div>
}

const Footer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className={s.footerWrapper}>{children}</div>
}

Modal.Title = Title
Modal.Description = Description
Modal.Body = Body
Modal.Footer = Footer

export default Modal

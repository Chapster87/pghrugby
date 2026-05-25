import { Disclosure } from "@headlessui/react"
import { Badge, Button } from "@medusajs/ui"
import { useEffect } from "react"
import clsx from "clsx"

import useToggleState from "@lib/hooks/use-toggle-state"
import { useFormStatus } from "react-dom"
import Text from "@/components/typography/text"

import s from "./style.module.css"

type AccountInfoProps = {
  label: string
  currentInfo: string | React.ReactNode
  isSuccess?: boolean
  isError?: boolean
  errorMessage?: string
  clearState: () => void
  children?: React.ReactNode
  "data-testid"?: string
}

const AccountInfo = ({
  label,
  currentInfo,
  isSuccess,
  isError,
  clearState,
  errorMessage = "An error occurred, please try again",
  children,
  "data-testid": dataTestid,
}: AccountInfoProps) => {
  const { state, close, toggle } = useToggleState()

  const { pending } = useFormStatus()

  const handleToggle = () => {
    clearState()
    setTimeout(() => toggle(), 100)
  }

  useEffect(() => {
    if (isSuccess) {
      close()
    }
  }, [isSuccess, close])

  return (
    <div className={s.infoWrapper} data-testid={dataTestid}>
      <div className={s.header}>
        <div className={s.currentInfo}>
          <Text size="sm" className={s.label}>
            {label}
          </Text>
          <div className={s.contentWrapper}>
            {typeof currentInfo === "string" ? (
              <Text className="font-semibold" data-testid="current-info">
                {currentInfo}
              </Text>
            ) : (
              currentInfo
            )}
          </div>
        </div>
        <div>
          <Button
            variant="secondary"
            className={s.editButton}
            onClick={handleToggle}
            type={state ? "reset" : "button"}
            data-testid="edit-button"
            data-active={state}
          >
            {state ? "Cancel" : "Edit"}
          </Button>
        </div>
      </div>

      {/* Success state */}
      <Disclosure>
        <Disclosure.Panel
          static
          className={clsx(s.contentWrapper, {
            [s.statusMessage]: true,
            "max-h-[1000px] opacity-100": isSuccess,
            "max-h-0 opacity-0": !isSuccess,
          })}
          data-testid="success-message"
        >
          <Badge className="p-2 my-4" color="green">
            <span>{label} updated succesfully</span>
          </Badge>
        </Disclosure.Panel>
      </Disclosure>

      {/* Error state  */}
      <Disclosure>
        <Disclosure.Panel
          static
          className={clsx(s.contentWrapper, {
            [s.statusMessage]: true,
            "max-h-[1000px] opacity-100": isError,
            "max-h-0 opacity-0": !isError,
          })}
          data-testid="error-message"
        >
          <Badge className="p-2 my-4" color="red">
            <span>{errorMessage}</span>
          </Badge>
        </Disclosure.Panel>
      </Disclosure>

      <Disclosure>
        <Disclosure.Panel
          static
          className={clsx(s.contentWrapper, {
            "max-h-[1000px] opacity-100": state,
            "max-h-0 opacity-0": !state,
          })}
        >
          <div className={s.editArea}>
            <div>{children}</div>
            <div className={s.buttonGroup}>
              <Button
                isLoading={pending}
                className={s.saveButton}
                type="submit"
                data-testid="save-button"
              >
                Save changes
              </Button>
            </div>
          </div>
        </Disclosure.Panel>
      </Disclosure>
    </div>
  )
}

export default AccountInfo

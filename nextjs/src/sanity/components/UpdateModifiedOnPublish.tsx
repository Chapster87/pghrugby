import {
  useDocumentOperation,
  DocumentActionComponent,
  DocumentActionProps,
} from "sanity"
import { FaPenFancy } from "react-icons/fa6"

export const UpdateModifiedOnPublish: DocumentActionComponent = (
  props: DocumentActionProps
) => {
  const { id, type } = props
  const { patch, publish } = useDocumentOperation(id, type)
  return {
    label: "Publish",
    icon: FaPenFancy,
    onHandle: () => {
      patch.execute([{ set: { modified: new Date().toISOString() } }])
      publish.execute()
    },
    disabled: !!publish.disabled,
  }
}

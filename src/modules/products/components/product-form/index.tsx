import { useEffect, useState } from "react"
import { client } from "@/sanity/client"
import { Form, Input } from "@heroui/react"
import NativeSelect from "@modules/common/components/native-select"
import CheckboxWithLabel from "@modules/common/components/checkbox"

type FormProps = {
  productId: string
  meta: {
    [key: string]: { value: string }
  }
  changeForm: React.ChangeEventHandler<HTMLInputElement>
  setFormValid?: (valid: boolean) => void
}

export default function ProductForm({
  productId,
  meta,
  changeForm,
  setFormValid,
}: FormProps) {
  const [form, setForm] = useState<any>(null)

  useEffect(() => {
    async function fetchForm() {
      // Fetch the product with the form reference
      const product = await client.fetch(
        `*[_type == "product" && _id == $id][0]{form->{_id, title, formFields}}`,
        { id: productId }
      )
      setForm(product?.form)
    }
    fetchForm()
  }, [productId])

  // Validate required fields
  useEffect(() => {
    if (!form || !form.formFields || form.formFields.length === 0) {
      setFormValid?.(true)
      return
    }
    const valid = form.formFields.every((field: any) => {
      if (!field.required) return true
      const value = meta?.[field.fieldName]?.value
      if (field.fieldType === "checkbox") {
        return !!value
      }
      return typeof value === "string" && value.trim() !== ""
    })
    setFormValid?.(valid)
  }, [form, meta, setFormValid])

  if (!form) return null

  // Handler for select fields
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    changeForm(e as unknown as React.ChangeEvent<HTMLInputElement>)
  }

  // Handler for checkbox fields
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    changeForm(e)
  }

  return (
    <Form className="w-full max-w-xs">
      <h3 className="font-bold mb-2">{form.title}</h3>
      {form.formFields?.map((field: any, idx: number) => {
        const fieldValue = meta?.[field.fieldName]?.value
        const placeholder = field.placeholder?.trim() || `Enter ${field.label}`
        switch (field.fieldType) {
          case "text":
          case "email":
            return (
              <Input
                key={idx}
                className="w-full mb-4"
                type={field.fieldType}
                name={field.fieldName}
                label={field.label}
                title={field.label}
                placeholder={placeholder}
                isRequired={field.required}
                errorMessage={
                  field.required
                    ? `Please enter ${field.label.toLowerCase()}`
                    : undefined
                }
                labelPlacement="outside"
                value={typeof fieldValue === "string" ? fieldValue : ""}
                onChange={changeForm}
              />
            )
          case "textarea":
            return (
              <div key={idx} className="mb-2">
                <Input
                  as="textarea"
                  name={field.fieldName}
                  label={field.label}
                  title={field.label}
                  placeholder={placeholder}
                  isRequired={field.required}
                  errorMessage={
                    field.required
                      ? `Please enter ${field.label.toLowerCase()}`
                      : undefined
                  }
                  labelPlacement="outside"
                  className="w-full"
                  value={typeof fieldValue === "string" ? fieldValue : ""}
                  onChange={changeForm}
                />
              </div>
            )
          case "select":
            return (
              <div key={idx} className="mb-2">
                <NativeSelect
                  name={field.fieldName}
                  required={field.required}
                  className="w-full"
                  placeholder={`Select ${field.label}`}
                  value={typeof fieldValue === "string" ? fieldValue : ""}
                  onChange={handleSelectChange}
                >
                  {field.options?.map((opt: string, i: number) => (
                    <option key={i} value={opt}>
                      {opt}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )
          case "checkbox":
            return (
              <div key={idx} className="mb-2">
                <CheckboxWithLabel
                  name={field.fieldName}
                  label={field.label}
                  checked={!!fieldValue}
                  onChange={() => {
                    const syntheticEvent = {
                      target: {
                        name: field.fieldName,
                        type: "checkbox",
                        checked: !fieldValue,
                        value: !fieldValue,
                      },
                    } as unknown as React.ChangeEvent<HTMLInputElement>
                    changeForm(syntheticEvent)
                  }}
                />
              </div>
            )
          default:
            return null
        }
      })}
      {/* Add a submit button or handler as needed */}
    </Form>
  )
}

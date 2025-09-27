import * as Form from "@radix-ui/react-form"

type GolfOutingFormProps = {
  meta: {
    [key: string]: { value: string }
  }
  changeForm: React.ChangeEventHandler<HTMLInputElement>
}

export default function GolfOutingForm({
  meta,
  changeForm,
}: GolfOutingFormProps) {
  return (
    <Form.Root className="w-full max-w-xs">
      <Form.Field name="email" className="mb-4">
        <div className="flex justify-between">
          <Form.Label className="font-medium text-sm">Contact Email</Form.Label>
          <Form.Message match="valueMissing" className="text-red-500 text-xs">
            Please enter a contact email
          </Form.Message>
        </div>
        <Form.Control asChild>
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            required
            value={meta?.email?.value || ""}
            onChange={changeForm}
            className="w-full border rounded px-2 py-1"
          />
        </Form.Control>
      </Form.Field>
      {["name_captain", "name_player_2", "name_player_3", "name_player_4"].map(
        (fieldName, index) => (
          <Form.Field key={fieldName} name={fieldName} className="mb-4">
            <div className="flex justify-between">
              <Form.Label className="font-medium text-sm">
                {fieldName
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (char) => char.toUpperCase())}
              </Form.Label>
              <Form.Message
                match="valueMissing"
                className="text-red-500 text-xs"
              >
                Please enter {fieldName.replace(/_/g, " ")}
              </Form.Message>
            </div>
            <Form.Control asChild>
              <input
                type="text"
                name={fieldName}
                placeholder={`Enter ${fieldName.replace(/_/g, " ")}`}
                required
                value={meta?.[fieldName]?.value || ""}
                onChange={changeForm}
                className="w-full border rounded px-2 py-1"
              />
            </Form.Control>
          </Form.Field>
        )
      )}
    </Form.Root>
  )
}

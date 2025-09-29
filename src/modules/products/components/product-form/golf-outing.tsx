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
    <Form.Root className="FormRoot">
      <Form.Field name="email" className="FormField">
        <div className="flex justify-between">
          <Form.Label className="FormLabel">Contact Email</Form.Label>
          <Form.Message match="valueMissing" className="FormMessage">
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
            className="FormInput"
          />
        </Form.Control>
      </Form.Field>
      {["name_captain", "name_player_2", "name_player_3", "name_player_4"].map(
        (fieldName, index) => (
          <Form.Field key={fieldName} name={fieldName} className="FormField">
            <div className="flex justify-between">
              <Form.Label className="FormLabel">
                {fieldName
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (char) => char.toUpperCase())}
              </Form.Label>
              <Form.Message match="valueMissing" className="FormMessage">
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
                className="FormInput"
              />
            </Form.Control>
          </Form.Field>
        )
      )}
    </Form.Root>
  )
}

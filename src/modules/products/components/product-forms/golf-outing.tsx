import { Form } from "radix-ui"

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
      <Form.Field className="FormField mb-4" name="email">
        <div className={`flex items-baseline justify-between`}>
          <Form.Label className="FormLabel mb-3">Contact Email</Form.Label>
          <Form.Message className="FormMessage" match="valueMissing">
            Please enter a contact email
          </Form.Message>
        </div>
        <Form.Control asChild>
          <input
            className={`border border-gray-300 rounded-md p-2 w-full`}
            type="email"
            name="email"
            title="Contact Email"
            value={meta?.email?.value || ""}
            required
            onChange={changeForm}
          />
        </Form.Control>
      </Form.Field>
      <Form.Field className="FormField mb-4" name="name_captain">
        <div className={`flex items-baseline justify-between`}>
          <Form.Label className="FormLabel mb-3">Captain Name</Form.Label>
          <Form.Message className="FormMessage" match="valueMissing">
            Please enter captain's name
          </Form.Message>
        </div>
        <Form.Control asChild>
          <input
            className={`border border-gray-300 rounded-md p-2 w-full`}
            type="text"
            name="name_captain"
            title="Captain Name"
            value={meta?.name_captain?.value || ""}
            required
            onChange={changeForm}
          />
        </Form.Control>
      </Form.Field>
      <Form.Field className="FormField mb-4" name="name_player_2">
        <div className={`flex items-baseline justify-between`}>
          <Form.Label className="FormLabel mb-3">Player 2 Name</Form.Label>
          <Form.Message className="FormMessage" match="valueMissing">
            Please enter player 2's name
          </Form.Message>
        </div>
        <Form.Control asChild>
          <input
            className={`border border-gray-300 rounded-md p-2 w-full`}
            type="text"
            name="name_player_2"
            title="Player 2 Name"
            value={meta?.name_player_2?.value || ""}
            required
            onChange={changeForm}
          />
        </Form.Control>
      </Form.Field>
      <Form.Field className="FormField mb-4" name="name_player_3">
        <div className={`flex items-baseline justify-between`}>
          <Form.Label className="FormLabel mb-3">Player 3 Name</Form.Label>
          <Form.Message className="FormMessage" match="valueMissing">
            Please enter player 3's name
          </Form.Message>
        </div>
        <Form.Control asChild>
          <input
            className={`border border-gray-300 rounded-md p-2 w-full`}
            type="text"
            name="name_player_3"
            title="Player 3 Name"
            value={meta?.name_player_3?.value || ""}
            required
            onChange={changeForm}
          />
        </Form.Control>
      </Form.Field>
      <Form.Field className="FormField mb-4" name="name_player_4">
        <div className={`flex items-baseline justify-between`}>
          <Form.Label className="FormLabel mb-3">Player 4 Name</Form.Label>
          <Form.Message className="FormMessage" match="valueMissing">
            Please enter player 4's name
          </Form.Message>
        </div>
        <Form.Control asChild>
          <input
            className={`border border-gray-300 rounded-md p-2 w-full`}
            type="text"
            name="name_player_4"
            title="Player 4 Name"
            value={meta?.name_player_4?.value || ""}
            required
            onChange={changeForm}
          />
        </Form.Control>
      </Form.Field>
    </Form.Root>
  )
}

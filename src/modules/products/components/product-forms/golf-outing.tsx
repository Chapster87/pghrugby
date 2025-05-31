import { Form, Input } from "@heroui/react"

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
    <Form className="w-full max-w-xs">
      <Input
        isRequired
        className="mb-4"
        errorMessage="Please enter a contact email"
        label="Contact Email"
        labelPlacement="outside"
        name="email"
        title="Contact Email"
        placeholder="Enter your email"
        type="email"
        value={meta?.email?.value || ""}
        onChange={changeForm}
      />
      <Input
        isRequired
        className="mb-4"
        errorMessage="Please enter captain's name"
        label="Captain Name"
        labelPlacement="outside"
        name="name_captain"
        title="Captain Name"
        placeholder="Enter captain's name"
        type="text"
        value={meta?.name_captain?.value || ""}
        onChange={changeForm}
      />
      <Input
        isRequired
        className="mb-4"
        errorMessage="Please enter player 2's name"
        label="Player 2 Name"
        labelPlacement="outside"
        name="name_player_2"
        title="Player 2 Name"
        placeholder="Enter player 2's name"
        type="text"
        value={meta?.name_player_2?.value || ""}
        onChange={changeForm}
      />
      <Input
        isRequired
        className="mb-4"
        errorMessage="Please enter player 3's name"
        label="Player 3 Name"
        labelPlacement="outside"
        name="name_player_3"
        title="Player 3 Name"
        placeholder="Enter player 3's name"
        type="text"
        value={meta?.name_player_3?.value || ""}
        onChange={changeForm}
      />
      <Input
        isRequired
        className="mb-4"
        errorMessage="Please enter player 4's name"
        label="Player 4 Name"
        labelPlacement="outside"
        name="name_player_4"
        title="Player 4 Name"
        placeholder="Enter player 4's name"
        type="text"
        value={meta?.name_player_4?.value || ""}
        onChange={changeForm}
      />
    </Form>
  )
}

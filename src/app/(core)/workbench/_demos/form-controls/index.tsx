import * as Checkbox from "@radix-ui/react-checkbox"
import * as Form from "@radix-ui/react-form"
import * as RadioGroup from "@radix-ui/react-radio-group"
import * as Switch from "@radix-ui/react-switch"
import * as Tooltip from "@radix-ui/react-tooltip"

import type { Demo } from "../types"
import s from "./style.module.css"

/**
 * The form controls as they stand today — raw Radix primitives bound to the
 * global `forms.css` classes, pending extraction into shared wrappers. Shows the
 * field, select, checkbox, radio, and switch states for review.
 */
function FormControlsSpecimens() {
  return (
    <>
      <div className={s.group}>
        <h3 className={s.groupTitle}>Text fields</h3>
        <Form.Root className="FormRoot">
          <Form.Field name="standard" className="FormField">
            <Form.Label className="FormLabel">Standard text field</Form.Label>
            <Form.Control asChild>
              <input type="text" className="FormInput" />
            </Form.Control>
          </Form.Field>

          <Form.Field name="required" className="FormField required">
            <Form.Label className="FormLabel">Required text field</Form.Label>
            <Form.Control asChild>
              <input type="text" required className="FormInput" />
            </Form.Control>
            <Form.Message match="valueMissing" className="FormMessage">
              This field is required.
            </Form.Message>
          </Form.Field>

          <Form.Field
            name="error"
            className="FormField"
            data-invalid
            data-valid="false"
          >
            <Form.Label className="FormLabel" data-invalid data-valid="false">
              Text field with error
            </Form.Label>
            <Form.Control asChild data-invalid data-valid="false">
              <input type="text" aria-invalid="true" className="FormInput" />
            </Form.Control>
            <Form.Message
              match="valueMissing"
              className="FormErrorMessage"
              forceMatch
            >
              This is a test error
            </Form.Message>
          </Form.Field>

          <Form.Field name="help" className="FormField">
            <Form.Label className="FormLabel">
              Text field with help text
            </Form.Label>
            <Form.Control asChild>
              <input type="text" className="FormInput" />
            </Form.Control>
            <Form.Message className="FormMessage">
              This is help text.
            </Form.Message>
          </Form.Field>

          <Form.Field name="disabled" className="FormField">
            <Form.Label className="FormLabel">Disabled text field</Form.Label>
            <Form.Control asChild>
              <input type="text" disabled className="FormInput" />
            </Form.Control>
          </Form.Field>

          <Form.Field name="tooltip" className="FormField">
            <div className={s.formFieldTooltip}>
              <Form.Label className="FormLabel">
                Text field with tooltip
              </Form.Label>
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      type="button"
                      aria-label="Info"
                      className={s.tooltipTrigger}
                    >
                      ℹ️
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className={s.tooltipContent}
                      sideOffset={5}
                    >
                      This is a tooltip for the text field.
                      <Tooltip.Arrow className={s.tooltipArrow} />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            </div>
            <Form.Control asChild>
              <input type="text" title="Tooltip text" className="FormInput" />
            </Form.Control>
          </Form.Field>
        </Form.Root>
      </div>

      <div className={s.group}>
        <h3 className={s.groupTitle}>Select</h3>
        <Form.Root className="FormRoot">
          <Form.Field name="select" className="FormField">
            <Form.Label className="FormLabel">Select an option</Form.Label>
            <Form.Control asChild>
              <select className="FormSelect" defaultValue="">
                <option value="" disabled hidden>
                  Choose an option
                </option>
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
              </select>
            </Form.Control>
          </Form.Field>
        </Form.Root>
      </div>

      <div className={s.group}>
        <h3 className={s.groupTitle}>Checkboxes</h3>
        <div className="CheckboxGroup">
          <div className="CheckboxRow">
            <Checkbox.Root className="CheckboxRoot" id="workbench-checkbox1">
              <Checkbox.Indicator className="CheckboxIndicator" />
            </Checkbox.Root>
            <label htmlFor="workbench-checkbox1" className="CheckboxLabel">
              Checkbox
            </label>
          </div>
          <div className="CheckboxRow">
            <Checkbox.Root
              disabled
              className="CheckboxRoot"
              id="workbench-checkbox2"
            >
              <Checkbox.Indicator className="CheckboxIndicator" />
            </Checkbox.Root>
            <label htmlFor="workbench-checkbox2" className="CheckboxLabel">
              Disabled
            </label>
          </div>
        </div>
      </div>

      <div className={s.group}>
        <h3 className={s.groupTitle}>Radio buttons</h3>
        <RadioGroup.Root className="RadioGroupRoot">
          <div className="RadioRow">
            <RadioGroup.Item
              value="option1"
              className="RadioItem"
              id="workbench-radio1"
            >
              <RadioGroup.Indicator className="RadioIndicator" />
            </RadioGroup.Item>
            <label htmlFor="workbench-radio1" className="RadioLabel">
              Option 1
            </label>
          </div>
          <div className="RadioRow">
            <RadioGroup.Item
              value="option2"
              className="RadioItem"
              id="workbench-radio2"
            >
              <RadioGroup.Indicator className="RadioIndicator" />
            </RadioGroup.Item>
            <label htmlFor="workbench-radio2" className="RadioLabel">
              Option 2
            </label>
          </div>
          <div className="RadioRow">
            <RadioGroup.Item
              value="option3"
              disabled
              className="RadioItem"
              id="workbench-radio3"
            >
              <RadioGroup.Indicator className="RadioIndicator" />
            </RadioGroup.Item>
            <label htmlFor="workbench-radio3" className="RadioLabel">
              Disabled
            </label>
          </div>
        </RadioGroup.Root>
      </div>

      <div className={s.group}>
        <h3 className={s.groupTitle}>Switch</h3>
        <div className="SwitchRow">
          <label htmlFor="workbench-switch1">Toggle</label>
          <Switch.Root className="SwitchRoot" id="workbench-switch1">
            <Switch.Thumb className="SwitchThumb" />
          </Switch.Root>
        </div>
      </div>
    </>
  )
}

const formControlsDemo: Demo = {
  id: "form-controls",
  title: "Form controls",
  description:
    "Text fields, select, checkbox, radio, and switch — raw Radix today, wrappers to follow.",
  render: () => <FormControlsSpecimens />,
}

export default formControlsDemo

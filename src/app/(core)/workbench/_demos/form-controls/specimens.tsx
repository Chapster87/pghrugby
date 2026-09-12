"use client"

import * as Form from "@radix-ui/react-form"

import Checkbox from "@components/checkbox"
import RadioGroup from "@components/radio-group"
import Select from "@components/select"
import Switch from "@components/switch"
import Tooltip from "@components/tooltip"

import s from "./style.module.css"

/**
 * The form-control specimens. A client component because the shared wrappers are
 * compound client components — their parts can only be composed on the client.
 *
 * Checkbox, radio, and switch are on the shared wrappers; the text fields,
 * select, and tooltip are still raw Radix bound to the global `forms.css`
 * classes, pending their wrappers.
 */
export default function FormControlsSpecimens() {
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
                    <Tooltip.Content>
                      This is a tooltip for the text field.
                      <Tooltip.Arrow />
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
        <Select.Root defaultValue="option1">
          <Select.Trigger aria-label="Select an option">
            <Select.Value placeholder="Choose an option" />
            <Select.Icon />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                <Select.Item value="option1">
                  <Select.ItemIndicator />
                  <Select.ItemText>Option 1</Select.ItemText>
                </Select.Item>
                <Select.Item value="option2">
                  <Select.ItemIndicator />
                  <Select.ItemText>Option 2</Select.ItemText>
                </Select.Item>
                <Select.Item value="option3">
                  <Select.ItemIndicator />
                  <Select.ItemText>Option 3</Select.ItemText>
                </Select.Item>
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      <div className={s.group}>
        <h3 className={s.groupTitle}>Checkboxes</h3>
        <div className={s.stack}>
          <Checkbox.Label>
            <Checkbox.Root defaultChecked>
              <Checkbox.Indicator />
            </Checkbox.Root>
            Checkbox
          </Checkbox.Label>
          <Checkbox.Label>
            <Checkbox.Root disabled>
              <Checkbox.Indicator />
            </Checkbox.Root>
            Disabled
          </Checkbox.Label>
        </div>
      </div>

      <div className={s.group}>
        <h3 className={s.groupTitle}>Radio buttons</h3>
        <RadioGroup.Root defaultValue="option1">
          <RadioGroup.Label>Options</RadioGroup.Label>
          <div className={s.stack}>
            <div className={s.choice}>
              <RadioGroup.Item value="option1" id="workbench-radio1">
                <RadioGroup.Indicator />
              </RadioGroup.Item>
              <label htmlFor="workbench-radio1">Option 1</label>
            </div>
            <div className={s.choice}>
              <RadioGroup.Item value="option2" id="workbench-radio2">
                <RadioGroup.Indicator />
              </RadioGroup.Item>
              <label htmlFor="workbench-radio2">Option 2</label>
            </div>
            <div className={s.choice}>
              <RadioGroup.Item value="option3" id="workbench-radio3" disabled>
                <RadioGroup.Indicator />
              </RadioGroup.Item>
              <label htmlFor="workbench-radio3">Disabled</label>
            </div>
          </div>
        </RadioGroup.Root>
      </div>

      <div className={s.group}>
        <h3 className={s.groupTitle}>Switch</h3>
        <Switch.Label>
          <Switch.Root defaultChecked>
            <Switch.Thumb />
          </Switch.Root>
          Toggle
        </Switch.Label>
      </div>
    </>
  )
}

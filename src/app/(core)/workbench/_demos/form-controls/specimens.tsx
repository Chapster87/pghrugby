"use client"

import { Info } from "lucide-react"

import Checkbox from "@components/checkbox"
import Field from "@components/field"
import Form from "@components/form"
import RadioGroup from "@components/radio-group"
import Select from "@components/select"
import Switch from "@components/switch"
import Tooltip from "@components/tooltip"

import s from "./style.module.css"

/**
 * The form-control specimens. A client component because the shared wrappers are
 * compound client components — their parts can only be composed on the client.
 *
 * Every control here is on a shared wrapper, so this page exercises the
 * wrappers rather than raw Radix.
 */
export default function FormControlsSpecimens() {
  return (
    <>
      <div className={s.group}>
        <h3 className={s.groupTitle}>Text fields</h3>
        <Form.Root>
          <Field.Root name="standard">
            <Field.Label>Standard text field</Field.Label>
            <Field.Control asChild>
              <input type="text" />
            </Field.Control>
          </Field.Root>

          <Field.Root name="required">
            <Field.Label required>Required text field</Field.Label>
            <Field.Control asChild>
              <input type="text" required />
            </Field.Control>
            <Field.Message match="valueMissing">
              This field is required.
            </Field.Message>
          </Field.Root>

          <Field.Root name="error" serverInvalid>
            <Field.Label>Text field with error</Field.Label>
            <Field.Control asChild>
              <input type="text" aria-invalid="true" />
            </Field.Control>
            <Field.Message match="valueMissing" forceMatch>
              This is a test error
            </Field.Message>
          </Field.Root>

          <Field.Root name="help">
            <Field.Label>Text field with help text</Field.Label>
            <Field.Control asChild>
              <input type="text" />
            </Field.Control>
            <p className={s.help}>This is help text.</p>
          </Field.Root>

          <Field.Root name="disabled">
            <Field.Label>Disabled text field</Field.Label>
            <Field.Control asChild>
              <input type="text" disabled />
            </Field.Control>
          </Field.Root>

          <Field.Root name="tooltip">
            <div className={s.formFieldTooltip}>
              <Field.Label>Text field with tooltip</Field.Label>
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      type="button"
                      aria-label="Info"
                      className={s.tooltipTrigger}
                    >
                      <Info className={s.tooltipIcon} aria-hidden />
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
            <Field.Control asChild>
              <input type="text" title="Tooltip text" />
            </Field.Control>
          </Field.Root>
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

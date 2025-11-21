import type { Metadata, ResolvingMetadata } from "next"
import contentStyles from "@/styles/content.module.css"
import s from "./styles.module.css"
import Heading from "@components/typography/heading"
import Text from "@components/typography/text"
import Button from "@components/button"
import Link from "@components/link"
import * as Form from "@radix-ui/react-form"
import * as Checkbox from "@radix-ui/react-checkbox"
import * as RadioGroup from "@radix-ui/react-radio-group"
import * as Switch from "@radix-ui/react-switch"
import * as Tooltip from "@radix-ui/react-tooltip"
import { Pizza } from "lucide-react"

/**
 * Generate metadata for the page.
 */
export async function generateMetadata(
  props: { params: { slug: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  // Build canonical URL using current URL and slug
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/links`

  return {
    title: "Style Guide | Pittsburgh Forge Rugby Club",
    description:
      "Explore the style guide for the Pittsburgh Forge Rugby Club, including colors, typography, and design elements to maintain a consistent brand identity.",
    alternates: {
      canonical: url.toString(),
    },
    openGraph: {
      url: url.toString(),
    },
  } satisfies Metadata
}

export default async function LinksPage() {
  return (
    <div className={`${contentStyles.contentMain} ${s.styleguide}`}>
      <section className="mb-12">
        <h1>Typography</h1>
        <Heading level="h1">Heading 1</Heading>
        <Heading level="h2">Heading 2</Heading>
        <Heading level="h3">Heading 3</Heading>
        <Heading level="h4">Heading 4</Heading>
        <Heading level="h5">Heading 5</Heading>
        <Heading level="h6">Heading 6</Heading>
        <Text>
          Paragraph text. Lorem ipsum dolor sit amet, consectetur adipiscing
          elit. Duis placerat libero id congue ultrices.
        </Text>
        <ul>
          <li>Unordered list item 1</li>
          <li>Unordered list item 2</li>
          <li>Unordered list item 3</li>
        </ul>
        <ol>
          <li>Ordered list item 1</li>
          <li>Ordered list item 2</li>
          <li>Ordered list item 3</li>
        </ol>
        <Text>
          Example of an <Link href="#">Inline Link</Link>
        </Text>
      </section>

      <section className="mb-12">
        <h1>Buttons</h1>
        <div className="mb-4 flex gap-3">
          <Button variant="primary">Primary Button</Button>
          <Button variant="primary" beforeText={<Pizza />}>
            Primary Button w/ Icon
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
        <div className="mb-4 flex gap-3 items-center">
          <Button variant="primary" size="small">
            Small Button
          </Button>
          <Button variant="primary" size="default">
            Default Button
          </Button>
          <Button variant="primary" size="large">
            Large Button
          </Button>
        </div>
        <div className="mb-4 flex gap-3">
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="secondary" beforeText={<Pizza />}>
            Secondary Button w/ Icon
          </Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
        </div>
        <div className="mb-4 flex gap-3 items-center">
          <Button variant="secondary" size="small">
            Small Button
          </Button>
          <Button variant="secondary" size="default">
            Default Button
          </Button>
          <Button variant="secondary" size="large">
            Large Button
          </Button>
        </div>
        <div className="mb-4 flex gap-3">
          <Link href="#" buttonStyle variant="primary">
            Text Link as Button
          </Link>
        </div>
      </section>

      <section className="mb-12">
        <h1>Forms</h1>
        <div>
          <h2>Text Fields</h2>
          <Form.Root className="FormRoot">
            <Form.Field name="standard" className="FormField">
              <Form.Label className="FormLabel">Standard Text Field</Form.Label>
              <Form.Control asChild>
                <input type="text" className="FormInput" />
              </Form.Control>
            </Form.Field>

            <Form.Field name="required" className="FormField required">
              <Form.Label className="FormLabel">Required Text Field</Form.Label>
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
                Text Field with Error
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
                Text Field with Help Text
              </Form.Label>
              <Form.Control asChild>
                <input type="text" className="FormInput" />
              </Form.Control>
              <Form.Message className="FormMessage">
                This is help text.
              </Form.Message>
            </Form.Field>

            <Form.Field name="disabled" className="FormField">
              <Form.Label className="FormLabel">Disabled Text Field</Form.Label>
              <Form.Control asChild>
                <input type="text" disabled className="FormInput" />
              </Form.Control>
            </Form.Field>

            <Form.Field name="tooltip" className="FormField">
              <div className="flex items-center gap-2">
                <Form.Label className="FormLabel">
                  Text Field with Tooltip
                </Form.Label>
                <Tooltip.Provider>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        type="button"
                        aria-label="Info"
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ℹ️
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="TooltipContent bg-gray-800 text-white text-sm px-2 py-1 rounded"
                        sideOffset={5}
                      >
                        This is a tooltip for the text field.
                        <Tooltip.Arrow className="TooltipArrow fill-gray-800" />
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

        <div>
          <h2>Select Box</h2>
          <Form.Root className="FormRoot">
            <Form.Field name="select" className="FormField">
              <Form.Label className="FormLabel">Select an Option</Form.Label>
              <Form.Control asChild>
                <select className="FormSelect">
                  <option value="" disabled selected hidden>
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

        <div>
          <h2>Checkboxes</h2>
          <div className="CheckboxGroup">
            <div className="CheckboxRow">
              <Checkbox.Root className="CheckboxRoot" id="checkbox1">
                <Checkbox.Indicator className="CheckboxIndicator" />
              </Checkbox.Root>
              <label htmlFor="checkbox1" className="CheckboxLabel">
                Checkbox
              </label>
            </div>
            <div className="CheckboxRow">
              <Checkbox.Root disabled className="CheckboxRoot" id="checkbox2">
                <Checkbox.Indicator className="CheckboxIndicator" />
              </Checkbox.Root>
              <label htmlFor="checkbox2" className="CheckboxLabel">
                Disabled
              </label>
            </div>
          </div>
        </div>

        <div>
          <h2>Radio Buttons</h2>
          <RadioGroup.Root className="RadioGroupRoot">
            <div className="RadioRow">
              <RadioGroup.Item
                value="option1"
                className="RadioItem"
                id="radio1"
              >
                <RadioGroup.Indicator className="RadioIndicator" />
              </RadioGroup.Item>
              <label htmlFor="radio1" className="RadioLabel">
                Option 1
              </label>
            </div>
            <div className="RadioRow">
              <RadioGroup.Item
                value="option2"
                className="RadioItem"
                id="radio2"
              >
                <RadioGroup.Indicator className="RadioIndicator" />
              </RadioGroup.Item>
              <label htmlFor="radio2" className="RadioLabel">
                Option 2
              </label>
            </div>
            <div className="RadioRow">
              <RadioGroup.Item
                value="option3"
                disabled
                className="RadioItem"
                id="radio3"
              >
                <RadioGroup.Indicator className="RadioIndicator" />
              </RadioGroup.Item>
              <label htmlFor="radio3" className="RadioLabel">
                Disabled
              </label>
            </div>
          </RadioGroup.Root>
        </div>

        <div>
          <h2>Switch</h2>
          <div className="SwitchRow">
            <label htmlFor="switch1">Toggle</label>
            <Switch.Root className="SwitchRoot" id="switch1">
              <Switch.Thumb className="SwitchThumb" />
            </Switch.Root>
          </div>
        </div>
      </section>
    </div>
  )
}

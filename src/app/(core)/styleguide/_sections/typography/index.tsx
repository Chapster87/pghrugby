import Link from "@components/link"
import Heading from "@components/typography/heading"
import Text from "@components/typography/text"

import type { StyleGuideSection } from "../types"

/**
 * Type specimens: heading ladder, body copy, lists, and an inline link.
 */
function TypographySpecimens() {
  return (
    <>
      <Heading level="h1">Heading 1</Heading>
      <Heading level="h2">Heading 2</Heading>
      <Heading level="h3">Heading 3</Heading>
      <Heading level="h4">Heading 4</Heading>
      <Heading level="h5">Heading 5</Heading>
      <Heading level="h6">Heading 6</Heading>
      <Text>
        Paragraph text. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        Duis placerat libero id congue ultrices.
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
    </>
  )
}

const typographySection: StyleGuideSection = {
  id: "typography",
  title: "Typography",
  description: "The heading ladder, body copy, lists, and inline links.",
  render: () => <TypographySpecimens />,
}

export default typographySection

import Link from "@components/link"
import Heading from "@components/typography/heading"
import Text from "@components/typography/text"

import type { StyleGuideSection } from "../types"

/**
 * Type specimens: the prose ladder, the marketing ladder, body copy, lists, and
 * an inline link.
 */
function TypographySpecimens() {
  return (
    <>
      <Heading level="h3">Prose headings</Heading>
      <Text>
        The default ladder for documents, articles, and app UI. These sizes stay
        readable at long measure and never dominate the page.
      </Text>
      <Heading level="h1">Heading 1</Heading>
      <Heading level="h2">Heading 2</Heading>
      <Heading level="h3">Heading 3</Heading>
      <Heading level="h4">Heading 4</Heading>
      <Heading level="h5">Heading 5</Heading>
      <Heading level="h6">Heading 6</Heading>

      <Heading level="h3">Marketing headings</Heading>
      <Text>
        The display ladder for marketing surfaces — home, matchday, campaigns.
        Use <code>variant=&quot;marketing&quot;</code> on <code>Heading</code>;
        the hero uses <code>display=&quot;display&quot;</code>.
      </Text>
      <Heading level="h1" variant="marketing" display="display">
        Display
      </Heading>
      <Heading level="h1" variant="marketing">
        Marketing Heading 1
      </Heading>
      <Heading level="h2" variant="marketing">
        Marketing Heading 2
      </Heading>
      <Heading level="h3" variant="marketing">
        Marketing Heading 3
      </Heading>
      <Heading level="h4" variant="marketing">
        Marketing Heading 4
      </Heading>
      <Heading level="h5" variant="marketing">
        Marketing Heading 5
      </Heading>
      <Heading level="h6" variant="marketing">
        Marketing Heading 6
      </Heading>

      <Heading level="h3">Body copy</Heading>
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
  description:
    "The prose ladder, the marketing display ladder, body copy, lists, and inline links.",
  render: () => <TypographySpecimens />,
}

export default typographySection

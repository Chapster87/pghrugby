import type { Demo } from "../types"
import ContentBlocksSpecimens from "./specimens"

const contentBlocksDemo: Demo = {
  id: "content-blocks",
  title: "Content blocks",
  description:
    "Every canonical block — image, gallery, video, link button — rendered from fixtures with no CMS involved.",
  render: () => <ContentBlocksSpecimens />,
}

export default contentBlocksDemo

"use client"

/**
 * This configuration is used to for the Sanity Studio that’s mounted on the `\src\app\studio\[[...tool]]\page.tsx` route
 */

import { visionTool } from "@sanity/vision"
import { defineConfig } from "sanity"
import { structureTool } from "sanity/structure"
import { presentationTool } from "sanity/presentation"
import { media } from "sanity-plugin-media"
import { tableOfContentsPlugin } from "sanity-plugin-table-of-contents"
import { simplerColorInput } from "sanity-plugin-simpler-color-input"

// Go to https://www.sanity.io/docs/api-versioning to learn how API versioning works
import { apiVersion, dataset, projectId } from "./src/sanity/env"
import { schema } from "./src/sanity/schemas"
import { structure } from "./src/sanity/structure.config"

export default defineConfig({
  basePath: "/studio",
  projectId,
  dataset,
  // Add and edit the content schema in the './sanity/schemas' folder
  schema,
  plugins: [
    structureTool({ structure }),
    presentationTool({
      previewUrl: {
        origin: process.env.SANITY_STUDIO_PREVIEW_ORIGIN,
        preview: "/",
        previewMode: {
          enable: "/api/draft-mode/enable",
        },
      },
    }),
    media(),
    // Vision is for querying with GROQ from inside the Studio
    // https://www.sanity.io/docs/the-vision-plugin
    visionTool({ defaultApiVersion: apiVersion }),
    tableOfContentsPlugin({
      fieldNames: ["content", "excerpt", "pageBuilder"], // all array and Portable Text fields that should be included in the TOC
      documentTypes: ["homepage", "page", "post"], // add the TOC to specific document types
    }),
    simplerColorInput({
      // Note: These are all optional
      defaultColorFormat: "rgba",
      defaultColorList: [
        { label: "Gold", value: "var(--color-gold)" },
        { label: "Black", value: "var(--color-black)" },
        { label: "Dk. Grey", value: "var(--color-grey-900)" },
        { label: "White", value: "var(--color-white)" },
        { label: "Red", value: "var(--color-red)" },
        { label: "Custom...", value: "custom" },
      ],
      enableSearch: true,
      showColorValue: true,
    }),
  ],
})

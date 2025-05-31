// src/app/api/draft-mode/enable/route.ts

import { client } from "../../../../sanity/client"
import { defineEnableDraftMode } from "next-sanity/draft-mode"

export const { GET } = defineEnableDraftMode({
  client: client.withConfig({
    token: process.env.SANITY_VIEWER_TOKEN,
  }),
})

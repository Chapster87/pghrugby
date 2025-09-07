"use server"

import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import FooterClient from "./footer-client"
import SponsorBar from "@components/sponsor-bar"

export default async function Footer() {
  const { collections } = await listCollections({
    fields: "*products",
  })
  const productCategories = await listCategories()

  const serverData = {
    collections,
    productCategories,
  }

  return <FooterClient serverData={serverData} sponsorBar={<SponsorBar />} />
}

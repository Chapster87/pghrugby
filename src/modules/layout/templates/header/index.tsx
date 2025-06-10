import Nav from "@/modules/layout/templates/nav"
import { client } from "@/sanity/lib/client"
import { retrieveCart } from "@lib/data/cart"

const settingsQuery = `*[_type == "settings"] | order(publishedAt desc)[0] {
  title
}`

export default async function Header() {
  const settings = await client.fetch(settingsQuery)
  const cart = await retrieveCart().catch(() => null)

  return (
    <>
      <Nav
        siteTitle={settings?.title || "Pittsburgh Forge Rugby"}
        cart={cart}
      />
    </>
  )
}

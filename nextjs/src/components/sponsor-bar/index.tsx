import s from "./style.module.css"
import { client } from "@/sanity/lib/client"
import { sponsorQuery } from "./sponsor.query"
import Image from "next/image"
import { urlFor } from "@/sanity/lib/image" // Assuming a helper function to generate image URLs

interface Sponsor {
  _id: string
  sponsorName: string
  sponsorLogo: {
    _type: string
    asset: {
      _ref: string
      _type: string
    }
  }
  url: string
  nofollow: boolean
  openInNewTab: boolean
  width?: number | null
  height?: number | null
}

interface SponsorBarData {
  title: string
  items: { sponsor: Sponsor }[]
}

export default async function SponsorBar() {
  const sponsors: SponsorBarData = await client.fetch(sponsorQuery)
  return (
    <div className={s.sponsorBar}>
      <div className={`lg:container ${s.sponsorRow}`}>
        {sponsors.items.map((item) => (
          <a
            key={item.sponsor._id}
            className={s.sponsorLink}
            href={item.sponsor.url}
            target={item.sponsor.openInNewTab ? "_blank" : "_self"}
            rel={
              item.sponsor.nofollow
                ? "nofollow noopener noreferrer"
                : "noopener noreferrer"
            }
          >
            <Image
              src={urlFor(item.sponsor.sponsorLogo).url()} // Generate the image URL dynamically
              alt={item.sponsor.sponsorName}
              width={item.sponsor.width || 100} // Default width if not provided
              height={item.sponsor.height || 50} // Default height if not provided
            />
          </a>
        ))}
      </div>
    </div>
  )
}

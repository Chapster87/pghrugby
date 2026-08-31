import s from "./style.module.css"
import { executeQuery } from "@/lib/forgecms/execute-query"
import { sponsorsQuery, ForgeCmsSponsor } from "@/lib/forgecms/chrome.query"
import Image from "next/image"

export default async function SponsorBar() {
  const { sponsorsCollection } = await executeQuery<{
    sponsorsCollection?: {
      edges?: { node: ForgeCmsSponsor }[]
    } | null
  }>(sponsorsQuery)
  const sponsors = (sponsorsCollection?.edges ?? []).map((edge) => edge.node)

  return (
    <div className={s.sponsorBar}>
      <div className={`${s.sponsorRowContainer} ${s.sponsorRow}`}>
        {sponsors.map((sponsor) => {
          const logoUrl = sponsor.logo?.url
          if (!logoUrl) return null
          const image = (
            <Image src={logoUrl} alt={sponsor.name} width={100} height={50} />
          )
          // sponsor_url is a free-form string in ForgeCMS and is currently
          // unpopulated; render the logo (non-link) until a URL is set.
          return sponsor.sponsor_url ? (
            <a
              key={sponsor.id}
              className={s.sponsorLink}
              href={sponsor.sponsor_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {image}
            </a>
          ) : (
            <span key={sponsor.id} className={s.sponsorLink}>
              {image}
            </span>
          )
        })}
      </div>
    </div>
  )
}

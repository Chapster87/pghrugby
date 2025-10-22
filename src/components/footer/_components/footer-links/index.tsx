import Link from "next/link"
import Heading from "@/components/typography/heading"
import { FormattedNavData } from "../../types"
import s from "./style.module.css"

function cleanUrl(url: string): string {
  // Ensure the URL is not altered if it's a valid route
  if (url.startsWith("/")) {
    return url
  }
  return url.endsWith("#") ? url.slice(0, -1) : url
}

export default function FooterLinks({
  formattedNavData,
}: {
  formattedNavData: FormattedNavData
}) {
  const { navigation } = formattedNavData

  console.log("FooterLinks navigation:", navigation)

  return (
    <nav className={s.footerLinks}>
      {navigation &&
        navigation.map((item, index) => (
          <div key={`${item.label}-${index}`}>
            <Heading level="h4" className={s.navGroupHeading}>
              {item.label}
            </Heading>
            {item.submenu && (
              <ul className={s.navGroupList}>
                {item.submenu.map((sub, subIdx) => (
                  <li key={subIdx} className={s.navGroupItem}>
                    <Link
                      href={cleanUrl(sub.route || sub.url)} // Ensure route is prioritized
                      className={s.navGroupLink}
                    >
                      {sub.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
    </nav>
  )
}

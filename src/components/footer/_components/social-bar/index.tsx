import Link from "@components/link"
import Image from "next/image"
import Heading from "@components/typography/heading"
import { FaFacebook, FaInstagram, FaTwitter } from "react-icons/fa6"
import { SocialMedia } from "../../types"
import s from "./style.module.css"

export default function SocialLinks({
  socialMedia,
}: {
  socialMedia: SocialMedia
}) {
  return (
    <div className={s.social}>
      <Heading level="h3" className={s.socialHeading}>
        Find us on Social Media:
      </Heading>
      <ul className={s.socialLinks}>
        {socialMedia && (
          <>
            {socialMedia.facebook && (
              <li>
                <Link
                  href={socialMedia.facebook}
                  target="_blank"
                  className={s.socialLink}
                >
                  <FaFacebook size={32} className={`${s.icon} ${s.facebook}`} />
                </Link>
              </li>
            )}
            {socialMedia.instagram && (
              <li>
                <Link
                  href={socialMedia.instagram}
                  target="_blank"
                  className={s.socialLink}
                >
                  <FaInstagram
                    size={32}
                    className={`${s.icon} ${s.instagram}`}
                  />
                </Link>
              </li>
            )}
            {socialMedia.twitter && (
              <li>
                <Link
                  href={socialMedia.twitter}
                  target="_blank"
                  className={s.socialLink}
                >
                  <FaTwitter size={32} className={`${s.icon} ${s.twitter}`} />
                </Link>
              </li>
            )}
          </>
        )}
      </ul>
    </div>
  )
}

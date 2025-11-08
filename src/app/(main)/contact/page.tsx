"use server"

import type { Metadata, ResolvingMetadata } from "next"
import { client } from "@/sanity/lib/client"
import Heading from "@components/typography/heading"
import Text from "@/components/typography/text"
import ContactForm from "@/components/contact-form"
import Sidebar from "@/components/sidebar"
import contentStyles from "@/styles/content.module.css"
import s from "./styles.module.css"

export async function generateMetadata(
  props: { params: { slug: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await props.params

  // Build canonical URL using current URL and slug
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/${slug}`

  return {
    title: `Contact Us | Pittsburgh Forge Rugby Club`,
    description: `Get in touch with the Pittsburgh Forge Rugby Club for inquiries, support, or more information about our teams and events.`,
    alternates: {
      canonical: url.toString(),
    },
    openGraph: {
      title: `Contact Us | Pittsburgh Forge Rugby Club`,
      description: `Get in touch with the Pittsburgh Forge Rugby Club for inquiries, support, or more information about our teams and events.`,
      url: url.toString(),
      type: "website",
    },
    twitter: {
      title: `Contact Us | Pittsburgh Forge Rugby Club`,
      description: `Get in touch with the Pittsburgh Forge Rugby Club for inquiries, support, or more information about our teams and events.`,
    },
  } satisfies Metadata
}

const socialsQuery = `*[_type == "socialMedia"] | order(publishedAt desc)[0] {
  facebook,
  instagram,
  twitter
}`

export default async function ContactUs() {
  const socials = await client.fetch(socialsQuery)
  return (
    <div className={contentStyles.mainWithSidebar}>
      <div className={`${contentStyles.contentMain} ${s.contactPage}`}>
        <Heading level="h1" className={s.pageHeading}>
          Contact Us
        </Heading>

        <div className={s.contactIntro}>
          <Heading level="h3" className={s.descHeadline}>
            Interested in joining?!? Need some info, or want to ask the club a
            question?
          </Heading>
          <Text>
            Below you will find links to all of our social media platforms as
            well as a form to email us. We are extremely active on social media
            and try to respond as soon as possible.
          </Text>
        </div>

        <div className={s.contactForm}>
          <ContactForm socialsData={socials} />
        </div>
      </div>
      <Sidebar />
    </div>
  )
}

import Link from "@components/link"
import Image from "next/image"
import Heading from "@components/typography/heading"
import s from "./style.module.css"

export default function JoinForge() {
  return (
    <div className={s.joinForge}>
      <Link href="/contact" className={s.joinForgeLink}>
        <Image
          src="/images/forge_blast_drop.png"
          alt="Join the Forge"
          width={544}
          height={410}
        />
        <Heading level="h3" display="h2" className={s.joinForgeText}>
          Ready to get into the action?!
          <br /> Click here to contact us!
        </Heading>
      </Link>
    </div>
  )
}

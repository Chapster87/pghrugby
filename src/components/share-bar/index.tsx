"use client"

import React, { useEffect, useRef } from "react"
import Text from "@/components/typography/text"
import s from "./style.module.css"

interface ShareBarProps {
  url: string
  title?: string
}

export const ShareBar: React.FC<ShareBarProps> = ({ url, title }) => {
  const fbRef = useRef<HTMLDivElement>(null)
  const twRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Facebook SDK
    if (!document.getElementById("facebook-jssdk")) {
      const js = document.createElement("script")
      js.id = "facebook-jssdk"
      js.src = "//connect.facebook.net/en_US/all.js#xfbml=1"
      document.body.appendChild(js)
    }
    // Twitter SDK
    if (!document.getElementById("twitter-wjs")) {
      const js = document.createElement("script")
      js.id = "twitter-wjs"
      js.src = "https://platform.twitter.com/widgets.js"
      document.body.appendChild(js)
    }
    // Render Facebook button
    if ((window as any).FB && fbRef.current) {
      ;(window as any).FB.XFBML.parse(fbRef.current)
    }
    // Render Twitter button
    if ((window as any).twttr && twRef.current) {
      ;(window as any).twttr.widgets.load(twRef.current)
    }
  }, [url, title])

  return (
    <div className={s.shareBar}>
      <Text className={s.label}>Share this page:</Text>
      <div ref={fbRef}>
        <div
          className="fb-share-button"
          data-href={url}
          data-layout="button"
          data-size="large"
        ></div>
      </div>
      <div ref={twRef}>
        <a
          href={`https://twitter.com/share?ref_src=twsrc%5Etfw`}
          className="twitter-share-button"
          data-url={url}
          data-text={title || ""}
          data-size="large"
        >
          Tweet
        </a>
      </div>
    </div>
  )
}

export default ShareBar

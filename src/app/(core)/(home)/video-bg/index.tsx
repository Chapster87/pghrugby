import React from "react"
import s from "./styles.module.css"

const VideoBg: React.FC = () => (
  <video
    className={s.backgroundVideo}
    autoPlay
    loop
    muted
    playsInline
    poster=""
  >
    <source
      src="https://cdn.sanity.io/files/ax8uvxtm/production/f7e8d7d7f4cf3916760769b20730a05e607290a7.webm"
      type="video/webm"
    />
    <source
      src="https://cdn.sanity.io/files/ax8uvxtm/production/4fdeaa51734cca1184a50bef041c918e2bf8bac7.mp4"
      type="video/mp4"
    />
    Your browser does not support the video tag.
  </video>
)

export default VideoBg

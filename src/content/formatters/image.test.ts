import { describe, expect, it } from "vitest"

import { toImageProps } from "./image"

describe("toImageProps", () => {
  it("returns sized props when the image knows its dimensions", () => {
    expect(
      toImageProps({
        src: "https://example.test/a.jpg",
        alt: "A rugby ball",
        width: 800,
        height: 600,
      })
    ).toEqual({
      kind: "sized",
      src: "https://example.test/a.jpg",
      alt: "A rugby ball",
      width: 800,
      height: 600,
    })
  })

  it("returns unsized props when either dimension is missing", () => {
    expect(
      toImageProps({
        src: "https://example.test/a.jpg",
        alt: "A rugby ball",
        width: 800,
        height: null,
      })
    ).toEqual({
      kind: "unsized",
      src: "https://example.test/a.jpg",
      alt: "A rugby ball",
    })
  })

  it("does not derive dimensions from the URL", () => {
    // A draft read carries Content-Link stega, which rewrites string fields, so
    // parsing `src` would work in production and fail in preview.
    const props = toImageProps({
      src: "https://res.cloudinary.com/demo/image/upload/w_300,h_300/crest.png",
      alt: "",
      width: null,
      height: null,
    })

    expect(props.kind).toBe("unsized")
  })
})

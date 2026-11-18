import { describe, expect, it } from "vitest"

import { urlBuilder } from "./url"

describe("urlBuilder", () => {
  it("prefixes posts", () => {
    expect(urlBuilder("post", "season-preview")).toBe("/post/season-preview")
  })

  it("prefixes products", () => {
    expect(urlBuilder("product", "dues")).toBe("/product/dues")
  })

  it("serves other types at the root slug", () => {
    expect(urlBuilder("page", "about")).toBe("/about")
  })

  it("returns a hash when there is no slug", () => {
    expect(urlBuilder("post")).toBe("#")
  })
})

import { describe, expect, it } from "vitest"

import { toPlainText } from "./plain-text"

describe("toPlainText", () => {
  it("returns an empty string for empty input", () => {
    expect(toPlainText()).toBe("")
    expect(toPlainText(null)).toBe("")
    expect(toPlainText("")).toBe("")
  })

  it("strips a single tag", () => {
    expect(toPlainText("<p>Hello</p>")).toBe("Hello")
  })

  it("strips nested tags", () => {
    expect(toPlainText("<div><p>Hello <strong>world</strong></p></div>")).toBe(
      "Hello world"
    )
  })

  it("strips tags that span lines", () => {
    expect(toPlainText('<img\n  src="x.jpg"\n  alt="x"\n/>')).toBe("")
  })

  it("strips comments", () => {
    expect(toPlainText("Before<!-- hidden -->After")).toBe("BeforeAfter")
  })

  it("decodes named entities", () => {
    expect(toPlainText("Tom &amp; Jerry")).toBe("Tom & Jerry")
    expect(toPlainText("&ldquo;Forge&rdquo; &mdash; rugby")).toBe(
      "“Forge” — rugby"
    )
  })

  it("decodes entities beyond the common handful", () => {
    // The point of using `html-entities` rather than a hand-rolled map: the full
    // HTML5 table, not the dozen references an author happened to think of.
    expect(toPlainText("Caf&eacute;")).toBe("Café")
    expect(toPlainText("&frac12; a match")).toBe("½ a match")
  })

  it("decodes a non-breaking space", () => {
    expect(toPlainText("Forge&nbsp;Rugby")).toBe("Forge\u00a0Rugby")
  })

  it("decodes decimal and hexadecimal entities", () => {
    expect(toPlainText("It&#39;s &#x2014; here")).toBe("It's — here")
  })

  it("leaves unknown entities as written", () => {
    expect(toPlainText("&bogus;")).toBe("&bogus;")
  })

  it("decodes a single level, so encoded markup stays encoded", () => {
    expect(toPlainText("&amp;lt;")).toBe("&lt;")
  })

  it("decodes entities after stripping tags, so encoded markup stays text", () => {
    expect(toPlainText("&lt;script&gt;alert(1)&lt;/script&gt;")).toBe(
      "<script>alert(1)</script>"
    )
  })

  it("does not treat prose comparisons as tags", () => {
    expect(toPlainText("5 < 10 > 3")).toBe("5 < 10 > 3")
  })

  it("trims surrounding whitespace", () => {
    expect(toPlainText("  <p> Hello </p>  ")).toBe("Hello")
  })

  it("preserves stega characters", () => {
    // Content-Link stega appends zero-width characters to string fields on a
    // draft read; the formatter must not normalize them away.
    const stega = "\u200b\u200c"
    expect(toPlainText(`<p>Hello${stega}</p>`)).toBe(`Hello${stega}`)
  })
})

import { describe, expect, it } from "vitest"

import { formatDate, toIsoDate } from "./date"

describe("formatDate", () => {
  it("formats an ISO timestamp as a numeric date", () => {
    expect(formatDate("2026-11-17T15:30:00Z")).toBe("11/17/2026")
  })

  it("formats in UTC regardless of the runtime time zone", () => {
    expect(formatDate("2026-11-17T00:30:00Z")).toBe("11/17/2026")
  })

  it("accepts a display format override", () => {
    expect(
      formatDate("2026-11-17T15:30:00Z", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    ).toBe("November 17, 2026")
  })

  it("returns an empty string for missing or invalid input", () => {
    expect(formatDate()).toBe("")
    expect(formatDate(null)).toBe("")
    expect(formatDate("")).toBe("")
    expect(formatDate("not a date")).toBe("")
  })
})

describe("toIsoDate", () => {
  it("normalizes a timestamp to ISO", () => {
    expect(toIsoDate("2026-11-17T15:30:00Z")).toBe("2026-11-17T15:30:00.000Z")
  })

  it("returns an empty string for missing or invalid input", () => {
    expect(toIsoDate()).toBe("")
    expect(toIsoDate(null)).toBe("")
    expect(toIsoDate("not a date")).toBe("")
  })
})

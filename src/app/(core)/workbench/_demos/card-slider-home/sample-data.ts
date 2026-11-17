/**
 * PROTOTYPE data — throwaway.
 *
 * Mirrors the shape `formatContentSliderData` produces for the homepage's
 * "Latest Content" slider (`src/app/(core)/(home)/page.tsx`), so each variant is
 * judged against realistic titles, dates, and excerpt lengths. No network, no
 * persistence: the prototype is a UI question, not a data question.
 */
export type PrototypeItem = {
  type: string
  title: string
  slug: string
  date: string
  excerpt: string
}

export const sampleItems: PrototypeItem[] = [
  {
    type: "post",
    title: "Forge open the fall season with a 34–12 win over Cincinnati",
    slug: "forge-open-fall-2026",
    date: "2026-09-27",
    excerpt:
      "A statement first half set the tone at Founders Field as the Forge ran in five tries to open the fall campaign.",
  },
  {
    type: "post",
    title: "Match report: Pittsburgh 27, Columbus 24",
    slug: "match-report-columbus",
    date: "2026-09-20",
    excerpt:
      "A last-minute penalty from the sideline sealed a bruising road win and kept the Forge unbeaten in conference play.",
  },
  {
    type: "post",
    title: "Three Forge players named to the All-Conference squad",
    slug: "all-conference-honours",
    date: "2026-09-14",
    excerpt:
      "Recognition for a front row that has anchored the scrum all season, plus a back-three threat with eight tries to date.",
  },
  {
    type: "post",
    title: "Youth clinic returns to Highland Park on October 18",
    slug: "youth-clinic-october",
    date: "2026-09-09",
    excerpt:
      "Free for ages 6–14, the clinic pairs first-team players with local schools for a morning of skills, games, and lunch.",
  },
  {
    type: "post",
    title: "Season ticket packages are live for 2026",
    slug: "season-tickets-2026",
    date: "2026-09-02",
    excerpt:
      "Reserve your seat for every home fixture, with member pricing, a matchday scarf, and priority access to playoff rounds.",
  },
  {
    type: "post",
    title: "Forge Academy announces the summer development roster",
    slug: "academy-summer-roster",
    date: "2026-08-25",
    excerpt:
      "Twenty-two players step up to the development squad, the deepest intake the Academy has fielded since it launched.",
  },
  {
    type: "post",
    title: "Behind the scrum: a Q&A with the front row",
    slug: "behind-the-scrum",
    date: "2026-08-18",
    excerpt:
      "Three props, one dark art. We sat down with the tight five to talk technique, timing, and the modern set piece.",
  },
  {
    type: "post",
    title: "Forge Rugby partners with local schools for the fall term",
    slug: "schools-partnership",
    date: "2026-08-11",
    excerpt:
      "Non-contact tag rugby comes to six Pittsburgh schools this autumn, with coaches and kit supplied by the club.",
  },
]

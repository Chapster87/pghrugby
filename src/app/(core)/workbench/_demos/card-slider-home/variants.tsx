"use client"

/**
 * PROTOTYPE variants — throwaway.
 *
 * Four structurally different takes on the homepage "Latest Content" slider.
 * They disagree about layout, information hierarchy, and primary affordance —
 * not just colour:
 *
 * - A · baseline: the current 5-up image-card rail (image slot shown as a box).
 * - B · image-less: a 3-up rail of purely typographic cards.
 * - C · featured lead: one large lead story beside a scannable list of the rest.
 * - D · date rail: a slim rail keyed by date, no images, minimal chrome.
 */

import { clsx } from "clsx"

import { urlBuilder } from "@/lib/util/url"

import { Rail } from "./rail"
import type { PrototypeItem } from "./sample-data"
import s from "./style.module.css"

/** Long-form date, e.g. "September 27, 2026". */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

/** Two-digit day of month, for the date rail. */
function dayOf(iso: string): string {
  return String(new Date(iso).getDate()).padStart(2, "0")
}

/** Short upper-case month, for the date rail. */
function monthOf(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase()
}

function yearOf(iso: string): number {
  return new Date(iso).getFullYear()
}

/** A · Baseline — the current 5-up image-card rail, kept as the control. */
export function VariantA({ items }: { items: PrototypeItem[] }) {
  return (
    <Rail ariaLabel="Latest content (baseline)">
      {items.map((item) => (
        <article key={item.slug} className={clsx(s.aSlide, s.aCard)}>
          <a
            href={urlBuilder(item.type, item.slug)}
            className={s.aMedia}
            aria-label={item.title}
          >
            <span className={s.aMediaLabel}>image</span>
          </a>
          <a
            href={urlBuilder(item.type, item.slug)}
            className={s.aTitleLink}
          >
            <h3 className={s.aTitle}>{item.title}</h3>
          </a>
          <p className={s.aExcerpt}>
            {item.excerpt}{" "}
            <a href={urlBuilder(item.type, item.slug)} className={s.aMore}>
              Read More
            </a>
          </p>
        </article>
      ))}
    </Rail>
  )
}

/** B · Image-less — typographic cards; the image is gone entirely. */
export function VariantB({ items }: { items: PrototypeItem[] }) {
  return (
    <Rail ariaLabel="Latest content (image-less)">
      {items.map((item) => (
        <article key={item.slug} className={clsx(s.bSlide, s.bCard)}>
          <span className={s.bDate}>{formatDate(item.date)}</span>
          <h3 className={s.bTitle}>
            <a
              href={urlBuilder(item.type, item.slug)}
              className={s.bTitleLink}
            >
              {item.title}
            </a>
          </h3>
          <p className={s.bExcerpt}>{item.excerpt}</p>
          <a href={urlBuilder(item.type, item.slug)} className={s.bMore}>
            Read more →
          </a>
        </article>
      ))}
    </Rail>
  )
}

/** C · Featured lead — one big lead story beside a scannable list. */
export function VariantC({ items }: { items: PrototypeItem[] }) {
  const [lead, ...rest] = items
  if (!lead) return null

  return (
    <div className={s.cGrid}>
      <article className={s.cLead}>
        <span className={s.cLeadKicker}>
          Top story · {formatDate(lead.date)}
        </span>
        <h3 className={s.cLeadTitle}>
          <a
            href={urlBuilder(lead.type, lead.slug)}
            className={s.cLeadTitleLink}
          >
            {lead.title}
          </a>
        </h3>
        <p className={s.cLeadExcerpt}>{lead.excerpt}</p>
        <a href={urlBuilder(lead.type, lead.slug)} className={s.cLeadMore}>
          Read the story →
        </a>
      </article>

      <ul className={s.cList}>
        {rest.map((item) => (
          <li key={item.slug} className={s.cListItem}>
            <span className={s.cListDate}>{formatDate(item.date)}</span>
            <a
              href={urlBuilder(item.type, item.slug)}
              className={s.cListTitle}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** D · Date rail — a slim rail keyed by date, minimal chrome, no images. */
export function VariantD({ items }: { items: PrototypeItem[] }) {
  return (
    <Rail ariaLabel="Latest content (date rail)">
      {items.map((item) => (
        <article key={item.slug} className={clsx(s.dSlide, s.dCard)}>
          <div className={s.dDate}>
            <span className={s.dDay}>{dayOf(item.date)}</span>
            <span className={s.dMonth}>{monthOf(item.date)}</span>
          </div>
          <div className={s.dBody}>
            <a
              href={urlBuilder(item.type, item.slug)}
              className={s.dTitle}
            >
              {item.title}
            </a>
            <span className={s.dYear}>{yearOf(item.date)}</span>
          </div>
        </article>
      ))}
    </Rail>
  )
}

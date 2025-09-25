"use client"

import React, { useState } from "react"
import dayjs from "dayjs"
import contentStyles from "@/styles/content.module.css"
import s from "./styles.module.css"
import * as Tooltip from "@radix-ui/react-tooltip"

export default function CalendarClient({
  events,
}: {
  events: {
    id: string // Changed from number to string to match the updated type
    title: string
    text: string
    start: string
    end: string
    location: string
    htmlLink: string
    calendarName: string // Include calendarIdName for event type
  }[]
}) {
  const [currentDate, setCurrentDate] = useState(dayjs())

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ]

  const getDaysInMonthGrid = () => {
    const startOfMonth = currentDate.startOf("month")
    const endOfMonth = currentDate.endOf("month")

    const daysInMonth = []

    // Add days from the previous month
    const startDayOfWeek = startOfMonth.day()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      daysInMonth.push({
        date: startOfMonth.subtract(i + 1, "day"),
        isCurrentMonth: false,
      })
    }

    // Add days from the current month
    for (let i = 0; i < currentDate.daysInMonth(); i++) {
      daysInMonth.push({
        date: startOfMonth.add(i, "day"),
        isCurrentMonth: true,
      })
    }

    // Add days from the next month
    const endDayOfWeek = endOfMonth.day()
    for (let i = 1; i < 7 - endDayOfWeek; i++) {
      daysInMonth.push({
        date: endOfMonth.add(i, "day"),
        isCurrentMonth: false,
      })
    }

    return daysInMonth
  }

  const daysInMonthGrid = getDaysInMonthGrid()

  const formatTimeShort = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      hour12: true, // Use 12-hour format with AM/PM
    }
    return new Date(dateString).toLocaleTimeString([], options)
  }

  return (
    <div
      className={`${contentStyles.contentMain} light 2xl:container px-4 py-6 mx-auto `}
    >
      <h1 className="text-2xl font-bold mb-4">Event Calendar</h1>
      <div className="flex justify-between mb-4">
        <button
          onClick={() => setCurrentDate(currentDate.subtract(1, "month"))}
        >
          Previous
        </button>
        <h2 className="text-xl font-bold">{currentDate.format("MMMM YYYY")}</h2>
        <button onClick={() => setCurrentDate(currentDate.add(1, "month"))}>
          Next
        </button>
      </div>
      <div className={`grid grid-cols-7 gap-4 ${s.calendarGrid}`}>
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className={`font-bold text-center border-b pb-2 ${s.dayOfWeekName}`}
          >
            {day}
          </div>
        ))}
        {daysInMonthGrid.map((day, index) => {
          const hasEvent = events.some((event) =>
            dayjs(event.start).isSame(day.date, "day")
          )
          const isToday = day.date.isSame(dayjs(), "day")
          return (
            <div
              key={index}
              className={`${s.day} ${
                day.isCurrentMonth ? s.dayCurrentMonth : s.dayDisabled
              } ${hasEvent ? s.dayWithEvent : ""} ${isToday ? s.dayToday : ""}`}
            >
              <div className={s.dayHeader}>{day.date.date()}</div>
              <div className={s.dayBody}>
                {events.map((event) => {
                  const eventDate = dayjs(event.start)
                  if (eventDate.isSame(day.date, "day")) {
                    return (
                      <Tooltip.Provider key={event.id}>
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <div
                              className={`${s.event} ${s[event.calendarName]}`}
                            >
                              <span className={s.eventDot}></span>
                              <span className={s.eventText}>{event.title}</span>
                            </div>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content
                              className={`${s.tooltipContent}`}
                              side="top"
                              align="center"
                              sideOffset={5}
                            >
                              <div className={s.tooltipTitle}>
                                {event.title}
                              </div>
                              {event.text && (
                                <div className={s.tooltipText}>
                                  {event.text}
                                </div>
                              )}
                              {event.start && event.end && (
                                <div className={s.tooltipTime}>
                                  <strong>Time:</strong>{" "}
                                  {formatTimeShort(event.start)} -{" "}
                                  {formatTimeShort(event.end)}
                                </div>
                              )}
                              {event.location && (
                                <div className={s.tooltipLocation}>
                                  <strong>Location:</strong> {event.location}
                                  <a
                                    href={`https://www.google.com/maps?q=${encodeURIComponent(
                                      event.location
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={s.tooltipLink}
                                  >
                                    View on Google Maps
                                  </a>
                                </div>
                              )}
                              {event.htmlLink && (
                                <a
                                  href={event.htmlLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={s.tooltipLink}
                                >
                                  View Event Details
                                </a>
                              )}
                              <Tooltip.Arrow className={s.tooltipArrow} />
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    )
                  }
                  return null
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

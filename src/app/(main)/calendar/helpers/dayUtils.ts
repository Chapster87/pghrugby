import dayjs from "dayjs"

export const getNumberOfDaysInMonth = (year: number, month: number) => {
  return dayjs(`${year}-${month}-01`).daysInMonth()
}

export const createDaysForCurrentMonth = (year: number, month: number) => {
  return Array.from(
    { length: getNumberOfDaysInMonth(year, month) },
    (_, index) => {
      return {
        dateString: dayjs(`${year}-${month}-${index + 1}`).format("YYYY-MM-DD"),
        dayOfMonth: index + 1,
        isCurrentMonth: true,
        isNextMonth: false,
        isPreviousMonth: false,
      }
    }
  )
}

export const createDaysForAdjacentMonth = (
  year: number,
  month: number,
  isNext: boolean
) => {
  const referenceDate = isNext
    ? dayjs(`${year}-${month}-01`).add(1, "month")
    : dayjs(`${year}-${month}-01`).subtract(1, "month")

  const daysInMonth = getNumberOfDaysInMonth(
    referenceDate.year(),
    referenceDate.month() + 1
  )

  return Array.from({ length: daysInMonth }, (_, index) => {
    return {
      dateString: referenceDate.date(index + 1).format("YYYY-MM-DD"),
      dayOfMonth: index + 1,
      isCurrentMonth: false,
      isNextMonth: isNext,
      isPreviousMonth: !isNext,
    }
  })
}

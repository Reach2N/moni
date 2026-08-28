export const CAMBODIA_TIME_ZONE = 'Asia/Phnom_Penh'
export const CAMBODIA_UTC_OFFSET = '+07:00'

const CAMBODIA_OFFSET_MS = 7 * 60 * 60 * 1000

type DateParts = { year: number; month: number; day: number }

function cambodiaDateParts(now: Date): DateParts {
  if (Number.isNaN(now.getTime())) throw new Error('invalid date')
  const shifted = new Date(now.getTime() + CAMBODIA_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }
}

const two = (value: number) => String(value).padStart(2, '0')
const localDate = ({ year, month, day }: DateParts) => `${year}-${two(month)}-${two(day)}`

function nextLocalDay(parts: DateParts): DateParts {
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1))
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  }
}

/** Half-open Cambodian-local day boundaries, serialized as offset ISO strings. */
export function cambodiaDayBounds(now = new Date()) {
  const today = cambodiaDateParts(now)
  const tomorrow = nextLocalDay(today)
  return {
    date: localDate(today),
    start: `${localDate(today)}T00:00:00${CAMBODIA_UTC_OFFSET}`,
    end: `${localDate(tomorrow)}T00:00:00${CAMBODIA_UTC_OFFSET}`,
  }
}

/** Half-open Cambodian-local calendar-month boundaries. */
export function cambodiaMonthBounds(now = new Date()) {
  const current = cambodiaDateParts(now)
  const nextMonth = new Date(Date.UTC(current.year, current.month, 1))
  const startDate = `${current.year}-${two(current.month)}-01`
  const endDate = `${nextMonth.getUTCFullYear()}-${two(nextMonth.getUTCMonth() + 1)}-01`
  return {
    month: `${current.year}-${two(current.month)}`,
    start: `${startDate}T00:00:00${CAMBODIA_UTC_OFFSET}`,
    end: `${endDate}T00:00:00${CAMBODIA_UTC_OFFSET}`,
  }
}

/** The YYYY-MM-DD calendar date in Cambodia for a timestamp. */
export function cambodiaDate(now = new Date()) {
  return localDate(cambodiaDateParts(now))
}

/**
 * Day of week for a YYYY-MM-DD Cambodian calendar date, 0 = Sunday, matching the
 * `dow` key in `businesses.hours`. Anchored at noon so no host time zone can push
 * the date across a boundary.
 */
export function cambodiaDayOfWeek(date: string) {
  return new Date(`${date}T12:00:00${CAMBODIA_UTC_OFFSET}`).getUTCDay()
}

/** "08:30" to 510. Minutes past midnight, the unit opening hours are compared in. */
export function parseClock(value: string) {
  const [hour = '0', minute = '0'] = value.split(':')
  return Number(hour) * 60 + Number(minute)
}

/** Minutes past Cambodian midnight for an instant. */
export function cambodiaMinutesOfDay(iso: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAMBODIA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso))
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

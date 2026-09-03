'use client'

import { useEffect, useRef, useState } from 'react'
import { CircleDot } from 'lucide-react'
import { Temporal } from 'temporal-polyfill'
import { createViewDay, createViewMonthGrid, createViewWeek } from '@schedule-x/calendar'
import type { CalendarEventExternal } from '@schedule-x/calendar'
import { createEventsServicePlugin } from '@schedule-x/events-service'
import { ScheduleXCalendar, useCalendarApp } from '@schedule-x/react'
import '@schedule-x/theme-default/dist/calendar.css'
import type { CalendarColours, CalendarEvent } from '@/lib/calendar/events.ts'
import { CALENDAR_TIME_ZONE, toCalendarEvent } from '@/lib/calendar/events.ts'
import type { LaneBooking } from '@/lib/queries/calendar.ts'
import { toKhmerDigits } from '@/lib/format/khmer.ts'
import { useLiveBookings } from './live-bookings.tsx'

/**
 * The owner's day, drawn by schedule-x.
 *
 * This replaces a hand-built CSS grid of resource lanes. The search that
 * produced the hand-built one is recorded in ARCHITECTURE.md and its conclusion
 * has not changed: the resource VIEW, one column per chair or room, is a paid
 * schedule-x plugin, and neither `@schedule-x/resource-scheduler` nor
 * `@sx-premium/resource-scheduler` exists on npm. What changed is the trade.
 * A resource is a colour now rather than a column, which costs the owner the
 * columns and buys her day, week and month views, keyboard focus, a responsive
 * grid and overlap resolution that nobody here has to maintain.
 *
 * The resource MODEL is untouched: `resourceId` still travels on every booking
 * and `calendarsFor()` turns each one into its own colour, so a licensed
 * resource view later reads the same rows.
 *
 * No business logic lives here, per CLAUDE.md rule 9. Everything the calendar
 * draws was mapped on the server by `src/lib/calendar/events.ts`, which
 * `db/test.mjs` proves with no browser.
 */

/**
 * The wall clock string, as the object the library wants.
 *
 * NOT a second time zone conversion. `toCalendarEvents` already moved the
 * instant from the database's UTC to the shop's Phnom Penh wall clock, and
 * converting again would shift every booking by seven hours. This only parses
 * `YYYY-MM-DD HH:mm`, which carries no zone, and pins it to the zone it was
 * already written in.
 *
 * It has to happen here rather than in the pure module because a Temporal
 * object cannot cross the server-to-client boundary: React serialises props,
 * so the string is the only form that survives the trip.
 */
function hydrate(event: CalendarEvent): CalendarEventExternal {
  return {
    ...event,
    start: Temporal.PlainDateTime.from(event.start).toZonedDateTime(CALENDAR_TIME_ZONE),
    end: Temporal.PlainDateTime.from(event.end).toZonedDateTime(CALENDAR_TIME_ZONE),
  }
}

/**
 * The time axis in Khmer numerals, which is what the lanes did before.
 *
 * `toKhmerDigits` and never a `km-KH` locale: Node and Chrome disagree on that
 * locale's separators, and the digits are transliterated from a Latin string
 * rather than formatted from one.
 */
function WeekGridHour({ gridStep }: { gridStep: { hour: number; minute: number } }) {
  const hour = String(gridStep.hour).padStart(2, '0')
  const minute = String(gridStep.minute).padStart(2, '0')
  return <span className="tnum text-[0.6875rem] text-rule">{toKhmerDigits(`${hour}:${minute}`)}</span>
}

/**
 * Module level, and deliberately not an object literal in the JSX below.
 * `ScheduleXCalendar` keys an effect on this prop and that effect calls
 * `destroy()` then `render()`, so a fresh object every render would tear the
 * calendar down and rebuild it on every keystroke of state.
 */
const CUSTOM_COMPONENTS = { weekGridHour: WeekGridHour }

export function CalendarView({
  events,
  calendars,
  date,
  rangeStart,
  rangeEnd,
  businessId,
}: {
  events: CalendarEvent[]
  calendars: Record<string, CalendarColours>
  /** `YYYY-MM-DD`, the first Cambodian-local day of the range. */
  date: string
  /** The half-open UTC bounds a live arrival has to fall inside to be shown. */
  rangeStart: string
  rangeEnd: string
  businessId: string
}) {
  const { arrived, connected } = useLiveBookings(businessId)

  // Created once, and available on the very first render: `useCalendarApp`
  // builds the calendar inside an effect with no dependencies, so a plugin that
  // only exists from the second render onward would never be installed.
  const [eventsService] = useState(() => createEventsServicePlugin())

  // Seeded with what the server already drew. The stream redelivers, and a
  // booking added twice is a booking the owner sees twice.
  const placed = useRef(new Set(events.map((event) => event.id)))

  const calendar = useCalendarApp(
    {
      views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
      defaultView: 'day',
      selectedDate: Temporal.PlainDate.from(date),
      // Told once, here. The events are already written in this zone.
      timezone: CALENDAR_TIME_ZONE,
      // en-GB for the 24 hour clock the rest of /app uses. Never km-KH: its
      // separators differ between Node's ICU and Chrome's.
      locale: 'en-GB',
      // /app is light only (src/app/app/layout.tsx pins [color-scheme:light]),
      // so the dark palette is never asked for.
      isDark: false,
      calendars,
      events: events.map(hydrate),
    },
    [eventsService],
  )

  // A booking that lands on the stream is pushed into the calendar rather than
  // re-rendering it. Re-rendering would rebuild the whole app and throw away
  // the view and the day the owner had navigated to.
  useEffect(() => {
    if (!calendar) return
    for (const live of arrived) {
      if (placed.current.has(live.id)) continue
      if (live.starts_at < rangeStart || live.starts_at >= rangeEnd) continue
      placed.current.add(live.id)
      // Through the same mapper the server used, so a live arrival cannot draw
      // at a different hour, in a different colour, or with different money
      // than the same booking would have on a reload.
      const booking: LaneBooking = {
        id: live.id,
        code: live.code,
        status: live.status,
        startsAt: live.starts_at,
        endsAt: live.ends_at,
        customer: live.customer_name ?? 'អតិថិជន',
        service: live.service_name ?? '',
        resourceId: null,
        channel: live.channel,
        priceMinor: live.price_minor,
        paidMinor: live.paid_minor,
        currency: live.currency as LaneBooking['currency'],
      }
      eventsService.add(hydrate(toCalendarEvent(booking)))
    }
  }, [arrived, calendar, eventsService, rangeStart, rangeEnd])

  return (
    <div>
      <p className="km flex items-center gap-2 text-xs text-rule">
        <CircleDot
          className={`size-3.5 ${connected ? 'text-seal-text' : 'text-rule'}`}
          strokeWidth={2}
          aria-hidden
        />
        {connected ? 'កំពុងតាមដានផ្ទាល់' : 'មិនទាន់តភ្ជាប់ផ្ទាល់'}
      </p>

      <div className="moni-calendar mt-2">
        <ScheduleXCalendar calendarApp={calendar} customComponents={CUSTOM_COMPONENTS} />
      </div>

      {events.length === 0 ? (
        <p className="km mt-3 border border-rule/70 px-3 py-6 text-center text-sm text-rule">
          មិនទាន់មានការណាត់សម្រាប់ថ្ងៃនេះទេ។
        </p>
      ) : null}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { CircleDot, Square } from 'lucide-react'
// Installs `globalThis.Temporal` and the Temporal-aware `Intl.DateTimeFormat`.
// Not optional and not a convenience: schedule-x 4 reads the GLOBAL `Temporal`
// to validate every event it is handed, so a named import of the same polyfill
// passes an object the library rejects with "Event start time needs to be a
// Temporal.ZonedDateTime". The side-effect import and the global are the same
// module instance, which is what makes its `instanceof` check agree.
import 'temporal-polyfill/global'
import { createViewDay, createViewMonthGrid, createViewWeek } from '@schedule-x/calendar'
import type { CalendarEventExternal } from '@schedule-x/calendar'
import { createEventsServicePlugin } from '@schedule-x/events-service'
import { ScheduleXCalendar, useCalendarApp } from '@schedule-x/react'
import '@schedule-x/theme-default/dist/calendar.css'
import type { CalendarColours, CalendarEvent } from '@/lib/calendar/events.ts'
import { CALENDAR_TIME_ZONE, UNASSIGNED, toCalendarEvent } from '@/lib/calendar/events.ts'
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
  // The library's own class, not a redraw of it: `.sx__week-grid__hour-text` is
  // what lifts the label into the axis gutter. A plain span sits inline instead
  // and prints the hour straight across the first column of the grid.
  return <span className="sx__week-grid__hour-text tnum">{toKhmerDigits(`${hour}:${minute}`)}</span>
}

/**
 * Module level, and deliberately not an object literal in the JSX below.
 * `ScheduleXCalendar` keys an effect on this prop and that effect calls
 * `destroy()` then `render()`, so a fresh object every render would tear the
 * calendar down and rebuild it on every keystroke of state.
 */
const CUSTOM_COMPONENTS = { weekGridHour: WeekGridHour }

/** What a booking with no chair, room or table yet is called on the legend. */
const UNASSIGNED_LABEL = 'មិនទាន់កំណត់'

/**
 * The key to the colours, because a colour with no legend carries nothing.
 *
 * Trading resource COLUMNS for resource COLOURS only pays if the owner can read
 * the colours, and without headers she could not: the chair's name lived in the
 * column head that went away, so telling green from blue meant opening a
 * booking. This puts the names back, once, above the whole calendar.
 *
 * The swatches are read out of the SAME `calendars` record the calendar itself
 * was built from, never a second colour table, so the legend and the events
 * cannot disagree. Fill is `container` and stroke is `main` because that is how
 * schedule-x paints an event block: the swatch is a miniature of the thing it
 * names rather than an approximation of it.
 *
 * No business logic, per CLAUDE.md rule 9: this reads two props and draws them.
 */
function CalendarLegend({
  resources,
  calendars,
}: {
  resources: Array<{ id: string; name: string }>
  calendars: Record<string, CalendarColours>
}) {
  // A legend of one entry distinguishes nothing. A cafe has no chairs to book,
  // so every booking is neutral and naming the neutral colour is just noise.
  if (resources.length === 0) return null

  const rows = [
    ...resources.map((resource) => ({ id: resource.id, name: resource.name })),
    { id: UNASSIGNED, name: UNASSIGNED_LABEL },
  ]

  return (
    <ul aria-label="ពណ៌សម្គាល់" className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
      {rows.map(({ id, name }) => {
        const colours = calendars[id]
        if (!colours) return null
        return (
          <li key={id} className="km flex items-center gap-1.5 text-xs text-rule">
            <Square
              className="size-3 shrink-0"
              strokeWidth={2}
              style={{ color: colours.lightColors.main, fill: colours.lightColors.container }}
              aria-hidden
            />
            {name}
          </li>
        )
      })}
    </ul>
  )
}

export function CalendarView({
  events,
  calendars,
  resources,
  date,
  rangeStart,
  rangeEnd,
  businessId,
}: {
  events: CalendarEvent[]
  calendars: Record<string, CalendarColours>
  /** The chairs, rooms or tables, in the order the shop lists them, for the legend. */
  resources: Array<{ id: string; name: string }>
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

  // Only so the empty-day note can retract. A booking that lands on an empty
  // day is drawn by the events service, which React never hears about, so
  // without this the calendar would show a real booking above a line reading
  // "no bookings today yet".
  const [liveCount, setLiveCount] = useState(0)

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
      setLiveCount((count) => count + 1)
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

      <CalendarLegend resources={resources} calendars={calendars} />

      <div className="moni-calendar mt-2">
        <ScheduleXCalendar calendarApp={calendar} customComponents={CUSTOM_COMPONENTS} />
      </div>

      {events.length === 0 && liveCount === 0 ? (
        <p className="km mt-3 border border-rule/70 px-3 py-6 text-center text-sm text-rule">
          មិនទាន់មានការណាត់សម្រាប់ថ្ងៃនេះទេ។
        </p>
      ) : null}
    </div>
  )
}

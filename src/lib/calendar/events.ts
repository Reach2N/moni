import { cambodiaClock, cambodiaDate, CAMBODIA_TIME_ZONE } from '../time/cambodia.ts'
import { mulberry32 } from '../storefront/style.ts'
import { formatMoney } from '../types.ts'
import type { CalendarRange, LaneBooking } from '../queries/calendar.ts'

/**
 * A booking, as the calendar library wants to read it.
 *
 * No `server-only`, no React, and no schedule-x import either: this module hands
 * back plain objects and the component passes them to the library. That is what
 * keeps the one thing that must never be wrong, the hour on the clock, provable
 * by `db/test.mjs` with no browser and no render.
 */

/** The neutral calendar. A booking with no resource is still a real customer. */
export const UNASSIGNED = 'unassigned'

export type CalendarEvent = {
  id: string
  title: string
  /** `YYYY-MM-DD HH:mm`, in the shop's zone. See `shopWallClock`. */
  start: string
  end: string
  calendarId: string
  description: string
  /**
   * schedule-x pushes `additionalClasses` straight onto the event block's class
   * list, which is how a cancelled booking still recedes without anyone
   * redrawing the library's event component. The class carries the status and
   * globals.css decides what a status looks like, so a new status is a rule
   * rather than a component.
   */
  _options: { additionalClasses: string[] }
}

/**
 * An instant as the wall clock the shop reads.
 *
 * schedule-x takes `start` and `end` as `YYYY-MM-DD HH:mm` with no offset and
 * no zone, and interprets them in the calendar's own zone. The calendar's zone
 * is the shop's zone: `Asia/Phnom_Penh`, UTC+7, no daylight saving. The database
 * stores `timestamptz` in UTC, so something has to move the hour, and it must be
 * this function rather than the browser: a laptop in Bangkok, a phone left on
 * Los Angeles and a Vercel region on UTC would each draw the same booking at a
 * different hour, all of them looking completely normal. An owner who trusts a
 * calendar an hour out turns a customer away at the wrong time, which is worse
 * than having no calendar at all.
 *
 * Both halves come from `src/lib/time/cambodia.ts`. No offset is added here,
 * because an offset written twice is an offset that can disagree with itself.
 */
function shopWallClock(iso: string): string {
  return `${cambodiaDate(new Date(iso))} ${cambodiaClock(iso)}`
}

/**
 * What the owner reads on the block itself: who is coming, what for, and what it
 * is worth. Money always through `formatMoney()`, never a float.
 *
 * A zero price is dropped rather than rendered. Zero means the owner never
 * stated a price, and "free" is a different claim: the same distinction the
 * setup review table already draws.
 */
function titleFor(booking: LaneBooking): string {
  const parts = [booking.customer, booking.service]
  if (booking.priceMinor > 0) parts.push(formatMoney(booking.priceMinor, booking.currency))
  return parts.filter((part) => part.length > 0).join(' · ')
}

/**
 * Every booking in the range, as an event.
 *
 * `calendarId` is the resource, so the resource that used to be a column is now
 * a colour: the information survives the view change rather than being dropped
 * with the lanes. A booking with no resource takes the neutral calendar instead
 * of being filtered out, because hiding it would take a paying customer off the
 * owner's day without telling her.
 */
export function toCalendarEvents(range: CalendarRange): CalendarEvent[] {
  return range.bookings.map(toCalendarEvent)
}

/**
 * One booking, as one event.
 *
 * Split out of `toCalendarEvents` because a booking that arrives on the live
 * stream after the page rendered has to become an event too, and it must become
 * exactly the same kind of event: the same hour, the same colour, the same
 * money. One function, so a live arrival can never drift from a server render.
 */
export function toCalendarEvent(booking: LaneBooking): CalendarEvent {
  return {
    id: booking.id,
    title: titleFor(booking),
    start: shopWallClock(booking.startsAt),
    end: shopWallClock(booking.endsAt),
    calendarId: booking.resourceId ?? UNASSIGNED,
    // The code is how a booking is named everywhere else in the product, in
    // chat and on the receipt, so it is what an owner searches the day for.
    description: `${booking.code} · ${booking.status}`,
    _options: { additionalClasses: [`moni-status-${booking.status}`] },
  }
}

/** The light and dark colour pair schedule-x's theme reads per calendar. */
export type CalendarColours = {
  colorName: string
  lightColors: { main: string; container: string; onContainer: string }
  darkColors: { main: string; container: string; onContainer: string }
}

/**
 * A resource id, as one integer.
 *
 * FNV-1a, because the ids are uuids and `mulberry32` wants a number. Hashing the
 * id and nothing else is the point: the colour depends on that one chair and on
 * no part of the list around it, so adding or retiring a chair never recolours
 * the others, and a reload never reshuffles the day.
 */
function seedFrom(id: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < id.length; index++) {
    hash ^= id.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Saturated enough that no seeded hue can be mistaken for the neutral grey. */
const SATURATION = 58

function colours(hue: number, saturation: number): CalendarColours {
  return {
    colorName: `sx-${Math.round(hue)}`,
    lightColors: {
      main: `hsl(${hue} ${saturation}% 34%)`,
      container: `hsl(${hue} ${saturation}% 92%)`,
      onContainer: `hsl(${hue} ${saturation}% 16%)`,
    },
    darkColors: {
      main: `hsl(${hue} ${saturation}% 76%)`,
      container: `hsl(${hue} ${saturation}% 24%)`,
      onContainer: `hsl(${hue} ${saturation}% 92%)`,
    },
  }
}

/**
 * One calendar per resource, plus the neutral one.
 *
 * The colour is derived from the resource id through `mulberry32`, the same
 * generator the storefront seeds a whole shop from, so there is one random
 * stream in this codebase and not two. Deterministic matters here for the same
 * reason it matters there: a chair whose colour changed between two reloads
 * would make the owner re-learn her own calendar every time she opened it.
 */
export function calendarsFor(resources: CalendarRange['resources']): Record<string, CalendarColours> {
  const out: Record<string, CalendarColours> = {}
  for (const resource of resources) {
    const hue = Math.round(mulberry32(seedFrom(resource.id))() * 360)
    out[resource.id] = colours(hue, SATURATION)
  }
  // Grey, and fixed rather than seeded: "no chair yet" is a statement about the
  // booking, so it must never be readable as one of the chairs.
  out[UNASSIGNED] = colours(220, 8)
  return out
}

/**
 * A live arrival, given back the resource the view drops.
 *
 * `v_bookings_agent` carries `resource_name` and `resource_kind` but not
 * `resource_id`, and the id is what a colour is keyed on: `calendarsFor()`
 * seeds the hue from it and `toCalendarEvent` reads it as `calendarId`. So a
 * booking arriving on the SSE stream drew in the neutral grey while the same
 * booking took its chair's colour on reload, which loses the one thing the
 * calendar rewrite traded the resource columns for.
 *
 * The stream route does the second read and hands both lists here. Pure, so
 * `db/test.mjs` proves the merge against real rows with no browser and no
 * server: a booking whose id is not in `owners` keeps a null, which
 * `toCalendarEvent` draws as unassigned rather than dropping.
 */
export function attachResourceIds<T extends { id: string | null }>(
  rows: readonly T[],
  owners: ReadonlyArray<{ id: string | null; resource_id: string | null }>,
): Array<T & { resource_id: string | null }> {
  // The view types every column as nullable, so an id can be null here. It
  // matches no owner and keeps its null, which is the unassigned colour.
  const byId = new Map(owners.map((owner) => [owner.id, owner.resource_id]))
  return rows.map((row) => ({ ...row, resource_id: byId.get(row.id) ?? null }))
}

/** The zone the events above are written in, for the calendar to be told once. */
export const CALENDAR_TIME_ZONE = CAMBODIA_TIME_ZONE

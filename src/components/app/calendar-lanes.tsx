'use client'

import { Fragment } from 'react'
import { CircleDot } from 'lucide-react'
import type { CalendarDay, LaneBooking } from '@/lib/queries/calendar.ts'
import { formatMoney } from '@/lib/types.ts'
import { toKhmerDigits } from './dashboard-format.ts'
import { ChannelIcon } from './channel-icon.tsx'
import { useLiveBookings } from './live-bookings.tsx'

/**
 * Hand built, and here is the record of the search CLAUDE.md requires.
 *
 * FullCalendar's core is MIT but resource timeline is a paid plugin, and
 * resource lanes are exactly what a salon calendar is. schedule-x was checked
 * properly on 30 August 2026 and lands in the same place for a subtler reason:
 * its MIT core 4.7.0 carries the resource DATA MODEL (`resources`,
 * `resourceId` on an event, `resourceGridOptions`, with a comment reading "Only
 * used for horizontal resource view") but exports only day, week, month, list
 * and agenda renderers. The resource view itself is a paid plugin on their
 * private registry: neither `@schedule-x/resource-scheduler` nor
 * `@sx-premium/resource-scheduler` exists on npm, and the public family is 20
 * packages with no resource view among them. So `npm install` cannot obtain it
 * at any price short of a licence.
 *
 * `CalendarDay` is nonetheless shaped to match theirs, resources plus a
 * `resourceId` per booking, so a licensed plugin later is a swap of this file
 * and not of the query. Both would still need the Khmer line height and
 * `formatMoney()` bolted on.
 *
 * So: CSS grid, one column per resource, one row per half hour.
 */
const SLOT_MINUTES = 30
const ROW_HEIGHT = 28

function minutesFromDayStart(iso: string, dayStart: string) {
  return Math.max(0, Math.round((new Date(iso).getTime() - new Date(dayStart).getTime()) / 60_000))
}

function clockLabel(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Phnom_Penh',
  }).format(new Date(iso))
}

/** Cancelled and no-show stay visible but recede: the day happened as it happened. */
const TONE: Record<string, string> = {
  pending: 'border-rule/70 bg-paper',
  confirmed: 'border-seal/70 bg-seal/10',
  completed: 'border-rule/40 bg-ink/5',
  cancelled: 'border-hairline bg-paper text-rule line-through',
  no_show: 'border-hairline bg-paper text-rule line-through',
}

export function CalendarLanes({ day, businessId }: { day: CalendarDay; businessId: string }) {
  const { arrived, connected } = useLiveBookings(businessId)

  // A booking that arrived on the stream is merged in rather than replacing the
  // server render, so the page never blanks and never double lists a row.
  const merged: LaneBooking[] = [...day.bookings]
  const known = new Set(day.bookings.map((booking) => booking.id))
  for (const live of arrived) {
    if (known.has(live.id)) continue
    if (live.starts_at < day.start || live.starts_at >= day.end) continue
    known.add(live.id)
    merged.push({
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
    })
  }

  const dayMinutes = Math.round((new Date(day.end).getTime() - new Date(day.start).getTime()) / 60_000)
  const rows = Math.ceil(dayMinutes / SLOT_MINUTES)
  const lanes = day.resources.length > 0 ? day.resources : [{ id: 'unassigned', name: 'ហាង', kind: 'staff' }]

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

      <div className="mt-2 overflow-x-auto border border-rule/70">
        <div
          className="grid min-w-max"
          style={{ gridTemplateColumns: `4rem repeat(${lanes.length}, minmax(9rem, 1fr))` }}
        >
          <div className="sticky left-0 z-10 border-b border-hairline bg-paper px-2 py-2" />
          {lanes.map((resource) => (
            <div key={resource.id} className="border-b border-l border-hairline px-2 py-2">
              <p className="km truncate text-xs font-semibold text-ink">{resource.name}</p>
            </div>
          ))}

          <div className="sticky left-0 z-10 bg-paper">
            {Array.from({ length: rows }, (_, index) => {
              const at = new Date(new Date(day.start).getTime() + index * SLOT_MINUTES * 60_000).toISOString()
              return (
                <div
                  key={index}
                  style={{ height: ROW_HEIGHT }}
                  className="tnum border-b border-hairline px-2 text-[0.6875rem] leading-[28px] text-rule"
                >
                  {index % 2 === 0 ? toKhmerDigits(clockLabel(at)) : ''}
                </div>
              )
            })}
          </div>

          {lanes.map((resource) => (
            <div key={resource.id} className="relative border-l border-hairline">
              {Array.from({ length: rows }, (_, index) => (
                <div key={index} style={{ height: ROW_HEIGHT }} className="border-b border-hairline" />
              ))}

              {merged
                .filter((booking) =>
                  lanes.length === 1 && lanes[0]!.id === 'unassigned'
                    ? true
                    : booking.resourceId === resource.id || (booking.resourceId === null && resource.id === lanes[0]!.id),
                )
                .map((booking) => {
                  const top = (minutesFromDayStart(booking.startsAt, day.start) / SLOT_MINUTES) * ROW_HEIGHT
                  const span = Math.max(
                    ROW_HEIGHT,
                    ((new Date(booking.endsAt).getTime() - new Date(booking.startsAt).getTime()) / 60_000 / SLOT_MINUTES) * ROW_HEIGHT,
                  )
                  const balance = booking.priceMinor - booking.paidMinor
                  return (
                    <article
                      key={booking.id}
                      style={{ top, height: span }}
                      className={`absolute inset-x-1 overflow-hidden border px-1.5 py-1 ${TONE[booking.status] ?? TONE.pending}`}
                    >
                      <p className="km flex items-center gap-1 truncate text-[0.6875rem] font-semibold text-ink">
                        <ChannelIcon channel={booking.channel} className="size-3 shrink-0" />
                        {booking.customer}
                      </p>
                      <p className="km truncate text-[0.6875rem] text-rule">{booking.service}</p>
                      {/* The expected KHQR amount, from services.price_minor and
                          through formatMoney(), never a float and never a
                          hand-rolled string. */}
                      <p className="tnum truncate text-[0.6875rem] text-rule">
                        {formatMoney(booking.priceMinor, booking.currency)}
                        {balance > 0 ? ` · នៅជំពាក់ ${formatMoney(balance, booking.currency)}` : ' · បង់រួច'}
                      </p>
                    </article>
                  )
                })}
            </div>
          ))}
        </div>
      </div>

      {merged.length === 0 ? (
        <p className="km mt-3 border border-rule/70 px-3 py-6 text-center text-sm text-rule">
          មិនទាន់មានការណាត់សម្រាប់ថ្ងៃនេះទេ។
        </p>
      ) : null}
      <Fragment />
    </div>
  )
}

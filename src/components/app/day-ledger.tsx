import { CalendarDays, CalendarPlus, Clock3 } from 'lucide-react'
import type { DashboardSnapshot } from '@/lib/queries/dashboard.ts'
import { Frame } from './frame.tsx'
import { BookingRow } from './booking-row.tsx'
import { PanelHeader, PanelNote, PanelRow, PanelRows } from './panel.tsx'
import {
  cambodiaMinutes,
  durationKm,
  khmerDayLabel,
  minutesToKhmerTime,
  toKhmerDigits,
} from './dashboard-format.ts'

type Snapshot = DashboardSnapshot
type Booking = Snapshot['today']['bookings'][number]
type LedgerItem =
  | { kind: 'booking'; booking: Booking }
  | { kind: 'gap'; from: number; to: number }

function buildLedger(snapshot: Snapshot): LedgerItem[] {
  const openHours = snapshot.today.openMinutes
  const bookings = snapshot.today.bookings
    .filter((booking) => booking.status !== 'cancelled')
    .toSorted((a, b) => a.startsAt.localeCompare(b.startsAt))

  if (!openHours) return bookings.map((booking) => ({ kind: 'booking', booking }))

  let cursor = openHours.open
  const items: LedgerItem[] = []

  for (const booking of bookings) {
    const start = Math.max(openHours.open, cambodiaMinutes(booking.startsAt))
    const end = Math.min(openHours.close, cambodiaMinutes(booking.endsAt))
    if (start - cursor >= 45) items.push({ kind: 'gap', from: cursor, to: start })
    items.push({ kind: 'booking', booking })
    cursor = Math.max(cursor, end)
  }

  if (openHours.close - cursor >= 45) items.push({ kind: 'gap', from: cursor, to: openHours.close })
  return items
}

/**
 * An unbooked stretch. Named for what it is worth to her rather than for what it
 * is: "free 09:30 to 14:00, 270 minutes" is a measurement, and a shop owner
 * reading it standing up wants the hours and the fact that she could sell them.
 */
function GapRow({ from, to }: { from: number; to: number }) {
  return (
    <PanelRow>
      <div className="grid min-h-12 grid-cols-[3.75rem_minmax(0,1fr)] items-center gap-3 px-3 py-2 sm:px-4">
        <Clock3 className="mx-auto size-4 text-rule" strokeWidth={1.75} aria-hidden />
        <p className="km tnum text-sm text-rule">
          ទំនេរ {minutesToKhmerTime(from)} ដល់ {minutesToKhmerTime(to)}
          <span className="km"> · {durationKm(to - from)}</span>
        </p>
      </div>
    </PanelRow>
  )
}

export function DayLedger({ snapshot }: { snapshot: Snapshot }) {
  const items = buildLedger(snapshot)
  const bookings = snapshot.today.bookings.filter((booking) => booking.status !== 'cancelled')
  const openHours = snapshot.today.openMinutes

  return (
    <Frame id="today" aria-labelledby="today-heading" className="scroll-mt-4">
      <PanelHeader
        icon={CalendarDays}
        titleId="today-heading"
        title={`ថ្ងៃនេះ · ${khmerDayLabel(snapshot.today.date)}`}
        note={
          openHours
            ? `បើក ${minutesToKhmerTime(openHours.open)} ដល់ ${minutesToKhmerTime(openHours.close)}`
            : 'ហាងបិទថ្ងៃនេះ'
        }
        trailing={
          <p className="km tnum shrink-0 text-xs text-rule">
            {toKhmerDigits(bookings.length)} ការណាត់
          </p>
        }
      />

      {bookings.length === 0 ? (
        <PanelNote icon={CalendarPlus} title="ថ្ងៃនេះមិនទាន់មានការណាត់ទេ" className="min-h-28">
          <p className="km mt-0.5 text-sm text-rule">
            ពេលអតិថិជនកក់តាមតេលេក្រាម ការណាត់នឹងឡើងនៅទីនេះដោយខ្លួនឯង។ បើមាននរណាមកផ្ទាល់ ប្រាប់ Moni ឱ្យកត់ទុក។
          </p>
          <a href="#moni" className="km mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-ink underline decoration-rule underline-offset-4">
            ប្រាប់ Moni ឥឡូវនេះ
          </a>
        </PanelNote>
      ) : (
        <PanelRows>
          {items.map((item, index) =>
            item.kind === 'booking' ? (
              <BookingRow key={item.booking.id} booking={item.booking} />
            ) : (
              <GapRow key={`gap-${item.from}-${item.to}-${index}`} from={item.from} to={item.to} />
            ),
          )}
        </PanelRows>
      )}
    </Frame>
  )
}

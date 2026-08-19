'use client'
// Searched first: shadcn Table is a data grid, not a row of ceremony, and neither
// registry has a list row that carries a state seal. Hand built in the world's
// vocabulary because the row IS the invitation.
import { Seal, type SealState } from './seal.tsx'
import { moneyKm, toKhmerDigits } from '@/lib/demo.ts'
import type { DemoBooking } from '@/lib/demo.ts'

const sealFor = (s: DemoBooking['status']): SealState =>
  s === 'completed' ? 'paid' : s === 'no_show' || s === 'cancelled' ? 'void' : 'waiting'

export function BookingRow({
  booking,
  pressed,
  onToggle,
}: {
  booking: DemoBooking
  pressed: boolean
  onToggle: () => void
}) {
  const state = sealFor(booking.status)
  const isVoid = state === 'void'
  const balance = booking.priceMinor - booking.paidMinor

  return (
    <li className="relative border-t border-hairline first:border-t-0">
      <div className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3.5 ${isVoid ? 'opacity-55' : ''}`}>
        <p className="km tnum w-12 shrink-0 text-sm text-rule">{toKhmerDigits(booking.startsAt)}</p>

        <div className="min-w-0">
          <p className="km truncate text-lg font-medium text-ink">{booking.customer}</p>
          {/* void is marked by striking the terms, never the person's name */}
          <p className={`km tnum text-sm text-rule ${isVoid ? 'line-through decoration-rule/70' : ''}`}>
            {booking.service} · {moneyKm(booking.priceMinor, booking.currency)}
            {balance > 0 && !isVoid ? ` · នៅសល់ ${moneyKm(balance, booking.currency)}` : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={onToggle}
          disabled={isVoid}
          aria-pressed={state === 'paid'}
          aria-label={
            state === 'paid'
              ? `Mark ${booking.customer} unpaid`
              : `Mark ${booking.customer} paid`
          }
          className="-m-2 rounded-sm p-2 transition-opacity hover:opacity-70 active:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Seal state={state} pressed={pressed} />
        </button>
      </div>
    </li>
  )
}

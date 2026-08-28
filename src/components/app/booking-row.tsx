'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { DashboardSnapshot } from '@/lib/queries/dashboard.ts'
import { RECEIPT_EVENT, type MoniReceiptEvent } from '@/lib/moni-events.ts'
import { Seal, type SealState } from './seal.tsx'
import { cambodiaTime, moneyKm, toKhmerDigits } from './dashboard-format.ts'

type Booking = DashboardSnapshot['today']['bookings'][number]

const STATUS_LABEL: Record<Booking['status'], string> = {
  pending: 'កំពុងរង់ចាំបញ្ជាក់',
  confirmed: 'បានបញ្ជាក់',
  completed: 'បានបញ្ចប់',
  cancelled: 'បានលុប',
  no_show: 'មិនបានមក',
}

function sealFor(booking: Booking): SealState {
  if (booking.status === 'completed' && booking.balanceMinor <= 0) return 'paid'
  if (booking.status === 'cancelled' || booking.status === 'no_show') return 'void'
  return 'waiting'
}

export function BookingRow({ booking }: { booking: Booking }) {
  const reduceMotion = useReducedMotion()
  const [highlighted, setHighlighted] = useState(false)
  const sealState = sealFor(booking)
  const isVoid = sealState === 'void'
  const start = toKhmerDigits(cambodiaTime(booking.startsAt))
  const end = toKhmerDigits(cambodiaTime(booking.endsAt))

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    function receive(event: Event) {
      const receipt = (event as CustomEvent<MoniReceiptEvent>).detail
      if (receipt.status !== 'success' || receipt.bookingCode !== booking.code) return
      setHighlighted(true)
      timer = setTimeout(() => setHighlighted(false), reduceMotion ? 0 : 900)
    }

    window.addEventListener(RECEIPT_EVENT, receive)
    return () => {
      window.removeEventListener(RECEIPT_EVENT, receive)
      if (timer) clearTimeout(timer)
    }
  }, [booking.code, reduceMotion])

  return (
    <motion.li
      className="border-t border-hairline first:border-t-0"
      initial={false}
      animate={{ backgroundColor: highlighted ? 'rgba(5, 150, 105, 0.10)' : 'rgba(5, 150, 105, 0)' }}
      transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={`grid min-h-20 grid-cols-[3.75rem_minmax(0,1fr)_2.25rem] items-center gap-3 px-3 py-2.5 sm:px-4 ${isVoid ? 'opacity-55' : ''}`}>
        <div className="tnum text-rule">
          <p className="text-sm font-medium text-ink">{start}</p>
          <p className="text-xs">{end}</p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="km text-base font-semibold text-ink">{booking.customer}</p>
            <p className="km text-xs text-rule">{STATUS_LABEL[booking.status]}</p>
          </div>
          <p className={`km text-sm text-rule ${isVoid ? 'line-through decoration-rule/70' : ''}`}>
            {booking.service} · {booking.resource}
          </p>
          {booking.balanceMinor > 0 && !isVoid ? (
            <p className="km tnum text-xs text-rule">
              នៅសល់ {moneyKm(booking.balanceMinor, booking.currency)} · {booking.code}
            </p>
          ) : null}
        </div>

        <span className="flex size-9 items-center justify-center" aria-label={STATUS_LABEL[booking.status]}>
          <Seal state={sealState} />
        </span>
      </div>
    </motion.li>
  )
}

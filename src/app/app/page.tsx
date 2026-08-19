'use client'
import { useState } from 'react'
import { Composer } from '@/components/app/composer.tsx'
import { ServicesTable } from '@/components/app/services-table.tsx'
import { Takings } from '@/components/app/takings.tsx'
import { BookingRow } from '@/components/app/booking-row.tsx'
import { TabBar } from '@/components/app/tab-bar.tsx'
import { Frame, Plate } from '@/components/app/frame.tsx'
import { BOOKINGS, SHOP, THREADS, QUOTA, toKhmerDigits, type DemoBooking } from '@/lib/demo.ts'
import type { ParseResponse } from '@/lib/parse-types.ts'
import { ArrowUpRight, QrCode, MessagesSquare } from 'lucide-react'

export default function App() {
  const [parsed, setParsed] = useState<ParseResponse | null>(null)
  const [bookings, setBookings] = useState<DemoBooking[]>(BOOKINGS)
  const [pressed, setPressed] = useState<string | null>(null)

  const collected = bookings.reduce((n, b) => n + b.paidMinor, 0)
  const waiting = bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed').length
  const ordered = [...bookings].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const needsOwner = THREADS.filter((t) => t.needsOwner)

  function togglePaid(code: string) {
    setPressed(code)
    setBookings((rows) =>
      rows.map((b) =>
        b.code !== code
          ? b
          : b.status === 'completed'
            ? { ...b, status: 'confirmed', paidMinor: 0 }
            : { ...b, status: 'completed', paidMinor: b.priceMinor },
      ),
    )
    setTimeout(() => setPressed(null), 220)
  }

  return (
    // pb-24 on mobile clears the nav, which is now pinned to the viewport
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 lg:px-8 lg:pb-8">
      <Plate
        name={SHOP.name}
        meta={`${SHOP.province} · ${SHOP.openLabel} · ${toKhmerDigits(QUOTA.used)}/${toKhmerDigits(QUOTA.limit)} ប្រតិបត្តិការ`}
      />

      {/* Mobile order follows STORY: what was collected, what needs her, then who is
          coming. On desktop the rail returns to the right column. */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
        <section className="order-1 lg:order-none lg:col-start-1 lg:row-start-1">
          {parsed ? <ServicesTable result={parsed} /> : <Composer onParsed={setParsed} />}
        </section>

        <div className="order-2 lg:order-none lg:col-start-2 lg:row-start-1">
          <Takings minor={collected} waiting={waiting} />
        </div>

        <aside className="order-4 flex flex-col gap-6 lg:order-none lg:col-start-2 lg:row-start-2">
        <section aria-labelledby="needs-h" className="border border-rule/40">
          <header className="flex items-center gap-2 border-b border-hairline px-4 py-3">
            <MessagesSquare size={15} strokeWidth={1.75} className="text-rule" aria-hidden />
            <h2 id="needs-h" className="km text-sm font-semibold text-ink">
              ត្រូវការអ្នក · {toKhmerDigits(needsOwner.length)}
            </h2>
          </header>
          <ul>
            {needsOwner.map((t) => (
              <li key={t.id} className="border-t border-hairline first:border-t-0">
                <button
                  type="button"
                  className="group flex w-full items-start gap-2 px-4 py-3 text-left transition-colors hover:bg-ink/[0.04]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="km block text-sm font-medium text-ink">{t.customer}</span>
                    <span className="km block truncate text-xs text-rule">{t.preview}</span>
                  </span>
                  <ArrowUpRight
                    size={14}
                    strokeWidth={1.75}
                    className="mt-0.5 shrink-0 text-rule group-hover:text-ink"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
          <p className="km border-t border-hairline px-4 py-2 text-xs text-rule">
            ជំនួយការឈប់ឆ្លើយ ពេលមិនច្បាស់ ហើយផ្ទេរមកអ្នក។
          </p>
        </section>

        <section aria-labelledby="qr-h" className="border border-rule/40">
          <header className="flex items-center gap-2 border-b border-hairline px-4 py-3">
            <QrCode size={15} strokeWidth={1.75} className="text-rule" aria-hidden />
            <h2 id="qr-h" className="km text-sm font-semibold text-ink">
              KHQR កំពុងរង់ចាំ
            </h2>
          </header>
          <div className="px-4 py-3">
            <p className="km text-sm text-ink">ដារ៉ា · សក់អ៊ុត</p>
            <p className="km tnum mt-0.5 text-xs text-rule">កក់ ២០,០០០៛ · ផុតកំណត់ក្នុង ៩ នាទី</p>
          </div>
        </section>

        </aside>

        {/* the ledger is the thesis object, so it follows takings directly */}
        <Frame
          aria-labelledby="today-h"
          className="order-3 lg:order-none lg:col-start-1 lg:row-start-2"
        >
          <header className="flex items-baseline justify-between border-b border-hairline px-4 py-3">
            <h2 id="today-h" className="km text-sm font-semibold text-ink">
              ថ្ងៃនេះ · {toKhmerDigits(ordered.length)} ការណាត់
            </h2>
            <span className="km tnum text-xs text-rule">{toKhmerDigits(waiting)} រង់ចាំ</span>
          </header>
          <ul>
            {ordered.map((b) => (
              <BookingRow
                key={b.code}
                booking={b}
                pressed={pressed === b.code}
                onToggle={() => togglePaid(b.code)}
              />
            ))}
          </ul>
        </Frame>
      </div>

      <p className="km pt-6 text-center text-xs text-rule">
        ទិន្នន័យសាកល្បង · demo shop, not a real business
      </p>

      <div className="lg:hidden">
        <TabBar />
      </div>
    </div>
  )
}

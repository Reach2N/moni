'use client'
import type { DashboardSnapshot } from '@/lib/queries/dashboard.ts'
import type { CurrencyCode } from '@/lib/types.ts'
import { moneyKm, moneyPartsKm, moneyTotalKm, toKhmerDigits } from '@/lib/format/khmer.ts'
import { Figure } from './figure.tsx'

/**
 * The committed region. One dark panel on the paper, the way an invitation prints
 * its ceremonial block, and the only place colour carries weight.
 *
 * It answers the second of the owner's three opening questions, "did they pay",
 * and it answers it in two halves, because the half she acts on is the second
 * one: money already in the drawer, and money still owed to her today. A takings
 * figure alone reads like a report. A takings figure next to a debt reads like a
 * shop.
 *
 * This panel was built for the first cut, then left unmounted, which meant the
 * surface had no answer to "did they pay" at all. It now reads the live snapshot
 * rather than the fixture module.
 *
 * The label is not letterspaced. DESIGN.md pins 0.2em, and 0.2em pulls Khmer
 * consonant clusters apart from their coeng subscripts, which PRODUCT.md settles
 * outright: legibility outranks atmosphere in every conflict.
 */
export function Takings({ snapshot }: { snapshot: DashboardSnapshot }) {
  const currency = snapshot.business.currency
  const collected = snapshot.today.collectedByCurrency[currency] ?? 0
  const { amount, symbol, symbolAfter } = moneyPartsKm(collected, currency)
  const owed = moneyTotalKm(snapshot.today.owedByCurrency)

  // A shop can quote riel and dollars in the same day. The figure holds the
  // shop's own currency and anything else is stated beside it rather than added
  // into a total that would be a lie.
  const otherCurrencies = Object.entries(snapshot.today.collectedByCurrency)
    .filter(([code, minor]) => code !== currency && minor > 0)
    .map(([code, minor]) => moneyKm(minor, code as CurrencyCode))

  return (
    <section className="bg-ink px-4 py-4 text-on-ink sm:px-5 sm:py-5" aria-labelledby="takings-label">
      <p id="takings-label" className="km text-sm text-on-ink-dim">
        លុយដែលអ្នកទទួលបានថ្ងៃនេះ
      </p>

      <p className="tnum mt-1 flex min-w-0 items-baseline gap-1.5 overflow-hidden text-seal">
        {/* The One Numeral System Rule applies to the biggest element too. The
            digits come from the Khmer locale, and Figure animates them because
            no library digit track carries non-Latin numerals. */}
        {symbolAfter ? null : <span className="text-2xl font-medium leading-none">{symbol}</span>}
        <Figure text={amount} className="text-[2.5rem] font-semibold leading-none" />
        {symbolAfter ? <span className="km text-2xl font-medium leading-none">{symbol}</span> : null}
      </p>

      {otherCurrencies.length > 0 ? (
        <p className="km tnum mt-1 text-sm text-on-ink-dim">និង {otherCurrencies.join(' និង ')}</p>
      ) : null}

      <div className="mt-4 border-t border-on-ink-dim/25 pt-3">
        {owed ? (
          <p className="km tnum text-sm text-on-ink">
            នៅត្រូវទទួល <span className="font-semibold">{owed}</span> ទៀត
          </p>
        ) : (
          <p className="km text-sm text-on-ink-dim">អតិថិជនថ្ងៃនេះបានបង់គ្រប់គ្នាហើយ</p>
        )}
        <p className="km tnum mt-0.5 text-sm text-on-ink-dim">
          {snapshot.today.waitingCount > 0
            ? `នៅសល់ ${toKhmerDigits(snapshot.today.waitingCount)} នាក់មិនទាន់មក`
            : 'គ្មានអ្នកណារង់ចាំទៀតទេ'}
        </p>
      </div>
    </section>
  )
}

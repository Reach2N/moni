'use client'
import { Figure } from './figure.tsx'
import { khmerNumber, toKhmerDigits } from '@/lib/demo.ts'

/**
 * The committed region. One dark panel on the paper, the way an invitation prints
 * its ceremonial block, and the only place colour carries weight.
 *
 * Quantities are the interface: the figure owns fixed digit positions and tabular
 * numerals so it never reflows as it grows through the day.
 */
export function Takings({ minor, waiting }: { minor: number; waiting: number }) {
  return (
    <section className="bg-ink px-5 pt-6 pb-5 text-on-ink" aria-labelledby="takings-label">
      <p id="takings-label" className="km text-xs tracking-[0.2em] text-on-ink-dim">
        ចំណូលថ្ងៃនេះ
      </p>

      <p className="tnum mt-1 flex min-w-0 items-baseline gap-1.5 overflow-hidden text-seal">
        {/* The One Numeral System Rule applies to the biggest element too. The
            digits come from the Khmer locale, and Figure animates them because
            no library digit track carries non-Latin numerals. */}
        <Figure text={khmerNumber(minor)} className="text-[2.5rem] font-semibold leading-none" />
        <span className="km text-2xl font-medium leading-none">៛</span>
      </p>

      <p className="km tnum mt-2 text-sm text-on-ink-dim">
        {khmerNumber(minor)} រៀល
      </p>

      <div className="mt-4 flex items-center gap-2 border-t border-on-ink-dim/25 pt-3">
        <span className="km text-sm text-on-ink-dim">
          {waiting > 0 ? `${toKhmerDigits(waiting)} នាក់កំពុងរង់ចាំ` : 'គ្មានអ្នករង់ចាំ'}
        </span>
      </div>
    </section>
  )
}

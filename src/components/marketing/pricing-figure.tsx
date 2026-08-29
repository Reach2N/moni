'use client'

/**
 * The free-tier allowance, counted up on entry.
 *
 * This exists because NumberTicker takes a `formatValue` FUNCTION, and a
 * function cannot cross the server/client boundary: passing one from the server
 * page would fail to serialise. So the locale crosses instead, as a string, and
 * the formatter is built here on the client.
 *
 * Khmer numerals come from src/lib/format/khmer.ts. Formatting a quantity
 * through a km-KH locale is the hydration bug documented in that file: Node and
 * Chrome disagree about which separator is the group and which is the decimal.
 */

import { NumberTicker } from '@/components/velora/number-ticker.tsx'
import { khmerNumber } from '@/lib/format/khmer.ts'
import type { Locale } from '@/lib/marketing/copy.ts'

export function PricingFigure({
  value,
  unit,
  locale,
}: {
  value: number
  unit: string
  locale: Locale
}) {
  const format = (n: number) => {
    const rounded = Math.round(n)
    return locale === 'km' ? khmerNumber(rounded) : rounded.toLocaleString('en-US')
  }

  return (
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <NumberTicker
        value={value}
        formatValue={format}
        className="tnum text-5xl font-semibold tracking-[-0.04em] text-label sm:text-6xl"
      />
      <span className="text-lg text-label-2">{unit}</span>
    </p>
  )
}

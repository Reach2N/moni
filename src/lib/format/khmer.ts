/**
 * Every quantity the owner reads passes through here, so the numeral system is
 * never mixed. This module is the single source: a demo fixture module and
 * `components/app/dashboard-format.ts` each carried their own copy of
 * `toKhmerDigits` and `moneyKm`, which is three chances for the two mechanisms to
 * drift apart on the same screen.
 *
 * Client safe on purpose. The signal engine runs on the server and the ledger
 * renders on the client, and both quote the same amounts.
 */
import { CURRENCIES } from '../types.ts'
import type { CurrencyCode } from '../types.ts'
import { cambodiaDayOfWeek } from '../time/cambodia.ts'

const KHMER_DIGITS = '០១២៣៤៥៦៧៨៩'

export const KM_LOCALE = 'km-KH'

/**
 * Separators are pinned, digits are transliterated. Both halves are scar tissue.
 *
 * The `-u-nu-khmr` locale extension is the first trap: Chrome ignores it and
 * silently resolves to `latn`, so the extension form passes a Node unit test and
 * renders Latin digits in the browser.
 *
 * Passing `numberingSystem: 'khmr'` as an option fixes that and walks into the
 * second, worse trap. Node and Chrome do not agree on what km-KH separators are,
 * and they do not merely differ, they are swapped:
 *
 *     15000 -> Node (ICU 78) ១៥.០០០     Chrome 151 ១៥,០០០
 *     5.00  -> Node (ICU 78) ៥,០០       Chrome 151 ៥.០០
 *
 * On a server rendered page that means $5.00 is printed "$៥,០០" into the HTML
 * and "$៥.០០" after hydration: a decimal point that moves depending on which
 * runtime drew it, on a surface whose whole promise is that the owner can see
 * exactly what was charged (PRODUCT.md principle 5). It is also a guaranteed
 * hydration mismatch on every money string.
 *
 * So the grouping is taken from a locale whose separators are the same in every
 * ICU build, and the digits are transliterated afterwards. DESIGN.md asked for
 * Khmer numerals with "the comma separator the rest of the surface uses"; this
 * is the only mechanism that delivers both on both runtimes.
 */
const PINNED_LOCALE = 'en-US'

/** Transliterates digits inside an already-formatted string. */
export function toKhmerDigits(value: string | number) {
  return String(value).replace(/\d/g, (digit) => KHMER_DIGITS[Number(digit)]!)
}

/** A bare count or measure in Khmer numerals. */
export function khmerNumber(value: number) {
  return toKhmerDigits(new Intl.NumberFormat(PINNED_LOCALE, { useGrouping: true }).format(value))
}

/** Money from integer minor units. KHR has 0 decimals, USD has 2. */
export function moneyKm(minor: number, currency: CurrencyCode) {
  const definition = CURRENCIES[currency]
  const major = minor / 10 ** definition.decimals
  const formatted = toKhmerDigits(new Intl.NumberFormat(PINNED_LOCALE, {
    useGrouping: true,
    minimumFractionDigits: definition.decimals,
    maximumFractionDigits: definition.decimals,
  }).format(major))
  return definition.symbolAfter ? `${formatted}${definition.symbol}` : `${definition.symbol}${formatted}`
}

/**
 * A shop may quote riel and dollars in the same day, so a total is a list of
 * amounts rather than one number. Joined with a Khmer "and" so it reads as a
 * sentence rather than as a row of figures.
 */
export function moneyTotalKm(byCurrency: Record<string, number>) {
  return Object.entries(byCurrency)
    .filter(([, minor]) => minor > 0)
    .map(([currency, minor]) => moneyKm(minor, currency as CurrencyCode))
    .join(' និង ')
}

/** "០២:៣០" from minutes past midnight. */
export function minutesToKhmerTime(minutes: number) {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return toKhmerDigits(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
}

/**
 * A duration the owner can act on. Below an hour she thinks in minutes, above it
 * in hours, and the boundary is never expressed as "90 minutes".
 */
export function durationKm(minutes: number) {
  if (minutes < 60) return `${toKhmerDigits(minutes)} នាទី`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (rest === 0) return `${toKhmerDigits(hours)} ម៉ោង`
  return `${toKhmerDigits(hours)} ម៉ោង ${toKhmerDigits(rest)} នាទី`
}

/**
 * Money split into its parts, for the committed region, where the amount is set
 * at 2.5rem and the currency mark rides beside it at a different size. Same
 * formatting path as `moneyKm`, so the two can never disagree on a screen that
 * shows both.
 */
export function moneyPartsKm(minor: number, currency: CurrencyCode) {
  const definition = CURRENCIES[currency]
  const major = minor / 10 ** definition.decimals
  const amount = toKhmerDigits(new Intl.NumberFormat(PINNED_LOCALE, {
    useGrouping: true,
    minimumFractionDigits: definition.decimals,
    maximumFractionDigits: definition.decimals,
  }).format(major))
  return { amount, symbol: definition.symbol, symbolAfter: definition.symbolAfter }
}

const KHMER_WEEKDAYS = [
  'ថ្ងៃអាទិត្យ',
  'ថ្ងៃចន្ទ',
  'ថ្ងៃអង្គារ',
  'ថ្ងៃពុធ',
  'ថ្ងៃព្រហស្បតិ៍',
  'ថ្ងៃសុក្រ',
  'ថ្ងៃសៅរ៍',
] as const

/** Sunday-indexed weekday name for a YYYY-MM-DD Cambodian date. */
export function khmerWeekday(date: string) {
  return KHMER_WEEKDAYS[cambodiaDayOfWeek(date)] ?? 'ថ្ងៃនេះ'
}

/** "ថ្ងៃពុធ ទី១៩ ខែ៨". The ledger header and the closure notice share it. */
export function khmerDayLabel(date: string) {
  const [, month, day] = date.split('-')
  return `${khmerWeekday(date)} ទី${toKhmerDigits(Number(day))} ខែ${toKhmerDigits(Number(month))}`
}

/**
 * Free text stored bilingually as "ខ្មែរ / English", reduced to the half this
 * surface reads. Closure reasons arrive in that shape, and printing both halves
 * put English prose on a Khmer notice board. Falls back to the whole string when
 * there is no Khmer in it, because dropping the only text there is would be
 * worse than showing text she has to puzzle over.
 */
export function khmerHalf(text: string) {
  const parts = text.split(/\s*[/|]\s*/)
  const khmer = parts.find((part) => /[ក-៓]/.test(part))
  return (khmer ?? text).trim()
}

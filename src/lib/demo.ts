/**
 * Demo data. Fictional, and labelled as such in the UI.
 * PRODUCT.md: no real users, no testimonials, nothing here may be shown as real.
 * Mirrors db/seed.sql so the switch to Supabase is a query swap, not a reshape.
 */
import { CURRENCIES } from './types.ts'
import type { BookingStatus, CurrencyCode } from './types.ts'

export type DemoBooking = {
  code: string
  startsAt: string
  endsAt: string
  customer: string
  service: string
  serviceEn: string
  resource: string
  status: BookingStatus
  priceMinor: number
  currency: CurrencyCode
  paidMinor: number
  channel: 'telegram' | 'instagram' | 'web' | 'walk_in'
}

export const SHOP = {
  name: 'ហាងកាត់សក់ សុខា',
  nameEn: 'Sokha Beauty',
  province: 'តាកែវ',
  currency: 'KHR' as CurrencyCode,
  openLabel: '០៨:០០ ដល់ ១៩:០០',
}

export const BOOKINGS: DemoBooking[] = [
  { code: 'MN4K2P', startsAt: '09:00', endsAt: '09:30', customer: 'រតនា', service: 'កាត់សក់', serviceEn: 'Haircut', resource: 'សុខា', status: 'completed', priceMinor: 15000, currency: 'KHR', paidMinor: 15000, channel: 'telegram' },
  { code: 'MN8L4R', startsAt: '10:30', endsAt: '10:50', customer: 'សុភា', service: 'លាងសក់', serviceEn: 'Wash', resource: 'ស្រីមុំ', status: 'completed', priceMinor: 8000, currency: 'KHR', paidMinor: 8000, channel: 'walk_in' },
  { code: 'MN7Q1A', startsAt: '14:00', endsAt: '15:45', customer: 'សុភាព', service: 'លាបសក់', serviceEn: 'Colouring', resource: 'សុខា', status: 'confirmed', priceMinor: 45000, currency: 'KHR', paidMinor: 15000, channel: 'telegram' },
  { code: 'MN9X5C', startsAt: '16:30', endsAt: '18:45', customer: 'ដារ៉ា', service: 'សក់អ៊ុត', serviceEn: 'Perm', resource: 'ស្រីមុំ', status: 'pending', priceMinor: 60000, currency: 'KHR', paidMinor: 0, channel: 'instagram' },
  { code: 'MN2B8D', startsAt: '11:15', endsAt: '11:35', customer: 'ចាន់', service: 'លាងសក់', serviceEn: 'Wash', resource: 'សុខា', status: 'no_show', priceMinor: 8000, currency: 'KHR', paidMinor: 0, channel: 'telegram' },
]

/** Takings counts collected money, not booked money. */
export const collectedMinor = BOOKINGS.reduce((n, b) => n + b.paidMinor, 0)
export const waitingCount = BOOKINGS.filter((b) => b.status === 'pending' || b.status === 'confirmed').length

/** Khmer numerals, because the shop reads its own numbers. */
const KH = '០១២៣៤៥៦៧៨៩'
export const toKhmerDigits = (s: string | number): string =>
  String(s).replace(/\d/g, (d) => KH[Number(d)]!)

/**
 * Every quantity on the surface goes through this, so the numeral system is never
 * mixed. Digits come from CLDR rather than a character swap.
 *
 * The numbering system MUST be passed as an option, not as a `-u-nu-khmr` locale
 * extension: Chrome ignores the extension and silently resolves to `latn`
 * (`supportedLocalesOf(['km-KH-u-nu-khmr'])` returns `[]`), so the extension form
 * renders Latin digits in the browser while looking correct under Node's ICU. The
 * option form works in both and keeps the comma separator the rest of the UI uses.
 */
export const KM_LOCALE = 'km-KH'
const KM_NUM: Intl.NumberFormatOptions = { useGrouping: true, numberingSystem: 'khmr' }

export const khmerNumber = (n: number): string =>
  new Intl.NumberFormat(KM_LOCALE, KM_NUM).format(n)

/** Money in Khmer numerals, symbol placement from types.ts. */
export const moneyKm = (minor: number, currency: CurrencyCode): string => {
  const c = CURRENCIES[currency]
  const major = minor / 10 ** c.decimals
  const n = new Intl.NumberFormat(KM_LOCALE, {
    ...KM_NUM,
    minimumFractionDigits: c.decimals,
    maximumFractionDigits: c.decimals,
  }).format(major)
  return c.symbolAfter ? `${n}${c.symbol}` : `${c.symbol}${n}`
}

export type DemoThread = { id: string; customer: string; preview: string; needsOwner: boolean; channel: DemoBooking['channel'] }
export const THREADS: DemoThread[] = [
  { id: 't1', customer: 'ដារ៉ា', preview: 'សុំបញ្ចុះតម្លៃ សក់អ៊ុត ៤០,០០០ បានទេ?', needsOwner: true, channel: 'instagram' },
  { id: 't2', customer: 'ស្រីនាង', preview: 'ថ្ងៃអាទិត្យបើកទេបង?', needsOwner: true, channel: 'telegram' },
  { id: 't3', customer: 'សុភាព', preview: 'បានហើយ អរគុណច្រើន', needsOwner: false, channel: 'telegram' },
]

export type DemoService = { name: string; nameEn: string; priceMinor: number; durationMin: number }
export const SERVICES: DemoService[] = [
  { name: 'កាត់សក់', nameEn: 'Haircut', priceMinor: 15000, durationMin: 30 },
  { name: 'លាងសក់', nameEn: 'Wash and blow dry', priceMinor: 8000, durationMin: 20 },
  { name: 'លាបសក់', nameEn: 'Hair colouring', priceMinor: 45000, durationMin: 90 },
  { name: 'សក់អ៊ុត', nameEn: 'Perm', priceMinor: 60000, durationMin: 120 },
  { name: 'តុបតែងមុខ', nameEn: 'Makeup', priceMinor: 25000, durationMin: 45 },
]

export const QUOTA = { used: 38, limit: 100 }

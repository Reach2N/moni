import { formatMoney } from '@/lib/types.ts'
import type { StorefrontData } from './types.ts'

export const DAY_NAMES_KM = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'] as const

/** Monday first, the way a shop's week reads. dow 0 is Sunday, so it goes last. */
export function orderedHours(hours: StorefrontData['shop']['hours']) {
  return [...hours].sort((a, b) => ((a.dow + 6) % 7) - ((b.dow + 6) % 7))
}

/** Every price on a public site goes through formatMoney(). Never a float. */
export function money(service: StorefrontData['services'][number]) {
  return formatMoney(service.priceMinor, service.currency)
}

import { formatMoney } from '@/lib/types.ts'
import type { StorefrontData } from './types.ts'

export const DAY_NAMES_KM = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'] as const

/** Monday first, the way a shop's week reads. dow 0 is Sunday, so it goes last. */
export function orderedHours(hours: StorefrontData['shop']['hours']) {
  return [...hours].sort((a, b) => ((a.dow + 6) % 7) - ((b.dow + 6) % 7))
}

/** Every price on a public site goes through formatMoney(). Never a float. */
export function money(item: StorefrontData['items'][number]) {
  return formatMoney(item.priceMinor, item.currency)
}

/**
 * The catalogue grouped the way a menu reads, with ungrouped items last.
 *
 * A shop with six things and no categories gets one unnamed group, which is
 * correct: inventing headings for a short menu makes it look like a form.
 */
export function groupedItems(items: StorefrontData['items']) {
  const groups = new Map<string, StorefrontData['items']>()
  for (const item of items) {
    const key = item.category?.trim() || ''
    const bucket = groups.get(key)
    if (bucket) bucket.push(item)
    else groups.set(key, [item])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
    .map(([category, rows]) => ({ category: category || null, rows }))
}

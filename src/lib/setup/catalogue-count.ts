import { catalogKindFor, sellsFor, type BookingUnit } from '../types.ts'

/**
 * How many of a parsed catalogue's rows will land in `services` versus
 * `products`, by the same rule `planCatalogue` (setup/plan.ts) applies at
 * save time: `catalogKindFor`, read off the business type's `sells` and each
 * row's own unit.
 *
 * Kept as its own pure sibling, no `server-only` and no database import, so
 * `ShopSetup` (a client component reviewing a parse before it is saved) and
 * `db/test.mjs` can both call it: the review screen used to count every
 * parsed row as a "service", which told a cafe owner she was about to save
 * services when her whole menu was about to become products.
 */
export function catalogueCounts(
  businessTypeId: string,
  rows: readonly { unit: string }[],
): { services: number; products: number } {
  let services = 0
  let products = 0
  for (const row of rows) {
    if (catalogKindFor(businessTypeId, row.unit as BookingUnit) === 'product') products += 1
    else services += 1
  }
  return { services, products }
}

/**
 * Which noun a shop with nothing parsed yet should be told about. With zero
 * rows there is no unit to read a kind off, so this falls back to the same
 * signal `product-list.tsx` uses to decide which kind leads for a business
 * that sells both: a time-only business (a salon with an empty parse) has no
 * roster, but a goods-or-both business (a cafe with an empty parse) has no
 * menu, and telling every zero case "services" told a cafe owner she was
 * missing a roster she never intended to have.
 */
export function catalogueZeroKind(businessTypeId: string): 'service' | 'product' {
  return sellsFor(businessTypeId) === 'time' ? 'service' : 'product'
}

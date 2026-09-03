import { catalogKindFor, type BookingUnit } from '../types.ts'

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

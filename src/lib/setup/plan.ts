import { catalogKindFor } from '../types.ts'
import { normalizeServiceName, type SetupRequest } from './schema.ts'

/**
 * Pure planning for the setup spine's catalogue save.
 *
 * No `server-only`, no database import: this is deliberately a sibling of
 * `schema.ts`, which `db/test.mjs:20` already imports without the
 * `server-only` trap that blocks `persist.ts` and `db.ts` (a module outside
 * the `react-server` export condition throws on import, which is the right
 * behaviour in a route handler and a dead end in a plain Node test). Keeping
 * the split, the name matching, the field mapping and the deactivate
 * decisions in here, with `persist.ts` reduced to two selects, this plan and
 * the writes it describes, is what makes the routing fix and the
 * kind-change guarantee provable outside a live Supabase project.
 */

type CatalogueRow = SetupRequest['shop']['services'][number]
type ExistingRow = { id: string; name: string; active: boolean }

export type ServiceValues = {
  name: string
  name_en: string | null
  description: string | null
  price_minor: number
  currency: string
  unit: string
  duration_min: number
  buffer_min: number
  capacity: number
  requires_deposit: boolean
  deposit_minor: number | null
  active: boolean
  sort_order: number
}

export type ProductValues = {
  name: string
  name_en: string | null
  description: string | null
  price_minor: number
  currency: string
  active: boolean
  sort_order: number
}

/**
 * What a re-parse is allowed to write over an existing product. `active` is
 * missing from the type, not merely left unset at the call site, so that
 * putting it back is a type error rather than a quiet regression.
 */
export type ProductUpdateValues = Omit<ProductValues, 'active'>

export type CataloguePlan = {
  services: {
    updates: Array<{ id: string; values: ServiceValues }>
    inserts: ServiceValues[]
    deactivate: string[]
  }
  products: {
    updates: Array<{ id: string; values: ProductUpdateValues }>
    inserts: ProductValues[]
    // Always empty. See the comment above the `products` plan below: setup
    // never deactivates a product, so nothing is ever computed for this list.
    deactivate: string[]
  }
}

/**
 * The latest active row per normalised name. A name can repeat across an
 * active row and one or more inactive ones (an item the owner archived, then
 * described again in a later parse); the active one is what a re-parse
 * should match against, so it wins the collision.
 */
function byActiveName(rows: readonly ExistingRow[]) {
  const map = new Map<string, ExistingRow>()
  for (const row of rows) {
    const key = normalizeServiceName(row.name)
    const current = map.get(key)
    if (!current || (row.active && !current.active)) map.set(key, row)
  }
  return map
}

export function planCatalogue(
  businessTypeId: string,
  rows: readonly CatalogueRow[],
  existingServices: readonly ExistingRow[],
  existingProducts: readonly ExistingRow[],
): CataloguePlan {
  // One parsed array, two tables. A cafe's cappuccino and a salon's haircut
  // both arrive as "a thing the owner listed", but only one of them can hold
  // a photo or be sold without booking anyone's time. `catalogKindFor` reads
  // the business type's `sells` plus the row's own unit, so the split needs
  // no new input field and no change to what the parse produces.
  const serviceRows = rows.filter((row) => catalogKindFor(businessTypeId, row.unit) === 'service')
  const productRows = rows.filter((row) => catalogKindFor(businessTypeId, row.unit) === 'product')

  const serviceByName = byActiveName(existingServices)
  const serviceUpdates: CataloguePlan['services']['updates'] = []
  const serviceInserts: ServiceValues[] = []
  const retainedServiceIds = new Set<string>()

  serviceRows.forEach((row, sortOrder) => {
    const values: ServiceValues = {
      name: row.name,
      name_en: row.name_en,
      description: row.description,
      price_minor: row.price_minor,
      currency: row.currency,
      unit: row.unit,
      duration_min: row.duration_min,
      buffer_min: row.buffer_min,
      capacity: row.capacity,
      requires_deposit: row.requires_deposit,
      deposit_minor: row.deposit_minor,
      active: true,
      sort_order: sortOrder,
    }
    const existing = serviceByName.get(normalizeServiceName(row.name))
    if (existing) {
      retainedServiceIds.add(existing.id)
      serviceUpdates.push({ id: existing.id, values })
    } else {
      serviceInserts.push(values)
    }
  })

  // A service list IS the shop's description of itself: a name the latest
  // parse does not mention is a real retirement, exactly as it was before
  // this file existed. This also carries the kind-change guarantee: a row
  // whose unit flipped to product between parses is, from this table's point
  // of view, indistinguishable from one that vanished, so it retires the same
  // way. `existingServices` is the pre-write row set, so nothing freshly
  // inserted above can ever appear in it: the whole list is computable before
  // any write happens.
  const deactivateServices = existingServices
    .filter((service) => service.active && !retainedServiceIds.has(service.id))
    .map((service) => service.id)

  const productByName = byActiveName(existingProducts)
  const productUpdates: CataloguePlan['products']['updates'] = []
  const productInserts: ProductValues[] = []

  productRows.forEach((row, sortOrder) => {
    // Carried fields only. duration_min, buffer_min, capacity,
    // requires_deposit and deposit_minor are dropped on purpose, not just
    // unused: a cappuccino has no duration and nothing books against it, and
    // `products` has no columns for them anyway. stock, category, photo_path
    // and photo_alt are absent from `values` entirely, not set to null: on an
    // insert that means the columns take their own NULL default, and on an
    // update it means a photo, stock count or category the owner already set
    // from the product editor survives a re-parse untouched. `active` is
    // omitted the same way, and for the mirror of the same reason setup
    // refuses to retire a product: a description cannot rebuild an uploaded
    // photograph, so it may not resurrect an item the owner archived either.
    // An archive is her decision about her own inventory, and saving a shop
    // description is not a vote on it.
    const values: ProductUpdateValues = {
      name: row.name,
      name_en: row.name_en,
      description: row.description,
      price_minor: row.price_minor,
      currency: row.currency,
      sort_order: sortOrder,
    }
    const existing = productByName.get(normalizeServiceName(row.name))
    if (existing) {
      productUpdates.push({ id: existing.id, values })
    } else {
      // A row this parse has just introduced has no history to respect, so it
      // lands live.
      productInserts.push({ ...values, active: true })
    }
  })

  return {
    services: { updates: serviceUpdates, inserts: serviceInserts, deactivate: deactivateServices },
    // Products are never deactivated here, on principle, not by oversight. A
    // service list IS the shop's description of itself, so a service a
    // re-parse stops mentioning is a real retirement. A product list is
    // inventory that lives its own life: it carries photographs the owner
    // uploaded, stock counts and categories, set from a different screen
    // (`/app/products`, `createProduct`, the `create_products_bulk` owner
    // tool) that a re-parse of the shop's DESCRIPTION knows nothing about. A
    // shop description is not an inventory count, so re-saving one must never
    // silently empty a photographed menu. A product a parse no longer
    // mentions simply stays active until the owner archives it herself,
    // which is visible and reversible; a paragraph doing it to her silently
    // is neither.
    products: { updates: productUpdates, inserts: productInserts, deactivate: [] },
  }
}

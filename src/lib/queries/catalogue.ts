import 'server-only'
import { db } from '../db.ts'
import { throwIfDbError } from '../db-result.ts'
import { formatMoney, type CatalogItem, type CatalogKind, type CurrencyCode } from '../types.ts'

const COLUMNS =
  'kind, id, business_id, name, name_en, description, price_minor, currency, stock, category, photo_path, photo_alt, active, sort_order, duration_min, unit'

/**
 * What this shop sells, both kinds, in one read.
 *
 * `businessId` is an argument like every query in this directory: RLS has zero
 * policies, so a query that forgets its tenant has nothing to catch it.
 *
 * Search is `ilike` on the name and nothing cleverer, because ARCHITECTURE.md
 * puts a shop under fifty items and a trigram index for fifty rows is a moving
 * part that earns nothing. The `%` and `_` in a term are escaped, or a customer
 * typing "100%" matches the entire menu.
 */
export async function listCatalogue(
  businessId: string,
  opts: { search?: string; kind?: CatalogKind; includeInactive?: boolean } = {},
): Promise<CatalogItem[]> {
  let query = db.from('v_catalog').select(COLUMNS).eq('business_id', businessId)
  if (!opts.includeInactive) query = query.eq('active', true)
  if (opts.kind) query = query.eq('kind', opts.kind)
  if (opts.search?.trim()) {
    const term = opts.search.trim().replace(/[\\%_]/g, (match) => `\\${match}`)
    query = query.ilike('name', `%${term}%`)
  }
  const result = await query.order('kind').order('sort_order').order('name')
  throwIfDbError('load catalogue', result.error)
  return (result.data ?? []) as CatalogItem[]
}

export async function countCatalogue(businessId: string): Promise<number> {
  const result = await db
    .from('v_catalog')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('active', true)
  throwIfDbError('count catalogue', result.error)
  return result.count ?? 0
}

/**
 * How much of the shop's own goods has a picture, in one read.
 *
 * Photos live on `products` and nowhere else: `v_catalog` reports a service's
 * photo_path as null by construction, so counting the view would tell a salon
 * it is missing pictures it can never have. ARCHITECTURE.md puts a shop under
 * fifty items, so the rows are counted here rather than in two head queries.
 */
export async function countProductPhotos(
  businessId: string,
): Promise<{ products: number; withPhoto: number }> {
  const result = await db
    .from('products')
    .select('photo_path')
    .eq('business_id', businessId)
    .eq('active', true)
  throwIfDbError('count product photos', result.error)
  const rows = result.data ?? []
  return { products: rows.length, withPhoto: rows.filter((row) => row.photo_path).length }
}

/**
 * The shape the assistant is given.
 *
 * Prices are formatted here, because the agent is forbidden from doing
 * arithmetic on money and a formatted string is the only thing it may repeat.
 * `bookable` is explicit rather than inferred: the model must never offer a
 * time for a cup of coffee, and a boolean says so more clearly than a kind it
 * has to reason about.
 */
export async function catalogueForAgent(businessId: string) {
  const items = await listCatalogue(businessId)
  return items.map((item) => ({
    id: item.id,
    kind: item.kind,
    name: item.name,
    name_en: item.name_en,
    price: formatMoney(item.price_minor, item.currency as CurrencyCode),
    price_minor: item.price_minor,
    category: item.category,
    // Null means uncounted, which is not zero: say so rather than implying none left.
    stock: item.stock,
    duration_min: item.duration_min,
    unit: item.unit,
    bookable: item.kind === 'service',
  }))
}

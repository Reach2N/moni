import 'server-only'
import { db } from '../db.ts'
import { requireDbData, throwIfDbError } from '../db-result.ts'
import type { CurrencyCode } from '../types.ts'

/**
 * Create, update and archive a product, in one place.
 *
 * Two callers reach this: the dashboard's HTTP route and the owner agent's
 * tool. Both come through the same validation, because the agent is not a
 * trusted client and two copies of these rules is how they drift.
 *
 * A price of zero is allowed and meaningful. The parse emits zero for a thing
 * the owner named without pricing, and the review screen asks her for the
 * number; refusing zero here would lose the item instead of asking.
 */
export class ProductError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ProductError'
    this.status = status
  }
}

export type NewProduct = {
  name: string
  name_en?: string | null
  description?: string | null
  price_minor: number
  currency?: CurrencyCode
  stock?: number | null
  category?: string | null
}

function clean(input: NewProduct) {
  const name = input.name?.trim()
  if (!name) throw new ProductError(400, 'a product needs a name')
  if (!Number.isInteger(input.price_minor) || input.price_minor < 0) {
    throw new ProductError(400, 'a price is a whole number of minor units, and never negative')
  }
  if (input.stock != null && (!Number.isInteger(input.stock) || input.stock < 0)) {
    throw new ProductError(400, 'stock is a whole number, or null when the shop does not count it')
  }
  return {
    name,
    name_en: input.name_en?.trim() || null,
    description: input.description?.trim() || null,
    price_minor: input.price_minor,
    currency: input.currency ?? 'KHR',
    // Undefined and null are the same answer here (do not count it), which is
    // different from zero (there are none left).
    stock: input.stock ?? null,
    category: input.category?.trim() || null,
  }
}

export async function createProduct(businessId: string, input: NewProduct) {
  const row = clean(input)
  const saved = await db
    .from('products')
    .insert({ business_id: businessId, ...row })
    .select('id, name')
    .single()
  return requireDbData('create product', saved)
}

export async function createProductsBulk(businessId: string, items: NewProduct[]) {
  if (items.length === 0) throw new ProductError(400, 'nothing to add')
  if (items.length > 100) throw new ProductError(400, 'refusing to add more than 100 products at once')
  const rows = items.map((item) => ({ business_id: businessId, ...clean(item) }))
  const saved = await db.from('products').insert(rows).select('id, name')
  throwIfDbError('create products', saved.error)
  return saved.data ?? []
}

export async function updateProduct(
  businessId: string,
  id: string,
  patch: Partial<NewProduct> & { active?: boolean },
) {
  // Built field by field, and typed rather than a Record<string, unknown>,
  // because the generated update type rejects an index signature that can hold
  // null. Same reason as update_service in owner-tools.ts.
  const next: Partial<{
    name: string
    name_en: string | null
    description: string | null
    price_minor: number
    stock: number | null
    category: string | null
    active: boolean
  }> = {}
  if (patch.name != null) {
    const name = patch.name.trim()
    if (!name) throw new ProductError(400, 'a product needs a name')
    next.name = name
  }
  if (patch.name_en !== undefined) next.name_en = patch.name_en?.trim() || null
  if (patch.description !== undefined) next.description = patch.description?.trim() || null
  if (patch.price_minor != null) {
    if (!Number.isInteger(patch.price_minor) || patch.price_minor < 0) {
      throw new ProductError(400, 'a price is a whole number of minor units, and never negative')
    }
    next.price_minor = patch.price_minor
  }
  if (patch.stock !== undefined) {
    if (patch.stock != null && (!Number.isInteger(patch.stock) || patch.stock < 0)) {
      throw new ProductError(400, 'stock is a whole number, or null when the shop does not count it')
    }
    next.stock = patch.stock
  }
  if (patch.category !== undefined) next.category = patch.category?.trim() || null
  if (patch.active != null) next.active = patch.active
  if (Object.keys(next).length === 0) throw new ProductError(400, 'nothing to change')

  const saved = await db
    .from('products')
    .update(next)
    .eq('id', id)
    .eq('business_id', businessId)
    .select('name')
    .maybeSingle()
  throwIfDbError('update product', saved.error)
  if (!saved.data) throw new ProductError(404, 'no such product in this shop')
  return { name: saved.data.name, changes: next }
}

/**
 * Archived, never deleted. An `order_items` row snapshots the name and price at
 * the time of sale, and an invoice printed last month must stay readable.
 */
export async function archiveProduct(businessId: string, id: string) {
  const saved = await db
    .from('products')
    .update({ active: false })
    .eq('id', id)
    .eq('business_id', businessId)
    .select('name')
    .maybeSingle()
  throwIfDbError('archive product', saved.error)
  if (!saved.data) throw new ProductError(404, 'no such product in this shop')
  return saved.data
}

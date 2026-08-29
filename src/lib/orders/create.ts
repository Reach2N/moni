import type { Tx } from './tx.ts'
import type { CurrencyCode } from '../types.ts'

/**
 * Create an order, take the stock, and number the invoice, all or nothing.
 *
 * No `server-only` and no imports beyond types: this is the code
 * `db/test.mjs` runs against a real Postgres to prove the two claims that
 * matter. If it drifted into a module the harness cannot import, the atomicity
 * would become a comment again.
 *
 * Two things happen here that PostgREST cannot express, which is the entire
 * reason this project keeps a direct driver:
 *
 * 1. Stock is decremented with a conditional UPDATE that returns the row. A read
 *    then a write would let two customers both see "1 left" and both buy it. The
 *    `where stock >= $qty` makes the database itself the arbiter, and zero rows
 *    back means somebody else got there first.
 * 2. The invoice number is taken with `for update`, so a second transaction
 *    allocating at the same moment waits rather than reading the same maximum.
 *    Numbers must be gapless per business; a duplicate is an accounting problem
 *    and a legal one.
 */
export type OrderLine = { productId: string; quantity: number }

export type CreatedOrder = {
  orderId: string
  code: string
  totalMinor: number
  currency: CurrencyCode
  invoiceNumber: number
  lines: Array<{ productId: string; name: string; quantity: number; unitPriceMinor: number; lineTotalMinor: number }>
}

export class OrderError extends Error {
  readonly code: 'empty' | 'unknown_product' | 'out_of_stock' | 'mixed_currency'
  constructor(code: OrderError['code'], message: string) {
    super(message)
    this.name = 'OrderError'
    this.code = code
  }
}

type ProductRow = {
  id: string
  name: string
  price_minor: number
  currency: string
  stock: number | null
}

export async function createOrder(
  tx: Tx,
  input: {
    businessId: string
    customerId: string | null
    channel: string
    lines: readonly OrderLine[]
    note?: string | null
  },
): Promise<CreatedOrder> {
  if (input.lines.length === 0) throw new OrderError('empty', 'an order needs at least one item')

  const merged = new Map<string, number>()
  for (const line of input.lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new OrderError('empty', 'each line needs a whole quantity of at least one')
    }
    // The same product twice in one order is one decrement of the sum, not two
    // decrements that each pass the stock check on their own.
    merged.set(line.productId, (merged.get(line.productId) ?? 0) + line.quantity)
  }

  const priced: CreatedOrder['lines'] = []
  let total = 0
  let currency: CurrencyCode | null = null

  for (const [productId, quantity] of merged) {
    // One statement: check stock, take it, and tell us what we took. A SELECT
    // followed by an UPDATE is the classic oversell, and no amount of care in
    // application code closes that window.
    const taken = await tx.query<ProductRow>(
      `update products
          set stock = stock - $3
        where id = $1 and business_id = $2 and active
          and (stock is null or stock >= $3)
        returning id, name, price_minor, currency, stock`,
      [productId, input.businessId, quantity],
    )

    if (taken.length === 0) {
      // Distinguish "no such product here" from "not enough left", because the
      // customer can act on one of those and not the other.
      const exists = await tx.query<{ id: string }>(
        `select id from products where id = $1 and business_id = $2 and active`,
        [productId, input.businessId],
      )
      if (exists.length === 0) throw new OrderError('unknown_product', 'that item is not sold here')
      throw new OrderError('out_of_stock', 'there is not enough of that left')
    }

    const product = taken[0]!
    if (currency && product.currency !== currency) {
      throw new OrderError('mixed_currency', 'one order cannot mix currencies')
    }
    currency = product.currency as CurrencyCode

    const lineTotal = product.price_minor * quantity
    total += lineTotal
    priced.push({
      productId: product.id,
      name: product.name,
      quantity,
      unitPriceMinor: product.price_minor,
      lineTotalMinor: lineTotal,
    })
  }

  const orderRows = await tx.query<{ id: string; code: string }>(
    `insert into orders (business_id, customer_id, channel, status, total_minor, currency, note)
     values ($1, $2, $3, 'pending', $4, $5, $6)
     returning id, code`,
    [input.businessId, input.customerId, input.channel, total, currency, input.note ?? null],
  )
  const order = orderRows[0]!

  for (const line of priced) {
    await tx.query(
      `insert into order_items (order_id, product_id, name, unit_price_minor, quantity, line_total_minor)
       values ($1, $2, $3, $4, $5, $6)`,
      [order.id, line.productId, line.name, line.unitPriceMinor, line.quantity, line.lineTotalMinor],
    )
  }

  const invoiceNumber = await allocateInvoiceNumber(tx, input.businessId)
  await tx.query(
    `insert into invoices (business_id, order_id, number, total_minor, currency)
     values ($1, $2, $3, $4, $5)`,
    [input.businessId, order.id, invoiceNumber, total, currency],
  )

  return {
    orderId: order.id,
    code: order.code,
    totalMinor: total,
    currency: currency!,
    invoiceNumber,
    lines: priced,
  }
}

/**
 * The next invoice number for one business, held against concurrent allocation.
 *
 * `for update` on the highest existing row makes a second transaction WAIT
 * instead of reading the same maximum, so two checkouts in the same second get
 * 41 and 42 rather than 41 twice. When there is no row yet there is nothing to
 * lock, and the unique index on (business_id, number) is what catches that first
 * race: one insert wins, the other fails and retries rather than duplicating.
 */
export async function allocateInvoiceNumber(tx: Tx, businessId: string): Promise<number> {
  const rows = await tx.query<{ number: number }>(
    `select number from invoices where business_id = $1 order by number desc limit 1 for update`,
    [businessId],
  )
  return (rows[0]?.number ?? 0) + 1
}

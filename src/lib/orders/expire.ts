import type { Tx, TransactionRunner } from './tx.ts'

/**
 * Give the stock back.
 *
 * `createOrder` takes stock at order time. On Telegram that is right: an agent
 * is shepherding one conversation and the order is real. On a public shop site
 * it means anybody with a browser can place a hundred orders she never intends
 * to pay for and empty a cafe's menu for free. So a pending WEB order whose QR
 * has lapsed is cancelled and what it took is put back.
 *
 * Scoped to `channel = 'web'` on purpose, and that scope is the whole safety of
 * this job. A Telegram order is being shepherded by an agent in a live
 * conversation, and cancelling it underneath that conversation would have the
 * assistant promising a customer something the database had already withdrawn.
 *
 * The invoice row is left alone. Invoice numbers are gapless per business by
 * design; deleting one to tidy up a cancelled order is an accounting problem,
 * not housekeeping.
 *
 * No `server-only` and no imports beyond types, because `db/test.mjs` runs this
 * exact code against a real Postgres. A stock restoration proved by a mock is a
 * comment about stock restoration.
 */
export type ExpiredOrder = {
  orderId: string
  code: string
  /** How many product rows had stock put back. A null-stock product is uncounted, so it is not one of these. */
  restored: number
}

export type ExpiryReport = { found: number; cancelled: number; restored: number }

/**
 * Orders whose NEWEST payment is pending and lapsed.
 *
 * Newest, not any: an order whose first QR lapsed and which was then issued a
 * fresh one has a live QR and a customer standing in front of it, and
 * cancelling it would be cancelling a sale in progress.
 */
export async function findExpiredWebOrders(
  tx: Tx,
  now: Date,
  limit = 100,
): Promise<Array<{ id: string; code: string }>> {
  return tx.query<{ id: string; code: string }>(
    `select o.id, o.code
       from orders o
       join lateral (
         select p.status, p.expires_at
           from payments p
          where p.order_id = o.id
          order by p.created_at desc
          limit 1
       ) newest on true
      where o.status = 'pending'
        and o.channel = 'web'
        and newest.status = 'pending'
        and newest.expires_at is not null
        and newest.expires_at < $1
      order by o.created_at
      limit $2`,
    [now.toISOString(), limit],
  )
}

/**
 * Cancel one order and put its stock back, in the caller's transaction.
 *
 * The cancel goes FIRST and is scoped to `status = 'pending'`. If it changes
 * zero rows somebody else already moved this order, and we must not add stock
 * back for an order that is being confirmed at the same moment: that is how a
 * shop ends up selling the same jar twice. Zero rows back is the answer, and
 * the stock is left exactly where it is.
 */
export async function expireOneOrder(tx: Tx, orderId: string): Promise<ExpiredOrder | null> {
  const cancelled = await tx.query<{ id: string; code: string }>(
    `update orders set status = 'cancelled'
      where id = $1 and status = 'pending' and channel = 'web'
      returning id, code`,
    [orderId],
  )
  if (cancelled.length === 0) return null

  // Summed per product first: the same product on two lines is one addition of
  // the total, mirroring the single decrement `createOrder` made.
  // `stock is not null` is what keeps an uncounted product uncounted: NULL means
  // "we do not track this one", and adding to it would invent a number.
  const restored = await tx.query<{ id: string }>(
    `update products p
        set stock = p.stock + agg.qty
       from (select oi.product_id as product_id, sum(oi.quantity)::int as qty
               from order_items oi
              where oi.order_id = $1 and oi.product_id is not null
              group by oi.product_id) agg
      where p.id = agg.product_id and p.stock is not null
      returning p.id`,
    [orderId],
  )

  await tx.query(
    `update payments set status = 'expired' where order_id = $1 and status = 'pending'`,
    [orderId],
  )

  return { orderId, code: cancelled[0]!.code, restored: restored.length }
}

/**
 * The whole job: scan, then one transaction per order.
 *
 * One transaction per order and not one for all of them, so a single order that
 * cannot be cancelled does not roll back the stock already given back for the
 * others. The cron tick catches whatever this throws.
 */
export async function expireWebOrders(
  run: TransactionRunner,
  { now = new Date(), limit = 100 }: { now?: Date; limit?: number } = {},
): Promise<ExpiryReport> {
  const due = await run((tx) => findExpiredWebOrders(tx, now, limit))
  let cancelled = 0
  let restored = 0
  for (const order of due) {
    const outcome = await run((tx) => expireOneOrder(tx, order.id))
    if (outcome) {
      cancelled += 1
      restored += outcome.restored
    }
  }
  return { found: due.length, cancelled, restored }
}

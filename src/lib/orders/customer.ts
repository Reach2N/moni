import type { Tx } from './tx.ts'

/**
 * Who placed this order, resolved INSIDE the order's transaction.
 *
 * It used to run before the transaction opened, through PostgREST, and that was
 * wrong in a way a smoke test found in about a minute: the first attempt failed
 * on a missing DATABASE_URL and left a customer row behind for an order that
 * never existed. Anybody could have filled a shop's customer list from a public
 * page without buying anything. In here it is all or nothing with the order.
 *
 * The name is required and the phone is not. Without a name the owner reads
 * "Order A4F9C2, 23,000" and has no idea whose it is. With a phone the row is
 * MATCHED rather than duplicated, so a regular ordering twice in a week is one
 * customer with two orders: that history is what the `customers` table is for.
 *
 * Pure and no `server-only`, so `db/test.mjs` proves the match against a real
 * Postgres rather than against a description of one.
 */
export async function resolveOrderCustomer(
  tx: Tx,
  {
    businessId,
    displayName,
    phone,
  }: { businessId: string; displayName: string; phone: string | null },
): Promise<string> {
  if (phone) {
    const matched = await tx.query<{ id: string }>(
      `update customers
          set display_name = $3, last_seen_at = now()
        where business_id = $1 and phone = $2
        returning id`,
      [businessId, phone, displayName],
    )
    // One statement matches and touches. A select then an update would let two
    // simultaneous orders from the same phone both miss and both insert.
    if (matched.length > 0) return matched[0]!.id
  }

  const created = await tx.query<{ id: string }>(
    `insert into customers (business_id, display_name, phone)
     values ($1, $2, $3)
     returning id`,
    [businessId, displayName, phone],
  )
  return created[0]!.id
}

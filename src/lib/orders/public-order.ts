import 'server-only'
import { db } from '../db.ts'
import { requireDbData, throwIfDbError } from '../db-result.ts'
import { createOrder, type CreatedOrder, type OrderLine } from './create.ts'
import { withTransaction } from './connection.ts'
import { idempotencyKey, QR_TTL_SECONDS } from '../payments.ts'
import { getPaymentSettings } from '../payments/account.ts'
import { railsFor } from '../payments/rails.ts'
import type { CurrencyCode } from '../types.ts'

/**
 * A customer on a shop's own site, buying.
 *
 * The route above this holds the HTTP concerns: same origin, the rate limit,
 * the zod body, the slug. This holds what happens afterwards, so the owner
 * agent could be given the same act later without either copy drifting.
 *
 * The tenancy input is `businessId`, resolved from the SLUG by the caller and
 * never read from a request body. `createOrder` then scopes every product read
 * to it, which is what makes a product id copied from another shop's page a
 * refusal rather than a sale.
 */
export type PublicOrderResult = {
  code: string
  total_minor: number
  currency: CurrencyCode
  expires_at: string | null
  has_qr: boolean
  /** No rail for this currency is a real answer, not a failure: pay at the shop. */
  pay_at_shop: boolean
}

export async function placePublicOrder({
  businessId,
  lines,
  customerName,
  customerPhone,
  note,
}: {
  businessId: string
  lines: readonly OrderLine[]
  customerName: string
  customerPhone: string | null
  note: string | null
}): Promise<PublicOrderResult> {
  const customerId = await resolveCustomer(businessId, customerName, customerPhone)

  // One transaction: stock taken, lines priced from the catalogue, invoice
  // numbered. The client sent product ids and quantities and nothing else, so
  // there is no price on the wire for it to have named.
  const order = await withTransaction((tx) =>
    createOrder(tx, { businessId, customerId, channel: 'web', lines, note }),
  )

  const payment = await raisePayment({ businessId, customerId, order })
  return {
    code: order.code,
    total_minor: order.totalMinor,
    currency: order.currency,
    expires_at: payment.expiresAt,
    has_qr: payment.hasQr,
    pay_at_shop: !payment.hasQr,
  }
}

/**
 * The name is required and the phone is not.
 *
 * Without a name the owner reads "Order A4F9C2, 23,000" and has no idea whose
 * it is. With a phone the row is matched rather than duplicated, so a regular
 * ordering twice in a week is one customer with two orders and not two
 * customers: that history is what the whole `customers` table exists for.
 */
async function resolveCustomer(
  businessId: string,
  displayName: string,
  phone: string | null,
): Promise<string> {
  if (phone) {
    const existing = await db
      .from('customers')
      .select('id')
      .eq('business_id', businessId)
      .eq('phone', phone)
      .maybeSingle()
    throwIfDbError('match customer by phone', existing.error)
    if (existing.data) {
      const touched = await db
        .from('customers')
        .update({ display_name: displayName, last_seen_at: new Date().toISOString() })
        .eq('id', existing.data.id)
        .eq('business_id', businessId)
      if (touched.error) console.error('[shop order] customer not touched:', touched.error.message)
      return existing.data.id
    }
  }

  const created = await db
    .from('customers')
    .insert({ business_id: businessId, display_name: displayName, phone })
    .select('id')
    .single()
  return requireDbData('create customer for shop order', created).id
}

/**
 * The QR, or an honest "pay at the shop".
 *
 * `railsFor` prefers the shop's own Bakong account, so the money is the shop's
 * and the owner's banking app is the verifier. An empty rail list is what a
 * shop with no account set looks like, and it is a real answer: the order
 * stands, the customer is told to pay at the counter, and no QR is minted that
 * would pay nobody.
 *
 * The key is TIME BUCKETED, never static. A static key plus the unique
 * constraint on (business_id, idempotency_key) permanently strands any customer
 * whose first QR lapsed unpaid: her retry collides with the dead row. Paid for
 * once already in production, see `payments.ts`.
 */
async function raisePayment({
  businessId,
  customerId,
  order,
}: {
  businessId: string
  customerId: string | null
  order: CreatedOrder
}): Promise<{ expiresAt: string | null; hasQr: boolean }> {
  const settings = await getPaymentSettings(businessId)
  const rails = railsFor(order.currency, settings.account)
  if (rails.length === 0) return { expiresAt: null, hasQr: false }

  const key = idempotencyKey(order.code, 'order')
  const existing = await db
    .from('payments')
    .select('id, qr_payload, status, expires_at')
    .eq('business_id', businessId)
    .eq('idempotency_key', key)
    .maybeSingle()
  throwIfDbError('load existing order payment', existing.error)
  if (existing.data?.qr_payload && existing.data.status === 'pending') {
    return { expiresAt: existing.data.expires_at, hasQr: true }
  }

  const rail = rails[0]!
  const charge = await rail.createCharge({
    amount_minor: order.totalMinor,
    currency: order.currency,
    reference: order.code,
    idempotency_key: key,
  })

  const expiresAt =
    charge.expires_at ?? new Date(Date.now() + QR_TTL_SECONDS * 1000).toISOString()
  const saved = await db
    .from('payments')
    .insert({
      business_id: businessId,
      // An order payment, so `booking_id` stays NULL. That null is not an
      // oversight: it is what makes the paid row count as a standalone sale in
      // `v_month_usage`, which is the free-tier meter.
      order_id: order.orderId,
      booking_id: null,
      customer_id: customerId,
      kind: 'full',
      amount_minor: order.totalMinor,
      currency: order.currency,
      provider: rail.id,
      // Which account the money goes to, on the row, so a dispute months later
      // can be answered without guessing what the owner had set.
      provider_account: rail.id === 'khqr' ? (settings.account?.accountId ?? null) : null,
      qr_payload: charge.qr_payload,
      provider_ref: charge.provider_ref,
      status: 'pending',
      expires_at: expiresAt,
      idempotency_key: key,
    })
    .select('id')
    .single()
  requireDbData('store order payment', saved)

  return { expiresAt, hasQr: !!charge.qr_payload }
}

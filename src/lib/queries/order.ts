import 'server-only'
import { db } from '../db.ts'
import { throwIfDbError } from '../db-result.ts'
import type { CurrencyCode, OrderStatus } from '../types.ts'

/**
 * One order, read by the code a customer holds, scoped to the shop whose slug
 * she is on.
 *
 * The scope is the whole security of the order page. A code alone is six
 * characters out of a generator that another shop's generator can repeat, so
 * looking it up by code and rendering whatever comes back would show one shop's
 * customer another shop's order. `business_id` is passed in from the slug, and a
 * code belonging to a different shop resolves to nothing here, which the page
 * turns into a 404.
 */
export type PublicOrder = {
  code: string
  status: OrderStatus
  totalMinor: number
  currency: CurrencyCode
  note: string | null
  createdAt: string
  lines: Array<{ name: string; quantity: number; unitPriceMinor: number; lineTotalMinor: number }>
  payment: {
    status: string
    /** Null when the shop takes no QR yet: the honest "pay at the shop" state. */
    expiresAt: string | null
    hasQr: boolean
    expired: boolean
  } | null
}

export async function getPublicOrder(businessId: string, code: string): Promise<PublicOrder | null> {
  const orderResult = await db
    .from('orders')
    .select('id, code, status, total_minor, currency, note, created_at')
    .eq('business_id', businessId)
    .eq('code', code.toUpperCase())
    .maybeSingle()
  throwIfDbError('load public order', orderResult.error)
  const order = orderResult.data
  if (!order) return null

  const [itemsResult, paymentResult] = await Promise.all([
    db
      .from('order_items')
      .select('name, quantity, unit_price_minor, line_total_minor')
      .eq('order_id', order.id),
    db
      .from('payments')
      .select('status, expires_at, qr_payload')
      .eq('business_id', businessId)
      .eq('order_id', order.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  throwIfDbError('load public order lines', itemsResult.error)
  throwIfDbError('load public order payment', paymentResult.error)

  const payment = paymentResult.data
  return {
    code: order.code,
    status: order.status as OrderStatus,
    totalMinor: order.total_minor,
    currency: order.currency as CurrencyCode,
    note: order.note,
    createdAt: order.created_at,
    lines: (itemsResult.data ?? []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPriceMinor: item.unit_price_minor,
      lineTotalMinor: item.line_total_minor,
    })),
    payment: payment
      ? {
          status: payment.status,
          expiresAt: payment.expires_at,
          hasQr: !!payment.qr_payload,
          expired:
            payment.status === 'pending' &&
            !!payment.expires_at &&
            new Date(payment.expires_at) < new Date(),
        }
      : null,
  }
}

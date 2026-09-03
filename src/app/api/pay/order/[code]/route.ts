import { db } from '@/lib/db.ts'
import { throwIfDbError } from '@/lib/db-result.ts'
import { renderKhqrCard } from '@/lib/khqr/qr-card.ts'
import { renderKhqrPng } from '@/lib/khqr/qr-png.ts'
import type { CurrencyCode } from '@/lib/types.ts'

export const runtime = 'nodejs'

/**
 * The scannable QR for one ORDER's payment, as an image.
 *
 * A separate route segment and not a branch inside `/api/pay/[code]`. Booking
 * codes and order codes are both short uppercase alphanumerics out of two
 * DIFFERENT generators, and nothing stops them colliding. A branch would answer
 * a collision by picking one, which means serving one shop's QR for another
 * shop's code, silently, at the moment money changes hands. A distinct path
 * cannot do that: the caller has already said which kind of code it holds.
 *
 * Same rules as the booking route beside it: public and unauthenticated because
 * the customer scanning it never signs in, addressed by a code she already has,
 * revealing an amount and a shop name and nothing else. A lapsed payment stops
 * rendering rather than serving a QR that pays nobody.
 *
 * `?format=png` returns the bare code as a PNG, the address a channel hands to
 * a platform that fetches attachments by URL and refuses SVG.
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const wantsPng = new URL(req.url).searchParams.get('format') === 'png'
  if (!/^[A-Z0-9]{4,12}$/i.test(code)) return new Response('not found', { status: 404 })

  const orderResult = await db
    .from('orders')
    .select('id, code, business_id, businesses(name)')
    .eq('code', code.toUpperCase())
    .maybeSingle()
  throwIfDbError('load order for QR', orderResult.error)
  const order = orderResult.data
  if (!order) return new Response('not found', { status: 404 })

  const paymentResult = await db
    .from('payments')
    .select('qr_payload, amount_minor, currency, status, expires_at')
    .eq('order_id', order.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  throwIfDbError('load payment for order QR', paymentResult.error)
  const payment = paymentResult.data
  if (!payment?.qr_payload) return new Response('not found', { status: 404 })
  if (payment.expires_at && new Date(payment.expires_at) < new Date()) {
    return new Response('this payment has expired', { status: 410 })
  }

  if (wantsPng) {
    const png = await renderKhqrPng(payment.qr_payload)
    return new Response(new Uint8Array(png), {
      headers: { 'content-type': 'image/png', 'cache-control': 'no-store' },
    })
  }

  const currency = payment.currency as CurrencyCode
  const svg = await renderKhqrCard({
    qrPayload: payment.qr_payload,
    shopName: order.businesses?.name ?? 'Moni',
    // Minor units and the code, not a formatted string: the branded card sets
    // the figure and the currency in different type sizes.
    amountMinor: payment.amount_minor,
    currency,
    reference: order.code,
  })

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      // A QR lives about five minutes. Caching it past that serves a dead code.
      'cache-control': 'no-store',
    },
  })
}

import { db } from '@/lib/db.ts'
import { throwIfDbError } from '@/lib/db-result.ts'
import { renderKhqrCard } from '@/lib/khqr/qr-card.ts'
import { formatMoney, type CurrencyCode } from '@/lib/types.ts'

export const runtime = 'nodejs'

/**
 * The scannable QR for one payment, as an image.
 *
 * Public and unauthenticated on purpose: the customer scanning it never signs
 * in, and the URL is addressed by the payment's own booking code, which the
 * customer already has. It reveals an amount and a shop name, which is exactly
 * what a payment request is, and nothing else: no catalogue, no other bookings,
 * no customer records.
 *
 * A lapsed payment stops rendering rather than serving a QR that pays nobody.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  if (!/^[A-Z0-9]{4,12}$/i.test(code)) return new Response('not found', { status: 404 })

  const bookingResult = await db
    .from('bookings')
    .select('id, code, business_id, businesses(name)')
    .eq('code', code.toUpperCase())
    .maybeSingle()
  throwIfDbError('load booking for QR', bookingResult.error)
  const booking = bookingResult.data
  if (!booking) return new Response('not found', { status: 404 })

  const paymentResult = await db
    .from('payments')
    .select('qr_payload, amount_minor, currency, status, expires_at')
    .eq('booking_id', booking.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  throwIfDbError('load payment for QR', paymentResult.error)
  const payment = paymentResult.data
  if (!payment?.qr_payload) return new Response('not found', { status: 404 })
  if (payment.expires_at && new Date(payment.expires_at) < new Date()) {
    return new Response('this payment has expired', { status: 410 })
  }

  const currency = payment.currency as CurrencyCode
  const svg = await renderKhqrCard({
    qrPayload: payment.qr_payload,
    shopName: booking.businesses?.name ?? 'Moni',
    amountLabel: formatMoney(payment.amount_minor, currency),
    reference: booking.code,
  })

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      // A QR lives about five minutes. Caching it past that serves a dead code.
      'cache-control': 'no-store',
    },
  })
}

import { db } from '@/lib/db.ts'
import { throwIfDbError } from '@/lib/db-result.ts'
import { renderKhqrCard } from '@/lib/khqr/qr-card.ts'
import { renderKhqrPng } from '@/lib/khqr/qr-png.ts'
import type { CurrencyCode } from '@/lib/types.ts'

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
 *
 * `?format=png` returns the bare code as a PNG. Messenger fetches attachments
 * by URL and refuses SVG, so this is the address the channel hands Meta.
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const wantsPng = new URL(req.url).searchParams.get('format') === 'png'
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

  if (wantsPng) {
    const png = await renderKhqrPng(payment.qr_payload)
    return new Response(new Uint8Array(png), {
      headers: { 'content-type': 'image/png', 'cache-control': 'no-store' },
    })
  }

  const currency = payment.currency as CurrencyCode
  const svg = await renderKhqrCard({
    qrPayload: payment.qr_payload,
    shopName: booking.businesses?.name ?? 'Moni',
    // Minor units and the code, not a formatted string: the branded card sets
    // the figure and the currency in different type sizes.
    amountMinor: payment.amount_minor,
    currency,
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

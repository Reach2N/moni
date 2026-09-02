import { requireMemberApi } from '@/lib/auth/member.ts'
import { ApiRequestError } from '@/lib/http/post.ts'
import { renderKhqrCard } from '@/lib/khqr/qr-card.ts'
import { getPaymentSettings, testChargeMinor } from '@/lib/payments/account.ts'
import { shopKhqrRail } from '@/lib/payments/shop-khqr.ts'

export const runtime = 'nodejs'

/**
 * A KHQR the OWNER scans, into her own account, for a token amount.
 *
 * This is the acceptance test for /app/money and the only proof that matters:
 * if her own banking app reads the card and names her own account, every
 * customer's card will too. It is not a payment row. Nothing is stored, no
 * customer is involved, and the reference says TEST so a transfer she does make
 * is recognisable in her statement.
 */
export async function GET() {
  try {
    const member = await requireMemberApi()
    const settings = await getPaymentSettings(member.businessId)
    if (!settings.account) return new Response('no payment account yet', { status: 404 })

    const amountMinor = testChargeMinor(settings.currency)
    const charge = await shopKhqrRail(settings.account).createCharge({
      amount_minor: amountMinor,
      currency: settings.currency,
      reference: 'TEST',
      idempotency_key: 'test-card',
    })
    const svg = await renderKhqrCard({
      qrPayload: charge.qr_payload,
      shopName: settings.account.merchantName,
      amountMinor,
      currency: settings.currency,
      reference: 'TEST',
    })
    return new Response(svg, {
      headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'no-store' },
    })
  } catch (error) {
    const status = error instanceof ApiRequestError ? error.status : 500
    return new Response('the test card could not be drawn', { status })
  }
}

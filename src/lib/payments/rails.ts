import 'server-only'
import { cutluyAdapter, manualAdapter, type PaymentProviderAdapter } from '../payments.ts'
import type { CurrencyCode } from '../types.ts'

/**
 * The rails, actually wired. There is one: CutLuy.
 *
 * CutLuy is Bakong, packaged. It issues a genuine Bakong KHQR (verified against
 * a live response on 30 August 2026: tag 30 carrying `abaakhppxxx@abaa`, and a
 * CRC our own crc16 reproduces exactly), so a customer scans it in any Cambodian
 * banking app exactly as they would a bank's own code. What CutLuy adds is the
 * part that is otherwise painful: issuing, and telling us it was paid, with no
 * merchant relationship with NBC and no relay of our own.
 *
 * The direct Bakong rail is GONE, and this comment is its headstone. It built
 * the KHQR offline from a BAKONG_ACCOUNT and verified through a Cambodian relay,
 * because NBC blocks check-transaction from servers outside Cambodia and Vercel
 * is not in Cambodia. Five environment variables and a relay we do not run, to
 * do what CutLuy already does. Keeping it meant two code paths for one behaviour
 * and five credentials nobody would ever set.
 *
 * CutLuy settles USD, and since 30 August 2026 this product prices in USD, so
 * one rail covers everything.
 */
function cutluyRail(): PaymentProviderAdapter | null {
  const token = process.env.CUTLUY_TOKEN?.trim()
  if (!token) return null
  return cutluyAdapter({
    token,
    baseUrl: process.env.CUTLUY_API_URL?.trim(),
    paymentLinkId: process.env.CUTLUY_PAYMENT_LINK_ID?.trim(),
  })
}

/**
 * Configured rails that settle this currency, in preference order.
 *
 * Still takes a currency, and still asks the adapter what it settles, even with
 * one rail: that is the seam a second rail arrives through, and a shop priced in
 * something no rail can charge should get an empty list rather than a QR that
 * pays nobody. An empty list is a real answer, not an unhandled case.
 */
export function railsFor(currency: CurrencyCode): PaymentProviderAdapter[] {
  const cutluy = cutluyRail()
  if (!cutluy) return []
  return cutluy.settlesCurrencies.includes(currency) ? [cutluy] : []
}

export { manualAdapter }

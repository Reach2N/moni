import 'server-only'
import { cutluyAdapter, localKhqrAdapter, manualAdapter, type PaymentProviderAdapter } from '../payments.ts'
import { buildKhqrPayload, khqrMd5 } from '../khqr/payload.ts'
import type { CurrencyCode } from '../types.ts'

/**
 * The rails, actually wired.
 *
 * `payments.ts` is ported from production code and takes its KHQR generator as
 * an injected function, deliberately. This is the file that supplies it and
 * reads the environment, so the ported adapter stays pure and testable and
 * nothing about a provider leaks into a route handler.
 *
 * Routing is by CURRENCY, not preference (CLAUDE.md). CutLuy settles USD only,
 * so it cannot serve a riel shop, and riel is the default for local shops.
 */
function khqrRail(): PaymentProviderAdapter | null {
  const account = process.env.BAKONG_ACCOUNT?.trim()
  const relayUrl = process.env.BAKONG_RELAY_API_URL?.trim()
  const relayToken = process.env.BAKONG_RELAY_TOKEN?.trim()
  // Generation is offline, but a QR nobody can verify is worse than no QR: the
  // customer pays and the booking never confirms. So all three or none.
  if (!account || !relayUrl || !relayToken) return null

  return localKhqrAdapter({
    buildPayload: (charge) =>
      buildKhqrPayload(
        {
          accountId: account,
          merchantName: process.env.BAKONG_MERCHANT_NAME?.trim() || 'Moni Shop',
          merchantCity: process.env.BAKONG_MERCHANT_CITY?.trim() || 'Phnom Penh',
        },
        { amount_minor: charge.amount_minor, currency: charge.currency, reference: charge.reference },
      ),
    md5: khqrMd5,
    relayUrl,
    relayToken,
  })
}

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
 * In preference order for this currency, configured rails only.
 *
 * An empty list is a real answer: a shop that has not given us a Bakong account
 * cannot take a QR payment, and saying so beats minting a QR that pays nobody.
 */
export function railsFor(currency: CurrencyCode): PaymentProviderAdapter[] {
  const rails: PaymentProviderAdapter[] = []
  const khqr = khqrRail()
  const cutluy = cutluyRail()
  if (currency === 'KHR') {
    if (khqr) rails.push(khqr)
  } else {
    if (cutluy) rails.push(cutluy)
    if (khqr) rails.push(khqr)
  }
  return rails
}

export { manualAdapter }

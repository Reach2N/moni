import 'server-only'
import { cutluyAdapter, manualAdapter, type PaymentProviderAdapter } from '../payments.ts'
import type { CurrencyCode, PaymentAccount } from '../types.ts'
import { shopKhqrRail } from './shop-khqr.ts'

/**
 * The rails, actually wired. Two, and the order is the product:
 *
 *   1. The shop's OWN Bakong account (`shopKhqrRail`), whenever the owner has
 *      set one on /app/money. Generated offline, both currencies, paid straight
 *      to the shop, confirmed by the owner. This is what "Moni takes payments
 *      for local businesses" has to mean: the money is the shop's.
 *   2. CutLuy, when this deployment carries a platform token. It settles into
 *      MONI's account, so on its own it is a demo rail, not a product. It stays
 *      because its webhook is real, verified, and the safety net for any shop
 *      that later opens a CutLuy account of its own.
 *
 * CutLuy is Bakong, packaged. It issues a genuine Bakong KHQR (verified against
 * a live response on 30 August 2026: tag 30 carrying `abaakhppxxx@abaa`, and a
 * CRC our own crc16 reproduces exactly), so a customer scans it in any Cambodian
 * banking app exactly as they would a bank's own code. What CutLuy adds is the
 * part that is otherwise painful: issuing, and telling us it was paid, with no
 * merchant relationship with NBC and no relay of our own.
 *
 * The direct Bakong rail was removed on 30 August 2026 because it charged into
 * ONE platform BAKONG_ACCOUNT from the environment and verified through a relay
 * nobody ran. It is back on 2 September in the only form that makes sense: the
 * generation half, per shop, into the shop's own account, with the owner as the
 * verifier. See `shop-khqr.ts` for why that is honest rather than lazy.
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
 * Rails that settle this currency for THIS shop, in preference order.
 *
 * `account` is the shop's own Bakong account (`paymentAccountFor(business)`),
 * or null when the owner has not set one. A shop priced in something no rail can
 * charge gets an empty list rather than a QR that pays nobody. An empty list is
 * a real answer, not an unhandled case: `create_payment` turns it into "please
 * pay at the shop".
 */
export function railsFor(currency: CurrencyCode, account: PaymentAccount | null): PaymentProviderAdapter[] {
  const candidates: PaymentProviderAdapter[] = []
  if (account) candidates.push(shopKhqrRail(account))
  const cutluy = cutluyRail()
  if (cutluy) candidates.push(cutluy)
  return candidates.filter((rail) => rail.settlesCurrencies.includes(currency))
}

export { manualAdapter }
export { isPollable, SHOP_KHQR_PROVIDER } from './shop-khqr.ts'

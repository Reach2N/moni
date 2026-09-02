import { buildKhqrPayload, khqrMd5 } from '../khqr/payload.ts'
import { QR_TTL_SECONDS, type PaymentProviderAdapter } from '../payments.ts'
import type { PaymentAccount } from '../types.ts'

/**
 * The rail that pays the SHOP.
 *
 * A KHQR generated into the shop's own Bakong account, offline, from the three
 * `khqr_*` columns the owner filled in on /app/money. The customer scans it in
 * any Cambodian banking app and the riel lands with the shop, never with Moni.
 * `src/lib/khqr/payload.ts` is the builder and db/test.mjs proves it byte for
 * byte against ts-khqr, so the only thing this file decides is WHOSE account.
 *
 * It does not verify. NBC blocks check-transaction from servers outside Cambodia
 * and Vercel is not in Cambodia; the direct rail that used to live here verified
 * through a relay nobody ran. The honest signal is the owner's own banking app,
 * which notifies her the moment the money arrives, so `checkCharge` always says
 * pending and `confirm_payment` (an owner tool and an inbox button) is how a row
 * becomes paid. `pollBased: false` is what tells the cron poller to leave these
 * rows alone rather than asking a question nobody can answer.
 *
 * No `server-only` here on purpose: db/test.mjs imports it to prove the rail
 * settles both currencies and charges into the right account.
 */
export const SHOP_KHQR_PROVIDER = 'khqr'

export function shopKhqrRail(account: PaymentAccount): PaymentProviderAdapter {
  return {
    id: SHOP_KHQR_PROVIDER,
    pollBased: false,
    settlesCurrencies: ['KHR', 'USD'],

    async createCharge(req) {
      const now = Date.now()
      const expiresAtMs = now + QR_TTL_SECONDS * 1000
      const qr_payload = buildKhqrPayload(
        { accountId: account.accountId, merchantName: account.merchantName, merchantCity: account.merchantCity },
        {
          amount_minor: req.amount_minor,
          currency: req.currency,
          reference: req.reference,
          createdAtMs: now,
          expiresAtMs,
        },
      )
      return {
        qr_payload,
        // The Bakong convention, kept so a relay can be added later without a
        // migration: the md5 of the string is the transaction handle.
        provider_ref: khqrMd5(qr_payload),
        expires_at: new Date(expiresAtMs).toISOString(),
      }
    },

    async checkCharge() {
      return {
        status: 'pending',
        raw: { note: 'paid into the shop account directly; the owner confirms receipt from her banking app' },
      }
    },
  }
}

/**
 * Whether a provider can be ASKED whether a payment arrived. CutLuy can (its
 * webhook is authoritative and polling is the safety net). A shop's own Bakong
 * account cannot be asked from outside Cambodia, so its rows wait for the owner.
 */
export function isPollable(providerId: string): boolean {
  return providerId !== SHOP_KHQR_PROVIDER
}

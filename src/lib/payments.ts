/**
 * Payment rails.
 *
 * This is not designed from the provider docs. It is ported from the KHQR code
 * already running in production at /Users/mense/tiktok-bot-private/store, which
 * has the scar tissue: the float epsilon bug, the fallback rules, and above all
 * the idempotency key shape. Comments marked PORTED carry a lesson that was paid
 * for once already, so do not simplify them away.
 *
 * Two rails, chosen by CURRENCY, not by preference:
 *   KHR -> local: generate the KHQR payload offline from the merchant account,
 *                 verify through the Cambodian relay. Riel shops are the default
 *                 case for this product, so this is the primary path.
 *   USD -> CutLuy: settles in USD only. Verified by their own payment id.
 *
 * Why not call Bakong directly for verification: NBC blocks check-transaction
 * from servers outside Cambodia in production, and Vercel is not in Cambodia.
 * Generation is offline and unaffected. Only the check needs the relay.
 */
import type { CurrencyCode } from './types.ts'
import { CURRENCIES } from './types.ts'

// ─────────────────────────────────────────────────────────────── contracts

export type ChargeRequest = {
  amount_minor: number
  currency: CurrencyCode
  /** our own reference the customer may see, e.g. the booking code */
  reference: string
  /** stable within one QR lifetime, different after it lapses. See below. */
  idempotency_key: string
}

export type Charge = {
  /** raw EMVCo KHQR string. Render to an image client side, never store a PNG. */
  qr_payload: string
  /** the handle we later check the provider with. Meaning differs per rail. */
  provider_ref: string
  expires_at: string
}

export type ChargeStatus = {
  status: 'pending' | 'paid' | 'expired' | 'failed'
  provider_txn_id?: string
  amount_minor?: number
  /** verbatim provider response, straight into payment_events.raw */
  raw: unknown
}

export interface PaymentProviderAdapter {
  readonly id: string
  /** KHQR confirmation is pull based, so both rails poll */
  readonly pollBased: boolean
  readonly settlesCurrencies: readonly CurrencyCode[]
  createCharge(req: ChargeRequest): Promise<Charge>
  checkCharge(provider_ref: string, expected_minor: number, currency: CurrencyCode): Promise<ChargeStatus>
}

/** A QR is only worth showing for a few minutes. Both rails agree on this. */
export const QR_TTL_SECONDS = 5 * 60

/**
 * PORTED, and this one is load bearing.
 *
 * The obvious key is `booking:<id>:deposit`. It is wrong. A unique constraint on
 * it means that once a customer's first QR lapses unpaid, she can never be given
 * another one: the retry collides with the dead row and she is stranded on a
 * permanently expired payment. The production store hit exactly this.
 *
 * Bucketing by TTL keeps a retry inside one QR lifetime idempotent, which is the
 * behaviour that actually matters, while letting the next window mint a fresh QR.
 */
export function idempotencyKey(reference: string, kind: string, nowMs = Date.now()): string {
  const bucket = Math.floor(nowMs / (QR_TTL_SECONDS * 1000))
  return `${reference}:${kind}:${bucket}`
}

/**
 * PORTED. Compare money in whole minor units, never with an epsilon.
 *
 * The original was `Math.abs(expected - actual) < 0.01` for USD, which accepted a
 * full cent of underpayment: 10 - 9.99 is 0.009999999999999787 in binary float,
 * just under the threshold. Worse, it was inconsistent, because whether a one
 * cent shortfall slipped through depended on how each price happened to land in
 * floating point. A non-positive amount on either side never matches, so an
 * unparseable provider amount is not read as agreement.
 */
export function amountsMatch(expected_minor: number, actual_minor: unknown): boolean {
  const actual = Number(actual_minor)
  if (!Number.isFinite(actual) || actual <= 0 || expected_minor <= 0) return false
  return Math.round(expected_minor) === Math.round(actual)
}

/**
 * PORTED. A rejected request fails the same way twice, so there is no point
 * retrying it on the other rail. A missing route or a server fault is worth one.
 */
const NON_RETRYABLE = [400, 401, 403, 422]
export function shouldFallback(status: number): boolean {
  if (NON_RETRYABLE.includes(status)) return false
  return status === 404 || status >= 500
}

export class ProviderError extends Error {
  // Not a constructor parameter property: those need a TS transform, and keeping
  // this file plain lets `node --test` import it with no build step.
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ProviderError'
    this.status = status
  }
}

const minorToMajor = (minor: number, currency: CurrencyCode): number =>
  minor / 10 ** CURRENCIES[currency].decimals
const majorToMinor = (major: unknown, currency: CurrencyCode): number =>
  Math.round(Number(major) * 10 ** CURRENCIES[currency].decimals)

type JsonRecord = Record<string, unknown>

const jsonRecord = (value: unknown): JsonRecord | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as JsonRecord) : null

async function readJson(res: Response): Promise<JsonRecord> {
  const text = await res.text()
  try {
    return jsonRecord(text ? JSON.parse(text) : {}) ?? { _unparseable: text.slice(0, 500) }
  } catch {
    return { _unparseable: text.slice(0, 500) }
  }
}

// ───────────────────────────────────────────────────────────────── CutLuy
// POST /v1/payments  { amount, reference_id, idempotency_key, payment_link_id? }
//   -> { id, qr_string, expires_at }
// GET  /v1/payments/:id
//   -> { status, amount }   status is a single string, only "paid" settles
// Amounts on the wire are DOLLARS, not cents. The store's own integration sends
// a decimal here, so convert on the boundary and keep minor units everywhere else.

export function cutluyAdapter(cfg: {
  baseUrl?: string
  token: string
  paymentLinkId?: string
  timeoutMs?: number
}): PaymentProviderAdapter {
  const base = (cfg.baseUrl ?? 'https://cutluy.com').replace(/\/+$/, '')
  const timeoutMs = cfg.timeoutMs ?? 10_000

  const call = async (path: string, init: RequestInit) => {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), timeoutMs)
    try {
      const res = await fetch(new URL(path, `${base}/`), {
        ...init,
        cache: 'no-store',
        signal: ctl.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.token}`,
          ...(init.headers ?? {}),
        },
      })
      const body = await readJson(res)
      if (!res.ok) {
        throw new ProviderError(
          typeof body.message === 'string' ? body.message : `CutLuy returned ${res.status}`,
          res.status,
        )
      }
      return body
    } finally {
      clearTimeout(t)
    }
  }

  return {
    id: 'cutluy',
    pollBased: true,
    settlesCurrencies: ['USD'],

    async createCharge(req) {
      if (req.currency !== 'USD') {
        // Hard fail rather than silently converting. A shop priced in riel that
        // gets billed in dollars at yesterday's rate is a support nightmare.
        throw new ProviderError(`CutLuy settles USD only, asked for ${req.currency}`, 400)
      }
      const body = await call('/v1/payments', {
        method: 'POST',
        body: JSON.stringify({
          amount: minorToMajor(req.amount_minor, 'USD'),
          reference_id: req.reference,
          idempotency_key: req.idempotency_key,
          ...(cfg.paymentLinkId ? { payment_link_id: cfg.paymentLinkId } : {}),
        }),
      })
      const qr_payload = typeof body.qr_string === 'string' ? body.qr_string : ''
      const id = typeof body.id === 'string' ? body.id : ''
      if (!qr_payload || !id) throw new ProviderError('CutLuy returned an invalid QR payload', 502)
      return {
        qr_payload,
        // PORTED: CutLuy has no md5 of the QR string, and checking needs their
        // own id via GET /v1/payments/:id with no reference_id lookup. Our
        // provider_ref column means "the handle we check the provider with", so
        // their id belongs in it and nothing else has to change.
        provider_ref: id,
        expires_at:
          typeof body.expires_at === 'string'
            ? body.expires_at
            : new Date(Date.now() + QR_TTL_SECONDS * 1000).toISOString(),
      }
    },

    async checkCharge(provider_ref, expected_minor) {
      const raw = await call(`/v1/payments/${encodeURIComponent(provider_ref)}`, { method: 'GET' })
      const amount_minor = majorToMinor(raw.amount, 'USD')
      // PORTED: a status alone never settles. The amount has to agree too.
      // `expired` and `failed` are terminal at the provider but map to pending
      // here, because nothing in this codebase should cancel a booking off the
      // back of a network response. The booking stops being payable when its own
      // expiry passes, which is a decision we own.
      if (raw.status !== 'paid') return { status: 'pending', raw }
      if (!amountsMatch(expected_minor, amount_minor)) {
        return { status: 'pending', amount_minor, raw }
      }
      return {
        status: 'paid',
        provider_txn_id: typeof raw.transaction_id === 'string' ? raw.transaction_id : provider_ref,
        amount_minor,
        raw,
      }
    },
  }
}

// ────────────────────────────────────────────── local KHQR, riel, the default
// Generation is offline from the merchant account, so no network call and no
// Cambodia-IP problem. Verification goes through the relay, keyed on md5 of the
// payload, which is the Bakong convention.

export function localKhqrAdapter(cfg: {
  /** builds the EMVCo string offline. Port of scripts/payment_backend.py. */
  buildPayload: (a: { amount_minor: number; currency: CurrencyCode; reference: string }) => string
  md5: (payload: string) => string
  relayUrl: string
  relayToken: string
  timeoutMs?: number
}): PaymentProviderAdapter {
  return {
    id: 'khqr',
    pollBased: true,
    settlesCurrencies: ['KHR', 'USD'],

    async createCharge(req) {
      const qr_payload = cfg.buildPayload({
        amount_minor: req.amount_minor,
        currency: req.currency,
        reference: req.reference,
      })
      return {
        qr_payload,
        provider_ref: cfg.md5(qr_payload),
        expires_at: new Date(Date.now() + QR_TTL_SECONDS * 1000).toISOString(),
      }
    },

    async checkCharge(provider_ref, expected_minor, currency) {
      const ctl = new AbortController()
      const t = setTimeout(() => ctl.abort(), cfg.timeoutMs ?? 10_000)
      try {
        const res = await fetch(new URL('/v1/check_transaction_by_md5', cfg.relayUrl), {
          method: 'POST',
          cache: 'no-store',
          signal: ctl.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cfg.relayToken}`,
          },
          body: JSON.stringify({ md5: provider_ref }),
        })
        const raw = await readJson(res)
        if (!res.ok) throw new ProviderError(`relay returned ${res.status}`, res.status)
        // Bakong convention: responseCode 0 means found and settled.
        if (raw.responseCode !== 0) return { status: 'pending', raw }
        const data = jsonRecord(raw.data)
        const amount_minor = majorToMinor(data?.amount, currency)
        if (!amountsMatch(expected_minor, amount_minor)) {
          return { status: 'pending', amount_minor, raw }
        }
        return {
          status: 'paid',
          provider_txn_id: typeof data?.hash === 'string' ? data.hash : undefined,
          amount_minor,
          raw,
        }
      } finally {
        clearTimeout(t)
      }
    },
  }
}

/** Cash and walk-ins. The owner marks it paid, no provider involved. */
export const manualAdapter: PaymentProviderAdapter = {
  id: 'cash',
  pollBased: false,
  settlesCurrencies: ['KHR', 'USD'],
  async createCharge() {
    throw new ProviderError('cash is recorded directly, not charged', 400)
  },
  async checkCharge() {
    return { status: 'pending', raw: { note: 'awaiting owner confirmation' } }
  },
}

/**
 * Route by currency, then fall back. Riel shops are the common case here, and
 * CutLuy cannot settle riel, so the order is not a global preference.
 */
export function providersFor(currency: CurrencyCode): PaymentProviderAdapter[] {
  const out: PaymentProviderAdapter[] = []
  const cutluyToken = process.env.CUTLUY_API_TOKEN?.trim()
  const relayUrl = process.env.BAKONG_RELAY_API_URL?.trim()
  const relayToken = process.env.BAKONG_RELAY_API_TOKEN?.trim()

  if (relayUrl && relayToken && process.env.BAKONG_ACCOUNT?.trim()) {
    // buildPayload and md5 are injected at the call site, where the KHQR string
    // builder lives. Kept out of here so this file stays network-only.
    out.push(
      localKhqrAdapter({
        buildPayload: () => {
          throw new Error('inject buildPayload from lib/khqr-string.ts')
        },
        md5: () => {
          throw new Error('inject md5 from node:crypto')
        },
        relayUrl,
        relayToken,
      }),
    )
  }
  if (currency === 'USD' && cutluyToken) {
    out.push(cutluyAdapter({ token: cutluyToken, paymentLinkId: process.env.CUTLUY_PAYMENT_LINK_ID }))
  }
  if (out.length === 0) throw new Error(`no payment rail configured that settles ${currency}`)
  return out
}

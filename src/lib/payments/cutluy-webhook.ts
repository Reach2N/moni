import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * CutLuy webhook verification, as pure functions.
 *
 * A webhook is the only honest way to learn that money moved. Polling
 * `GET /v1/payments/:id` tells you what CutLuy thought when you asked, costs a
 * request against a 600/minute budget, and still races the customer. The
 * webhook is authoritative, so everything that decides whether to TRUST one
 * lives here, with no framework and no network, and is proved in `db/test.mjs`.
 *
 * No `server-only`: these are the rules, and a rule nothing tests is a comment.
 */

/** CutLuy signs with `t=<unix seconds>,v1=<hex hmac>`. */
export type CutluySignature = { timestamp: number; v1: string }

export function parseSignatureHeader(header: string | null | undefined): CutluySignature | null {
  if (!header) return null
  let timestamp: number | null = null
  let v1: string | null = null
  for (const part of header.split(',')) {
    const [key, value] = part.trim().split('=', 2)
    if (key === 't' && value && /^\d{1,15}$/.test(value)) timestamp = Number(value)
    if (key === 'v1' && value && /^[0-9a-f]+$/i.test(value)) v1 = value.toLowerCase()
  }
  if (timestamp === null || !v1) return null
  return { timestamp, v1 }
}

/**
 * The signed string is `${t}.${rawBody}`, over the bytes CutLuy actually sent.
 *
 * This takes the RAW body as a string on purpose. Parsing JSON and
 * re-serialising it changes the bytes (key order, whitespace, unicode escapes)
 * and the HMAC then never matches, which is the single most common way a
 * webhook integration fails while looking correct.
 */
export function expectedSignature(timestamp: number, rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex')
}

/** Constant time. `===` on a hex digest leaks it one character at a time. */
export function signaturesMatch(presented: string, expected: string): boolean {
  const a = Buffer.from(presented, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  // timingSafeEqual throws on a length mismatch, so the length is checked first
  // and a wrong length is simply "no", which leaks nothing a wrong hex digit
  // would not have leaked anyway.
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** Five minutes, which blunts replay of a captured delivery without fighting clock skew. */
export const REPLAY_WINDOW_SECONDS = 5 * 60

export function withinReplayWindow(timestamp: number, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  const drift = nowSeconds - timestamp
  // A timestamp far in the FUTURE is refused too. Only a forged or badly skewed
  // sender produces one, and accepting it would make the window meaningless.
  return drift <= REPLAY_WINDOW_SECONDS && drift >= -REPLAY_WINDOW_SECONDS
}

export type CutluyVerdict =
  | { ok: true; timestamp: number }
  | { ok: false; reason: 'no_signature' | 'bad_format' | 'stale' | 'mismatch' }

export function verifyCutluyDelivery(
  rawBody: string,
  header: string | null | undefined,
  secret: string,
  nowSeconds?: number,
): CutluyVerdict {
  const parsed = parseSignatureHeader(header)
  if (!header) return { ok: false, reason: 'no_signature' }
  if (!parsed) return { ok: false, reason: 'bad_format' }
  if (!withinReplayWindow(parsed.timestamp, nowSeconds)) return { ok: false, reason: 'stale' }
  if (!signaturesMatch(parsed.v1, expectedSignature(parsed.timestamp, rawBody, secret))) {
    return { ok: false, reason: 'mismatch' }
  }
  return { ok: true, timestamp: parsed.timestamp }
}

/**
 * The events CutLuy sends. Only ONE of them means the money moved.
 *
 * `payment.scanned` means the customer opened the QR in their banking app and
 * has not paid. Fulfilling on it would give away goods for an intention, and it
 * is the mistake this list exists to make impossible to write by accident.
 */
export const CUTLUY_EVENTS = ['payment.completed', 'payment.scanned', 'payment.expired', 'payment.failed'] as const
export type CutluyEvent = (typeof CUTLUY_EVENTS)[number]

export function isFulfillingEvent(event: string): boolean {
  return event === 'payment.completed'
}

/** Their status vocabulary mapped onto ours. Only `paid` settles. */
export function statusFromEvent(event: string): 'paid' | 'expired' | 'failed' | 'pending' {
  if (event === 'payment.completed') return 'paid'
  if (event === 'payment.expired') return 'expired'
  if (event === 'payment.failed') return 'failed'
  // payment.scanned, and anything they add later, leaves the row alone.
  return 'pending'
}

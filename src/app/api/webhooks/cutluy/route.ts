import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { db } from '@/lib/db.ts'
import { throwIfDbError } from '@/lib/db-result.ts'
import type { Json } from '@/lib/database.types.ts'
import { amountsMatch } from '@/lib/payments.ts'
import {
  isFulfillingEvent,
  statusFromEvent,
  verifyCutluyDelivery,
} from '@/lib/payments/cutluy-webhook.ts'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BODY_BYTES = 100_000

/**
 * CutLuy's webhook. This, not polling, is how we learn a USD payment succeeded.
 *
 * The order of operations here is the entire security and correctness story, so
 * it is written out rather than implied:
 *
 *  1. The RAW body is read first, as text, and the signature is checked against
 *     those exact bytes. Nothing parses JSON before that. Parsing and
 *     re-serialising changes the bytes and the HMAC stops matching, which is the
 *     classic way this integration "works" everywhere except production.
 *  2. Signatures are compared in constant time, never with `===`.
 *  3. A delivery whose timestamp is more than five minutes old (or ahead) is
 *     refused, so a captured delivery cannot be replayed later.
 *  4. We answer 2xx immediately and do the database work in `after()`. A non-2xx
 *     is retried with exponential backoff up to eight times, and a slow handler
 *     turns one payment into eight deliveries.
 *  5. The work is idempotent, keyed off the payment id: the update is scoped to
 *     `status = 'pending'`, so a second delivery of the same event updates zero
 *     rows and changes nothing.
 *  6. Only `payment.completed` fulfils. `payment.scanned` means the customer
 *     opened the QR in their banking app and has NOT paid.
 */
export async function POST(req: Request) {
  const secret = process.env.CUTLUY_WEBHOOK_SECRET?.trim()
  if (!secret) {
    // Refusing to trust anything we cannot verify. 503 rather than 200, because
    // this is our misconfiguration and a retry after we fix it is welcome.
    console.error('[cutluy] CUTLUY_WEBHOOK_SECRET is not set, refusing the delivery')
    return NextResponse.json({ error: 'not configured' }, { status: 503 })
  }

  const raw = await req.text()
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'payload too large' }, { status: 413 })
  }

  const verdict = verifyCutluyDelivery(raw, req.headers.get('x-cutluy-signature'), secret)
  if (!verdict.ok) {
    // One shape of answer for every rejection, so the endpoint cannot be used to
    // learn whether a signature was merely stale or actually wrong.
    console.warn(`[cutluy] delivery refused: ${verdict.reason}`)
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const event = req.headers.get('x-cutluy-event') ?? ''
  let payload: { id?: string; status?: string; amount?: string | number; reference_id?: string } | null = null
  try {
    payload = JSON.parse(raw)
  } catch {
    // Signed but unreadable is their bug, not ours, and retrying will not fix
    // it. 200 stops the backoff.
    return NextResponse.json({ ok: true, ignored: 'unreadable payload' })
  }

  const paymentId = typeof payload?.id === 'string' ? payload.id : null
  if (!paymentId) return NextResponse.json({ ok: true, ignored: 'no payment id' })

  // Answer now, work after. Requirement 4, and the reason `after()` exists.
  after(async () => {
    try {
      await settle({ event, paymentId, payload, raw })
    } catch (error) {
      console.error('[cutluy] settlement failed:', error instanceof Error ? error.message : error)
    }
  })

  return NextResponse.json({ ok: true })
}

async function settle({
  event,
  paymentId,
  payload,
  raw,
}: {
  event: string
  paymentId: string
  payload: { amount?: string | number } | null
  raw: string
}) {
  // `provider_ref` is CutLuy's own id, which is what their webhook carries and
  // what `cutluyAdapter.createCharge` stored. One lookup, no reference guessing.
  const paymentResult = await db
    .from('payments')
    .select('id, business_id, booking_id, amount_minor, currency, status')
    .eq('provider', 'cutluy')
    .eq('provider_ref', paymentId)
    .maybeSingle()
  throwIfDbError('load cutluy payment', paymentResult.error)
  const payment = paymentResult.data
  if (!payment) {
    console.warn(`[cutluy] no payment matches provider_ref ${paymentId}`)
    return
  }

  // Verbatim, always. When a customer insists they paid and the row says
  // otherwise, this is the only thing that can settle the argument.
  const recorded = await db.from('payment_events').insert({
    payment_id: payment.id,
    source: 'cutluy',
    status_reported: event,
    raw: JSON.parse(raw) as Json,
  })
  if (recorded.error) console.error('[cutluy] event not recorded:', recorded.error.message)

  if (!isFulfillingEvent(event)) {
    const status = statusFromEvent(event)
    // scanned leaves the row exactly as it was: an intention is not a payment.
    if (status === 'pending') return
    await db
      .from('payments')
      .update({ status, last_checked_at: new Date().toISOString() })
      .eq('id', payment.id)
      .eq('status', 'pending')
    return
  }

  // The amount has to agree, in whole minor units. A completed event for the
  // wrong figure is a discrepancy for a human, never an automatic fulfilment.
  const reportedMinor = Math.round(Number(payload?.amount ?? NaN) * 100)
  if (!amountsMatch(payment.amount_minor, reportedMinor)) {
    console.error(
      `[cutluy] amount mismatch on ${paymentId}: expected ${payment.amount_minor}, reported ${reportedMinor}`,
    )
    await db
      .from('payments')
      .update({ last_checked_at: new Date().toISOString() })
      .eq('id', payment.id)
    return
  }

  // Idempotent, keyed off the payment. The second delivery of the same event
  // matches zero rows because the first one already moved it off pending.
  const paid = await db
    .from('payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      provider_txn_id: paymentId,
      last_checked_at: new Date().toISOString(),
    })
    .eq('id', payment.id)
    .eq('status', 'pending')
    .select('id, booking_id, business_id')
    .maybeSingle()
  throwIfDbError('mark cutluy payment paid', paid.error)
  if (!paid.data) return // already settled by an earlier delivery

  if (payment.booking_id) {
    const confirmed = await db
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', payment.booking_id)
      .eq('business_id', payment.business_id)
      .eq('status', 'pending')
    if (confirmed.error) console.error('[cutluy] booking not confirmed:', confirmed.error.message)
  }

  const audit = await db.from('events').insert({
    business_id: payment.business_id,
    actor: 'system',
    actor_label: 'cutluy webhook',
    action: 'payment.completed',
    entity_type: 'payment',
    entity_id: payment.id,
    after: { provider_ref: paymentId, amount_minor: payment.amount_minor },
  })
  if (audit.error) console.error('[cutluy] payment not audited:', audit.error.message)
}

import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { db } from '@/lib/db.ts'
import { dueReminders, keepAlive, pendingPayments, recordReminder } from '@/lib/queries/ops.ts'
import { deliverToCustomer } from '@/lib/channels/deliver.ts'
import { isPollable, railsFor } from '@/lib/payments/rails.ts'
import type { CurrencyCode } from '@/lib/types.ts'
import { cambodiaClock } from '@/lib/time/cambodia.ts'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * Everything that has to happen on a clock, on ONE endpoint.
 *
 * Vercel Hobby cron cannot fire more than once a day, and an expression that
 * asks for more fails at DEPLOY time, not at runtime. Three needs are sub-daily
 * (reminders, payment polling, and keeping the free-tier project awake), so they
 * all ride here and a free external scheduler calls it every five minutes.
 * ARCHITECTURE.md section 4.
 *
 * Every job is independent and none may take the tick down with it: a failing
 * reminder must not stop a payment being noticed. Each is caught, counted, and
 * reported, and the response is the log.
 */
function authorised(req: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim()
  if (!expected) return false
  const presented = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const a = Buffer.from(presented, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  // Constant time, and the length check first because timingSafeEqual throws on
  // a mismatch. This endpoint sends messages to real customers; an open one is
  // a way to make a shop spam its own clientele.
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

async function runReminders() {
  const due = await dueReminders()
  let sent = 0
  for (const reminder of due) {
    const when = cambodiaClock(reminder.startsAt)
    const text =
      reminder.kind === 'day_before'
        ? `រំលឹក៖ ${reminder.serviceName} ថ្ងៃស្អែក ម៉ោង ${when}។ លេខកូដ ${reminder.code}។`
        : `រំលឹក៖ ${reminder.serviceName} ម៉ោង ${when} ក្នុងមួយម៉ោងទៀត។ លេខកូដ ${reminder.code}។`

    const delivery = await deliverToCustomer({
      businessId: reminder.businessId,
      customerId: reminder.customerId,
      channel: reminder.channel,
      text,
    })
    // Recorded either way. A reminder we could not deliver must not be retried
    // every five minutes forever; the audit row says what happened.
    await recordReminder(reminder)
    if (delivery.delivered) sent += 1
  }
  return { due: due.length, sent }
}

async function runPaymentPolling() {
  const pending = await pendingPayments()
  let settled = 0
  for (const payment of pending) {
    // A shop's own Bakong account cannot be asked from here; the owner confirms.
    if (!isPollable(payment.provider)) continue
    const currency = payment.currency as CurrencyCode
    const rail = railsFor(currency, null).find((candidate) => candidate.id === payment.provider)
    if (!rail || !payment.provider_ref) continue

    const result = await rail.checkCharge(payment.provider_ref, payment.amount_minor, currency)
    await db.from('payment_events').insert({
      payment_id: payment.id,
      source: `${rail.id}:cron`,
      status_reported: result.status,
      raw: result.raw as never,
    })

    const now = new Date().toISOString()
    if (result.status !== 'paid') {
      await db.from('payments').update({ last_checked_at: now }).eq('id', payment.id)
      continue
    }

    // Scoped to pending, so the webhook winning the race first is not undone
    // and the booking is not confirmed twice.
    const paid = await db
      .from('payments')
      .update({ status: 'paid', paid_at: now, last_checked_at: now, provider_txn_id: result.provider_txn_id ?? null })
      .eq('id', payment.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()
    if (!paid.data) continue

    settled += 1
    if (payment.booking_id) {
      await db
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', payment.booking_id)
        .eq('business_id', payment.business_id)
        .eq('status', 'pending')
    }
  }
  return { checked: pending.length, settled }
}

export async function POST(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const started = Date.now()
  const report: Record<string, unknown> = {}
  const failures: string[] = []

  for (const [name, job] of [
    ['reminders', runReminders],
    ['payments', runPaymentPolling],
    ['keep_alive', async () => ({ businesses: await keepAlive() })],
  ] as const) {
    try {
      report[name] = await job()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'failed'
      console.error(`[cron] ${name}:`, message)
      report[name] = { error: message }
      failures.push(name)
    }
  }

  return NextResponse.json({
    ok: failures.length === 0,
    ms: Date.now() - started,
    ...report,
    ...(failures.length ? { failed: failures } : {}),
  })
}

/** A GET is convenient for a scheduler that cannot POST, and for a health check. */
export const GET = POST

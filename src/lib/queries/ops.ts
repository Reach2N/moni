import 'server-only'
import { db } from '../db.ts'
import { throwIfDbError } from '../db-result.ts'
import type { Spend } from '../ops/budget.ts'

/**
 * What the operations layer needs to know. PLAN.md Phase 9.
 *
 * Spend is read from the DATABASE rather than a counter in memory, because a
 * ceiling that every serverless instance disagrees about is not a ceiling.
 */
export async function readSpend(businessId: string, conversationId: string): Promise<Spend> {
  const [monthResult, conversationResult] = await Promise.all([
    db.from('v_month_usage').select('ai_spend_micro_usd').eq('business_id', businessId).maybeSingle(),
    db.from('messages').select('cost_micro_usd').eq('conversation_id', conversationId).not('cost_micro_usd', 'is', null),
  ])
  throwIfDbError('read month spend', monthResult.error)
  throwIfDbError('read conversation spend', conversationResult.error)

  return {
    monthMicroUsd: monthResult.data?.ai_spend_micro_usd ?? 0,
    conversationMicroUsd: (conversationResult.data ?? []).reduce(
      (total, row) => total + (row.cost_micro_usd ?? 0),
      0,
    ),
  }
}

export type DueReminder = {
  bookingId: string
  businessId: string
  customerId: string
  channel: string
  code: string
  startsAt: string
  customerName: string
  serviceName: string
  kind: 'day_before' | 'hour_before'
}

/**
 * Bookings that need a reminder now.
 *
 * "Sent already" is recorded in `events`, not in a column on the booking. Two
 * reasons: it needs no migration, and the audit trail is where you look anyway
 * when a customer says they were never told. The kind is part of the action, so
 * the 24 hour and 1 hour reminders cannot suppress each other.
 */
export async function dueReminders(now = new Date(), limit = 50): Promise<DueReminder[]> {
  const windows = [
    { kind: 'day_before' as const, from: 23.5, to: 24.5 },
    { kind: 'hour_before' as const, from: 0.75, to: 1.25 },
  ]

  const out: DueReminder[] = []
  for (const window of windows) {
    const from = new Date(now.getTime() + window.from * 3_600_000).toISOString()
    const to = new Date(now.getTime() + window.to * 3_600_000).toISOString()

    const bookingsResult = await db
      .from('bookings')
      .select('id, business_id, customer_id, channel, code, starts_at, customers(display_name), services(name)')
      .in('status', ['pending', 'confirmed'])
      .gte('starts_at', from)
      .lt('starts_at', to)
      .limit(limit)
    throwIfDbError('load bookings due a reminder', bookingsResult.error)
    const bookings = bookingsResult.data ?? []
    if (bookings.length === 0) continue

    const sentResult = await db
      .from('events')
      .select('entity_id')
      .eq('action', `reminder.${window.kind}`)
      .in('entity_id', bookings.map((booking) => booking.id))
    throwIfDbError('load reminders already sent', sentResult.error)
    const sent = new Set((sentResult.data ?? []).map((row) => row.entity_id))

    for (const booking of bookings) {
      if (sent.has(booking.id)) continue
      out.push({
        bookingId: booking.id,
        businessId: booking.business_id,
        customerId: booking.customer_id,
        channel: booking.channel,
        code: booking.code,
        startsAt: booking.starts_at,
        customerName: booking.customers?.display_name ?? 'អតិថិជន',
        serviceName: booking.services?.name ?? '',
        kind: window.kind,
      })
    }
  }
  return out
}

/** Marks a reminder sent, so the next tick five minutes later does not resend it. */
export async function recordReminder(reminder: DueReminder) {
  const result = await db.from('events').insert({
    business_id: reminder.businessId,
    actor: 'system',
    actor_label: 'cron tick',
    action: `reminder.${reminder.kind}`,
    entity_type: 'booking',
    entity_id: reminder.bookingId,
    after: { channel: reminder.channel, starts_at: reminder.startsAt },
  })
  throwIfDbError('record reminder', result.error)
}

/**
 * Payments still waiting on money, oldest first.
 *
 * CutLuy's webhook is authoritative and this is the safety net beneath it: a
 * delivery that never arrived, or arrived while we were deploying, still gets
 * noticed. Bounded hard, because polling is rate limited (600 reads a minute)
 * and a backlog must not become a thundering herd.
 */
export async function pendingPayments(limit = 20) {
  const cutoff = new Date(Date.now() - 24 * 3_600_000).toISOString()
  const result = await db
    .from('payments')
    .select('id, business_id, booking_id, amount_minor, currency, provider, provider_ref')
    .eq('status', 'pending')
    .not('provider_ref', 'is', null)
    .gte('created_at', cutoff)
    .order('last_checked_at', { ascending: true, nullsFirst: true })
    .limit(limit)
  throwIfDbError('load pending payments', result.error)
  return result.data ?? []
}

/**
 * The cheapest possible read, purely so the project is not idle.
 *
 * The free tier pauses after seven days without activity, which happened on
 * 27 August and again before 30 August. A paused project is a shop that cannot
 * take a booking, and the fix is a query nobody needs.
 */
export async function keepAlive() {
  const result = await db.from('businesses').select('id', { count: 'exact', head: true }).limit(1)
  throwIfDbError('keep alive', result.error)
  return result.count ?? 0
}

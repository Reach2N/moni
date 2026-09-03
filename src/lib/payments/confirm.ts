import 'server-only'
import { db } from '../db.ts'
import { requireDbData, throwIfDbError } from '../db-result.ts'
import { deliverToCustomer } from '../channels/deliver.ts'
import { confirmTarget } from './confirm-target.ts'
import { applyScope, confirmScope } from './confirm-scope.ts'
import { formatMoney, type CurrencyCode } from '../types.ts'

/**
 * The owner says the money arrived.
 *
 * For a QR paid into the shop's own Bakong account nobody outside the shop can
 * see the transfer, and the owner's banking app is the only witness. This is the
 * ONE place a person moves a payment from pending to paid, shared by the owner
 * tool (`confirm_payment`), the inbox button, and the money screen, so the rules
 * live once:
 *
 *   - only a pending row moves, and the update is scoped to `status = 'pending'`
 *     so a second tap or a stale click changes zero rows and reports so;
 *   - `paid` requires `paid_at` (a CHECK constraint), so they are set together;
 *   - the booking goes pending -> confirmed in the same step, the way the CutLuy
 *     webhook and `check_payment` already do, so every rail ends up identical,
 *     and since Phase 13 an ORDER does the same;
 *   - a code that matches BOTH a booking and an order is an explicit ambiguous
 *     outcome, never a guess: see `confirm-target.ts` for why;
 *   - the provider reply that would normally sit in `payment_events` is the
 *     owner's word, recorded verbatim as such, because when a customer later
 *     insists they paid twice this is the row that settles it;
 *   - the customer is told, on the channel they used, so the conversation that
 *     asked for the money also hears that it arrived. A WEB order has no channel
 *     to reply on, so nobody is told and the outcome says so rather than
 *     pretending: the order page shows paid on reload, which is the honest
 *     answer until a web customer has somewhere to be reached.
 */
export type ConfirmOutcome =
  | {
      outcome: 'confirmed'
      /** Which kind of thing was confirmed. The owner asked with a code; this says what it was. */
      kind: 'booking' | 'order'
      code: string
      amount: string
      amount_minor: number
      currency: CurrencyCode
      customer_told: boolean
    }
  | { outcome: 'already_paid'; code: string; amount: string }
  /** One code, two things. Nobody guesses: the owner is asked which. */
  | { outcome: 'ambiguous'; code: string }
  | { outcome: 'not_found'; code: string }

/** Channels a customer can actually be reached on. `web` and `walk_in` are not. */
const REACHABLE = new Set(['telegram', 'messenger'])

export async function confirmPayment({
  businessId,
  code,
  actorLabel,
}: {
  businessId: string
  code: string
  /** Who said so, for the audit row: "owner via moni" or "owner via inbox". */
  actorLabel: string
}): Promise<ConfirmOutcome> {
  const upper = code.trim().toUpperCase()

  // Both, always, and scoped to this business. Looking up the booking first and
  // stopping there is what would let a collision confirm the wrong sale.
  const [bookingResult, orderResult] = await Promise.all([
    db
      .from('bookings')
      .select('id, code, customer_id, channel')
      .eq('business_id', businessId)
      .eq('code', upper)
      .maybeSingle(),
    db
      .from('orders')
      .select('id, code, customer_id, channel')
      .eq('business_id', businessId)
      .eq('code', upper)
      .maybeSingle(),
  ])
  throwIfDbError('load booking for confirmation', bookingResult.error)
  throwIfDbError('load order for confirmation', orderResult.error)

  const target = confirmTarget(bookingResult.data, orderResult.data)
  if (target.kind === 'none') return { outcome: 'not_found', code: upper }
  if (target.kind === 'ambiguous') return { outcome: 'ambiguous', code: upper }

  const isOrder = target.kind === 'order'
  const subject = isOrder ? orderResult.data! : bookingResult.data!

  const base = db
    .from('payments')
    .select('id, amount_minor, currency, status')
    .eq('business_id', businessId)
  const scoped = isOrder ? base.eq('order_id', target.id) : base.eq('booking_id', target.id)
  const paymentResult = await scoped
    .in('status', ['pending', 'paid'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  throwIfDbError('load payment for confirmation', paymentResult.error)
  const payment = paymentResult.data
  if (!payment) return { outcome: 'not_found', code: upper }

  const currency = payment.currency as CurrencyCode
  const amount = formatMoney(payment.amount_minor, currency)
  if (payment.status === 'paid') return { outcome: 'already_paid', code: upper, amount }

  const now = new Date().toISOString()
  // Scoped through `confirmScope`, never a hand-written eq chain: the row, the
  // shop and `pending`, so a second tap changes nothing and says already_paid.
  // See `confirm-scope.ts` for why the rule lives there and not here.
  const paid = await applyScope(
    db
      .from('payments')
      .update({ status: 'paid', paid_at: now, provider_txn_id: 'owner-confirmed', last_checked_at: now }),
    confirmScope(payment.id, businessId),
  )
    .select('id')
    .maybeSingle()
  throwIfDbError('confirm payment', paid.error)
  if (!paid.data) return { outcome: 'already_paid', code: upper, amount }

  const witness = await db.from('payment_events').insert({
    payment_id: payment.id,
    source: 'manual',
    status_reported: 'paid',
    raw: { confirmed_by: actorLabel, at: now },
  })
  if (witness.error) console.error('[confirm_payment] event not recorded:', witness.error.message)

  if (isOrder) {
    const confirmed = await applyScope(
      db.from('orders').update({ status: 'confirmed' }),
      confirmScope(target.id, businessId),
    )
    if (confirmed.error) console.error('[confirm_payment] order not confirmed:', confirmed.error.message)
  } else {
    const confirmed = await applyScope(
      db.from('bookings').update({ status: 'confirmed' }),
      confirmScope(target.id, businessId),
    )
    if (confirmed.error) console.error('[confirm_payment] booking not confirmed:', confirmed.error.message)
  }

  const audit = await db.from('events').insert({
    business_id: businessId,
    actor: 'owner',
    actor_label: actorLabel,
    action: 'payment.confirmed',
    entity_type: 'payment',
    entity_id: payment.id,
    after: { code: upper, amount_minor: payment.amount_minor, currency, kind: target.kind },
  })
  if (audit.error) console.error('[confirm_payment] not audited:', audit.error.message)

  // Tell the customer, in the thread that asked for the money. Stored first so
  // the inbox transcript shows it, then pushed; a push failure is reported, not
  // hidden, and never undoes the confirmation above.
  const customerTold = await tellCustomer({
    businessId,
    customerId: subject.customer_id,
    channel: subject.channel,
    text: isOrder
      ? `បានទទួលប្រាក់ ${amount} សម្រាប់ការបញ្ជាទិញ ${upper} ហើយ។ អរគុណ។`
      : `បានទទួលប្រាក់ ${amount} សម្រាប់ការណាត់ ${upper} ហើយ។ អរគុណ។`,
  })

  return {
    outcome: 'confirmed',
    kind: target.kind,
    code: upper,
    amount,
    amount_minor: payment.amount_minor,
    currency,
    customer_told: customerTold,
  }
}

async function tellCustomer({
  businessId,
  customerId,
  channel,
  text,
}: {
  businessId: string
  customerId: string | null
  channel: string
  text: string
}): Promise<boolean> {
  // A web order has no thread and no address. Saying so here beats a delivery
  // attempt that fails for a reason nobody reads.
  if (!customerId || !REACHABLE.has(channel)) return false
  try {
    const conversation = await db
      .from('conversations')
      .select('id')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .eq('channel', channel)
      .maybeSingle()
    if (conversation.data) {
      const stored = await db.from('messages').insert({
        conversation_id: conversation.data.id,
        business_id: businessId,
        role: 'system',
        body: text,
      })
      if (stored.error) console.error('[confirm_payment] receipt not stored:', stored.error.message)
    }
    const delivery = await deliverToCustomer({ businessId, customerId, channel, text })
    if (!delivery.delivered) console.warn(`[confirm_payment] customer not told: ${delivery.reason}`)
    return delivery.delivered
  } catch (error) {
    console.warn('[confirm_payment] customer not told:', error instanceof Error ? error.message : error)
    return false
  }
}

export type PendingPayment = {
  code: string
  /** What the code names, so the inbox row says "booking" or "order" rather than guessing. */
  kind: 'booking' | 'order'
  amount: string
  provider: string
  createdAt: string
  /** An order's lines, so the owner can see what she is confirming. Empty for a booking. */
  lines: Array<{ name: string; quantity: number }>
}

/**
 * Pending QR payments for one customer, for the inbox "money arrived" button.
 *
 * Widened in Phase 13 to include ORDER payments: a shop site order raises a QR
 * exactly as a booking does, and before this it raised one the owner had no
 * button for. Rows that name neither a booking nor an order are skipped: a cash
 * sale over the counter is written already paid and has nothing to confirm.
 *
 * Three follow-up reads rather than a PostgREST embed. `payments` now has two
 * nullable foreign keys into two different tables and a nested embed for the
 * order's lines on top, and that is the kind of select string that typechecks
 * until the day it silently returns null.
 */
export async function pendingPaymentsFor(businessId: string, customerId: string): Promise<PendingPayment[]> {
  const result = await db
    .from('payments')
    .select('id, booking_id, order_id, amount_minor, currency, provider, created_at')
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5)
  throwIfDbError('load pending payments for customer', result.error)
  const rows = (result.data ?? []).filter((row) => row.booking_id || row.order_id)
  if (rows.length === 0) return []

  const bookingIds = [...new Set(rows.map((row) => row.booking_id).filter((id): id is string => !!id))]
  const orderIds = [...new Set(rows.map((row) => row.order_id).filter((id): id is string => !!id))]

  const [bookingRows, orderRows, itemRows] = await Promise.all([
    bookingIds.length
      ? db.from('bookings').select('id, code').eq('business_id', businessId).in('id', bookingIds)
      : Promise.resolve({ data: [], error: null }),
    orderIds.length
      ? db.from('orders').select('id, code').eq('business_id', businessId).in('id', orderIds)
      : Promise.resolve({ data: [], error: null }),
    orderIds.length
      ? db.from('order_items').select('order_id, name, quantity').in('order_id', orderIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  throwIfDbError('load booking codes for pending payments', bookingRows.error)
  throwIfDbError('load order codes for pending payments', orderRows.error)
  throwIfDbError('load order lines for pending payments', itemRows.error)

  const bookingCode = new Map((bookingRows.data ?? []).map((row) => [row.id, row.code]))
  const orderCode = new Map((orderRows.data ?? []).map((row) => [row.id, row.code]))
  const lines = new Map<string, Array<{ name: string; quantity: number }>>()
  for (const item of itemRows.data ?? []) {
    const bucket = lines.get(item.order_id) ?? []
    bucket.push({ name: item.name, quantity: item.quantity })
    lines.set(item.order_id, bucket)
  }

  return rows.flatMap((row) => {
    const isOrder = !!row.order_id
    const code = isOrder ? orderCode.get(row.order_id!) : bookingCode.get(row.booking_id!)
    // A payment whose booking or order belongs to another business resolves to
    // no code here and is dropped, rather than shown without one.
    if (!code) return []
    return [
      {
        code,
        kind: (isOrder ? 'order' : 'booking') as PendingPayment['kind'],
        amount: formatMoney(row.amount_minor, row.currency as CurrencyCode),
        provider: row.provider,
        createdAt: row.created_at,
        lines: isOrder ? (lines.get(row.order_id!) ?? []) : [],
      },
    ]
  })
}

export { requireDbData }

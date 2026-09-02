import 'server-only'
import { db } from '../db.ts'
import { requireDbData, throwIfDbError } from '../db-result.ts'
import { deliverToCustomer } from '../channels/deliver.ts'
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
 *     webhook and `check_payment` already do, so every rail ends up identical;
 *   - the provider reply that would normally sit in `payment_events` is the
 *     owner's word, recorded verbatim as such, because when a customer later
 *     insists they paid twice this is the row that settles it;
 *   - the customer is told, on the channel they used, so the conversation that
 *     asked for the money also hears that it arrived.
 */
export type ConfirmOutcome =
  | { outcome: 'confirmed'; code: string; amount: string; amount_minor: number; currency: CurrencyCode; customer_told: boolean }
  | { outcome: 'already_paid'; code: string; amount: string }
  | { outcome: 'not_found'; code: string }

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

  const bookingResult = await db
    .from('bookings')
    .select('id, code, customer_id, channel')
    .eq('business_id', businessId)
    .eq('code', upper)
    .maybeSingle()
  throwIfDbError('load booking for confirmation', bookingResult.error)
  const booking = bookingResult.data
  if (!booking) return { outcome: 'not_found', code: upper }

  const paymentResult = await db
    .from('payments')
    .select('id, amount_minor, currency, status')
    .eq('business_id', businessId)
    .eq('booking_id', booking.id)
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
  const paid = await db
    .from('payments')
    .update({ status: 'paid', paid_at: now, provider_txn_id: 'owner-confirmed', last_checked_at: now })
    .eq('id', payment.id)
    .eq('business_id', businessId)
    .eq('status', 'pending')
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

  const confirmed = await db
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', booking.id)
    .eq('business_id', businessId)
    .eq('status', 'pending')
  if (confirmed.error) console.error('[confirm_payment] booking not confirmed:', confirmed.error.message)

  const audit = await db.from('events').insert({
    business_id: businessId,
    actor: 'owner',
    actor_label: actorLabel,
    action: 'payment.confirmed',
    entity_type: 'payment',
    entity_id: payment.id,
    after: { code: upper, amount_minor: payment.amount_minor, currency },
  })
  if (audit.error) console.error('[confirm_payment] not audited:', audit.error.message)

  // Tell the customer, in the thread that asked for the money. Stored first so
  // the inbox transcript shows it, then pushed; a push failure is reported, not
  // hidden, and never undoes the confirmation above.
  let customerTold = false
  try {
    const text = `បានទទួលប្រាក់ ${amount} សម្រាប់ការណាត់ ${upper} ហើយ។ អរគុណ។`
    const conversation = await db
      .from('conversations')
      .select('id')
      .eq('business_id', businessId)
      .eq('customer_id', booking.customer_id)
      .eq('channel', booking.channel)
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
    const delivery = await deliverToCustomer({ businessId, customerId: booking.customer_id, channel: booking.channel, text })
    customerTold = delivery.delivered
    if (!delivery.delivered) console.warn(`[confirm_payment] customer not told: ${delivery.reason}`)
  } catch (error) {
    console.warn('[confirm_payment] customer not told:', error instanceof Error ? error.message : error)
  }

  return { outcome: 'confirmed', code: upper, amount, amount_minor: payment.amount_minor, currency, customer_told: customerTold }
}

/** Pending QR payments for a customer's bookings, for the inbox "money arrived" button. */
export async function pendingPaymentsFor(businessId: string, customerId: string) {
  const result = await db
    .from('payments')
    .select('amount_minor, currency, provider, created_at, bookings!inner(code)')
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .eq('status', 'pending')
    .not('booking_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5)
  throwIfDbError('load pending payments for customer', result.error)
  return (result.data ?? []).map((row) => ({
    code: row.bookings.code,
    amount: formatMoney(row.amount_minor, row.currency as CurrencyCode),
    provider: row.provider,
    createdAt: row.created_at,
  }))
}

export type PendingPayment = Awaited<ReturnType<typeof pendingPaymentsFor>>[number]
export { requireDbData }

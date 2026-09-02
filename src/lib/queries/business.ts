import 'server-only'
import { db } from '../db.ts'
import { requireDbData, throwIfDbError } from '../db-result.ts'
import { BILLABLE_BOOKING_STATUSES } from '../types.ts'

/**
 * The business columns every owner-facing surface needs. One list, because a
 * column added here and forgotten in the other caller is how a dashboard and an
 * agent end up disagreeing about the same shop.
 */
export const BUSINESS_COLUMNS =
  'id, slug, name, business_type, category, phone, address, province, timezone, default_currency, locale, hours, attributes, ai_instructions, plan, quota_txn_month'

/**
 * A shop by its id, which is the tenant key resolved from the session by
 * `requireMember()`. Never resolve a tenant from anything a request supplied:
 * ARCHITECTURE.md section 2 puts the whole of tenancy in that one helper plus
 * this argument.
 */
export async function getBusinessById(businessId: string) {
  return requireDbData(
    'load business',
    await db.from('businesses').select(BUSINESS_COLUMNS).eq('id', businessId).single(),
  )
}

/**
 * Does this shop have anything to sell yet, of either kind?
 *
 * The answer decides whether a member lands on the dashboard or on onboarding,
 * so it is a count and not a full read: an empty shop's dashboard is a page of
 * zeroes that answers none of the owner's three opening questions.
 *
 * It counted active `services` until 2 September 2026, which meant a cafe with
 * a full menu and no appointments answered false: the dashboard bounced it back
 * to onboarding on every visit and the setup spine never completed. It counts
 * `v_catalog`, so a menu is a catalogue and so is a price list.
 */
export async function hasCatalogue(businessId: string): Promise<boolean> {
  const result = await db
    .from('v_catalog')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('active', true)
  throwIfDbError('count catalogue', result.error)
  return (result.count ?? 0) > 0
}

export type ChannelStatus = {
  channel: string
  displayName: string | null
  status: string
  connectedAt: string | null
  lastError: string | null
}

/**
 * What the owner has wired up. The token is never selected, not even to be
 * ignored: a credential that is not read cannot be leaked by a careless log.
 */
export async function getChannelConnections(businessId: string): Promise<ChannelStatus[]> {
  const result = await db
    .from('channel_connections')
    .select('channel, display_name, status, connected_at, last_error')
    .eq('business_id', businessId)
    .order('channel')
  throwIfDbError('load channel connections', result.error)
  return (result.data ?? []).map((row) => ({
    channel: row.channel,
    displayName: row.display_name,
    status: row.status,
    connectedAt: row.connected_at,
    lastError: row.last_error,
  }))
}

/**
 * Has this shop ever served a real customer?
 *
 * The counted set is the one `v_month_usage` meters (db/schema.sql): a booking
 * that got real, plus a standalone paid sale with no booking behind it, so a
 * booking that is also paid counts once. The WINDOW is deliberately different:
 * the meter asks about this month, the setup spine asks whether it has ever
 * happened at all. Change the set here only by changing the view too, or the
 * product will meter one thing and congratulate the owner for another.
 *
 * Two head counts rather than one join: either is a yes, so the second is
 * skipped whenever the first answers.
 */
export async function hasFirstTransaction(businessId: string): Promise<boolean> {
  const bookings = await db
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .in('status', [...BILLABLE_BOOKING_STATUSES])
  throwIfDbError('count billable bookings', bookings.error)
  if ((bookings.count ?? 0) > 0) return true

  const sales = await db
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'paid')
    .is('booking_id', null)
  throwIfDbError('count standalone sales', sales.error)
  return (sales.count ?? 0) > 0
}

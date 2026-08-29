import 'server-only'
import { db } from '../db.ts'
import { requireDbData, throwIfDbError } from '../db-result.ts'

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
 * Does this shop have anything to sell yet?
 *
 * The answer decides whether a member lands on the dashboard or on onboarding,
 * so it is a count and not a full read: an empty shop's dashboard is a page of
 * zeroes that answers none of the owner's three opening questions.
 */
export async function hasCatalogue(businessId: string): Promise<boolean> {
  const result = await db
    .from('services')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('active', true)
  throwIfDbError('count active services', result.error)
  return (result.count ?? 0) > 0
}

import 'server-only'
import { db } from '../db.ts'
import { requireDbData } from '../db-result.ts'

/**
 * The business columns every owner-facing surface needs. One list, because a
 * column added here and forgotten in the other caller is how a dashboard and an
 * agent end up disagreeing about the same shop.
 */
export const BUSINESS_COLUMNS =
  'id, slug, name, business_type, category, phone, address, province, timezone, default_currency, locale, hours, attributes, plan, quota_txn_month'

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

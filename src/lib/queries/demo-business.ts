import 'server-only'
import { db } from '../db.ts'
import { requireDbData } from '../db-result.ts'

export const DEMO_BUSINESS_SLUG = 'sokha-beauty'
export const DEMO_VISITOR_COOKIE = 'moni_sokha_visitor'

export async function getDemoBusiness() {
  return requireDbData(
    'load demo business',
    await db
      .from('businesses')
      .select(
        'id, slug, name, business_type, category, phone, address, province, timezone, default_currency, locale, hours, attributes, plan, quota_txn_month',
      )
      .eq('slug', DEMO_BUSINESS_SLUG)
      .single(),
  )
}

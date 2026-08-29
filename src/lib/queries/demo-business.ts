import 'server-only'
import { db } from '../db.ts'
import { requireDbData } from '../db-result.ts'
import { BUSINESS_COLUMNS } from './business.ts'

export const DEMO_BUSINESS_SLUG = 'sokha-beauty'
export const DEMO_VISITOR_COOKIE = 'moni_sokha_visitor'

export async function getDemoBusiness() {
  return requireDbData(
    'load demo business',
    await db
      .from('businesses')
      .select(BUSINESS_COLUMNS)
      .eq('slug', DEMO_BUSINESS_SLUG)
      .single(),
  )
}

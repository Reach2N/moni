import 'server-only'
import { db } from '../db.ts'
import { throwIfDbError } from '../db-result.ts'
import { getChannelConnections, hasFirstTransaction } from './business.ts'
import { deriveSetupProgress, type SetupStep } from './setup-progress.ts'

/**
 * The five answers the setup spine needs, in one round of parallel reads.
 *
 * `businessId` is an argument, like every query in this directory: RLS has zero
 * policies, so a query that forgets its tenant has nothing to catch it.
 */
export async function loadSetupProgress(businessId: string): Promise<SetupStep[]> {
  const [described, catalogue, channels, served] = await Promise.all([
    db.from('businesses').select('raw_description, khqr_account_id').eq('id', businessId).single(),
    db
      .from('v_catalog')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('active', true),
    getChannelConnections(businessId),
    hasFirstTransaction(businessId),
  ])
  throwIfDbError('load shop description', described.error)
  throwIfDbError('count catalogue', catalogue.error)

  const catalogueCount = catalogue.count ?? 0
  return deriveSetupProgress({
    hasDescription: Boolean(described.data?.raw_description),
    hasCatalogue: catalogueCount > 0,
    catalogueCount,
    hasPaymentAccount: Boolean(described.data?.khqr_account_id),
    channels,
    hasFirstTransaction: served,
  })
}

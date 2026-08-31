import 'server-only'
import { db } from '../db.ts'
import { throwIfDbError } from '../db-result.ts'
import { getChannelConnections, hasFirstTransaction } from './business.ts'
import { deriveSetupProgress, type SetupStep } from './setup-progress.ts'

/**
 * The four answers the setup spine needs, in one round of parallel reads.
 *
 * `businessId` is an argument, like every query in this directory: RLS has zero
 * policies, so a query that forgets its tenant has nothing to catch it.
 */
export async function loadSetupProgress(businessId: string): Promise<SetupStep[]> {
  const [described, services, channels, served] = await Promise.all([
    db.from('businesses').select('raw_description').eq('id', businessId).single(),
    db
      .from('services')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('active', true),
    getChannelConnections(businessId),
    hasFirstTransaction(businessId),
  ])
  throwIfDbError('load shop description', described.error)
  throwIfDbError('count active services', services.error)

  const serviceCount = services.count ?? 0
  return deriveSetupProgress({
    hasDescription: Boolean(described.data?.raw_description),
    hasCatalogue: serviceCount > 0,
    serviceCount,
    channels,
    hasFirstTransaction: served,
  })
}

import 'server-only'
import { countEscalations } from './inbox.ts'

/**
 * The two numbers every owner screen's chrome shows: how many conversations
 * wait on her, and how many bookings the free plan has left this month. Cheap
 * on purpose, because this runs on every page and the dashboard snapshot is
 * the one screen that can afford the full read.
 */
export async function loadShellCounts(businessId: string): Promise<{ inboxCount: number }> {
  return { inboxCount: await countEscalations(businessId) }
}

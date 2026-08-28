import 'server-only'
import { db } from '../db.ts'
import { throwIfDbError } from '../db-result.ts'
import { cambodiaDayBounds } from '../time/cambodia.ts'

/** Everything the dashboard and the agent need about one shop, in one round trip. */
export async function getShop(slug: string) {
  const { data: business, error } = await db
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw new Error(`getShop(${slug}): ${error.message}`)

  const [servicesResult, resourcesResult] = await Promise.all([
    db.from('services').select('*').eq('business_id', business.id).eq('active', true).order('sort_order'),
    db.from('resources').select('*').eq('business_id', business.id).eq('active', true).order('name'),
  ])
  throwIfDbError('getShop services', servicesResult.error)
  throwIfDbError('getShop resources', resourcesResult.error)

  return { business, services: servicesResult.data ?? [], resources: resourcesResult.data ?? [] }
}

/** Today's bookings, already joined to names, from the agent view. */
export async function getToday(businessId: string, now = new Date()) {
  const { start, end } = cambodiaDayBounds(now)

  const { data, error } = await db
    .from('v_bookings_agent')
    .select('*')
    .eq('business_id', businessId)
    .gte('starts_at', start)
    .lt('starts_at', end)
    .order('starts_at')
  if (error) throw new Error(`getToday: ${error.message}`)
  return data ?? []
}

/** Conversations the assistant handed back to the owner. */
export async function getEscalations(businessId: string) {
  const { data, error } = await db
    .from('conversations')
    .select('id, channel, needs_owner_reason, last_message_at, customers(display_name)')
    .eq('business_id', businessId)
    .eq('status', 'needs_owner')
    .order('last_message_at', { ascending: false })
  if (error) throw new Error(`getEscalations: ${error.message}`)
  return data ?? []
}

/** The free-tier meter. */
export async function getUsage(businessId: string) {
  const { data, error } = await db.from('v_month_usage').select('*').eq('business_id', businessId).single()
  if (error) throw new Error(`getUsage: ${error.message}`)
  return data
}

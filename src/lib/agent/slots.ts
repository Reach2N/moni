import 'server-only'
import { db } from '../db.ts'
import { throwIfDbError } from '../db-result.ts'
import type { OpeningHours } from '../types.ts'
import { CAMBODIA_TIME_ZONE, CAMBODIA_UTC_OFFSET } from '../time/cambodia.ts'

/**
 * Free-slot computation. The agent calls this and never reasons about availability
 * itself, which is the rule that stops it promising a time that is already taken.
 *
 * Timezone: Cambodia is UTC+07:00 and has never observed DST, so an offset string
 * is exact here and avoids pulling in a timezone library. If this product ever
 * ships outside Cambodia this is the first thing that has to change.
 */
const STEP_MIN = 15

const at = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00${CAMBODIA_UTC_OFFSET}`)
const plusMin = (d: Date, m: number) => new Date(d.getTime() + m * 60_000)
const hhmm = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: CAMBODIA_TIME_ZONE,
  }).format(d)

export type Slot = { starts_at: string; ends_at: string; resource_id: string; resource_name: string; label: string }

export async function listSlots(args: {
  businessId: string
  serviceId: string
  /** YYYY-MM-DD in Cambodian local time */
  date: string
  limit?: number
}): Promise<{ slots: Slot[]; closed?: string }> {
  const { businessId, serviceId, date, limit = 6 } = args

  const [businessResult, serviceResult] = await Promise.all([
    db.from('businesses').select('hours, timezone').eq('id', businessId).maybeSingle(),
    db
      .from('services')
      .select('id, name, duration_min, buffer_min, capacity')
      .eq('id', serviceId)
      .eq('business_id', businessId)
      .eq('active', true)
      .maybeSingle(),
  ])
  throwIfDbError('load slot business', businessResult.error)
  throwIfDbError('load scoped slot service', serviceResult.error)
  const business = businessResult.data
  const service = serviceResult.data
  if (!business || !service) return { slots: [], closed: 'shop or service not found' }

  const dow = new Date(`${date}T12:00:00${CAMBODIA_UTC_OFFSET}`).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
  const hours = (business.hours as unknown as OpeningHours) ?? []
  const today = hours.find((h) => h.dow === dow)
  if (!today) return { slots: [], closed: 'the shop is closed that day' }

  const open = at(date, today.open)
  const close = at(date, today.close)
  const hold = service.duration_min + service.buffer_min

  // resources that can perform this service; an empty mapping means anyone can
  const [resourcesResult, mappedResult] = await Promise.all([
    db.from('resources').select('id, name').eq('business_id', businessId).eq('active', true).order('name'),
    db.from('resource_services').select('resource_id').eq('service_id', serviceId),
  ])
  throwIfDbError('load scoped slot resources', resourcesResult.error)
  throwIfDbError('load service resource mappings', mappedResult.error)
  const resources = resourcesResult.data
  const mapped = mappedResult.data
  const allowed = new Set((mapped ?? []).map((m) => m.resource_id))
  const pool = (resources ?? []).filter((r) => allowed.size === 0 || allowed.has(r.id))
  if (pool.length === 0) return { slots: [], closed: 'nobody is set up to do that service' }

  const dayStart = at(date, '00:00')
  const dayEnd = plusMin(dayStart, 24 * 60)

  const [takenResult, closuresResult] = await Promise.all([
    db.from('bookings').select('resource_id, starts_at, ends_at')
      .eq('business_id', businessId)
      .in('status', ['pending', 'confirmed', 'completed'])
      .lt('starts_at', dayEnd.toISOString())
      .gt('ends_at', dayStart.toISOString()),
    db.from('closures').select('starts_at, ends_at')
      .eq('business_id', businessId)
      .lt('starts_at', dayEnd.toISOString())
      .gt('ends_at', dayStart.toISOString()),
  ])
  throwIfDbError('load occupied slots', takenResult.error)
  throwIfDbError('load slot closures', closuresResult.error)
  const taken = takenResult.data
  const closures = closuresResult.data

  const overlaps = (aS: Date, aE: Date, bS: string, bE: string) =>
    aS < new Date(bE) && new Date(bS) < aE

  const slots: Slot[] = []
  const now = new Date()

  for (let t = open; plusMin(t, hold) <= close; t = plusMin(t, STEP_MIN)) {
    if (slots.length >= limit) break
    const end = plusMin(t, hold)
    if (t < now) continue // never offer a time that has already passed
    if ((closures ?? []).some((c) => overlaps(t, end, c.starts_at, c.ends_at))) continue

    const free = pool.find(
      (r) => !(taken ?? []).some((b) => b.resource_id === r.id && overlaps(t, end, b.starts_at, b.ends_at)),
    )
    if (!free) continue

    slots.push({
      starts_at: t.toISOString(),
      // Occupancy includes the service buffer. The exclusion constraint then
      // protects the same range that list_slots offered, including under races.
      ends_at: end.toISOString(),
      resource_id: free.id,
      resource_name: free.name,
      label: hhmm(t),
    })
  }

  return slots.length ? { slots } : { slots: [], closed: 'fully booked that day' }
}

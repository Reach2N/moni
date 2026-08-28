import 'server-only'
import { db } from '../db.ts'
import { requireDbData, throwIfDbError } from '../db-result.ts'
import type { Json } from '../database.types.ts'
import { businessType } from '../types.ts'
import { getDemoBusiness } from '../queries/demo-business.ts'
import { normalizeServiceName, type SetupRequest } from './schema.ts'

const RESOURCE_LABEL: Record<string, string> = {
  staff: 'Staff',
  room: 'Room',
  bay: 'Bay',
  table: 'Table',
  chair: 'Chair',
  equipment: 'Equipment',
}

type PersistSetupResult = {
  businessId: string
  services: { active: number; updated: number; inserted: number; deactivated: number }
  resources: { requested: number; active: number; created: number; reactivated: number; deactivated: number }
  warnings: string[]
}

function nextResourceNames(kind: string, count: number, existing: Set<string>) {
  const label = RESOURCE_LABEL[kind] ?? 'Resource'
  const names: string[] = []
  for (let number = 1; names.length < count; number += 1) {
    const name = `${label} ${number}`
    if (!existing.has(name.toLocaleLowerCase('en'))) {
      names.push(name)
      existing.add(name.toLocaleLowerCase('en'))
    }
  }
  return names
}

export async function persistDemoSetup(input: SetupRequest): Promise<PersistSetupResult> {
  const business = await getDemoBusiness()
  const type = businessType(input.shop.business_type)
  const attributes = {
    ...((business.attributes as Record<string, Json | undefined>) ?? {}),
    setup_notes: input.shop.notes,
  } satisfies Record<string, Json | undefined>

  const businessUpdate = {
    ...(input.business?.name ? { name: input.business.name } : {}),
    ...(input.business && 'phone' in input.business ? { phone: input.business.phone } : {}),
    ...(input.business && 'address' in input.business ? { address: input.business.address } : {}),
    ...(input.business && 'province' in input.business ? { province: input.business.province } : {}),
    business_type: input.shop.business_type,
    category: type.category,
    default_currency: input.shop.default_currency,
    raw_description: input.raw_description,
    parsed_at: new Date().toISOString(),
    parse_model: input.model ?? null,
    hours: input.shop.hours,
    attributes,
  }

  const updatedBusiness = await db
    .from('businesses')
    .update(businessUpdate)
    .eq('id', business.id)
    .eq('slug', business.slug)
    .select('id')
    .single()
  requireDbData('save setup business', updatedBusiness)

  const currentServicesResult = await db
    .from('services')
    .select('id, name, active')
    .eq('business_id', business.id)
    .order('created_at')
  throwIfDbError('load setup services', currentServicesResult.error)

  const byName = new Map<string, { id: string; name: string; active: boolean }>()
  for (const service of currentServicesResult.data ?? []) {
    const key = normalizeServiceName(service.name)
    const current = byName.get(key)
    if (!current || (service.active && !current.active)) byName.set(key, service)
  }

  const retainedIds = new Set<string>()
  const inserts: Array<{
    business_id: string
    name: string
    name_en: string | null
    description: string | null
    price_minor: number
    currency: string
    unit: string
    duration_min: number
    buffer_min: number
    capacity: number
    requires_deposit: boolean
    deposit_minor: number | null
    active: boolean
    sort_order: number
  }> = []
  const updates: Array<PromiseLike<unknown>> = []

  input.shop.services.forEach((service, sortOrder) => {
    const existing = byName.get(normalizeServiceName(service.name))
    const values = {
      name: service.name,
      name_en: service.name_en,
      description: service.description,
      price_minor: service.price_minor,
      currency: service.currency,
      unit: service.unit,
      duration_min: service.duration_min,
      buffer_min: service.buffer_min,
      capacity: service.capacity,
      requires_deposit: service.requires_deposit,
      deposit_minor: service.deposit_minor,
      active: true,
      sort_order: sortOrder,
    }
    if (existing) {
      retainedIds.add(existing.id)
      updates.push(
        db
          .from('services')
          .update(values)
          .eq('business_id', business.id)
          .eq('id', existing.id)
          .select('id')
          .single()
          .then((result) => requireDbData(`update service ${service.name}`, result)),
      )
    } else {
      inserts.push({ business_id: business.id, ...values })
    }
  })

  await Promise.all(updates)

  if (inserts.length > 0) {
    const inserted = await db.from('services').insert(inserts).select('id')
    throwIfDbError('insert setup services', inserted.error)
    for (const service of inserted.data ?? []) retainedIds.add(service.id)
  }

  const omittedIds = (currentServicesResult.data ?? [])
    .filter((service) => service.active && !retainedIds.has(service.id))
    .map((service) => service.id)
  if (omittedIds.length > 0) {
    const deactivated = await db
      .from('services')
      .update({ active: false })
      .eq('business_id', business.id)
      .in('id', omittedIds)
    throwIfDbError('deactivate omitted services', deactivated.error)
  }

  const resourceResult = await ensureResourceCount(business.id, type.resourceKind, input.shop.resource_count)

  const activeServicesResult = await db
    .from('services')
    .select('id')
    .eq('business_id', business.id)
    .eq('active', true)
  throwIfDbError('reload active services', activeServicesResult.error)
  const activeResourcesResult = await db
    .from('resources')
    .select('id')
    .eq('business_id', business.id)
    .eq('active', true)
  throwIfDbError('reload active resources', activeResourcesResult.error)

  const mappings = (activeResourcesResult.data ?? []).flatMap((resource) =>
    (activeServicesResult.data ?? []).map((service) => ({ resource_id: resource.id, service_id: service.id })),
  )
  if (mappings.length > 0) {
    const mapped = await db
      .from('resource_services')
      .upsert(mappings, { onConflict: 'resource_id,service_id', ignoreDuplicates: true })
    throwIfDbError('map resources to active services', mapped.error)
  }

  const audit = await db.from('events').insert({
    business_id: business.id,
    actor: 'owner',
    actor_label: 'owner via setup',
    action: 'setup.catalogue_saved',
    entity_type: 'business',
    entity_id: business.id,
    after: {
      services: input.shop.services.length,
      resource_count: input.shop.resource_count,
      business_type: input.shop.business_type,
    },
  })
  throwIfDbError('audit setup save', audit.error)

  return {
    businessId: business.id,
    services: {
      active: input.shop.services.length,
      updated: updates.length,
      inserted: inserts.length,
      deactivated: omittedIds.length,
    },
    resources: resourceResult,
    warnings: resourceResult.active > resourceResult.requested
      ? ['Some resources still have future bookings, so they stayed active.']
      : [],
  }
}

async function ensureResourceCount(businessId: string, kind: string, requested: number) {
  const resourcesResult = await db
    .from('resources')
    .select('id, name, kind, active, created_at')
    .eq('business_id', businessId)
    .order('created_at')
  throwIfDbError('load setup resources', resourcesResult.error)
  const resources = resourcesResult.data ?? []
  const active = resources.filter((resource) => resource.active)
  let reactivated = 0
  let created = 0
  let deactivated = 0

  if (active.length < requested) {
    const needed = requested - active.length
    const inactive = resources.filter((resource) => !resource.active).slice(0, needed)
    if (inactive.length > 0) {
      const result = await db
        .from('resources')
        .update({ active: true })
        .eq('business_id', businessId)
        .in('id', inactive.map((resource) => resource.id))
      throwIfDbError('reactivate setup resources', result.error)
      reactivated = inactive.length
    }

    const stillNeeded = needed - inactive.length
    if (stillNeeded > 0) {
      const existingNames = new Set(resources.map((resource) => resource.name.toLocaleLowerCase('en')))
      const names = nextResourceNames(kind, stillNeeded, existingNames)
      const result = await db
        .from('resources')
        .insert(names.map((name) => ({ business_id: businessId, name, kind, active: true })))
      throwIfDbError('create setup resources', result.error)
      created = names.length
    }
  } else if (active.length > requested) {
    const candidates = active.slice().reverse()
    const futureBookings = await db
      .from('bookings')
      .select('resource_id')
      .eq('business_id', businessId)
      .in('resource_id', candidates.map((resource) => resource.id))
      .in('status', ['pending', 'confirmed', 'completed'])
      .gt('ends_at', new Date().toISOString())
    throwIfDbError('check future resource bookings', futureBookings.error)
    const blocked = new Set((futureBookings.data ?? []).map((booking) => booking.resource_id))
    const removable = candidates
      .filter((resource) => !blocked.has(resource.id))
      .slice(0, active.length - requested)
    if (removable.length > 0) {
      const result = await db
        .from('resources')
        .update({ active: false })
        .eq('business_id', businessId)
        .in('id', removable.map((resource) => resource.id))
      throwIfDbError('deactivate surplus resources', result.error)
      deactivated = removable.length
    }
  }

  return {
    requested,
    active: active.length + reactivated + created - deactivated,
    created,
    reactivated,
    deactivated,
  }
}

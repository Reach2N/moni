import 'server-only'
import { db } from '../db.ts'
import { requireDbData, throwIfDbError } from '../db-result.ts'
import type { Json } from '../database.types.ts'
import { businessType, catalogKindFor } from '../types.ts'
import { getBusinessById } from '../queries/business.ts'
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
  products: { active: number; updated: number; inserted: number; deactivated: number }
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

/**
 * Saves a parsed shop against ONE business. `businessId` comes from
 * `requireMember()`; it is never read from the request, so a member cannot write
 * a catalogue into someone else's shop by editing a payload.
 */
export async function persistSetup(businessId: string, input: SetupRequest): Promise<PersistSetupResult> {
  const business = await getBusinessById(businessId)
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
    ...(input.ai_instructions !== undefined ? { ai_instructions: input.ai_instructions } : {}),
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
    .select('id')
    .single()
  requireDbData('save setup business', updatedBusiness)

  // One parsed array, two tables. A cafe's cappuccino and a salon's haircut both
  // arrive as "a thing the owner listed", but only one of them can hold a photo
  // or be sold without booking anyone's time. `catalogKindFor` reads the
  // business type's `sells` plus the row's own unit, so the split needs no new
  // input field and no change to what the parse produces.
  const serviceRows = input.shop.services.filter(
    (service) => catalogKindFor(input.shop.business_type, service.unit) === 'service',
  )
  const productRows = input.shop.services.filter(
    (service) => catalogKindFor(input.shop.business_type, service.unit) === 'product',
  )

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

  // Only the service-bound rows reach this table. A row that used to live here
  // and is now product-bound (the owner's re-parse changed its unit, or its
  // business type changed) is simply absent from serviceRows, so it never
  // retains an id below and falls into the deactivate pass exactly like a row
  // the owner deleted outright. That is what keeps a row from ever sitting in
  // both tables at once.
  serviceRows.forEach((service, sortOrder) => {
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

  // Second reconciliation, same shape as the one above, a different table. A
  // shop that sells only time (a salon) always finds productRows empty here, so
  // this whole block is a no-op for it; a shop that sells only goods (a cafe)
  // finds serviceRows empty above instead. Nothing about the reconciliation
  // itself changes with what a shop sells, only which rows reach it.
  const currentProductsResult = await db
    .from('products')
    .select('id, name, active')
    .eq('business_id', business.id)
    .order('created_at')
  throwIfDbError('load setup products', currentProductsResult.error)

  const byProductName = new Map<string, { id: string; name: string; active: boolean }>()
  for (const product of currentProductsResult.data ?? []) {
    const key = normalizeServiceName(product.name)
    const current = byProductName.get(key)
    if (!current || (product.active && !current.active)) byProductName.set(key, product)
  }

  const retainedProductIds = new Set<string>()
  const productInserts: Array<{
    business_id: string
    name: string
    name_en: string | null
    description: string | null
    price_minor: number
    currency: string
    active: boolean
    sort_order: number
  }> = []
  const productUpdates: Array<PromiseLike<unknown>> = []

  // A row that used to be a product and is now service-bound is, symmetrically,
  // simply absent from productRows: it falls into the deactivate pass below
  // exactly like one the owner deleted. That is the other half of what keeps a
  // row from ever sitting in both tables when its kind changes between parses.
  productRows.forEach((item, sortOrder) => {
    const existing = byProductName.get(normalizeServiceName(item.name))
    // Carried fields only. duration_min, buffer_min, capacity, requires_deposit
    // and deposit_minor are dropped on purpose, not just unused: a cappuccino has
    // no duration and nothing books against it, so the parse's booking fields for
    // a walk-in row describe nothing real, and writing them into products would
    // just be zeros nobody asked for on a table that has no such columns anyway.
    // stock, category, photo_path and photo_alt are left out of `values` below
    // entirely rather than set to null: on an update that means an owner's
    // photo, stock count or category survives a re-parse untouched, and on an
    // insert it means the same columns default to null on their own, which is
    // the right answer for a product the owner only described in text.
    const values = {
      name: item.name,
      name_en: item.name_en,
      description: item.description,
      price_minor: item.price_minor,
      currency: item.currency,
      active: true,
      sort_order: sortOrder,
    }
    if (existing) {
      retainedProductIds.add(existing.id)
      productUpdates.push(
        db
          .from('products')
          .update(values)
          .eq('business_id', business.id)
          .eq('id', existing.id)
          .select('id')
          .single()
          .then((result) => requireDbData(`update product ${item.name}`, result)),
      )
    } else {
      productInserts.push({ business_id: business.id, ...values })
    }
  })

  await Promise.all(productUpdates)

  if (productInserts.length > 0) {
    const insertedProducts = await db.from('products').insert(productInserts).select('id')
    throwIfDbError('insert setup products', insertedProducts.error)
    for (const product of insertedProducts.data ?? []) retainedProductIds.add(product.id)
  }

  const omittedProductIds = (currentProductsResult.data ?? [])
    .filter((product) => product.active && !retainedProductIds.has(product.id))
    .map((product) => product.id)
  if (omittedProductIds.length > 0) {
    const deactivatedProducts = await db
      .from('products')
      .update({ active: false })
      .eq('business_id', business.id)
      .in('id', omittedProductIds)
    throwIfDbError('deactivate omitted products', deactivatedProducts.error)
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
      services: serviceRows.length,
      products: productRows.length,
      resource_count: input.shop.resource_count,
      business_type: input.shop.business_type,
    },
  })
  throwIfDbError('audit setup save', audit.error)

  return {
    businessId: business.id,
    services: {
      active: serviceRows.length,
      updated: updates.length,
      inserted: inserts.length,
      deactivated: omittedIds.length,
    },
    products: {
      active: productRows.length,
      updated: productUpdates.length,
      inserted: productInserts.length,
      deactivated: omittedProductIds.length,
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

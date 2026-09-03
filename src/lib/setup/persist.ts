import 'server-only'
import { db } from '../db.ts'
import { requireDbData, throwIfDbError } from '../db-result.ts'
import type { Json } from '../database.types.ts'
import { businessType } from '../types.ts'
import { getBusinessById } from '../queries/business.ts'
import type { SetupRequest } from './schema.ts'
import { planCatalogue } from './plan.ts'

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

  const currentServicesResult = await db
    .from('services')
    .select('id, name, active')
    .eq('business_id', business.id)
    .order('created_at')
  throwIfDbError('load setup services', currentServicesResult.error)

  const currentProductsResult = await db
    .from('products')
    .select('id, name, active')
    .eq('business_id', business.id)
    .order('created_at')
  throwIfDbError('load setup products', currentProductsResult.error)

  // Every decision, the split by kind, the name matching, the field mapping
  // and which rows retire, happens in `plan.ts` with no database call inside
  // it. `persist.ts` keeps only these two selects and the writes below, which
  // is what makes the plan itself provable in `db/test.mjs`: that harness
  // cannot import this file (`server-only` plus a live Supabase client), but
  // it can import a pure function.
  const plan = planCatalogue(
    input.shop.business_type,
    input.shop.services,
    currentServicesResult.data ?? [],
    currentProductsResult.data ?? [],
  )

  const serviceUpdates = plan.services.updates.map(({ id, values }) =>
    db
      .from('services')
      .update(values)
      .eq('business_id', business.id)
      .eq('id', id)
      .select('id')
      .single()
      .then((result) => requireDbData(`update service ${values.name}`, result)),
  )
  await Promise.all(serviceUpdates)

  if (plan.services.inserts.length > 0) {
    const inserted = await db
      .from('services')
      .insert(plan.services.inserts.map((values) => ({ business_id: business.id, ...values })))
      .select('id')
    throwIfDbError('insert setup services', inserted.error)
  }

  if (plan.services.deactivate.length > 0) {
    const deactivated = await db
      .from('services')
      .update({ active: false })
      .eq('business_id', business.id)
      .in('id', plan.services.deactivate)
    throwIfDbError('deactivate omitted services', deactivated.error)
  }

  const productUpdates = plan.products.updates.map(({ id, values }) =>
    db
      .from('products')
      .update(values)
      .eq('business_id', business.id)
      .eq('id', id)
      .select('id')
      .single()
      .then((result) => requireDbData(`update product ${values.name}`, result)),
  )
  await Promise.all(productUpdates)

  if (plan.products.inserts.length > 0) {
    const insertedProducts = await db
      .from('products')
      .insert(plan.products.inserts.map((values) => ({ business_id: business.id, ...values })))
      .select('id')
    throwIfDbError('insert setup products', insertedProducts.error)
  }

  // No deactivate call for products, ever: `plan.products.deactivate` is
  // always empty (see plan.ts). A service list IS the shop's description of
  // itself, so a service the latest parse drops is a real retirement. A
  // product is inventory with its own photo, stock count and category, kept
  // from a different screen entirely (`/app/products`, `createProduct`, the
  // `create_products_bulk` owner tool), and `ShopSetup` is reachable at any
  // time, not just once at onboarding. Re-saving a shop's description must
  // never silently empty a menu someone already photographed; only the owner
  // retiring a product herself does that, which is visible and reversible.

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
      services: plan.services.updates.length + plan.services.inserts.length,
      products: plan.products.updates.length + plan.products.inserts.length,
      resource_count: input.shop.resource_count,
      business_type: input.shop.business_type,
    },
  })
  throwIfDbError('audit setup save', audit.error)

  return {
    businessId: business.id,
    services: {
      active: plan.services.updates.length + plan.services.inserts.length,
      updated: plan.services.updates.length,
      inserted: plan.services.inserts.length,
      deactivated: plan.services.deactivate.length,
    },
    products: {
      active: plan.products.updates.length + plan.products.inserts.length,
      updated: plan.products.updates.length,
      inserted: plan.products.inserts.length,
      // Always zero: setup never deactivates a product. Kept in the shape so
      // the owner-facing summary stays symmetric with services, not because
      // this can ever be anything else.
      deactivated: plan.products.deactivate.length,
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

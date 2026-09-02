import 'server-only'
import { db } from '../db.ts'
import { requireDbData, throwIfDbError } from '../db-result.ts'
import { generateStorefront } from '../ai/storefront.ts'
import { getStorefrontRow, publishStorefront, saveStorefrontDraft } from '../queries/storefront.ts'

/**
 * "Write my shop's page." One function behind two doors, /api/storefront and
 * the owner agent's `generate_shop_site`, so the brief the model receives and
 * the audit row it leaves are the same whichever way the owner asked.
 *
 * The model fills validated strings and picks a theme. It never sees markup,
 * and nothing it wrote is public until `publishShopSite` copies the draft
 * across, which is the owner's act and stays that way.
 */
export async function generateShopSiteDraft(businessId: string, actorLabel: string) {
  const businessResult = await db
    .from('businesses')
    .select('name, business_type, raw_description, ai_instructions, hours')
    .eq('id', businessId)
    .single()
  const business = requireDbData('load business for storefront', businessResult)

  const servicesResult = await db
    .from('services')
    .select('name, name_en, duration_min, unit')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('sort_order')
  throwIfDbError('load services for storefront', servicesResult.error)

  const generated = await generateStorefront({
    shopName: business.name,
    businessType: business.business_type,
    rawDescription: business.raw_description,
    aiInstructions: business.ai_instructions,
    services: (servicesResult.data ?? []).map((service) => ({
      name: service.name,
      nameEn: service.name_en,
      durationMin: service.duration_min,
      unit: service.unit,
    })),
    hours: (business.hours as Array<{ dow: number; open: string; close: string }>) ?? [],
  })

  const storefront = await saveStorefrontDraft(businessId, generated.content, generated.model)

  await db.from('events').insert({
    business_id: businessId,
    actor: 'owner',
    actor_label: `${actorLabel} (${generated.model})`,
    action: 'storefront.generated',
    entity_type: 'business',
    entity_id: businessId,
    after: { theme: generated.content.theme, warnings: generated.warnings.length },
  })

  return { storefront, warnings: generated.warnings, model: generated.model, cost_micro_usd: generated.cost_micro_usd }
}

/** Publish the draft. Refuses when there is nothing drafted rather than publishing an empty page. */
export async function publishShopSite(businessId: string, actorLabel: string) {
  const current = await getStorefrontRow(businessId)
  if (!current?.draft) return { published: false as const, reason: 'no draft yet' }
  const row = await publishStorefront(businessId)
  await db.from('events').insert({
    business_id: businessId,
    actor: 'owner',
    actor_label: actorLabel,
    action: 'storefront.published',
    entity_type: 'business',
    entity_id: businessId,
    after: { theme: row.theme, published_at: row.published_at },
  })
  return { published: true as const, storefront: row }
}

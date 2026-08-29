import 'server-only'
import { db } from '../db.ts'
import { requireDbData, throwIfDbError } from '../db-result.ts'
import type { CurrencyCode, StorefrontContent } from '../types.ts'
import type { StorefrontData } from '@/themes/types.ts'

/**
 * Everything a public shop site needs, in one read, addressed by slug.
 *
 * This is the only query in the codebase that resolves a tenant from something
 * a visitor supplied, and that is correct: the slug IS the public address of the
 * shop. What makes it safe is that it returns nothing private. No customers, no
 * bookings, no conversations, no tokens: a catalogue, opening hours, and text
 * the owner published on purpose.
 */
export async function getStorefront(slug: string): Promise<StorefrontData | null> {
  const businessResult = await db
    .from('businesses')
    .select('id, slug, name, province, address, phone, default_currency, hours')
    .eq('slug', slug)
    .maybeSingle()
  throwIfDbError('load storefront business', businessResult.error)
  const business = businessResult.data
  if (!business) return null

  const [storefrontResult, servicesResult, channelResult] = await Promise.all([
    db.from('storefronts').select('theme, published').eq('id', business.id).maybeSingle(),
    db
      .from('services')
      .select('id, name, name_en, description, price_minor, currency, duration_min, unit')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('sort_order')
      .order('name'),
    db
      .from('channel_connections')
      .select('channel, display_name, status')
      .eq('business_id', business.id)
      .eq('status', 'connected'),
  ])
  throwIfDbError('load storefront', storefrontResult.error)
  throwIfDbError('load storefront services', servicesResult.error)
  throwIfDbError('load storefront channels', channelResult.error)

  const published = storefrontResult.data?.published as StorefrontContent | null | undefined
  // Unpublished means there is no site, not an empty one. A shop that never
  // pressed publish should 404, not show a blank page with its prices on it.
  if (!published) return null

  const telegram = (channelResult.data ?? []).find((row) => row.channel === 'telegram')
  const handle = telegram?.display_name?.replace(/^@/, '')
  const action: StorefrontData['action'] = handle
    ? { kind: 'telegram', href: `https://t.me/${handle}`, label: 'Telegram' }
    : business.phone
      ? { kind: 'phone', href: `tel:${business.phone.replace(/\s+/g, '')}`, label: business.phone }
      : { kind: 'none', href: null, label: 'សូមទាក់ទងមកហាងដោយផ្ទាល់' }

  return {
    shop: {
      name: business.name,
      slug: business.slug,
      province: business.province,
      address: business.address,
      phone: business.phone,
      currency: business.default_currency as CurrencyCode,
      hours: (business.hours as StorefrontData['shop']['hours']) ?? [],
    },
    services: (servicesResult.data ?? []).map((service) => ({
      id: service.id,
      name: service.name,
      nameEn: service.name_en,
      description: service.description,
      priceMinor: service.price_minor,
      currency: service.currency as CurrencyCode,
      durationMin: service.duration_min,
      unit: service.unit,
    })),
    content: published,
    action,
  }
}

/** The owner's own view: draft and published side by side. */
export async function getStorefrontRow(businessId: string) {
  const result = await db
    .from('storefronts')
    .select('theme, draft, published, published_at, generated_by')
    .eq('id', businessId)
    .maybeSingle()
  throwIfDbError('load storefront row', result.error)
  return result.data ?? null
}

export async function saveStorefrontDraft(businessId: string, content: StorefrontContent, model: string) {
  const saved = await db
    .from('storefronts')
    .upsert(
      { id: businessId, theme: content.theme, draft: content, generated_by: model },
      { onConflict: 'id' },
    )
    .select('theme, draft, published, published_at, generated_by')
    .single()
  return requireDbData('save storefront draft', saved)
}

/**
 * Publishing is the owner's act, never the model's. It copies the draft across
 * verbatim, so what a customer reads is exactly what the owner approved.
 */
export async function publishStorefront(businessId: string) {
  const current = await getStorefrontRow(businessId)
  if (!current?.draft) throw new Error('there is no draft to publish')

  const published = await db
    .from('storefronts')
    .update({
      published: current.draft,
      theme: (current.draft as StorefrontContent).theme,
      published_at: new Date().toISOString(),
    })
    .eq('id', businessId)
    .select('theme, draft, published, published_at, generated_by')
    .single()
  return requireDbData('publish storefront', published)
}

import type { CurrencyCode } from '../types.ts'

/**
 * Has this shop actually published a site?
 *
 * One predicate, used by the page's own lookup and by the public order route,
 * so the two can never disagree about what exists. A shop that never pressed
 * publish is a 404 on its page; if the order route asked a different question
 * it would take orders for a shop with no site and no prices anyone approved.
 *
 * A draft is not a site. `storefronts.draft` can be full of model-written copy
 * for weeks; only `published` is the owner's act, and only `published` counts
 * here.
 *
 * Pure and no `server-only`, so `db/test.mjs` can drive it with real rows read
 * out of a real Postgres. A publish gate proved by reading the code is not
 * proved.
 */
export type PublishedShop = { businessId: string; name: string; currency: CurrencyCode }

export function publishedShopFrom(
  business: { id: string; name: string; default_currency: string } | null | undefined,
  storefront: { published: unknown } | null | undefined,
): PublishedShop | null {
  if (!business) return null
  if (!storefront?.published) return null
  return {
    businessId: business.id,
    name: business.name,
    currency: business.default_currency as CurrencyCode,
  }
}

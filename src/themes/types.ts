import type { CatalogKind, CurrencyCode, StorefrontContent, ThemeId } from '@/lib/types.ts'

/**
 * Everything a theme is allowed to see. One typed prop, four themes, so a theme
 * cannot quietly depend on a field another theme does not get, and adding a
 * vertical never means touching a theme's signature.
 */
export type StorefrontData = {
  shop: {
    name: string
    slug: string
    province: string | null
    address: string | null
    phone: string | null
    currency: CurrencyCode
    hours: Array<{ dow: number; open: string; close: string }>
  }
  /**
   * What the shop sells, both kinds, from `v_catalog`.
   *
   * One array and not two on purpose: two would leave each of the four themes
   * deciding how to interleave them, and four themes would decide four
   * different ways. A theme reads `kind` when it wants to draw a menu row
   * differently from a bookable one.
   */
  items: Array<{
    id: string
    kind: CatalogKind
    name: string
    nameEn: string | null
    description: string | null
    priceMinor: number
    currency: CurrencyCode
    /** Services only. Null on a product, which takes no time to hand over. */
    durationMin: number | null
    unit: string
    category: string | null
    /** Already a URL. A theme never learns where the bucket is. */
    photoUrl: string | null
  }>
  content: StorefrontContent
  /** Where the book-or-order action points. Telegram when connected, else the shop's phone. */
  action: { kind: 'telegram' | 'phone' | 'none'; href: string | null; label: string }
}

export type ThemeModule = {
  id: ThemeId
  name: string
  /**
   * A theme receives `tileSeed`, the same integer `styleFor()` was seeded
   * with, as a plain prop. It exists only so the private `Items` helper in
   * `registry.tsx` can call `tileFor(tileSeed, item.id)` and draw a tile for
   * a photoless row: a theme forwards it for that one purpose and computes no
   * colour, radius or spacing from it. Every one of those already arrived as
   * a `--sf-*` CSS custom property, resolved above this component.
   */
  Storefront: (props: { data: StorefrontData; tileSeed: number }) => React.ReactNode
}

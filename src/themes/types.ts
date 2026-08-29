import type { CurrencyCode, StorefrontContent, ThemeId } from '@/lib/types.ts'

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
  services: Array<{
    id: string
    name: string
    nameEn: string | null
    description: string | null
    priceMinor: number
    currency: CurrencyCode
    durationMin: number
    unit: string
  }>
  content: StorefrontContent
  /** Where the book-or-order action points. Telegram when connected, else the shop's phone. */
  action: { kind: 'telegram' | 'phone' | 'none'; href: string | null; label: string }
}

export type ThemeModule = {
  id: ThemeId
  name: string
  Storefront: (props: { data: StorefrontData }) => React.ReactNode
}

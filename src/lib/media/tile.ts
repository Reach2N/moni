import { mulberry32 } from '../storefront/style.ts'

/**
 * What a product row shows when there is no photograph.
 *
 * Not a stock photo: a photograph of somebody else's coffee beside a real
 * shop's real price is the kind of thing that loses an owner permanently. Not a
 * gap either, because a half photographed menu with gaps reads as broken rather
 * than as unfinished. A pattern in the shop's own palette is the honest answer:
 * it never claims to be a photograph and it makes the menu look composed.
 *
 * Image generation would be better and is verified unable to run once on the
 * current tier, so this is what ships until billing exists.
 *
 * Pure, and no `server-only`, so `db/test.mjs` proves the stability the owner
 * depends on: renaming an item must not change how it looks.
 */
export const TILE_PATTERNS = ['bars', 'arcs', 'grid', 'chevron', 'dots', 'waves'] as const
export type TilePattern = (typeof TILE_PATTERNS)[number]

export type TileSpec = {
  pattern: TilePattern
  rotation: 0 | 90 | 180 | 270
  /** Which step of the accent tint to draw in. Three steps, so a menu has depth without becoming a rainbow. */
  tint: 0 | 1 | 2
}

/** FNV-1a. A product id is a uuid string and needs to become one integer. */
function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Keyed on the product id and NOT the name. An owner correcting a spelling
 * should not find her whole menu redrawn.
 */
export function tileFor(seed: number, productId: string): TileSpec {
  const rand = mulberry32((seed ^ hash(productId)) >>> 0)
  const pattern = TILE_PATTERNS[Math.floor(rand() * TILE_PATTERNS.length)]!
  const rotation = ([0, 90, 180, 270] as const)[Math.floor(rand() * 4)]!
  const tint = ([0, 1, 2] as const)[Math.floor(rand() * 3)]!
  return { pattern, rotation, tint }
}

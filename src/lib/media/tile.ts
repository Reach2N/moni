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

/**
 * Which rotations actually change how a pattern looks.
 *
 * `grid` and `dots` draw the same symmetric position list on both axes, so
 * every rotation of either renders the same picture: recording a rotation for
 * them would spend a seed's entropy on a difference nobody can see, and worse,
 * would make two products that render identically claim to be two different
 * tiles. `bars` and `waves` repeat after 180 degrees, so only one
 * representative of each matching pair is kept. `arcs` and `chevron` have no
 * symmetry: all four rotations are genuinely distinct pictures. `tileFor`
 * draws only from a pattern's own list here, so a recorded rotation is always
 * one a viewer can actually tell apart from the others.
 */
export const ROTATIONS_FOR: Record<TilePattern, readonly (0 | 90 | 180 | 270)[]> = {
  grid: [0],
  dots: [0],
  bars: [0, 90],
  waves: [0, 90],
  arcs: [0, 90, 180, 270],
  chevron: [0, 90, 180, 270],
}

export type TileSpec = {
  pattern: TilePattern
  rotation: 0 | 90 | 180 | 270
  /** Which step of the accent tint to draw in. Three steps, so a menu has depth without becoming a rainbow. */
  tint: 0 | 1 | 2
  /**
   * How many repeated elements the pattern draws: grid cells per axis, dot
   * rows, bar count, wave count, arc count, chevron count. A second axis of
   * visual variety alongside pattern, rotation and tint, because the
   * rotation classes above are deliberately few. Without it a busy menu would
   * run out of genuinely different looks long before it ran out of products.
   */
  density: 2 | 3 | 4 | 5
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
  const rotations = ROTATIONS_FOR[pattern]
  const rotation = rotations[Math.floor(rand() * rotations.length)]!
  const tint = ([0, 1, 2] as const)[Math.floor(rand() * 3)]!
  const density = ([2, 3, 4, 5] as const)[Math.floor(rand() * 4)]!
  return { pattern, rotation, tint, density }
}

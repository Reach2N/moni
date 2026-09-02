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
 *
 * This table is a claim about the ART, not about this file. `db/test.mjs`
 * proves it by rotating `patternGeometry`'s actual output and checking which
 * rotations reproduce the unrotated picture, so a future redraw of a pattern
 * that quietly breaks its symmetry is caught rather than trusted.
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

// ── geometry ─────────────────────────────────────────────────────────────
//
// What `ProductTile` draws, as plain coordinates: no colour, no stroke, no
// JSX. Split out so `db/test.mjs` can rotate the actual shapes and prove
// `ROTATIONS_FOR` true, per CLAUDE.md's rule of keeping pure logic beside its
// consumer so the harness can reach it (`src/lib/agent/instructions.ts`
// beside `prompt.ts` is the precedent this follows).

export type Point = { x: number; y: number }

export type Primitive =
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'path'; points: Point[] }

/**
 * `count` positions spaced evenly across [lo, hi]. A pattern whose symmetry
 * `ROTATIONS_FOR` depends on passes a range that sums to 56, the tile's own
 * width and height, so the list is its own mirror image about the centre and
 * a rotation that should be a no-op actually is one, at every density.
 */
function evenly(count: number, lo: number, hi: number): number[] {
  if (count === 1) return [(lo + hi) / 2]
  const step = (hi - lo) / (count - 1)
  return Array.from({ length: count }, (_, i) => lo + i * step)
}

/**
 * Sample points along the "T" reflected quadratic curve `waves` draws: two
 * quadratic Bezier arcs, `(8,y)` to `(28,y)` to `(48,y)`, dipping through
 * `(18,y-7)` then rising through `(38,y+7)`. Sampled rather than kept as an
 * SVG command string so a rotation of the actual curve can be compared to
 * another curve's sample points.
 */
function wavePoints(y: number, samples = 16): Point[] {
  const quad = (p0: Point, p1: Point, p2: Point): Point[] =>
    Array.from({ length: samples + 1 }, (_, i) => {
      const t = i / samples
      const mt = 1 - t
      return {
        x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
        y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
      }
    })
  const first = quad({ x: 8, y }, { x: 18, y: y - 7 }, { x: 28, y })
  const second = quad({ x: 28, y }, { x: 38, y: y + 7 }, { x: 48, y })
  return [...first, ...second.slice(1)]
}

/**
 * Sample points along the semicircle `arcs` draws: the upper half of a circle
 * of radius `r` centred at `(28, 44)`, from `(28 - r, 44)` to `(28 + r, 44)`.
 */
function arcPoints(r: number, samples = 16): Point[] {
  return Array.from({ length: samples + 1 }, (_, i) => {
    const angle = Math.PI * (1 - i / samples)
    return { x: 28 + r * Math.cos(angle), y: 44 - r * Math.sin(angle) }
  })
}

/**
 * The coordinates a pattern draws at a given density. Pure: `ProductTile`
 * renders exactly this, and `db/test.mjs` rotates it to check `ROTATIONS_FOR`
 * against the real shapes rather than against `tileFor`'s own draw.
 *
 * `arcs`' outer radius is capped at 24 (`arcs` used to reach 38, a semicircle
 * spanning x from -11.5 to 67.5 against this 56 by 56 box: it fit only
 * because `ProductTile`'s wrapper clips overflow, silently truncating the
 * largest ring into a flat sliver on every arcs tile on every real menu).
 */
export function patternGeometry(pattern: TilePattern, density: number): Primitive[] {
  const n = density
  switch (pattern) {
    case 'bars':
      return evenly(n, 10, 46).map((x) => ({ kind: 'line', x1: x, y1: 8, x2: x, y2: 48 }))
    case 'arcs':
      return evenly(n, 10, 24).map((r) => ({ kind: 'path', points: arcPoints(r) }))
    case 'grid':
      return evenly(n, 14, 42).flatMap((v) => [
        { kind: 'line' as const, x1: 8, y1: v, x2: 48, y2: v },
        { kind: 'line' as const, x1: v, y1: 8, x2: v, y2: 48 },
      ])
    case 'chevron':
      return evenly(n, 10, 38).map((y) => ({
        kind: 'path',
        points: [
          { x: 12, y: y + 10 },
          { x: 28, y },
          { x: 44, y: y + 10 },
        ],
      }))
    case 'dots': {
      const r = n >= 5 ? 2 : n === 4 ? 2.5 : 3
      const positions = evenly(n, 14, 42)
      return positions.flatMap((cy) => positions.map((cx) => ({ kind: 'circle' as const, cx, cy, r })))
    }
    case 'waves':
      return evenly(n, 16, 40).map((y) => ({ kind: 'path', points: wavePoints(y) }))
  }
}

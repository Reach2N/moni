import { type ThemeId, type Vibe } from '../types.ts'

/**
 * A shop's whole look, as a pure function of one integer.
 *
 * No `server-only`, no React, no AI SDK, because `db/test.mjs` runs this module
 * directly to prove the one thing that must never be assumed: that no seed can
 * put unreadable Khmer on a real shop's public site. A guardrail that cannot be
 * executed by the harness is a comment.
 *
 * The theme decides the bones and the vibe decides the mood. This file decides
 * everything neither of them said, and it clamps rather than trusts.
 */

/**
 * mulberry32. Short enough to read in full, no dependency, identical output on
 * every platform. Determinism is a hard requirement here: a shop whose site
 * changed colour between two page loads would look broken to its own customers.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Hsl = { h: number; s: number; l: number }

/** Khmer clusters clip below this. It is a floor in the scale, not a variable. */
export const MIN_LEADING = 1.75

function hslToRgb({ h, s, l }: Hsl): [number, number, number] {
  const sat = s / 100
  const lum = l / 100
  const c = (1 - Math.abs(2 * lum - 1)) * sat
  const hp = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] :
    hp < 2 ? [x, c, 0] :
    hp < 3 ? [0, c, x] :
    hp < 4 ? [0, x, c] :
    hp < 5 ? [x, 0, c] : [c, 0, x]
  const m = lum - c / 2
  return [r1 + m, g1 + m, b1 + m]
}

function relativeLuminance(colour: Hsl): number {
  const [r, g, b] = hslToRgb(colour).map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast, so "legible" is a number the harness can assert and not a taste. */
export function contrastRatio(a: Hsl, b: Hsl): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** #1D1D1F, the label colour the whole product already uses. */
const LABEL: Hsl = { h: 240, s: 3, l: 12 }
const NEAR_WHITE: Hsl = { h: 0, s: 0, l: 100 }

/**
 * Hue bands by warmth. Neutral is the house green, so a shop that said nothing
 * expressive lands near Moni's own accent rather than somewhere arbitrary.
 */
const HUE_BANDS: Record<Vibe['warmth'], [number, number]> = {
  warm: [14, 54],
  neutral: [118, 166],
  cool: [196, 264],
}

/** Saturation by voice. A plain shop gets a quiet accent, a bright one does not. */
const SAT_BANDS: Record<Vibe['voice'], [number, number]> = {
  plain: [18, 34],
  crafted: [34, 56],
  bright: [56, 78],
}

const RADIUS_POOL: Record<Vibe['voice'], number[]> = {
  plain: [2, 4, 6],
  crafted: [8, 10, 12],
  bright: [14, 18, 999],
}

const HEADING_WEIGHTS: Record<Vibe['voice'], number[]> = {
  plain: [500, 600],
  crafted: [600, 700],
  bright: [700],
}

/** Base size, section gap and row gap, in px. */
const RHYTHM: Record<Vibe['density'], { scale: number; section: number; row: number }> = {
  airy: { scale: 17, section: 56, row: 14 },
  standard: { scale: 16, section: 40, row: 10 },
  compact: { scale: 15, section: 28, row: 8 },
}

const RATIO: Record<Vibe['voice'], number> = { plain: 1.2, crafted: 1.25, bright: 1.333 }

/**
 * Leading by density, before the floor is applied. An airy shop gets more air
 * in its Khmer, a compact one sits on the floor. Every value here already
 * clears `MIN_LEADING`, which is the point: the floor exists to catch a future
 * value someone adds below it, not to describe the ones that are here today.
 */
const LEADING: Record<Vibe['density'], number> = { airy: 1.9, standard: 1.8, compact: 1.75 }

function pick<T>(rand: () => number, pool: readonly T[]): T {
  return pool[Math.floor(rand() * pool.length)]!
}

function between(rand: () => number, [lo, hi]: [number, number]): number {
  return lo + rand() * (hi - lo)
}

function round(value: number, places = 2): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

/**
 * The three colours a site is built from, already clamped.
 *
 * The surface is settled first, because a near-white ground always clears 7:1
 * against the label colour. The accent is then darkened from its starting
 * lightness until it clears BOTH 4.5:1 against near-white text and 3:1 against
 * that ground. Darkening raises both ratios at once, so one direction always
 * converges and there is no pair of constraints that can fight.
 */
export function paletteFor(seed: number, vibe: Vibe): { accent: Hsl; onAccent: Hsl; surface: Hsl; label: Hsl } {
  const rand = mulberry32(seed)
  const h = round(between(rand, HUE_BANDS[vibe.warmth]), 1)
  const s = round(between(rand, SAT_BANDS[vibe.voice]), 1)

  const surface: Hsl = {
    h,
    s: round(Math.min(8, Math.max(2, s * 0.12)), 1),
    l: round(97.4 + rand() * 1.4, 1),
  }

  let l = round(30 + rand() * 16, 1)
  for (let step = 0; step < 120; step++) {
    const accent: Hsl = { h, s, l }
    if (contrastRatio(accent, NEAR_WHITE) >= 4.5 && contrastRatio(accent, surface) >= 3) {
      return { accent, onAccent: NEAR_WHITE, surface, label: LABEL }
    }
    l = round(l - 0.5, 1)
    if (l <= 4) break
  }
  // Unreachable in practice: at l = 4 the ratio against white is above 15. It
  // is here so the function has no path that returns an unclamped colour.
  return { accent: { h, s, l: 4 }, onAccent: NEAR_WHITE, surface, label: LABEL }
}

export type StorefrontStyle = {
  /** CSS custom properties for the storefront root. */
  vars: Record<string, string>
  /** How item rows are separated. A data attribute, because CSS cannot switch a border style through a variable. */
  rule: 'line' | 'tint' | 'none'
  /**
   * The raw seed, forwarded so a product with no photo can be drawn (Task 5).
   * It is carried here rather than read from the row a second time so that
   * exactly one place in the codebase turns a seed into anything.
   */
  tileSeed: number
}

function hsl({ h, s, l }: Hsl): string {
  return `hsl(${h} ${s}% ${l}%)`
}

/**
 * The theme is taken as an argument and deliberately used only to keep the
 * signature honest for later composition work. It does not branch today: a
 * counter shop and a salon on the same seed get the same tokens, and only their
 * markup differs. See the spec's deferred list.
 */
export function styleFor(seed: number, vibe: Vibe, _theme: ThemeId): StorefrontStyle {
  const palette = paletteFor(seed, vibe)
  // A second stream, offset from the palette's, so changing a colour band never
  // silently reshuffles the radius.
  const rand = mulberry32((seed ^ 0x9e3779b9) >>> 0)

  const radius = pick(rand, RADIUS_POOL[vibe.voice])
  const weight = pick(rand, HEADING_WEIGHTS[vibe.voice])
  const rhythm = RHYTHM[vibe.density]
  const rule: StorefrontStyle['rule'] =
    vibe.voice === 'plain' ? 'line' : vibe.voice === 'crafted' ? pick(rand, ['line', 'tint'] as const) : pick(rand, ['tint', 'none'] as const)

  return {
    rule,
    tileSeed: seed,
    vars: {
      '--sf-accent': hsl(palette.accent),
      '--sf-on-accent': hsl(palette.onAccent),
      '--sf-accent-tint': `color-mix(in srgb, ${hsl(palette.accent)} 10%, transparent)`,
      '--sf-surface': hsl(palette.surface),
      '--sf-radius': `${radius}px`,
      '--sf-scale': `${rhythm.scale}px`,
      '--sf-ratio': String(RATIO[vibe.voice]),
      '--sf-weight-heading': String(weight),
      '--sf-gap-section': `${rhythm.section}px`,
      '--sf-gap-row': `${rhythm.row}px`,
      '--sf-leading': String(Math.max(MIN_LEADING, LEADING[vibe.density])),
    },
  }
}

/**
 * Four other looks to offer the owner.
 *
 * Derived from her current seed rather than from `Math.random()`, so the same
 * shop reshuffling twice sees the same four. That is what makes the picker
 * reproducible, and it is why the harness can assert it at all.
 */
export function candidateSeeds(from: number, count: number): number[] {
  const rand = mulberry32((from ^ 0x85ebca6b) >>> 0)
  const out: number[] = []
  while (out.length < count) {
    const seed = Math.floor(rand() * 2147483647)
    if (seed !== from && !out.includes(seed)) out.push(seed)
  }
  return out
}

/**
 * One number decides a whole public site, so it is validated in a pure function
 * the harness can prove rather than inline in a route handler where it would be
 * asserted by nobody.
 */
export function isSeed(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 2147483647
}

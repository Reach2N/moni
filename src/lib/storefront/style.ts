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

function rgbToHsl([r, g, b]: [number, number, number]): Hsl {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  let s = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h: Math.round(h * 10) / 10, s: Math.round(s * 1000) / 10, l: Math.round(l * 1000) / 10 }
}

/**
 * `fg` laid over `bg` at `alpha`, resolved to one opaque colour.
 *
 * The product's own secondary and tertiary inks are translucent blacks
 * (`rgba(60,60,67,0.60)` and friends), which is fine when the ground is a known
 * white. A shop's ground is not known until its seed is read, so the same inks
 * are composited HERE, in numbers, against that shop's own surface. Two things
 * follow, and both are the point: the emitted value is a plain `hsl()` that any
 * browser can paint, and it is a concrete colour the harness can measure. A
 * ratio asserted against a translucent token would be a ratio against nothing.
 */
function over(fg: Hsl, bg: Hsl, alpha: number): Hsl {
  const f = hslToRgb(fg)
  const b = hslToRgb(bg)
  return rgbToHsl([
    f[0] * alpha + b[0] * (1 - alpha),
    f[1] * alpha + b[1] * (1 - alpha),
    f[2] * alpha + b[2] * (1 - alpha),
  ])
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
 * How far the ink is let up off the ground for each role.
 *
 * These are the same three steps `:root` draws its secondary label, tertiary
 * label and separator at (0.60, 0.30 and 0.29 of an ink over the page), kept as
 * a hierarchy rather than as literal numbers: two of them are raised because
 * this ink has to clear a stated WCAG floor on a ground that moves per shop,
 * which `:root`'s fixed white never had to do.
 *
 * SECONDARY carries real sentences: the subhead under every headline, the day
 * names in the opening hours, an item's English name. That is small body text,
 * so it owes 4.5:1, and 0.60 lands at 4.36 on the lightest surfaces, which is
 * under the floor. 0.68 clears it at 5.60 across the whole sweep.
 *
 * SEPARATOR draws the rule that binds a dish to its price down a phone-width
 * menu, so it is a graphical object the content is read through, at 3:1 per
 * WCAG 1.4.11. The house hairline weight is roughly half of that: 0.29 measures
 * 1.85, and 0.50 is the lightest round step that clears 3, at 3.21.
 *
 * TERTIARY stays exactly where the product's own tertiary label sits. It is the
 * de-emphasised meta line only: the footer address, a step number beside the
 * step it numbers. Raising it would make it a second body ink and flatten the
 * hierarchy this scale exists to draw.
 */
const INK_SECONDARY = 0.68
const INK_TERTIARY = 0.30
const INK_SEPARATOR = 0.5

/**
 * Hue bands by warmth. Neutral is the house green, so a shop that said nothing
 * expressive lands near Moni's own accent rather than somewhere arbitrary.
 *
 * Neutral is the widest of the three, and deliberately: it is the default, so
 * it is the band every legacy row and every generation that named no warmth
 * draws from, and it will be the most crowded band by a long way. At the
 * original 118 to 166 four neighbouring shops came out four shades of the same
 * green. 96 to 186 runs olive through green to teal, which is still the quiet
 * natural half of the wheel that "neutral" promises, and it stops short of the
 * cool band below so a neutral shop can never be mistaken for a cool one.
 */
const HUE_BANDS: Record<Vibe['warmth'], [number, number]> = {
  warm: [14, 54],
  neutral: [96, 186],
  cool: [196, 264],
}

/**
 * Saturation by voice. A plain shop gets a quiet accent, a bright one does not.
 *
 * Plain is widened downward rather than upward: 10 is nearly a grey and reads
 * as plainer still, while the top stays under crafted's floor so the voices do
 * not blur into each other.
 */
const SAT_BANDS: Record<Vibe['voice'], [number, number]> = {
  plain: [10, 33],
  crafted: [34, 56],
  bright: [56, 78],
}

/**
 * Plain reaches from a true square corner to a 7px one. Every value is still a
 * crisp corner, under crafted's 8px floor, so the pool grew without the voice
 * meaning less.
 */
const RADIUS_POOL: Record<Vibe['voice'], number[]> = {
  plain: [0, 2, 4, 7],
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
export type Palette = {
  accent: Hsl
  onAccent: Hsl
  surface: Hsl
  label: Hsl
  labelSecondary: Hsl
  labelTertiary: Hsl
  separator: Hsl
  /** The ground a photoless product's tile is drawn on, and its three ink steps. */
  tileGround: Hsl
  tileInks: [Hsl, Hsl, Hsl]
}

const TILE_GROUND_ALPHA = 0.06
const TILE_INK_ALPHAS: [number, number, number] = [0.08, 0.14, 0.22]

export function paletteFor(seed: number, vibe: Vibe): Palette {
  const rand = mulberry32(seed)
  const h = round(between(rand, HUE_BANDS[vibe.warmth]), 1)
  const s = round(between(rand, SAT_BANDS[vibe.voice]), 1)

  const surface: Hsl = {
    h,
    s: round(Math.min(8, Math.max(2, s * 0.12)), 1),
    l: round(97.4 + rand() * 1.4, 1),
  }

  // Every ink but the accent is settled from the surface alone, so it is known
  // before the clamp loop runs and identical on both of that loop's exits.
  const inks = {
    label: LABEL,
    labelSecondary: over(LABEL, surface, INK_SECONDARY),
    labelTertiary: over(LABEL, surface, INK_TERTIARY),
    separator: over(LABEL, surface, INK_SEPARATOR),
  }
  const withAccent = (accent: Hsl): Palette => {
    const tileGround = over(accent, surface, TILE_GROUND_ALPHA)
    return {
      accent,
      onAccent: NEAR_WHITE,
      surface,
      ...inks,
      tileGround,
      tileInks: [
        over(accent, tileGround, TILE_INK_ALPHAS[0]),
        over(accent, tileGround, TILE_INK_ALPHAS[1]),
        over(accent, tileGround, TILE_INK_ALPHAS[2]),
      ],
    }
  }

  let l = round(30 + rand() * 16, 1)
  for (let step = 0; step < 120; step++) {
    const accent: Hsl = { h, s, l }
    if (contrastRatio(accent, NEAR_WHITE) >= 4.5 && contrastRatio(accent, surface) >= 3) {
      return withAccent(accent)
    }
    l = round(l - 0.5, 1)
    if (l <= 4) break
  }
  // Unreachable in practice: at l = 4 the ratio against white is above 15. It
  // is here so the function has no path that returns an unclamped colour.
  return withAccent({ h, s, l: 4 })
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
  // Plain used to be pinned to `line`, which cost the default vibe its last axis
  // of difference. It draws from the two QUIET rules instead: a hairline between
  // rows, or nothing at all and let the row gap do the separating. The tinted
  // band stays the decorated option, so it is still crafted and bright that a
  // stripe belongs to.
  const rule: StorefrontStyle['rule'] =
    vibe.voice === 'plain' ? pick(rand, ['line', 'none'] as const)
      : vibe.voice === 'crafted' ? pick(rand, ['line', 'tint'] as const)
        : pick(rand, ['tint', 'none'] as const)

  return {
    rule,
    tileSeed: seed,
    vars: {
      '--sf-accent': hsl(palette.accent),
      '--sf-on-accent': hsl(palette.onAccent),
      '--sf-accent-tint': hsl(over(palette.accent, palette.surface, 0.1)),
      '--sf-surface': hsl(palette.surface),
      // The ground moved to a seeded near-white and the ink did not follow, so
      // for one release every shop's site rendered near-white text on near-white
      // paper for a visitor whose system was dark: `:root`'s dark block was
      // still repainting `--label`, because nothing under `.sf` had ever claimed
      // it. These four are the claim. They are emitted rather than left to CSS
      // so that the ratios the harness asserts are the ratios the page paints.
      '--sf-label': hsl(palette.label),
      '--sf-label-2': hsl(palette.labelSecondary),
      '--sf-label-3': hsl(palette.labelTertiary),
      '--sf-separator': hsl(palette.separator),
      // A photoless row's tile, resolved here for the same reason: `color-mix`
      // is not a graceful degradation. A browser that does not know it drops the
      // whole declaration, so the tile would lose its tint AND its ground and
      // paint near-black strokes on nothing.
      '--sf-tile-ground': hsl(palette.tileGround),
      '--sf-tile-ink-1': hsl(palette.tileInks[0]),
      '--sf-tile-ink-2': hsl(palette.tileInks[1]),
      '--sf-tile-ink-3': hsl(palette.tileInks[2]),
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

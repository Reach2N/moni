# Seeded Storefronts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every shop a visually distinct public site, decided by a vibe the model reads from the owner's own words plus a stored seed the owner picks, with no seed able to produce unreadable Khmer.

**Architecture:** Three inputs in strict precedence. The theme comes from what the shop is (unchanged). The vibe is three closed enums the model fills, exactly as it already fills `theme`. The seed is an integer column the owner chooses from four candidates. A pure function turns (seed, vibe, theme) into CSS custom properties, which are applied above the theme component so the four theme files barely change. The model still never emits markup.

**Tech Stack:** TypeScript, Next.js 16.3.1, Tailwind v4, Supabase Postgres, PGlite for the harness, Vercel AI SDK with `Output.object`.

**Spec:** `docs/superpowers/specs/2026-09-02-seeded-storefront-design.md`

## Global Constraints

- **No em dashes.** Not in UI copy, not in comments, not in commit messages. Colon, comma or full stop.
- **`src/lib/types.ts` changes first, `db/schema.sql` follows.** Never the reverse.
- **Money is integer minor units rendered through `formatMoney()`.** Untouched by this plan, do not refactor it.
- **Icons only, never emoji.** lucide-react or an authored SVG.
- **Khmer needs `line-height: 1.75` minimum.** It is a floor in the type scale, not a free variable.
- **No business logic in components.** Components take props and call HTTP endpoints.
- **Taxonomies that grow are `text` in Postgres and `as const` in TypeScript.**
- **Component sourcing rule:** search Beautiful UI, then 21st.dev Agent Elements, then DaisyUI, then shadcn/Radix, before authoring any UI component. Record the source or the gap in `CREDITS.md`.
- **Pure modules must not import `server-only`.** `db/test.mjs` cannot import a module that does, and the failure names the wrong problem entirely.
- **Run `npm run db:test` after any schema change.** It is the acceptance gate.
- Import paths inside `src/lib` use relative paths with the `.ts` extension (`'../types.ts'`). Imports from `src/app` and `src/components` use `@/` with the `.ts`/`.tsx` extension.

---

### Task 1: The vibe taxonomy and the seed column

**Files:**
- Modify: `src/lib/types.ts:656` (after `STOREFRONT_STATUSES`, before `StorefrontContent`)
- Modify: `src/lib/types.ts:667-678` (`StorefrontContent`)
- Modify: `src/lib/types.ts:680-690` (`Storefront`)
- Modify: `db/schema.sql:447-460` (the `storefronts` table)
- Create: `supabase/migrations/20260903000000_storefront_seed.sql`
- Test: `db/test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `WARMTHS`, `VOICES`, `DENSITIES`, `type Vibe`, `DEFAULT_VIBE`, `vibeOf(content)`, and `storefronts.seed`.

- [ ] **Step 1: Write the failing test**

Append to `db/test.mjs`, just before the `// ── result` banner at the end:

```js
console.log('\na shop\'s look is a vibe plus a seed')
// The vibe is three closed enums, so the model can get it wrong only in ways
// the schema already refuses. Twenty-seven combinations is the whole space.
eq('three warmths', WARMTHS.length, 3)
eq('three voices', VOICES.length, 3)
eq('three densities', DENSITIES.length, 3)
// Every storefront published before this phase has no vibe in its jsonb. A
// missing vibe must be a default, never a crash on a real shop's live site.
eq('a content object with no vibe falls back', vibeOf({ headline: 'x' }).warmth, DEFAULT_VIBE.warmth)
eq('and a stated vibe is used as stated', vibeOf({ vibe: { warmth: 'cool', voice: 'bright', density: 'compact' } }).voice, 'bright')
// A vibe that is present but malformed is the same case as absent: the site
// still has to render.
eq('a malformed vibe falls back too', vibeOf({ vibe: { warmth: 'purple' } }).warmth, DEFAULT_VIBE.warmth)

const seedRow = await db.query(
  `select seed from storefronts limit 1`
)
eq('every storefront row has a seed', Number.isInteger(seedRow.rows[0]?.seed), true)
eq('and it is inside the 31 bit range', seedRow.rows[0].seed >= 0 && seedRow.rows[0].seed <= 2147483647, true)
```

Add to the import block at the top of `db/test.mjs`, beside the existing `THEMES` import:

```js
import { WARMTHS, VOICES, DENSITIES, DEFAULT_VIBE, vibeOf } from '../src/lib/types.ts'
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run db:test`
Expected: FAIL. The import throws `SyntaxError: The requested module '../src/lib/types.ts' does not provide an export named 'WARMTHS'`.

- [ ] **Step 3: Add the taxonomy to types.ts**

Insert after `export type StorefrontStatus` (line 657):

```ts
/**
 * How a shop feels, in three closed enums the model fills from the owner's own
 * words. Twenty-seven combinations.
 *
 * These are enums and not free text on purpose. The model is choosing an id
 * here exactly as it already chooses `theme`, so a bad generation is a wrong
 * adjective and never markup on a real shop's public site. The seed resolves
 * everything these three do not say: see src/lib/storefront/style.ts.
 */
export const WARMTHS = ['warm', 'neutral', 'cool'] as const
export const VOICES = ['plain', 'crafted', 'bright'] as const
export const DENSITIES = ['airy', 'standard', 'compact'] as const

export type Vibe = {
  warmth: (typeof WARMTHS)[number]
  voice: (typeof VOICES)[number]
  density: (typeof DENSITIES)[number]
}

/**
 * What a shop published before this phase existed gets.
 *
 * Neutral, plain and standard is the quietest point in the space, which is the
 * right thing to hand a shop that never chose: it looks deliberate rather than
 * random, and the owner can regenerate whenever she likes.
 */
export const DEFAULT_VIBE: Vibe = { warmth: 'neutral', voice: 'plain', density: 'standard' }

/**
 * Read a vibe out of stored content that may predate it, or be malformed.
 *
 * A live shop site must render. A published jsonb blob written last week has no
 * `vibe` key at all, and treating that as an error would take a real shop's
 * site down to serve a type.
 */
export function vibeOf(content: unknown): Vibe {
  const candidate = (content as { vibe?: Partial<Vibe> } | null)?.vibe
  if (!candidate) return DEFAULT_VIBE
  const warmth = (WARMTHS as readonly string[]).includes(candidate.warmth ?? '')
    ? (candidate.warmth as Vibe['warmth'])
    : DEFAULT_VIBE.warmth
  const voice = (VOICES as readonly string[]).includes(candidate.voice ?? '')
    ? (candidate.voice as Vibe['voice'])
    : DEFAULT_VIBE.voice
  const density = (DENSITIES as readonly string[]).includes(candidate.density ?? '')
    ? (candidate.density as Vibe['density'])
    : DEFAULT_VIBE.density
  return { warmth, voice, density }
}
```

Add `vibe` to `StorefrontContent`, after `theme`:

```ts
export type StorefrontContent = {
  theme: ThemeId
  /** How the shop feels, from the owner's own words. Read through `vibeOf()`. */
  vibe: Vibe
  headline: string
```

Add `seed` to `Storefront`, after `theme`:

```ts
export type Storefront = {
  id: string
  business_id: string
  theme: ThemeId | string
  /** The owner's chosen look. A column and not part of the content jsonb: it is her choice, not the model's, and it survives a regeneration. */
  seed: number
  draft: StorefrontContent | null
```

- [ ] **Step 4: Add the column to schema.sql**

In `db/schema.sql`, inside `create table if not exists storefronts`, after the `theme` line:

```sql
  seed          integer not null default (floor(random() * 2147483647))::int,
```

And after the existing `comment on column storefronts.generated_by`:

```sql
comment on column storefronts.seed is 'The integer a shop''s whole look is a function of. A column default rather than app generated, so it is set once per row and stable by construction. Changing it is the owner''s act on /app/site, never the model''s.';
```

- [ ] **Step 5: Write the migration**

Create `supabase/migrations/20260903000000_storefront_seed.sql`:

```sql
-- A shop's look becomes a function of this integer. Phase 12.
-- The default fires for existing rows too, so every shop already published
-- gets a stable seed at migration time rather than a null the renderer has to
-- guess around.
alter table storefronts
  add column if not exists seed integer not null
    default (floor(random() * 2147483647))::int;

comment on column storefronts.seed is 'The integer a shop''s whole look is a function of. Set once per row and stable by construction. Changing it is the owner''s act on /app/site, never the model''s.';
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run db:test`
Expected: PASS, with the previous total plus 8.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts db/schema.sql supabase/migrations/20260903000000_storefront_seed.sql db/test.mjs
git commit -m "A shop's look is a vibe and a seed, and old rows still render"
```

---

### Task 2: The seeded style core

**Files:**
- Create: `src/lib/storefront/style.ts`
- Test: `db/test.mjs`

**Interfaces:**
- Consumes: `Vibe`, `ThemeId`, `WARMTHS`, `VOICES`, `DENSITIES` from `../types.ts`.
- Produces:
  - `mulberry32(seed: number): () => number`
  - `type Hsl = { h: number; s: number; l: number }`
  - `contrastRatio(a: Hsl, b: Hsl): number`
  - `paletteFor(seed: number, vibe: Vibe): { accent: Hsl; onAccent: Hsl; surface: Hsl; label: Hsl }`
  - `styleFor(seed: number, vibe: Vibe, theme: ThemeId): StorefrontStyle`
  - `type StorefrontStyle = { vars: Record<string, string>; rule: 'line' | 'tint' | 'none'; tileSeed: number }`
  - `candidateSeeds(from: number, count: number): number[]`
  - `MIN_LEADING = 1.75`

This module must NOT import `server-only`, must not import React, and must not import the AI SDK. `db/test.mjs` runs it directly.

- [ ] **Step 1: Write the failing test**

Append to `db/test.mjs` before the result banner:

```js
console.log('\nno seed may produce a site a customer cannot read')
// This is the guardrail that matters. A generated palette that renders
// unreadable Khmer on a real shop's public site is the same class of failure
// the never-emit-markup rule exists to prevent, so it gets the same treatment:
// the function clamps, and the harness proves the clamp.
const VIBES = []
for (const warmth of WARMTHS) for (const voice of VOICES) for (const density of DENSITIES) {
  VIBES.push({ warmth, voice, density })
}
eq('the vibe space is twenty seven', VIBES.length, 27)

let worstButton = Infinity, worstAccent = Infinity, worstBody = Infinity, worstLeading = Infinity
const SEEDS = []
for (let i = 0; i < 400; i++) SEEDS.push(Math.floor((i * 5_381_923) % 2147483647))
for (const seed of SEEDS) {
  for (const vibe of VIBES) {
    const p = paletteFor(seed, vibe)
    worstButton = Math.min(worstButton, contrastRatio(p.accent, p.onAccent))
    worstAccent = Math.min(worstAccent, contrastRatio(p.accent, p.surface))
    worstBody = Math.min(worstBody, contrastRatio(p.label, p.surface))
    for (const theme of THEMES) {
      const s = styleFor(seed, vibe, theme.id)
      worstLeading = Math.min(worstLeading, parseFloat(s.vars['--sf-leading']))
    }
  }
}
eq(`a call to action is legible on every one of ${SEEDS.length * VIBES.length} palettes`, worstButton >= 4.5, true)
eq('accent text on the page ground is legible', worstAccent >= 3, true)
eq('body copy on the page ground is legible', worstBody >= 7, true)
eq('and Khmer never drops below 1.75 leading', worstLeading >= 1.75, true)

// Determinism is not a convenience. A shop whose site changed colour between
// two page loads would look broken to its own customers.
const a1 = styleFor(12345, { warmth: 'warm', voice: 'crafted', density: 'airy' }, 'counter')
const a2 = styleFor(12345, { warmth: 'warm', voice: 'crafted', density: 'airy' }, 'counter')
eq('the same seed and vibe give a byte identical style', JSON.stringify(a1), JSON.stringify(a2))
const b1 = styleFor(999, { warmth: 'warm', voice: 'crafted', density: 'airy' }, 'counter')
eq('a different seed gives a different style', JSON.stringify(a1) === JSON.stringify(b1), false)
// The vibe has to actually do something, or the model is filling a field for
// nothing.
const warmHue = paletteFor(4242, { warmth: 'warm', voice: 'plain', density: 'airy' }).accent.h
const coolHue = paletteFor(4242, { warmth: 'cool', voice: 'plain', density: 'airy' }).accent.h
eq('warm and cool land in different hue bands', Math.abs(warmHue - coolHue) > 100, true)

// The picker offers four looks. It must never offer the one she already has,
// or a reshuffle would silently do nothing.
const cands = candidateSeeds(777, 4)
eq('the picker offers four candidates', cands.length, 4)
eq('all four are distinct', new Set(cands).size, 4)
eq('and none is the seed she already has', cands.includes(777), false)
eq('every candidate is a valid 31 bit seed', cands.every((s) => Number.isInteger(s) && s >= 0 && s <= 2147483647), true)
eq('the shuffle is reproducible from its input', JSON.stringify(candidateSeeds(777, 4)), JSON.stringify(cands))
```

Add to the imports at the top of `db/test.mjs`:

```js
import { candidateSeeds, contrastRatio, paletteFor, styleFor } from '../src/lib/storefront/style.ts'
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run db:test`
Expected: FAIL with `Cannot find module '.../src/lib/storefront/style.ts'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/storefront/style.ts`:

```ts
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
      '--sf-leading': String(MIN_LEADING),
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run db:test`
Expected: PASS. The contrast sweep runs 400 seeds by 27 vibes and should complete in well under a second.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storefront/style.ts db/test.mjs
git commit -m "One integer decides a shop's look, and no integer makes it unreadable"
```

---

### Task 3: The model fills the vibe

**Files:**
- Modify: `src/lib/ai/storefront.ts:26-34` (`StorefrontSchema`), `:36-48` (`SYSTEM`)
- Modify: `src/lib/ai/storefront-check.ts`
- Test: `db/test.mjs`

**Interfaces:**
- Consumes: `WARMTHS`, `VOICES`, `DENSITIES`, `Vibe`, `vibeOf` from Task 1.
- Produces: a `StorefrontContent` that always carries a valid `vibe`.

- [ ] **Step 1: Write the failing test**

Append to `db/test.mjs` before the result banner:

```js
console.log('\nthe vibe comes from the owner\'s own words')
// sanityCheck is what stands between a generation and a real shop's site. It
// already catches markup, a price in prose and an invented claim. A vibe that
// is missing or nonsense is the same kind of defect and gets caught the same
// way, before the owner can publish it.
const noVibe = sanityCheck({ theme: 'counter', headline: 'Good coffee', subhead: 'Open early every day', about: 'A small cafe run by one family since the shop opened.', highlights: ['Open Saturday', 'Two staff'], callToAction: 'Order', notice: null }, 'Sok Cafe')
eq('a generation with no vibe is flagged', noVibe.some((w) => w.field === 'vibe'), true)
const badVibe = sanityCheck({ theme: 'counter', vibe: { warmth: 'purple', voice: 'plain', density: 'airy' }, headline: 'Good coffee', subhead: 'Open early every day', about: 'A small cafe run by one family since the shop opened.', highlights: ['Open Saturday', 'Two staff'], callToAction: 'Order', notice: null }, 'Sok Cafe')
eq('a vibe outside the taxonomy is flagged', badVibe.some((w) => w.field === 'vibe'), true)
const goodVibe = sanityCheck({ theme: 'counter', vibe: { warmth: 'warm', voice: 'plain', density: 'airy' }, headline: 'Good coffee', subhead: 'Open early every day', about: 'A small cafe run by one family since the shop opened.', highlights: ['Open Saturday', 'Two staff'], callToAction: 'Order', notice: null }, 'Sok Cafe')
eq('a stated vibe passes', goodVibe.some((w) => w.field === 'vibe'), false)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run db:test`
Expected: FAIL on `a generation with no vibe is flagged`, actual `false`.

- [ ] **Step 3: Extend the schema and the prompt**

In `src/lib/ai/storefront.ts`, add to `StorefrontSchema` immediately after the `theme` field:

```ts
  vibe: z
    .object({
      warmth: z.enum(WARMTHS).describe('warm for wood, food, family. cool for clinical, technical, modern. neutral if the description says neither'),
      voice: z.enum(VOICES).describe('plain for a quiet practical shop, crafted for one that takes pride in how it looks, bright for one aimed at a young crowd'),
      density: z.enum(DENSITIES).describe('airy for a short menu or a calm place, compact for a long menu or a busy one, standard otherwise'),
    })
    .describe("how the shop feels, read from the owner's own words and never guessed from the business type alone"),
```

Add `WARMTHS, VOICES, DENSITIES` to the existing `@/lib/types.ts` import at the top of the file.

Append to the `SYSTEM` constant, after the theme paragraph:

```
Also choose a vibe. It is read from what the owner actually wrote, not from the kind of business: a plain, practical description gets a plain voice even if the shop is a beauty salon. If her words give you nothing to go on, answer neutral, plain, standard rather than inventing a mood she never expressed.
```

- [ ] **Step 4: Extend the sanity check**

In `src/lib/ai/storefront-check.ts`, add to the checks (matching the existing warning shape used by the file):

```ts
  // A vibe is the one field here that becomes colour rather than words, so a
  // missing or invented one is caught with the same seriousness as an invented
  // claim: both reach a real shop's public site.
  const vibe = (content as { vibe?: { warmth?: string; voice?: string; density?: string } }).vibe
  const vibeOk =
    !!vibe &&
    (WARMTHS as readonly string[]).includes(vibe.warmth ?? '') &&
    (VOICES as readonly string[]).includes(vibe.voice ?? '') &&
    (DENSITIES as readonly string[]).includes(vibe.density ?? '')
  if (!vibeOk) {
    warnings.push({ field: 'vibe', issue: 'no usable vibe was chosen, so the site will fall back to the quiet default' })
  }
```

Import `WARMTHS, VOICES, DENSITIES` from `./types.ts` or `../types.ts` as that file's existing import style requires. Read the top of the file and match it.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run db:test`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. `StorefrontContent` now requires `vibe`, so any object literal built without it is a compile error. Fix each one by supplying `DEFAULT_VIBE`, not by widening the type.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ai/storefront.ts src/lib/ai/storefront-check.ts db/test.mjs
git commit -m "The model says how the shop feels, and a missing answer is caught"
```

---

### Task 4: The themes wear the tokens

**Files:**
- Modify: `src/lib/queries/storefront.ts:19-82` (`getStorefront`), `:85-93` (`getStorefrontRow`)
- Modify: `src/app/s/[slug]/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/themes/registry.tsx`
- Test: manual render plus `npm run shoot`

**Interfaces:**
- Consumes: `styleFor`, `StorefrontStyle` from Task 2; `vibeOf` from Task 1.
- Produces: `getStorefront(slug)` now returns `{ data: StorefrontData; style: StorefrontStyle } | null`.

`src/themes/types.ts` gains nothing. A theme still receives one `StorefrontData` prop and still cannot see the seed. That is what keeps the four theme files as readable as they are.

- [ ] **Step 1: Widen the query's return**

In `src/lib/queries/storefront.ts`, add `seed` to the storefronts select:

```ts
    db.from('storefronts').select('theme, seed, published').eq('id', business.id).maybeSingle(),
```

Change the signature and the return. The function currently ends with `return { shop: {...}, items: [...], content: published, action }`. Wrap it:

```ts
export async function getStorefront(
  slug: string,
): Promise<{ data: StorefrontData; style: StorefrontStyle } | null> {
```

and replace the final return with:

```ts
  const data: StorefrontData = {
    shop: { /* unchanged */ },
    items: /* unchanged */,
    content: published,
    action,
  }
  // The style is computed here and not inside a theme, so a theme cannot reach
  // the seed and no theme can disagree with another about what a seed means.
  const style = styleFor(storefrontResult.data?.seed ?? 0, vibeOf(published), published.theme)
  return { data, style }
}
```

Add `seed` to the `getStorefrontRow` select so `/app/site` can read it:

```ts
    .select('theme, seed, draft, published, published_at, generated_by')
```

Import `styleFor` and `StorefrontStyle` from `../storefront/style.ts`, and `vibeOf` from `../types.ts`.

- [ ] **Step 2: Update the page**

In `src/app/s/[slug]/page.tsx`, `generateMetadata` becomes:

```ts
  const result = await getStorefront(slug)
  if (!result) return { title: 'Moni' }
  const { data } = result
```

and the page body:

```tsx
  const result = await getStorefront(slug)
  if (!result) notFound()
  const { data, style } = result
  const theme = themeFor(data.content.theme)

  return (
    <div
      className="sf min-h-dvh bg-surface text-label"
      style={style.vars as React.CSSProperties}
      data-rule={style.rule}
    >
```

The rest of the file is unchanged.

- [ ] **Step 3: Add the scoped token block to globals.css**

Append, unlayered, after the existing bridge block:

```css
/* ── a shop's own site wears its own tokens ───────────────────────────────
   The seeded style arrives as custom properties on `.sf`. Everything below is
   a REMAPPING, not a new palette: `bg-green` and `text-label-2` in the four
   theme components already resolve through these names, so the themes change
   almost not at all and a new token is one line here rather than four edits
   across four files.

   Unlayered on purpose, the same cascade-layer trick as the Khmer line height:
   Tailwind emits its utilities inside @layer utilities, so these win without
   an !important anywhere. */
.sf {
  --accent:       var(--sf-accent);
  --on-accent:    var(--sf-on-accent);
  --green:        var(--sf-accent);
  --green-tint:   var(--sf-accent-tint);
  --accent-tint:  var(--sf-accent-tint);
  --background:   var(--sf-surface);
  --surface:      var(--sf-surface);
  --page:         var(--sf-surface);
  font-size:      var(--sf-scale);
}

.sf h1, .sf h2, .sf h3 { font-weight: var(--sf-weight-heading); }

/* Khmer clusters clip below 1.75 whatever the scale did, so the leading is a
   floor applied here rather than a number a theme is trusted to remember. */
.sf .km, .sf :lang(km) { line-height: var(--sf-leading); }

.sf .sf-section + .sf-section { margin-top: var(--sf-gap-section); }
.sf .sf-row { padding-block: var(--sf-gap-row); border-bottom: 1px solid var(--separator); }
.sf .sf-row:last-child { border-bottom: 0; }
.sf[data-rule='tint'] .sf-row { border-bottom: 0; }
.sf[data-rule='tint'] .sf-row:nth-child(odd) { background: var(--sf-accent-tint); }
.sf[data-rule='none'] .sf-row { border-bottom: 0; }
```

- [ ] **Step 4: Replace the literals in the theme registry**

In `src/themes/registry.tsx`, four mechanical replacements. Do NOT restructure the four theme components: their markup is the part that must stay stable.

1. The four `Action` call sites each carry `rounded-full`. Replace with `rounded-[var(--sf-radius)]` in all four.
2. In `Items`, the item `<li>` currently reads `className="flex items-center gap-3 border-b border-separator py-2 last:border-b-0"`. Replace with `className="sf-row flex items-center gap-3"`, since the padding and the divider now come from the `.sf-row` rule.
3. In `Items`, the photo `<img>` carries `rounded-md`. Replace with `rounded-[calc(var(--sf-radius)*0.75)]`.
4. In `Items`, each `<section>` carries `className="mb-6 last:mb-0"`. Replace with `className="sf-section"` and delete the `mb-6 last:mb-0`, since the rhythm now comes from `--sf-gap-section`.

Update the file's header comment to say that the markup is ours and the tokens are seeded, and that a theme never sees the seed.

- [ ] **Step 5: Verify by rendering**

Run:

```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null; npm run build && npm start &
```

Wait for the server, then check the CSS chunk returns 200 before believing any screenshot, per CLAUDE.md:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/s/<a-seeded-slug>
```

Expected: 200 for a published shop, 404 for an unpublished one.

- [ ] **Step 6: Screenshot**

Run: `npm run shoot`
Expected: desktop, mobile and mobile-viewport captures with `overflowing=0` and `invisible=0`. A non-zero `overflowing` is a real layout bug: a grid item defaults to `min-width: auto`, so check for a `min-w-0` before assuming the token change caused it.

- [ ] **Step 7: Commit**

```bash
git add src/lib/queries/storefront.ts src/app/s/\[slug\]/page.tsx src/app/globals.css src/themes/registry.tsx
git commit -m "A shop's site wears its own colour, radius and rhythm"
```

---

### Task 5: A product with no photo gets a tile

**Files:**
- Create: `src/lib/media/tile.ts`
- Create: `src/components/storefront/product-tile.tsx`
- Modify: `src/themes/registry.tsx` (`Items`)
- Modify: `src/themes/types.ts` (`StorefrontData.items` gains nothing; the tile seed is passed separately, see below)
- Modify: `CREDITS.md`
- Test: `db/test.mjs`

**Interfaces:**
- Consumes: `mulberry32` from Task 2.
- Produces:
  - `TILE_PATTERNS`, `type TilePattern`, `type TileSpec = { pattern: TilePattern; rotation: 0 | 90 | 180 | 270; tint: 0 | 1 | 2 }`
  - `tileFor(seed: number, productId: string): TileSpec`
  - `<ProductTile spec={...} className={...} />`

`Items` needs the shop seed to draw a tile, and it is a private helper inside `registry.tsx` rather than a theme. So `StorefrontData` gains nothing: the seed arrives as a second, opaque prop on `ThemeModule.Storefront` which each theme forwards to `Items` without reading. A theme still derives no style of its own, which is the property that matters. React context was rejected because it needs a client boundary and this whole tree is server rendered.

- [ ] **Step 1: Write the failing test**

Append to `db/test.mjs` before the result banner:

```js
console.log('\na menu with half its photos still reads as a menu')
// Uploading stays the real path. A tile is what a row gets when there is
// nothing to upload yet, and it must never resemble a photograph or a broken
// image. Keyed on the product id and not the name, so renaming an item does
// not change how it looks.
const tileA = tileFor(4242, '11111111-1111-1111-1111-111111111111')
const tileB = tileFor(4242, '11111111-1111-1111-1111-111111111111')
eq('the same product gets the same tile every time', JSON.stringify(tileA), JSON.stringify(tileB))
const tileC = tileFor(4242, '22222222-2222-2222-2222-222222222222')
eq('a different product gets a different tile', JSON.stringify(tileA) === JSON.stringify(tileC), false)
const tileD = tileFor(999, '11111111-1111-1111-1111-111111111111')
eq('and the same product in a different shop differs too', JSON.stringify(tileA) === JSON.stringify(tileD), false)
eq('every tile names a real pattern', TILE_PATTERNS.includes(tileA.pattern), true)
eq('and a rotation the SVG can use', [0, 90, 180, 270].includes(tileA.rotation), true)
// Across a shop's whole menu the tiles must actually vary, or the fallback is
// one grey square repeated and the owner may as well have had nothing.
const spread = new Set()
for (let i = 0; i < 60; i++) spread.add(JSON.stringify(tileFor(4242, `product-${i}`)))
eq(`sixty items produce ${spread.size} distinct tiles`, spread.size >= 20, true)
```

Add to the imports at the top of `db/test.mjs`:

```js
import { TILE_PATTERNS, tileFor } from '../src/lib/media/tile.ts'
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run db:test`
Expected: FAIL with `Cannot find module '.../src/lib/media/tile.ts'`.

- [ ] **Step 3: Write the tile spec**

Create `src/lib/media/tile.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run db:test`
Expected: PASS.

- [ ] **Step 5: Search for a component before authoring one**

CLAUDE.md's sourcing rule applies. Search Beautiful UI, then 21st.dev Agent Elements, then DaisyUI, for a generative or geometric placeholder component. Record the outcome in `CREDITS.md` under the storefront section, either as a source URL and install reference, or as an explicit gap with the searches performed. Rule 10 permits authored SVG art, which is what this is if no source fits.

- [ ] **Step 6: Write the tile component**

Create `src/components/storefront/product-tile.tsx`. Six authored SVG patterns, each drawn in `currentColor` so the tint is set by the wrapper:

```tsx
import type { TileSpec } from '@/lib/media/tile.ts'

/**
 * The drawing half of `tileFor`. Six authored patterns, in the world's own
 * stroke weight, at the same size as the photo they stand in for and in the
 * same rounded box, so a half photographed menu has one alignment and one
 * rhythm rather than two.
 *
 * Every pattern is geometric on purpose. It must not resemble a photograph: a
 * customer who thinks she is looking at a picture of the food has been misled,
 * which is the failure this whole approach exists to avoid.
 */
const TINTS = ['8%', '14%', '22%'] as const

export function ProductTile({ spec, className }: { spec: TileSpec; className?: string }) {
  const paint = { color: `color-mix(in srgb, var(--sf-accent) ${TINTS[spec.tint]}, transparent)` }
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{ ...paint, background: `color-mix(in srgb, var(--sf-accent) 6%, var(--sf-surface))` }}
    >
      <svg viewBox="0 0 56 56" width="56" height="56" style={{ transform: `rotate(${spec.rotation}deg)` }}>
        <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          {spec.pattern === 'bars' && [10, 20, 30, 40].map((x) => <line key={x} x1={x} y1="8" x2={x} y2="48" />)}
          {spec.pattern === 'arcs' && [14, 26, 38].map((r) => <path key={r} d={`M ${28 - r} 44 A ${r} ${r} 0 0 1 ${28 + r} 44`} />)}
          {spec.pattern === 'grid' && [14, 28, 42].flatMap((v) => [
            <line key={`h${v}`} x1="8" y1={v} x2="48" y2={v} />,
            <line key={`v${v}`} x1={v} y1="8" x2={v} y2="48" />,
          ])}
          {spec.pattern === 'chevron' && [10, 24, 38].map((y) => <path key={y} d={`M 12 ${y + 10} L 28 ${y} L 44 ${y + 10}`} />)}
          {spec.pattern === 'dots' && [14, 28, 42].flatMap((cy) =>
            [14, 28, 42].map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill="currentColor" stroke="none" />),
          )}
          {spec.pattern === 'waves' && [16, 28, 40].map((y) => (
            <path key={y} d={`M 8 ${y} Q 18 ${y - 7} 28 ${y} T 48 ${y}`} />
          ))}
        </g>
      </svg>
    </span>
  )
}
```

- [ ] **Step 7: Wire it into the item rows**

In `src/themes/registry.tsx`:

Change `ThemeModule` usage so the seed reaches `Items`. In `src/themes/types.ts`, change:

```ts
export type ThemeModule = {
  id: ThemeId
  name: string
  Storefront: (props: { data: StorefrontData; tileSeed: number }) => React.ReactNode
}
```

Each of the four theme components takes `{ data, tileSeed }` and forwards `tileSeed` to `<Items>`. `Items` gains `tileSeed: number` in its props and its row becomes:

```tsx
{item.photoUrl ? (
  // eslint-disable-next-line @next/next/no-img-element -- a Supabase Storage URL on a public page, sized here rather than through the image pipeline
  <img
    src={item.photoUrl}
    alt={item.name}
    width={56}
    height={56}
    loading="lazy"
    className="size-14 shrink-0 rounded-[calc(var(--sf-radius)*0.75)] object-cover"
  />
) : (
  <ProductTile
    spec={tileFor(tileSeed, item.id)}
    className="size-14 shrink-0 overflow-hidden rounded-[calc(var(--sf-radius)*0.75)]"
  />
)}
```

In `src/app/s/[slug]/page.tsx`, pass the seed:

```tsx
<theme.Storefront data={data} tileSeed={style.tileSeed} />
```

`style.tileSeed` already exists: Task 2 put it on `StorefrontStyle`. Nothing in `src/lib/storefront/style.ts` changes in this task.

- [ ] **Step 8: Verify and screenshot**

Run: `npm run db:test` then `npx tsc --noEmit` then `npm run shoot`
Expected: all pass. Visually confirm a menu with some photos and some tiles has one alignment and one rhythm.

- [ ] **Step 9: Commit**

```bash
git add src/lib/media/tile.ts src/components/storefront/product-tile.tsx src/themes/registry.tsx src/themes/types.ts src/lib/storefront/style.ts src/app/s/\[slug\]/page.tsx CREDITS.md db/test.mjs
git commit -m "A row with no photo is drawn, not left as a hole"
```

---

### Task 6: The owner picks her look

**Files:**
- Create: `src/app/api/storefront/seed/route.ts`
- Create: `src/components/app/seed-picker.tsx`
- Modify: `src/app/app/site/page.tsx`
- Modify: `CREDITS.md`
- Test: `db/test.mjs`

**Interfaces:**
- Consumes: `candidateSeeds`, `styleFor` from Task 2; `getStorefrontRow` from Task 4.
- Produces: `POST /api/storefront/seed` taking `{ seed: number }` and returning `{ seed }`.

- [ ] **Step 1: Write the failing test**

Append to `db/test.mjs` before the result banner:

```js
console.log('\nthe owner chooses her own shop\'s look')
// The route accepts an integer and nothing else. A seed is the one number that
// decides a whole public site, so a float, a negative or an overflow is a
// refusal rather than a coerced value that renders something nobody chose.
eq('a valid seed passes the guard', isSeed(12345), true)
eq('zero is a valid seed', isSeed(0), true)
eq('the top of the range is valid', isSeed(2147483647), true)
eq('a float is refused', isSeed(1.5), false)
eq('a negative is refused', isSeed(-1), false)
eq('past the range is refused', isSeed(2147483648), false)
eq('a string is refused', isSeed('12345'), false)
eq('NaN is refused', isSeed(NaN), false)
```

Add `isSeed` to the `src/lib/storefront/style.ts` import in `db/test.mjs`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run db:test`
Expected: FAIL, `isSeed` is not exported.

- [ ] **Step 3: Add the guard**

Append to `src/lib/storefront/style.ts`:

```ts
/**
 * One number decides a whole public site, so it is validated in a pure function
 * the harness can prove rather than inline in a route handler where it would be
 * asserted by nobody.
 */
export function isSeed(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 2147483647
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run db:test`
Expected: PASS.

- [ ] **Step 5: Write the route**

Create `src/app/api/storefront/seed/route.ts`, matching the shape of `src/app/api/storefront/route.ts` exactly. Read that file first and copy its error handling, its `requireMemberApi()` call and its `assertSameOriginBrowserPost(req)` call rather than inventing a variant:

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMemberApi } from '@/lib/auth/member.ts'
import { ApiRequestError, assertSameOriginBrowserPost, readJsonBody, validationPayload } from '@/lib/http/post.ts'
import { db } from '@/lib/db.ts'
import { throwIfDbError } from '@/lib/db-result.ts'

export const runtime = 'nodejs'

const Body = z.object({ seed: z.number().int().min(0).max(2147483647) }).strict()

/**
 * The owner keeps one of the looks she was offered.
 *
 * A seed is not content, so it does not go through draft and publish: it takes
 * effect on the live site immediately, the way changing a price does. That is
 * deliberate. The publish gate exists because the MODEL wrote the words and a
 * person must read them first. Nobody needs to review a colour the owner
 * herself just tapped.
 */
export async function POST(req: Request) {
  try {
    assertSameOriginBrowserPost(req)
    const member = await requireMemberApi()
    const { seed } = Body.parse(await readJsonBody(req, 1_000))

    const saved = await db
      .from('storefronts')
      .update({ seed })
      .eq('id', member.businessId)
      .select('seed')
      .single()
    throwIfDbError('save storefront seed', saved.error)

    await db.from('events').insert({
      business_id: member.businessId,
      actor: 'owner',
      actor_label: 'owner via site',
      action: 'storefront.seed_chosen',
      entity_type: 'business',
      entity_id: member.businessId,
      after: { seed },
    })

    return NextResponse.json({ seed })
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(validationPayload(error), { status: 400 })
    }
    console.error('[storefront/seed]', error instanceof Error ? error.message : 'seed failed')
    return NextResponse.json({ error: 'that look could not be saved' }, { status: 500 })
  }
}
```

- [ ] **Step 6: Search for a picker component before authoring one**

Search Beautiful UI, then 21st.dev Agent Elements, then DaisyUI, for a card-select or option-grid with a selected state. Record the source or the gap in `CREDITS.md`.

- [ ] **Step 7: Write the picker**

Create `src/components/app/seed-picker.tsx`, a client component. It holds no business logic: it renders four candidates, POSTs the chosen seed, and refreshes.

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, LoaderCircle, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { candidateSeeds, styleFor } from '@/lib/storefront/style.ts'
import type { Vibe, ThemeId } from '@/lib/types.ts'

/**
 * Four looks, side by side, and she taps one.
 *
 * `styleFor` is pure and the content is already on the page, so four candidates
 * cost one render and no model call. That is the whole reason this is a picker
 * and not a reroll button: comparing beats rolling blind, and it is free.
 *
 * Rerolling changes the seed and never the vibe, so a warm shop stays warm and
 * only becomes a different warm.
 */
export function SeedPicker({
  seed,
  vibe,
  theme,
  headline,
}: {
  seed: number
  vibe: Vibe
  theme: ThemeId
  headline: string
}) {
  const router = useRouter()
  const [shuffleFrom, setShuffleFrom] = useState(seed)
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState('')
  const candidates = [seed, ...candidateSeeds(shuffleFrom, 3)]

  async function choose(next: number) {
    setBusy(next)
    setError('')
    try {
      const response = await fetch('/api/storefront/seed', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ seed: next }),
      })
      const body = await response.json()
      if (!response.ok || body.error) throw new Error(body.error ?? 'request failed')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'that look could not be saved')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="km text-sm font-semibold text-ink">រូបរាងហាង</h2>
        <Button variant="ghost" size="sm" onClick={() => setShuffleFrom(candidates[1] ?? seed)}>
          <Shuffle className="size-4" />
          <span className="km">ប្តូរ</span>
        </Button>
      </div>
      <p className="km mt-1 text-xs text-rule">ជ្រើសរើសមួយ។ ពាក្យនៅដដែល ប្តូរតែពណ៌ និងរូបរាង។</p>

      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {candidates.map((candidate) => {
          const style = styleFor(candidate, vibe, theme)
          const chosen = candidate === seed
          return (
            <li key={candidate}>
              <button
                type="button"
                onClick={() => choose(candidate)}
                disabled={busy !== null}
                aria-pressed={chosen}
                className="w-full overflow-hidden rounded-xl border border-line text-left disabled:opacity-60 aria-pressed:border-accent aria-pressed:ring-2 aria-pressed:ring-accent"
                style={style.vars as React.CSSProperties}
              >
                <span className="block aspect-4/5 p-3" style={{ background: 'var(--sf-surface)' }}>
                  <span
                    className="km block truncate text-[11px] font-semibold"
                    style={{ fontWeight: 'var(--sf-weight-heading)' }}
                  >
                    {headline}
                  </span>
                  <span className="mt-2 block h-1.5 w-3/4 rounded-full" style={{ background: 'var(--sf-accent-tint)' }} />
                  <span className="mt-1 block h-1.5 w-1/2 rounded-full" style={{ background: 'var(--sf-accent-tint)' }} />
                  <span
                    className="mt-3 block h-6 w-full"
                    style={{ background: 'var(--sf-accent)', borderRadius: 'var(--sf-radius)' }}
                  />
                </span>
                <span className="flex min-h-9 items-center justify-center gap-1 border-t border-line bg-canvas px-2 text-xs">
                  {busy === candidate ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                  {chosen && busy === null ? <Check className="size-3.5" /> : null}
                  <span className="km">{chosen ? 'កំពុងប្រើ' : 'ជ្រើស'}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {error ? <p className="km mt-2 text-xs text-red">{error}</p> : null}
    </section>
  )
}
```

- [ ] **Step 8: Mount it**

In `src/app/app/site/page.tsx`, render `SeedPicker` above `SiteEditor`, only when there is something to preview:

```tsx
{row?.draft || row?.published ? (
  <div className="mt-6">
    <SeedPicker
      seed={row.seed}
      vibe={vibeOf(row.draft ?? row.published)}
      theme={((row.draft ?? row.published) as StorefrontContent).theme}
      headline={((row.draft ?? row.published) as StorefrontContent).headline}
    />
  </div>
) : null}
```

Import `SeedPicker` and `vibeOf`.

- [ ] **Step 9: Verify**

Run: `npm run db:test`, `npx tsc --noEmit`, then build and start and open `/app/site`.
Expected: four candidates render, tapping one persists it, and reloading `/s/{slug}` shows the chosen look.

- [ ] **Step 10: Screenshot and commit**

Run: `npm run shoot`

```bash
git add src/app/api/storefront/seed/route.ts src/components/app/seed-picker.tsx src/app/app/site/page.tsx src/lib/storefront/style.ts CREDITS.md db/test.mjs
git commit -m "Four looks, and the owner keeps the one she wants"
```

---

### Task 7: Tell the owner which items have no photo

**Files:**
- Modify: `src/app/app/products/page.tsx`
- Test: `db/test.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Write the failing test**

Append to `db/test.mjs` before the result banner:

```js
console.log('\nthe owner learns what is missing before her customers do')
// She should find out on her own products screen, not by looking at her
// published site and noticing the pattern tiles.
const missing = await one(db, `select count(*) c from products where business_id = '${B_CAFE}' and active and photo_path is null`)
eq('the count of photoless items is answerable in one query', Number.isInteger(Number(missing.c)), true)
```

`B_CAFE` and the `one()` helper are already bound in `db/test.mjs`: see the existing `cafeCatalogue` assertion around line 1164 and match its style exactly.

- [ ] **Step 2: Run the test to verify it fails or passes**

Run: `npm run db:test`
Expected: PASS immediately, because the column already exists. This assertion is here to pin the query the page depends on, so a later schema edit that drops `photo_path` fails here rather than silently emptying the prompt.

- [ ] **Step 3: Add the count to the products page**

Read `src/app/app/products/page.tsx` and add, above the list, a single line rendered only when the count is above zero. Follow the file's existing panel grammar from `src/components/app/panel.tsx` rather than inventing a new note style:

```tsx
{withoutPhoto > 0 ? (
  <p className="km mt-2 text-xs text-rule">
    មុខទំនិញ {toKhmerDigits(String(withoutPhoto))} មិនទាន់មានរូប។ បើគ្មានរូប គេហទំព័រនឹងគូរលំនាំជំនួស។
  </p>
) : null}
```

Import `toKhmerDigits` from `@/lib/format/khmer.ts`. Every user facing quantity goes through it: never a `km-KH` locale, per CLAUDE.md.

Compute `withoutPhoto` in the server component from the catalogue the page already loads. Do not add a second query if the rows are already in hand.

- [ ] **Step 4: Verify and commit**

Run: `npm run db:test`, `npx tsc --noEmit`, `npm run shoot`

```bash
git add src/app/app/products/page.tsx db/test.mjs
git commit -m "Say how many items still need a photo"
```

---

### Task 8: Close the phase

**Files:**
- Modify: `PLAN.md`
- Modify: `CLAUDE.md`
- Modify: `ARCHITECTURE.md`

- [ ] **Step 1: Full verification**

Run, and paste the real output into the commit body rather than describing it:

```bash
npm run db:test
npm run test:signals
npx tsc --noEmit
npm run build
lsof -ti:3000 | xargs kill -9 2>/dev/null; npm start &
npm run shoot
```

Expected: db:test passes with the new total, signals pass, no type errors, a clean build, and captures with `overflowing=0` and `invisible=0`.

- [ ] **Step 2: Confirm the acceptance check from the spec**

Publish four shops of the same business type with four different seeds. Confirm four visibly different sites, each legible, each still recognisably a Moni site. Confirm a half photographed menu renders with no gaps.

- [ ] **Step 3: Write the phase into PLAN.md**

Add a `### Phase 12: A seeded look per shop` section after Phase 11, in the same voice as the Phase 11 section: what the bug was, what was decided, what the assertions prove, and what was deliberately left out. Reference the spec and this plan by path. State the new `npm run db:test` total.

- [ ] **Step 4: Update CLAUDE.md**

Change the "active implementation pass" paragraph to name Phase 12 and its spec. Add to "Things already decided, do not relitigate":

```
- **A shop's look is a vibe plus a seed** (decided 3 September 2026). The theme comes
  from what the shop is, the vibe is three closed enums the model reads from
  `raw_description`, and the seed is a column the owner picks from four candidates.
  `styleFor()` is pure so `db/test.mjs` proves the only claim that matters: no seed
  produces unreadable Khmer on a real shop's public site. Tokens vary, composition
  does not, and that narrowing is deliberate rather than unfinished.
- **A product with no photo gets a seeded tile, never a stock photo.** A photograph of
  somebody else's food beside a real shop's real price is the failure that loses an
  owner permanently. `tileFor()` is keyed on the product id, so renaming an item does
  not redraw the menu.
```

- [ ] **Step 5: Update ARCHITECTURE.md section 6**

Record that the storefront now has a style layer above the theme, that the theme components never see the seed, and why the style is computed in the query rather than in a theme.

- [ ] **Step 6: Commit**

```bash
git add PLAN.md CLAUDE.md ARCHITECTURE.md
git commit -m "Phase 12: a seeded look per shop, and the docs that agree with it"
```

---

## Notes for the executor

- **The contrast sweep is the point of this phase.** If it is slow, reduce the seed sample, never the assertion. If it fails, the fix is in `paletteFor`'s clamp, never in the threshold.
- **Do not restructure the four theme components.** Their markup is what makes a bad generation read badly instead of breaking a shop. This phase changes the tokens they resolve, not the tags they emit.
- **`npm start` fails silently on a busy port.** It logs `errno: -48` and exits, the old server keeps serving a stale build, its CSS chunk 404s, and the page renders completely unstyled. Kill port 3000 first and check the page returns 200 before believing any screenshot.
- **`fullPage: true` renders `position: fixed` at its first-viewport position.** Take the viewport-only shot too before reporting fixed chrome as broken.
- **If a component search finds nothing,** record the gap in `CREDITS.md` with the searches performed. That is the rule's actual requirement, not a formality.

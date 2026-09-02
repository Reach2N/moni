# Seeded storefronts: every shop its own site

Phase 12. Written 2 September 2026.

## The problem

`src/themes/registry.tsx` holds four hand-built themes. The model picks one id
and fills seven validated strings, and everything past that is a literal:
`bg-green` for the accent, one type scale, one radius, one section order. Two
salons in Phnom Penh get pixel-identical pages with different words in them.

That is a product problem, not a taste problem. The pitch is "the owner describes
her shop and everything else is derived from that". A site that is visibly the
same template as the shop next door tells her it was not derived from anything.

## What this phase does

A shop's look is decided by three inputs, in strict precedence.

1. **The theme comes from what the shop is.** A cafe is `counter` on every seed.
   Unchanged from today, and it is the part that keeps every site a Moni site.
2. **The vibe comes from the owner's own words.** The model reads
   `raw_description` and picks one of twenty-seven closed combinations.
3. **The seed resolves everything the words did not say.** A pure function of an
   integer, deterministic forever, and the owner picks which integer.

Nothing here lets the model near markup. It fills enum fields, exactly as it
already fills `theme`, so the worst a bad generation can do is still read badly.

## Decisions taken

**Tokens vary, composition does not.** The seed drives palette, type scale and
weight, radius, spacing rhythm and row divider treatment. Section order, hero
shape and item-row structure stay fixed per theme. This is a deliberate
narrowing: two counter shops will read as the same bones in different clothes.
The token layer is designed so composition variation can be added later without
redoing it, and that is the only accommodation made for it. No variant slots are
built now for a feature that is not being built now.

**The seed is stored and the owner chooses it.** `storefronts` gains a `seed`
column. On `/app/site` the owner sees four candidate looks side by side and taps
one. `styleFor` is pure and the content is already loaded, so four candidates are
four wrappers around one theme component: no model call, no round trip, no cost.
She can reshuffle whenever she likes. Rerolling changes the seed and never the
vibe, so a warm shop stays warm and only becomes a different warm.

**A product with no photo gets a seeded tile, not a gap and not a stock photo.**
Uploading stays the real path. A stock photograph of someone else's coffee beside
a real shop's real price is the kind of thing that loses an owner permanently, and
image generation is verified unable to run once on the current tier. A tile drawn
from the shop's own palette is honest: it never claims to be a photograph, and it
makes a half-photographed menu look composed instead of broken.

## Data model

`src/lib/types.ts` changes first, `db/schema.sql` follows.

### types.ts

`StorefrontContent` gains one nested object of closed enums:

```ts
export const WARMTHS  = ['warm', 'neutral', 'cool'] as const
export const VOICES   = ['plain', 'crafted', 'bright'] as const
export const DENSITIES = ['airy', 'standard', 'compact'] as const

export type Vibe = {
  warmth: (typeof WARMTHS)[number]
  voice: (typeof VOICES)[number]
  density: (typeof DENSITIES)[number]
}
```

`vibe` is part of `StorefrontContent` because the model writes it and the owner
reviews it in the draft, alongside the headline and the about text.

`seed` is NOT part of `StorefrontContent`. It is the owner's choice, not the
model's, and it must survive a regeneration that rewrites every string. It is a
column.

### schema.sql

Migration `20260903000000_storefront_seed`:

```sql
alter table storefronts
  add column if not exists seed integer not null
    default (floor(random() * 2147483647))::int;
```

A column default rather than app-generated, so the value is set once per row and
is stable by construction. `comment on column` records that a shop's look is a
function of this integer and that changing it is the owner's act.

Nothing else in the schema moves. The vibe rides inside the existing `draft` and
`published` jsonb.

## The pure core

`src/lib/storefront/style.ts`. No `server-only` import, no AI SDK import, no
React import, so `db/test.mjs` can run it against a real Postgres-free harness
and prove its guarantees. This is the same reason `src/lib/agent/instructions.ts`
sits beside `prompt.ts`.

```ts
export function styleFor(seed: number, vibe: Vibe, theme: ThemeId): StorefrontStyle
```

`StorefrontStyle` is a flat record of CSS custom property values:

| Property | What it controls | Gated by |
| --- | --- | --- |
| `--sf-accent` | the one accent colour | warmth picks the hue band, seed picks inside it |
| `--sf-on-accent` | text drawn on the accent | computed, whichever of near-white or near-black wins on contrast |
| `--sf-accent-tint` | quiet accent fills | derived from `--sf-accent` |
| `--sf-surface` | page ground, an off-white carrying a trace of the accent hue | warmth, seed |
| `--sf-radius` | one radius for the whole screen | voice, seed |
| `--sf-scale` | base font size | density |
| `--sf-ratio` | heading step | voice |
| `--sf-weight-heading` | 500 to 700, Busra has six weights | voice |
| `--sf-gap-section` | rhythm between sections | density |
| `--sf-gap-row` | rhythm inside a list | density |
| `--sf-rule` | `line`, `tint` or `none` for row dividers | voice, seed |

The PRNG is mulberry32, roughly ten lines, chosen because it is short enough to
read in full and has no dependency. Determinism is a hard requirement, not a
convenience: a shop whose site changed colour between two page loads would look
broken to its own customers.

Hue bands by warmth: warm draws from 15 to 55 degrees, neutral from a narrow
desaturated band, cool from 195 to 265. Saturation and lightness are drawn inside
ranges and then clamped, never used raw.

### Type family

Busra is the only self-hosted Khmer face in `public/fonts`. Futura 100 Khmer
cannot be converted to a web format under TypeTogether's EULA, per CLAUDE.md, so
it is not an option. The seed therefore varies weight, scale and heading
treatment, and does not vary family.

Vendoring Kantumruy Pro, which is OFL and drawn by the same designer, would give
the seed a real second family and is the single highest-value addition to this
axis. It is listed as deferred rather than done, because vendoring a font is its
own small piece of work with its own licence file to place.

## The guardrail

A generated palette that renders unreadable Khmer on a real shop's public site is
the same class of failure that the never-emit-markup rule exists to prevent, and
it gets the same treatment: `styleFor` clamps rather than trusts, and the harness
proves it.

`contrastRatio(a, b)` is a WCAG relative-luminance calculation in the same pure
module, about twenty lines. `styleFor` uses it to:

- push `--sf-accent` lightness until it reaches 4.5:1 against `--sf-on-accent`,
  so a call-to-action button is always legible;
- hold `--sf-accent` at 3:1 or better against `--sf-surface`, so accent text on
  the page ground is legible;
- hold the near-black label colour at 7:1 or better against `--sf-surface`, so
  body copy is legible on a tinted ground.

`db/test.mjs` asserts all three across a sample of seeds crossed with every one
of the twenty-seven vibes and all four themes. It also asserts determinism: the
same seed and vibe produce a byte-identical style object.

Khmer's 1.75 line height becomes a floor inside the scale rather than a free
variable, because `--sf-scale` and `--sf-ratio` would otherwise be able to
produce a leading that clips coeng subscripts. The floor is asserted too.

## How tokens reach the markup

`globals.css` already resolves `--green` from `--accent`, and the themes already
say `bg-green` and `text-label-2`. So `styleFor` returns custom properties, the
storefront root carries them as inline style, and the existing Tailwind classes
resolve to new values with no rewrite of the theme components.

Only the hardcoded literals need touching:

- `rounded-full` on the four call-to-action buttons becomes `rounded-[var(--sf-radius)]`
- the fixed `text-3xl` and `text-lg` sizes go through the scale
- `border-b border-separator` on item rows honours `--sf-rule`

`src/themes/types.ts` gains nothing. A theme still receives one `StorefrontData`
prop and still cannot see where the bucket is or what the seed was. The style is
applied above it, which is what keeps the four theme components as readable as
they are today.

## The tile

`src/lib/media/tile.ts`, pure and harness-runnable for the same reason.

```ts
export function tileFor(seed: number, productId: string): TileSpec
```

Keyed on the product id and not the name, so renaming an item does not change its
tile. `TileSpec` names one of a small fixed set of authored geometric patterns
plus a rotation and a tint step, all drawn from the shop's palette. Six patterns
is the starting count.

Rendered by an authored SVG component at the same 56 by 56 as the photo it stands
in for, in the same rounded box. It must never resemble a photograph, and it must
sit beside a real photo without looking like an error.

CLAUDE.md's component sourcing rule applies: search Beautiful UI and then the
listed sources for a generative placeholder component before authoring one, and
record the gap in `CREDITS.md` if none fits. The pattern SVGs are authored art
under rule 10, which is what rule 10 permits.

`/app/products` gains a plain count of how many items have no photo, so the owner
knows what is missing rather than discovering it on her published site.

## The picker

`/app/site` gains a row of four candidate looks above the existing draft editor.
Each is the shop's real theme with its real content at a reduced scale inside a
fixed-aspect frame, so the owner is choosing her actual site and not a swatch.

`POST /api/storefront/seed` takes the chosen seed and writes it. Owner-only,
behind `requireMemberApi()`, same-origin checked, exactly like the other owner
routes. The seed is validated as a 31-bit non-negative integer.

Component sourcing rule again: search for a card-select or option-grid before
building the picker frame.

## Acceptance

- `npm run db:test` passes with new assertions covering contrast on all three
  pairs, across sampled seeds by twenty-seven vibes by four themes; determinism;
  the Khmer line-height floor; tile stability under rename; and the seed column
  default being present and stable.
- Four shops of the same business type, given four different seeds, produce four
  visibly different published sites, each still legible and each still
  recognisably a Moni site.
- A menu that is half photographed renders with no gaps.
- `npm run shoot` at desktop and mobile, in both colour schemes and once under
  `prefers-reduced-motion: reduce`.

## Deliberately not in this phase

- **Composition variation.** Section order, hero variants and item-row variants.
  The token layer is built so this can be added without redoing it.
- **Photo-derived palettes.** Extracting a hue from uploaded photos.
- **An explicit brand colour override.** The seam is obvious once the token layer
  exists: an owner-set accent would simply win over the seeded one.
- **A second font family.** Vendoring Kantumruy Pro.

None of these have stubs or reserved fields. They are listed so that the next
person knows they were considered and declined, not forgotten.

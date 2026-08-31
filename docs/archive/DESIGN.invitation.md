---
name: Moni
description: A Khmer wedding invitation as an operating surface: ruled frames, one metallic ink, and a struck seal per booking.
colors:
  paper: "#F8FAFC"
  ink: "#0F172A"
  rule: "#475569"
  seal: "#059669"
  seal-text: "#04845D"
  on-ink: "#F8FAFC"
  on-ink-dim: "#94A3B8"
  hairline: "#CBD5E1"
typography:
  display:
    fontFamily: "futura-100-khmer, Busra, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  figure:
    fontFamily: "futura-100-khmer, Busra, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "'tnum' 1"
  headline:
    fontFamily: "futura-100-khmer, Busra, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.45
  title:
    fontFamily: "futura-100-khmer, Busra, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.6
  body:
    fontFamily: "futura-100-khmer, Busra, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "futura-100-khmer, Busra, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.75
  meta:
    fontFamily: "futura-100-khmer, Busra, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.75
rounded:
  none: "0px"
  hit: "0.25rem"
  focus: "1px"
  pill: "9999px"
spacing:
  tight: "0.25rem"
  xs: "0.5rem"
  row-y: "0.875rem"
  sm: "0.75rem"
  md: "1rem"
  panel: "1.25rem"
  lg: "1.5rem"
  nav-clear: "6rem"
components:
  plate:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.display}"
    rounded: "{rounded.none}"
    padding: "1.5rem 1rem"
  panel-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.figure}"
    rounded: "{rounded.none}"
    padding: "1.5rem 1.25rem 1.25rem"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.seal}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.5rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.seal}"
  input-compose:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0.75rem 1rem"
  ledger-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "0.875rem 1rem"
  badge-count:
    backgroundColor: "{colors.seal}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "0 0.25rem"
    height: "1.125rem"
  nav-bottom:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.rule}"
    typography: "{typography.meta}"
    rounded: "{rounded.none}"
    padding: "0.625rem 0"
  nav-bottom-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
---

# Design System: Moni

> **Retired, 27 August 2026.** The "Invitation" system below styled the earlier demo
> iteration. The committed direction is now black and white with a single green accent
> in an Apple-native style, defined in PLAN.md section 3. Do not style new surfaces
> from this file.

## Overview

**Creative North Star: "The Invitation"**

A booking already is an invitation: a name, a time, and someone who will receive you. The
surface is built as printed stationery rather than as software chrome. One sheet of note
paper carries a centred plate with the shop's name, a ruled ledger of today's guests, and a
single committed dark block where the day's takings are printed in metallic ink. Nothing
floats, nothing is stacked, and nothing is separated by a shadow. Regions are separated by
the rule alone, the way a press separates them.

The density is calm and typographic. There is one ground colour, one type family, four
pinned inks, and exactly two pieces of ornament per screen. Colour is scarce on purpose: it
appears as a struck seal, a fill, or ink on the dark block, never as the thing that carries
a meaning. State is always a shape first, so a row reads correctly in sunlight, in
greyscale, and to anyone who cannot separate green from grey.

Confirmed rejections: the SaaS dashboard's card grid and stat row, drop shadows, rounded
card surfaces, a second display face, and any white panel floating on a tinted page. The
world's own materials are permitted and used: centred display type, ruled hairlines,
corner ornament, and a hard-edged ceremonial block.

**Key Characteristics:**
- One ground, `paper`, everywhere. No white panels anywhere in the component tree.
- Separation is a rule, never a shadow and never a fill change.
- Four pinned inks, one of which is metallic and structural only.
- One family, Busra, carrying Khmer and Latin together.
- Khmer line height 1.75 as a floor, enforced by cascade layer rather than by `!important`.
- State is a shape: three seals share one centre and one outer radius.
- Quantities hold fixed digit positions and never reflow.
- Exactly two ornament instances per screen.
- Exactly one authored motion, 180ms, and it reports a real state change.

## Colors

Four pinned inks on one ground: cool note stock, plate ink, a ruled grey, and a single
metallic green.

### Primary
- **Metallic Seal Green** (`{colors.seal}`): the one accent, and the only colour with any
  weight. It appears as a struck paid seal, the takings figure on the dark panel, the
  primary button's label on plate ink, the active nav mark, the count badge fill, the focus
  ring, the caret, and the selection highlight. Measured 4.74:1 on plate ink and 3.6:1 on
  paper, so on paper it is only ever structure or fill.
- **Seal Green, text grade** (`{colors.seal-text}`): the darkened variant reserved for the
  rare case where green must carry small text on paper. Not currently used on the owner
  surface, and it exists so that case never reaches for the 3.6:1 value.

### Neutral
- **Note Paper** (`{colors.paper}`): the single ground for the document, every panel, the
  compose box, the nav bar, and the scrollbar track. Also the text colour on the metallic
  badge.
- **Plate Ink** (`{colors.ink}`): body text at 17.06:1, headings, the customer's name, and
  the fill of the one committed dark region. Also the ornament stroke, so brackets register
  at full weight instead of dissolving into the line they sit on.
- **Ruled Grey** (`{colors.rule}`): secondary text, time brackets, terms and prices under a
  name, icon strokes, placeholders, and the ruled ornament itself. 7.24:1 on paper, so it is
  legible as text and reads as structure at 40 and 70 percent alpha.
- **Hairline** (`{colors.hairline}`): the interior division only. Row dividers inside a
  ledger, the line under a panel header, the scrollbar thumb.
- **On Ink** (`{colors.on-ink}`) and **On Ink Dim** (`{colors.on-ink-dim}`): the two text
  values inside the committed dark region, the dim one for its label and its supporting
  line, plus its 25 percent alpha divider.

### Named Rules

**The One Ground Rule.** `paper` is the only background on the surface, with the single
exception of the one committed ink region. There is no `bg-white` anywhere. If a region
needs to be distinct, it is separated by a rule, not by a lighter or darker fill.

**The Colour Lands on Structure Rule.** Seal green never carries small text on paper. It is
a filled seal, a structural mark, a badge fill, a ring, or ink on the dark panel. Nothing on
the surface is meaning-by-colour, so removing all colour loses no information.

**The One Committed Region Rule.** At most one dark ink block per screen, and it is the
figure that matters most that day. A second dark block turns the sheet into a dashboard.

## Typography

**Display Font:** Busra (SIL, OFL, vendored at `public/fonts` with its licence text)
**Body Font:** Busra, six weights, 200 to 700
**Brand Face, not loaded:** Futura 100 Khmer holds the first slot in the sans stack. It is
licensed for web use only through an Adobe Fonts web project and its EULA forbids conversion
to a web font format, so it is never self hosted. The slot is the intended brand face and
the constraint, not a defect: pasting the Adobe web project link into the root layout ships
it with nothing else changing.

**Character:** One family for the whole product. Busra is real Khmer engineering derived
from Khmer Mondulkiri, so coeng subscripts stack correctly rather than approximately, and it
carries Latin in the same voice. An operate surface does not need a display and body
pairing, and a second face would only add noise.

### Hierarchy
- **Display** (600, 1.875rem mobile rising to 2.25rem, line height 1.15, tight tracking):
  the shop's name on the plate, centred, once per screen.
- **Figure** (600, 2.5rem, line height 1, tabular): the day's takings on the dark panel.
  The only type larger than the display face's body sizes, and the only one in metallic ink.
- **Headline** (600, 1.25rem, line height 1.45): the compose invitation, the one asking
  question on the surface.
- **Title** (500, 1.125rem, line height 1.6): the customer's name in a ledger row. The
  largest thing in the row, because the person is the point.
- **Body** (400, 1rem, line height 1.75): the compose textarea and its placeholder.
- **Label** (600, 0.875rem, line height 1.75): panel headers and the primary button.
- **Meta** (400, 0.75rem, line height 1.75): plate meta line, terms and prices under a
  name, supporting notes, nav labels, the model provenance line, the demo disclaimer, and the
  count badge. This is the hard floor of the ramp: no type on the surface is smaller than
  0.75rem, and there are no arbitrary pixel sizes off the ramp anywhere in the tree.

### Named Rules

**The Coeng Clearance Rule.** Khmer line height is never below 1.75, or coeng subscripts
clip. This is achieved twice over: every `--text-*--line-height` is raised at the theme
source, and an unlayered `:is(:lang(km), .km)` rule beats the `leading-none` that shadcn
hardcodes into Card, Dialog and Label by cascade layer, with no `!important`. Verified in
the compiled stylesheet, where `.leading-none` sits inside `@layer utilities` and this rule
does not. Live render resolves to 31.5px on 18px. The document is `lang="km"`.

**The Quantity Rule.** Amounts and times are quantities, not prose. Every one of them
carries tabular numerals via `.tnum` and holds fixed digit positions, so a figure that grows
through the day never reflows the line it sits in. Transitioning digits are animated in place,
never by relayout: an animated quantity gives every digit its own fixed `0.62em` cell and lets
punctuation take its natural advance, which honours the rule without depending on a font
shipping tabular Khmer digits. Measured across a value change on the takings figure: 139px
before and 139px after.

**The One Numeral System Rule.** The surface does not mix numeral systems. Every quantity
renders in Khmer numerals, without exception: times, counts, quota, prices, the nav badge,
and the 2.5rem takings figure itself. One mechanism, in one module: every quantity is grouped
by Intl and then transliterated by `toKhmerDigits`, and `khmerNumber`, `moneyKm`, `moneyTotalKm`
and `moneyPartsKm` all live in `src/lib/format/khmer.ts`. Currency decimals come from the
currency table, so KHR stays at 0 places and USD at 2.

*Implementation note, three traps, all paid for.* The first is the `-u-nu-khmr` locale
extension: Chrome ignores it and silently resolves to `latn`, while Node's ICU honours it, so
the extension form passes a unit test and renders Latin digits in the browser.

The second is the fix for the first. Passing `numberingSystem: 'khmr'` as an Intl **option**
does give Khmer digits in both runtimes, and it makes Node and Chrome disagree about what
km-KH separators are. They do not merely differ, they are **swapped**:

| value | Node, ICU 78 | Chrome 151 |
|---|---|---|
| `15000` | `១៥.០០០` | `១៥,០០០` |
| `5.00` | `៥,០០` | `៥.០០` |

On a server rendered page that prints `$៥,០០` into the HTML and `$៥.០០` after hydration: a
decimal point that moves depending on which runtime drew it, on a surface whose promise is
that the owner sees exactly what was charged. It is also a guaranteed React hydration
mismatch on every money string, and it was one, live, until 19 August.

So the shipped form takes grouping from `en-US`, whose separators are identical in every ICU
build, and transliterates the digits afterwards. Khmer numerals with the comma this surface
uses, deterministic on both runtimes. **Never format a user facing quantity through a
`km-KH` locale.**

The third trap is that a verification asserting the *absence* of Latin digits passes when the
digits are absent entirely. Assert the positive: glyphs present, correct script, correct
separator, and box width stable across a value change.

*Implementation note, two traps, both paid for.* First, no third-party transitioning-digit
component can carry this rule: their digit tracks are built from ASCII 0 to 9, so a Khmer
numbering system renders the group separator and drops every digit. Animated quantities go
through the project's own `Figure`, which takes an already-formatted string and is therefore
numeral-system agnostic, with the locale rules staying in one place. Second, a verification
that asserts the *absence* of Latin digits passes when the digits are absent entirely. Assert
the positive: glyphs present, correct script, and box width stable across a value change.

**The One Family Rule.** One typeface across the product. No second display face, no mono,
no system UI face standing in for a display face.

## Layout

A single centred column of note paper, max 72rem, with 1rem of gutter on mobile and 2rem
from the large breakpoint. Bottom padding is 6rem on mobile to clear the pinned nav and
returns to 2rem once the nav is gone.

The plate sits above the column split, centred, with 1.25rem of air above and below.
Everything under it lives in one responsive container whose behaviour is structural rather
than fluid: on mobile it is a flex column ordered by the story, explicitly, with the compose
box first, then takings, then the ledger, then what needs her. From the large breakpoint the
same markup becomes a two-track grid of `minmax(0,1fr)` plus a 20rem rail, with explicit
column and row placement instead of source order. The rail's two lower panels share one
grid cell so they stack flush against each other rather than distributing.

Spacing rhythm is a 4px base used sparsely: 1.5rem between regions, 1rem of horizontal
panel padding, 0.75rem of vertical padding in a header or a note, 0.875rem in a ledger row
so the seal has room to breathe, 1.25rem of horizontal padding inside the committed ink
region. The document is `overflow-x: clip` with `max-width: 100vw` so no descendant can
widen the page and pull the centred column off axis. Clip rather than hidden, so no scroll
container is created.

### Named Rules

**The Rule Is the Separator Rule.** Regions are divided by a stroke, at exactly three
values: the ornament frame course at 40 percent rule, the field container at 70 percent
rule, and the hairline for interior divisions. No gaps-plus-fills, no card gutters standing
in for structure.

**The Pinned Nav Rule.** The bottom nav is pinned to the viewport, not to the document end,
and it reserves `env(safe-area-inset-bottom)`. It exists on mobile only; from the large
breakpoint navigation is the layout itself.

## Elevation & Depth

There are no shadows anywhere in this system, and there is no blur, no gradient, and no
translucency except as flat alpha on a stroke. Depth is entirely tonal and typographic: the
one dark ink region reads as pressed into the sheet because it is the only value change on
the page, and hierarchy elsewhere is carried by type size, weight, and the three stroke
values. Nothing lifts on hover. Interaction is expressed as opacity and colour change on
text and strokes, at 70 percent on a seal hover and a 4 percent ink wash on a list row.

### Named Rules

**The No Shadow Rule.** Print has no drop shadows. Neither does this. If a surface needs to
read as separate, give it a rule or give it the ink. Do not lift it.

## Shapes

Square by default. Every panel, frame, header, table cell, button, and input has a 0px
radius, because the world is a printed sheet and paper does not round its corners. Three
exceptions, each earned: a 0.25rem radius on the seal's invisible hit target, a full pill on
the numeric count badge, and a 1px radius on the focus ring so the outline does not read as
a box drawn around the box.

The recurring silhouette is the ruled frame with kbach corner brackets, drawn as ruled right
angles rather than floral ornament: an outer 2-weight stroke and an inner 0.9-weight stroke
in plate ink, 16px, one at each corner, rotated in 90 degree steps and pulled 1px outside the
frame so they sit on the line rather than beside it.

The seal is the other signature geometry. All three states share one centre and a 14.5 outer
radius so the seal column never goes ragged: paid is a 1.25 outer ring plus a 0.75 inner ring
plus a square-capped, miter-joined mark; waiting is the same outer ring with a broken course
and no inner ring; void is the plain double ring, with the row's terms struck through and the
customer's name spared.

### Named Rules

**The Two Ornaments Rule.** At most two ornament instances per screen. On the owner surface
they are the plate and the ledger. Nothing else gets brackets. Ornament under a strict count
is what keeps it ornament instead of decoration.

**The Two Weights Rule.** Ornament is always two stroke weights, and the heavy one is in
plate ink rather than rule grey. One weight reads as a border; two read as ornament.

**The Square Corner Rule.** Radius is 0 unless the element is a hit target, a numeric pill,
or a focus ring.

## Components

### Buttons
- **Shape:** hard square (0px radius). No border on the primary, a rule on nothing.
- **Primary:** plate ink ground with a metallic green label, 0.5rem by 1rem, label weight.
  This is the only place green sits on ink at text size, and 4.74:1 is why it can.
- **Hover / Focus:** opacity to 90 percent on hover, colour-preserving. Focus is the global
  2px seal ring at 2px offset. Disabled drops to 40 percent with `not-allowed`.
- **Icon buttons:** rule grey stroke going to plate ink on hover, no fill, no ring, no
  container. The seal press button is bare: it is a hit target around the seal, nothing
  visible of its own.

### Cards / Containers
There are no cards. There are two container kinds, and the difference is meaningful.
- **Ornament frame:** 1px border at 40 percent rule with four kbach brackets. Reserved for
  the plate and the ledger.
- **Field container:** 1px border at 70 percent rule, no brackets. The compose box, the
  services table, the two rail panels, the error note.
- **Background:** always `paper`. **Shadow:** none, ever. **Internal padding:** 1rem
  horizontal, 0.75rem vertical in headers and notes.
- **Header pattern:** a panel header is a flex row with a 15px lucide icon at strokeWidth
  1.75 in rule grey, a label-grade Khmer heading in plate ink, an optional right-aligned
  tabular count in meta grey, closed by a hairline underneath.

### Inputs / Fields
- **Style:** 1px 70 percent rule border on paper, square, no inner shadow, no fill change.
  The textarea is transparent inside its container and its own outline is removed, so the
  container is the field.
- **Focus:** the container border becomes seal green via `focus-within`. Inline numeric
  edits get a seal border directly. Placeholder is rule grey at 7.24:1, not a washed grey.
- **Toolbar:** actions sit in a hairline-separated tray at the bottom right of the field, so
  the field reads as a form, not as a chat box.
- **Empty state:** the primary action is live rather than disabled. An empty compose box
  fills itself with a worked example instead of refusing, so the first viewport always has a
  working primary action.
- **Error:** a full-width note bordered in rule grey on paper, plate ink text, with a 16px
  triangle icon. No red. The palette has no error colour and the system does not invent one.

### Navigation
Three tabs, fixed to the bottom of the viewport on mobile, paper ground, closed at the top
by a 70 percent rule. Icons are 20px lucide at strokeWidth 1.5 above a meta-grade Khmer
label. Default is rule grey, hover and active are plate ink, and the active tab additionally
carries a 2px seal bar inset 1.5rem across its top edge, so the active state survives
greyscale on the weight change alone. Counts ride as a metallic pill in Khmer numerals at
the icon's top right, at the meta floor (0.75rem) in a 1.125rem circle rather than at a
smaller off-ramp size.

### The Seal (signature component)
The state system, and the reason a row reads as an invitation rather than a table cell. A
34px SVG, three states, each a different shape and not merely a different colour. Paid draws
in seal green; waiting and void draw in rule grey. Void additionally strikes the row's terms
with a 70 percent rule decoration and leaves the person's name untouched.

**The Shape Before Colour Rule.** A state is a shape. Colour may reinforce it and may never
be the only carrier. Any new state must be legible with the stylesheet's colours removed.

**The One Authored Moment Rule.** Pressing a seal is the only motion on the surface: a
0.86 to 1.04 to 1 scale settle, 180ms, `cubic-bezier(0.16, 1, 0.3, 1)`, from an
already-visible default, and it reports a real state change rather than decorating a click.
Under `prefers-reduced-motion` the state change still happens and only the animation is
suppressed. Everything else that changes, changes with a colour or opacity transition.

### The Figure (signature component)
The animated quantity, and the mechanism behind The Quantity Rule. It takes an
already-formatted string rather than a number, so it is numeral-system agnostic and the
locale rules stay in one place. Each glyph sits in its own cell: a digit gets a fixed
`0.62em` cell, punctuation keeps its natural advance. Glyphs enter and exit per cell at
180ms on `cubic-bezier(0.16, 1, 0.3, 1)` from an already-visible default, so a changed
quantity settles rather than counting up. Under `prefers-reduced-motion` the glyph renders
statically and the value still changes. Accessibility is one `role="img"` carrying the whole
formatted string as its label, with every cell hidden, so assistive tech reads one quantity
instead of a row of loose characters.

**The Shared Baseline Rule.** An animated glyph cell never carries `overflow: hidden`. On an
inline-block that moves the baseline to the bottom margin edge, which drops an adjacent
currency mark below the digits it belongs to. Clip nothing: fade the outgoing glyph to zero
opacity instead, and the baseline stays shared.

### The Committed Region (signature component)
One dark ink panel per screen. A dim letterspaced Khmer label (0.2em) above a 2.5rem
metallic figure that transitions its digits in place at fixed positions, a Khmer-numeral
restatement below it in the dim value, and a supporting count separated by a 25 percent
alpha divider. Square, no border, no radius, flush to its grid cell.

### The Ledger Row (signature component)
A three-track grid: a fixed 3rem tabular time bracket in rule grey on the left, the
customer's name largest in plate ink with the terms beneath it, and the seal on the right.
Rows are divided by hairlines with the first divider suppressed. A void row drops to 55
percent opacity as a whole in addition to its strike.

### Browser surfaces
The parts nobody draws still carry the design: selection is paper on seal, caret and
`accent-color` are seal, the focus ring is a 2px seal outline at 2px offset with a 1px
radius, and the scrollbar is a square hairline thumb inset by a 3px paper border on a paper track,
with a rule-grey hover, plus `scrollbar-color` for Firefox. The thumb carries no radius: it
is not one of the three earned exceptions. Left at their defaults these belong to no design system.

## Do's and Don'ts

### Do:
- **Do** put every new region on `paper` and separate it with one of the three stroke
  values: 40 percent rule for ornament frames, 70 percent rule for fields, hairline for
  interior divisions.
- **Do** give every quantity `.tnum` and Khmer numerals, and animate digits in place at
  fixed positions rather than letting a figure reflow its line.
- **Do** render every amount through `formatMoney` from integer minor units plus a per-row
  currency code. KHR has 0 decimals, USD has 2.
- **Do** make a new state a shape, and only then let colour reinforce it.
- **Do** hold Khmer text at line height 1.75 or above, and keep the override unlayered so
  it beats `@layer utilities` without `!important`.
- **Do** keep the ornament count at two per screen, always in two stroke weights, with the
  heavy weight in plate ink.
- **Do** draw glyphs as lucide icons at strokeWidth 1.5 to 2, or as authored SVG in the same
  stroke weight.
- **Do** take every type size from the seven recorded roles. 0.75rem is the floor and there
  are no arbitrary pixel sizes.
- **Do** theme the browser's own surfaces from the palette on any new page.
- **Do** label demo content as demo content in the UI. Everything on this surface is
  fictional data for an invented shop.

### Don't:
- **Don't** add a shadow, a blur, a gradient, or a radius to a panel. Print has none of
  these.
- **Don't** introduce `bg-white` or any second ground value. One ground, one committed ink
  region.
- **Don't** set seal green as small text on paper at 3.6:1. Use it as a fill, a mark, or ink
  on the dark panel, and use the text-grade variant if green text is genuinely required.
- **Don't** let colour be the only carrier of a state, a status, or a category.
- **Don't** add a second typeface, and don't substitute a system display face for the brand
  face. Don't convert Futura 100 Khmer to a web font under any circumstances.
- **Don't** mix Khmer and Latin numerals inside one figure or one column, and don't format a
  user facing quantity through a `km-KH` locale at all. The `-u-nu-khmr` extension resolves to
  `latn` in Chrome, and the `numberingSystem` option makes Node and Chrome swap the group and
  decimal separators. Group through `en-US`, then transliterate.
- **Don't** rebuild this as a card grid or a stat row. The ledger and the one committed
  region are the answer to both.
- **Don't** add a second animation. The seal press is the authored moment and it stays the
  only one.
- **Don't** use emoji as an icon, and don't ship an all-caps kicker or eyebrow above a
  heading. The plate is the only thing that announces.
- **Don't** write an em dash into any user-facing string, any comment, or any document in
  this project.
- **Don't** write copy or visuals that imply real traction, real customers, or real revenue.

## Known Gaps

These are recorded as unfinished work, not as system rules, and a future surface should
close them rather than inherit them.

- Empty and first-run states carry no ceremony. The compose box, the ledger, and the rail
  panels all have real filled states and no designed zero state.
- There is no paper event between the plate and the first field. The transition from the
  ornament frame to the compose box is currently a plain 1.25rem gap.

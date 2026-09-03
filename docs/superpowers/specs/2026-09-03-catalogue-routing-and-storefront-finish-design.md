# A cafe's menu is products, and its page looks finished

Phase 12.5. Written 3 September 2026.

## The problem, seen on a real page

`localhost:3000/s/sansethireach` renders a coffee shop as two lines of text and
a lot of white space. No photographs, no pattern tiles, no way to pay, an empty
bordered gap, and a headline that is just the slug. Every one of those has a
separate cause and they are worth separating, because only the first is
structural.

**The catalogue is filed in the wrong table.** `src/lib/setup/persist.ts` writes
every parsed row to `services` and never to `products`: the file contains zero
occurrences of the word. So a cafe's cappuccino is stored as a service. A
service cannot hold a photo, `v_catalog` reports its `photo_path` as null by
construction, and `shouldDrawTile` therefore correctly refuses to draw anything.
The tile feature shipped in Phase 12 is not broken. It is unreachable.

It reaches further than pictures. `createOrder` operates on the `products` table
only, so a shop whose menu is filed as services can never take an order either,
which makes this a blocker for Phase 13 and not a cosmetic complaint.

Phase 11 named this bug class and fixed three READ paths: the storefront, the
customer agent and the `/app` redirect. The WRITE path was missed.

**The page throws away content the model wrote.** Of the four themes, `counter`
is the only one that never renders `content.highlights`. The model generates two
to four factual highlights, `sanityCheck` validates them, and the theme drops
them. A cafe is exactly the business that gets `counter`.

**An absent section still draws its furniture.** `counter` wraps hours, about and
the call to action in one `border-t pt-6` container. A shop with no recorded
hours gets `Hours` returning null inside a box that still draws its rule and
padding, which reads as a broken empty band.

## The routing rule

One pure function, in `src/lib/types.ts` because that file is the source of
truth for taxonomies:

```ts
export function catalogKindFor(businessTypeId: string, unit: BookingUnit): CatalogKind
```

Three cases, in order:

1. `sellsFor(businessTypeId) === 'time'` returns `'service'`, whatever the unit.
   A salon that somehow parsed a walk-in row is still selling time.
2. `unit === 'walk_in'` returns `'product'`. A walk-in row occupies nobody's
   time and nothing can be double booked against it, which is the actual
   difference between the two tables.
3. Everything else returns `'service'`.

This needs no new column and no migration, which is the point. `sells` already
lives on the business type in TypeScript and `unit` already rides on every
parsed row. The rule is derived from data the system already has and got wrong
only because nobody asked it the question.

Worked cases: a cafe is `sells: 'both'` with a default unit of `walk_in`, so its
menu becomes products. A restaurant is `sells: 'both'` with a default unit of
`session`, so a table booking stays a service while a dish parsed as `walk_in`
becomes a product. A salon is `sells: 'time'`, so nothing changes for it at all.

## Writing to two tables

`persist.ts` currently reconciles one table: insert, update, deactivate,
retaining ids. It gains the same reconciliation against `products`, with the
routing rule deciding which set a parsed row joins.

Its return shape widens from `services: {...}` to carry both counts, because the
setup spine reports what it did and reporting "12 services" for a cafe that got
12 products would be a lie in the one place the owner is watching.

Two rules that must survive the change:

- **A row that moves kind is a delete and an insert, never an orphan.** If an
  owner re-parses and a row's unit changes, the old row leaves its table.
- **`raw_description` is never overwritten**, per hard rule 8. Re-parsing rewrites
  the catalogue, not the source.

## The backfill

New shops route correctly the moment `persist.ts` ships. Existing shops stay
broken, which includes the only published shop there is, so a backfill is part
of the work rather than a follow-up.

`db/backfill-catalogue.mjs`, run deliberately and never on boot. It reads
`catalogKindFor` from `src/lib/types.ts` so the taxonomy has one definition and
the script cannot drift from the runtime.

For every active `services` row it recomputes the kind. A row that should be a
product is copied into `products` and the service row is deleted, inside one
transaction per business.

**It refuses to move a row that any booking references.** A booking's
`service_id` is a real foreign key and a real commitment to a real customer;
moving that row would either break the constraint or orphan the booking. Such
rows are left alone and REPORTED, with the business, the row and the booking
count, because a silent skip is how a half-migrated catalogue happens. The
script prints what it moved, what it skipped and why, and exits non-zero if
anything was skipped, so the operator has to look.

Fields map explicitly: `name`, `name_en`, `description`, `price_minor`,
`currency`, `active` and `sort_order` carry across. `duration_min`, `buffer_min`,
`capacity`, `requires_deposit` and `deposit_minor` are dropped, and dropping them
is correct: a cappuccino has no duration and nothing books against it. `stock`
starts null, meaning unlimited, because the shop never told us a count.
`category`, `photo_path` and `photo_alt` start null.

## The storefront fixes

- **`counter` renders `highlights`.** Same treatment the other three themes give
  them, a short factual list, placed where a menu reader will actually see it.
- **An empty section draws nothing.** `Hours` already returns null when there are
  no hours; the container around it must collapse too rather than drawing a rule
  around a void. The same applies to an empty highlights list.
- **The footer contact line moves off the tertiary ink.** `src/app/s/[slug]/page.tsx`
  renders the shop's address and phone at 1.91:1, measured. These are the two
  facts a customer needs to physically reach the shop. It becomes `text-label-2`,
  already asserted at 5.60:1.
- **A headline that is only the shop name is retried once.** `sanityCheck`
  already detects it and the owner published past it anyway, because a warning
  beside a publish button is a warning that loses. When that rule and only that
  rule fires, `generateStorefront` regenerates once with the failure named in the
  prompt. If the second attempt is no better the draft is kept and the warning
  stands: a weak headline beats no page, and a retry loop on a real owner's
  screen is worse than either. One retry, bounded, never a loop.

## What is deliberately not here

- **The empty state on a shop with no channel and no phone.** `sansethireach` has
  neither, so its call to action degrades to a sentence. That is correct
  behaviour and the fix is connecting Telegram, not changing the theme.
- **Payment.** Phase 13.
- **The calendar.** Its own phase, decided separately.

## Acceptance

- `npm run db:test` proves `catalogKindFor` across every business type crossed
  with every booking unit, and proves the backfill's refusal to move a booked row.
- A cafe described through onboarding lands in `products`, and its menu rows draw
  tiles on its public page.
- A salon described through onboarding lands in `services`, unchanged, and its
  rows draw no tiles.
- The backfill moves `sansethireach`'s two rows and its page renders tiles.
- `npm run shoot` captures the storefront in both colour schemes with no empty
  bordered band and the highlights visible.

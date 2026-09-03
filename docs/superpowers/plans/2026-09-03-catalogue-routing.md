# Catalogue Routing and Storefront Finish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A cafe described through onboarding lands in `products` so its menu can carry photographs and be ordered, existing shops are backfilled safely, and the public page stops discarding content it was given.

**Architecture:** One pure routing function in `src/lib/types.ts` decides `product` or `service` from the business type's `sells` and the row's `unit`. `persist.ts` reconciles both tables instead of one. A deliberate script backfills existing rows and refuses to move any row a booking references. Four storefront defects are fixed in the theme registry and the public page.

**Tech Stack:** TypeScript, Next.js 16.3.1, Tailwind v4, Supabase Postgres, PGlite for the harness.

**Spec:** `docs/superpowers/specs/2026-09-03-catalogue-routing-and-storefront-finish-design.md`

## Global Constraints

- **No em dashes.** Not in code, comments, copy, or commit messages. Colon, comma or full stop.
- **`src/lib/types.ts` is the source of truth.** It changes first. No new column and no migration is needed in this phase.
- **Money is integer minor units with a currency per row, rendered through `formatMoney()`.**
- **`raw_description` is never overwritten.**
- **Icons only, never emoji.**
- **Khmer needs `line-height: 1.75` minimum.**
- **Pure modules must not import `server-only`,** or `db/test.mjs` cannot import them.
- **No business logic in components.**
- **Do not restructure the four theme components** in `src/themes/registry.tsx` beyond the changes each task names.
- Imports inside `src/lib` use relative paths with the `.ts` extension; from `src/app` and `src/components` use `@/` with the extension.
- Baseline: `npm run db:test` is 386 passing, 0 failing.

---

### Task 1: The routing rule

**Files:**
- Modify: `src/lib/types.ts` (beside `sellsFor`, around line 146)
- Test: `db/test.mjs`

**Interfaces:**
- Consumes: `sellsFor`, `BUSINESS_TYPES`, `BOOKING_UNITS`, `CatalogKind`.
- Produces: `catalogKindFor(businessTypeId: string, unit: BookingUnit): CatalogKind`.

- [ ] **Step 1: Write the failing test**

Append to `db/test.mjs` before the result banner:

```js
console.log('\nwhat a shop sells decides which table a row lives in')
// The bug this closes: setup/persist.ts wrote EVERY parsed row to services, so
// a cafe's cappuccino was filed as a service, could never hold a photo, and
// could never be ordered. The rule needs no column: `sells` already lives on
// the business type and `unit` already rides on every parsed row.
eq('a cafe walk-in row is a product', catalogKindFor('cafe', 'walk_in'), 'product')
eq('a cafe session row is still a service', catalogKindFor('cafe', 'session'), 'service')
// A time-selling business is never talked into products by a stray unit. A
// salon that somehow parsed a walk-in row is still selling time.
eq('a salon walk-in row stays a service', catalogKindFor('salon', 'walk_in'), 'service')
eq('a salon session row is a service', catalogKindFor('salon', 'session'), 'service')
// A restaurant sells both: the table booking is time, the dish is a thing.
eq('a restaurant table booking is a service', catalogKindFor('restaurant', 'session'), 'service')
eq('a restaurant dish is a product', catalogKindFor('restaurant', 'walk_in'), 'product')
// An unknown business type falls back to `both`, so the unit decides.
eq('an unknown type still routes by unit', catalogKindFor('not_a_real_type', 'walk_in'), 'product')
// Every type crossed with every unit must return a real kind, never undefined.
let unrouted = 0
for (const type of BUSINESS_TYPES) {
  for (const unit of BOOKING_UNITS) {
    const kind = catalogKindFor(type.id, unit)
    if (kind !== 'product' && kind !== 'service') unrouted++
  }
}
eq(`every one of ${BUSINESS_TYPES.length * BOOKING_UNITS.length} type and unit pairs routes`, unrouted, 0)
// A time-selling type can never produce a product, on any unit at all.
const timeTypes = BUSINESS_TYPES.filter((t) => t.sells === 'time')
let timeLeak = 0
for (const type of timeTypes) {
  for (const unit of BOOKING_UNITS) {
    if (catalogKindFor(type.id, unit) === 'product') timeLeak++
  }
}
eq(`none of the ${timeTypes.length} time-selling types leaks a product`, timeLeak, 0)
```

Add `catalogKindFor` and `BOOKING_UNITS` to the existing `'../src/lib/types.ts'` import in `db/test.mjs`. `BUSINESS_TYPES` and `sellsFor` are already imported.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run db:test`
Expected: FAIL, `catalogKindFor` is not exported.

- [ ] **Step 3: Write the implementation**

Insert into `src/lib/types.ts` immediately after `sellsFor`:

```ts
/**
 * Which table a parsed catalogue row belongs in.
 *
 * This is the rule `src/lib/setup/persist.ts` was missing, and the reason a
 * cafe's menu was filed as a list of services: a service cannot hold a photo,
 * `v_catalog` reports its photo_path as null by construction, and `createOrder`
 * only ever looks at `products`, so a cafe could neither show a picture nor take
 * an order.
 *
 * No column and no migration: `sells` already lives on the business type and
 * `unit` already rides on every parsed row. The difference between the two
 * tables is whether the thing occupies somebody's time, and `walk_in` is
 * precisely the unit that says it does not.
 */
export function catalogKindFor(businessTypeId: string, unit: BookingUnit): CatalogKind {
  // A business that sells time sells time, whatever a stray unit says. Reading
  // it the other way round would let one odd parse turn a salon into a shop.
  if (sellsFor(businessTypeId) === 'time') return 'service'
  return unit === 'walk_in' ? 'product' : 'service'
}
```

If `CatalogKind` is declared below this point in the file, move the function below its declaration rather than moving the type: the type is referenced widely.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run db:test`
Expected: PASS, 386 plus 9.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`

```bash
git add src/lib/types.ts db/test.mjs
git commit -m "A walk-in row occupies nobody's time, so it is a product"
```

---

### Task 2: Setup writes to both tables

**Files:**
- Modify: `src/lib/setup/persist.ts`
- Modify: `src/lib/setup/schema.ts` only if its return type needs widening
- Test: `db/test.mjs`

**Interfaces:**
- Consumes: `catalogKindFor` from Task 1.
- Produces: `persistSetup` returning counts for both `services` and `products`.

- [ ] **Step 1: Read the existing file completely**

`src/lib/setup/persist.ts` reconciles ONE table across roughly 200 lines: it loads existing rows, matches by normalised name, updates matches, inserts the rest, retains ids, deactivates what vanished, and writes an audit event. Understand that whole shape before changing it. You are adding a second reconciliation of the same form, not rewriting the first.

- [ ] **Step 2: Write the failing test**

Append to `db/test.mjs` before the result banner. Use the existing `B_CAFE` and `B_SALON` constants and the `one()` helper:

```js
console.log('\na cafe\'s menu is filed where a menu belongs')
// Before this, persist.ts wrote every row to services and the word "product"
// did not appear in the file. That is why a real cafe's published page showed
// no photographs: not a rendering bug, an unreachable feature.
const cafeProducts = await one(db, `select count(*) c from products where business_id = '${B_CAFE}' and active`)
const cafeWalkInServices = await one(db, `select count(*) c from services where business_id = '${B_CAFE}' and active and unit = 'walk_in'`)
eq('a cafe has product rows', Number(cafeProducts.c) > 0, true)
eq('and no walk-in row was left behind in services', Number(cafeWalkInServices.c), 0)
// A salon is untouched by all of this. If it moved, the rule leaked.
const salonProducts = await one(db, `select count(*) c from products where business_id = '${B_SALON}'`)
eq('a salon has no products at all', Number(salonProducts.c), 0)
```

If the seed does not yet give `B_CAFE` a walk-in catalogue, add one to `db/seed.sql` as part of this task: a cafe fixture whose menu is services is exactly the state this phase exists to end, and the harness needs the corrected shape to assert against.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run db:test`
Expected: FAIL on `a cafe has product rows`.

- [ ] **Step 4: Implement the two-table reconciliation**

In `persist.ts`, split the incoming parsed rows by `catalogKindFor(business.business_type, row.unit)` before any database work. Then run the existing reconciliation for services against the service-bound rows, and a matching reconciliation against `products` for the product-bound rows.

The product reconciliation maps fields explicitly:
- carried: `name`, `name_en`, `description`, `price_minor`, `currency`, `active`, `sort_order`
- dropped: `duration_min`, `buffer_min`, `capacity`, `requires_deposit`, `deposit_minor`. Write a comment saying why: a cappuccino has no duration and nothing books against it.
- left null: `stock` (null means unlimited, and the owner never gave a count), `category`, `photo_path`, `photo_alt`

Widen the return type so both counts are reported. The setup spine shows the owner what it did, and telling a cafe owner it saved "12 services" would be a lie in the one place she is watching.

A row whose kind CHANGES between two parses must leave its old table. Handle it in the existing deactivate pass: a service that is no longer service-bound is deactivated exactly as a vanished one is.

- [ ] **Step 5: Run the tests and typecheck**

Run: `npm run db:test` then `npx tsc --noEmit`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/setup/persist.ts db/seed.sql db/test.mjs
git commit -m "Setup files a menu as products and a booking as a service"
```

---

### Task 3: Backfill the shops that already exist

**Files:**
- Create: `db/backfill-catalogue.mjs`
- Modify: `package.json` (a `db:backfill` script)
- Test: `db/test.mjs`

**Interfaces:**
- Consumes: `catalogKindFor` from Task 1.
- Produces: a deliberate, re-runnable script. It is never invoked on boot.

- [ ] **Step 1: Write the failing test**

The move logic must be pure so the harness can prove the refusal. Append to `db/test.mjs`:

```js
console.log('\nno backfill may move a row a customer is holding')
// A booking's service_id is a real commitment to a real person. Moving that row
// either breaks the foreign key or orphans the booking, so a booked row is
// refused and REPORTED. A silent skip is how a half migrated catalogue happens.
eq('an unbooked walk-in row on a cafe is movable',
  movePlan({ businessType: 'cafe', unit: 'walk_in', bookingCount: 0 }).move, true)
eq('the same row with one booking is refused',
  movePlan({ businessType: 'cafe', unit: 'walk_in', bookingCount: 1 }).move, false)
eq('and the refusal names its reason',
  movePlan({ businessType: 'cafe', unit: 'walk_in', bookingCount: 1 }).reason, 'booked')
eq('a salon row is never moved, booked or not',
  movePlan({ businessType: 'salon', unit: 'walk_in', bookingCount: 0 }).move, false)
eq('and that refusal names a different reason',
  movePlan({ businessType: 'salon', unit: 'walk_in', bookingCount: 0 }).reason, 'already correct')
```

Import `movePlan` from `'../src/lib/catalogue/backfill.ts'`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run db:test`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the pure rule**

Create `src/lib/catalogue/backfill.ts`. No `server-only`, sole import from `'../types.ts'`:

```ts
import { catalogKindFor, type BookingUnit } from '../types.ts'

/**
 * Whether one existing `services` row should move to `products`, and if not, why.
 *
 * Pure and separate from the script that runs it, so `db/test.mjs` can prove the
 * refusal that matters: a row any booking references is a commitment to a real
 * customer, and moving it either breaks a foreign key or orphans the booking.
 */
export type MovePlan = { move: boolean; reason: 'movable' | 'booked' | 'already correct' }

export function movePlan(row: {
  businessType: string
  unit: BookingUnit
  bookingCount: number
}): MovePlan {
  if (catalogKindFor(row.businessType, row.unit) !== 'product') {
    return { move: false, reason: 'already correct' }
  }
  if (row.bookingCount > 0) return { move: false, reason: 'booked' }
  return { move: true, reason: 'movable' }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run db:test`
Expected: PASS.

- [ ] **Step 5: Write the script**

Create `db/backfill-catalogue.mjs`. It imports `movePlan` so the taxonomy has one definition and the script cannot drift from the runtime. For every business it loads active services with their booking counts, asks `movePlan`, and inside one transaction per business copies movable rows into `products` and deletes the service rows.

It must:
- print every move and every skip, with the business slug, the row name and the booking count;
- exit NON-ZERO if anything was skipped, so an operator has to look at a half-migrated catalogue rather than scrolling past it;
- support `--dry-run` and default to it, so a first run cannot change anything by accident;
- be safe to run twice: a second run finds nothing movable.

Add to `package.json`: `"db:backfill": "node db/backfill-catalogue.mjs"`.

- [ ] **Step 6: Dry run, then real run**

Run the dry run first and paste its real output into the report. Then run it for real against the live database and paste that output too, including the moved and skipped counts for `sansethireach`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/catalogue/backfill.ts db/backfill-catalogue.mjs package.json db/test.mjs
git commit -m "Move a filed-wrong menu, and refuse to move a booked row"
```

---

### Task 4: The page stops discarding what it was given

**Files:**
- Modify: `src/themes/registry.tsx` (`CounterStorefront`, and the empty-section handling in all four)
- Modify: `src/app/s/[slug]/page.tsx` (footer contrast)
- Modify: `src/lib/ai/storefront.ts` (one headline retry)
- Test: `db/test.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Render highlights in `counter`**

`CounterStorefront` is the only one of the four themes that never renders `data.content.highlights`. The model generates two to four factual highlights and `sanityCheck` validates them; the theme drops them. A cafe is exactly the business that gets `counter`, which is why its page reads as thin.

Add them as a short factual list, in the theme's existing idiom. Match how `StayStorefront` renders the same field. Do not restructure anything else in the component.

- [ ] **Step 2: An absent section draws nothing**

`CounterStorefront` wraps hours, about and the action in one `border-t pt-6` container. `Hours` returns null when a shop has no recorded hours, leaving a rule drawn around a void, which is the empty band visible on `/s/sansethireach` today.

Make the container's border conditional on there being something inside it. Apply the same reasoning to an empty `highlights` array in every theme that renders one: an empty list must render nothing, not an empty bordered box.

- [ ] **Step 3: Fix the footer contrast**

`src/app/s/[slug]/page.tsx` renders the shop's address and phone on the tertiary ink, measured at 1.91:1 against the seeded surface. These are the two facts a customer needs to physically reach the shop. Change that line to `text-label-2`, which the harness already asserts at 5.60:1. Leave the "Made with Moni" line where it is: it is genuinely secondary.

- [ ] **Step 4: Retry a headline that is only the shop name**

`sanityCheck` already detects this and returns a warning, and the owner published past it, because a warning beside a publish button is a warning that loses.

In `generateStorefront`, when that rule and ONLY that rule fires, regenerate once with the failure named in the prompt. If the second attempt is no better, keep the draft and let the warning stand. One retry, bounded, never a loop: a weak headline beats no page, and a retry loop on a real owner's screen is worse than either. Add a comment saying exactly that.

- [ ] **Step 5: Verify**

Run: `npm run db:test`, `npx tsc --noEmit`, `npm run build`.

Then render. `next start` FAILS SILENTLY ON A BUSY PORT: it logs `errno: -48` and exits while the old server serves a stale build whose CSS chunk 404s. Always `lsof -ti:3000 | xargs kill -9 2>/dev/null; npm start &` first and confirm the page and its CSS chunk both return 200.

Run `npm run shoot`, which now captures `/s/[slug]` in both colour schemes and exits non-zero if the slug does not resolve. Confirm: tiles visible on the cafe's rows, highlights visible, no empty bordered band, and the footer contact line legible.

- [ ] **Step 6: Commit**

```bash
git add src/themes/registry.tsx src/app/s/\[slug\]/page.tsx src/lib/ai/storefront.ts db/test.mjs
git commit -m "Show the highlights, drop the empty band, and make the address readable"
```

---

### Task 5: Close the phase

**Files:**
- Modify: `PLAN.md`, `CLAUDE.md`

- [ ] **Step 1: Full verification**

Run and paste REAL output, never a description:

```bash
npm run db:test
npm run test:signals
npx tsc --noEmit
npm run build
lsof -ti:3000 | xargs kill -9 2>/dev/null; npm start &
npm run shoot
```

- [ ] **Step 2: PLAN.md**

Add `### Phase 12.5: A cafe's menu is products` after Phase 12, in the same voice: what the bug was, that Phase 11 fixed three read paths and missed the write path, the routing rule and why it needed no column, what the backfill refuses to do, and the four storefront fixes. State the new `npm run db:test` total.

Then REMOVE the Phase 13 blocker note that Phase 12 added, because this phase cleared it. A document and the code may not disagree, and a stale blocker is the kind of disagreement that wastes a whole session.

- [ ] **Step 3: CLAUDE.md**

Add to "Things already decided, do not relitigate":

```
- **A walk-in row is a product, a timed row is a service** (decided 3 September 2026).
  `catalogKindFor(businessType, unit)` in types.ts is the one rule, and it needed no
  column because `sells` already lives on the business type and `unit` already rides
  on every parsed row. Phase 11 fixed three READ paths for the cafe bug and missed the
  WRITE path in `setup/persist.ts`, which is why a real cafe's published page showed no
  photographs for a month: the tile feature was not broken, it was unreachable.
```

- [ ] **Step 4: Commit**

```bash
git add PLAN.md CLAUDE.md
git commit -m "Phase 12.5: a menu is products, and the docs agree"
```

---

## Notes for the executor

- **The backfill touches real customer data.** Dry run first, read the output, and never move a booked row. If the script's refusal list is not empty, that is information for the operator, not an error to suppress.
- **Do not restructure the four theme components.** Their markup is what makes a bad generation read badly instead of breaking a shop.
- **`next start` fails silently on a busy port.** Kill 3000 first and check the CSS chunk returns 200 before trusting a screenshot.
- **An assertion must measure the thing, not the record.** Four times in the previous phase an assertion restated the implementation instead of checking it, and one of those shipped a bug that made every shop site unreadable in dark mode. If a new assertion cannot fail when the behaviour breaks, it is not an assertion.

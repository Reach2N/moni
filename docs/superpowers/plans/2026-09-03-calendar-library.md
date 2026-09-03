# Calendar Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-built resource-lane calendar with schedule-x's MIT core, keeping which-resource visible as colour rather than as columns, and clear two items parked from the previous phase.

**Architecture:** A pure `server-only`-free module maps a booking to a schedule-x event so the harness can prove timezone, money and null-resource handling. The page keeps its existing SSE hook and feeds arrivals through `@schedule-x/events-service` rather than re-rendering. Khmer reaches the library's own DOM through one unlayered scoped rule.

**Tech Stack:** TypeScript, Next.js 16.3.1, Tailwind v4, schedule-x 4.x (MIT), PGlite for the harness.

**Spec:** `docs/superpowers/specs/2026-09-03-calendar-library-design.md`

## Global Constraints

- **No em dashes.** Not in code, comments, copy, or commit messages.
- **Icons only, never emoji.**
- **Khmer needs `line-height: 1.75` minimum and NO letter spacing.** A cluster is drawn as one unit, so tracking pulls the coeng off its consonant.
- **Never format a user-facing quantity through a `km-KH` locale.** Node and Chrome disagree on its separators, which is a hydration mismatch. Group through `en-US` and transliterate with `toKhmerDigits`.
- **Money is integer minor units rendered through `formatMoney()`.** Never a float.
- **Time is `timestamptz`, UTC in the database, `Asia/Phnom_Penh` for display.** Use the existing `src/lib/time/cambodia.ts`, never the browser's zone.
- **Pure modules must not import `server-only`,** or `db/test.mjs` cannot import them.
- **No business logic in components.**
- Imports inside `src/lib` use relative paths with the `.ts` extension; from `src/app` and `src/components` use `@/` with the extension.
- **An assertion must be able to fail when the behaviour breaks.** This project has hit the opposite five times, once shipping a bug that made every shop site unreadable.
- Baseline: `npm run db:test` is 443 passing, 0 failing.

---

### Task 1: Clear the two parked items

**Files:**
- Modify: `PLAN.md` (the Phase 12.5 sentence about why tiles have not been seen)
- Modify: `src/lib/setup/plan.ts:146`
- Test: `db/test.mjs`

Neither belongs to the calendar. Both were parked in the previous phase with a ruling that they would be fixed at the start of the next one, and this is it.

- [ ] **Step 1: Write the failing test**

Append to `db/test.mjs` before the result banner:

```js
console.log('\nsetup will not retire a product, and must not resurrect one either')
// Phase 12.5 stopped a re-parse from deactivating a product, because a product
// carries uploaded photographs a description cannot rebuild. This is the mirror
// of that bug: `active: true` was hardcoded on the update, so re-saving a shop
// description silently un-archived an item the owner had deliberately archived.
// "Hers to do, visible and reversible" is worth nothing if the next save undoes it.
const archived = planCatalogue(
  'cafe',
  [{ name: 'cappuccino', name_en: null, description: null, price_minor: 4000, currency: 'KHR', unit: 'walk_in', duration_min: 5, sort_order: 0 }],
  [],
  [{ id: 'p-1', name: 'cappuccino', active: false }],
)
eq('an archived product still matches by name', archived.products.updates.length, 1)
eq('and the update does not carry active at all',
  Object.prototype.hasOwnProperty.call(archived.products.updates[0].values, 'active'), false)
```

Match the existing `planCatalogue` assertions' fixture shape exactly: read them first and copy their argument construction rather than inventing one.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run db:test`
Expected: FAIL on the `active` assertion.

- [ ] **Step 3: Omit `active` from the product update**

In `src/lib/setup/plan.ts`, the product UPDATE values must not carry `active`, exactly as they already omit `photo_path`, `stock` and `category`. The INSERT still sets `active: true`, because a newly parsed row is meant to be live.

Write the why in a comment: setup refuses to retire a product because a description cannot rebuild an uploaded photograph, and by the same reasoning it must not resurrect one the owner archived. An archive is the owner's decision about her own inventory and a description save is not a vote on it.

- [ ] **Step 4: Fix the PLAN.md sentence**

Find the Phase 12.5 sentence claiming the tiles have not been seen because `/app/site` and `/app/products` are behind Clerk. Tiles render on the PUBLIC `/s/[slug]`, which needs no sign-in. The real cause is the unrun backfill, which the preceding sentence already states correctly. Fix the causal link only; both facts are already present and correct on their own.

- [ ] **Step 5: Verify and commit**

Run: `npm run db:test`, `npx tsc --noEmit`

```bash
git add src/lib/setup/plan.ts PLAN.md db/test.mjs
git commit -m "An archive is the owner's decision, and a description save is not a vote on it"
```

---

### Task 2: The packages and the pure event mapping

**Files:**
- Modify: `package.json`
- Create: `src/lib/calendar/events.ts`
- Modify: `src/lib/queries/calendar.ts`
- Test: `db/test.mjs`

**Interfaces:**
- Produces: `toCalendarEvents(range: CalendarRange): CalendarEvent[]`, `calendarsFor(resources)`, and `getCalendarRange(businessId, from, to)`.

- [ ] **Step 1: Install**

```bash
npm install @schedule-x/react@4 @schedule-x/calendar@4 @schedule-x/theme-default@4 @schedule-x/events-service@4
```

All four are MIT, verified on npm 3 September 2026. Confirm the installed versions and licences and record them in your report. Do NOT install any resource-scheduler package: both names 404 and that is the whole reason lanes are being dropped.

- [ ] **Step 2: Write the failing test**

Append to `db/test.mjs` before the result banner:

```js
console.log('\na booking becomes an event without moving in time or losing its money')
const range = {
  date: '2026-09-03',
  start: '2026-09-03T01:00:00.000Z',
  end: '2026-09-03T13:00:00.000Z',
  resources: [
    { id: 'r-1', name: 'Chair 1', kind: 'chair' },
    { id: 'r-2', name: 'Chair 2', kind: 'chair' },
  ],
  bookings: [
    { id: 'b-1', code: 'AB12CD', status: 'confirmed', startsAt: '2026-09-03T02:00:00.000Z', endsAt: '2026-09-03T02:30:00.000Z', customer: 'Sokha', service: 'Haircut', resourceId: 'r-1', channel: 'telegram', priceMinor: 15000, paidMinor: 0, currency: 'KHR' },
    { id: 'b-2', code: 'EF34GH', status: 'confirmed', startsAt: '2026-09-03T03:00:00.000Z', endsAt: '2026-09-03T03:30:00.000Z', customer: 'Dara', service: 'Shave', resourceId: null, channel: 'walk_in', priceMinor: 5000, paidMinor: 5000, currency: 'KHR' },
  ],
}
const events = toCalendarEvents(range)
eq('every booking becomes an event', events.length, 2)
// The single most damaging thing a calendar can do is show the wrong hour. The
// database stores UTC; the shop reads Phnom Penh, which is UTC+7 with no DST.
// 02:00Z is 09:00 in the shop.
eq('a booking is rendered in Phnom Penh time, not UTC', events[0].start.includes('09:00'), true)
eq('and its end moves with it', events[0].end.includes('09:30'), true)
// A booking with no resource must still appear. Hiding it would lose a real
// customer from the owner's day.
eq('a booking with no resource still becomes an event', events[1].calendarId, 'unassigned')
eq('a booking with a resource takes that resource as its calendar', events[0].calendarId, 'r-1')
// Money goes through formatMoney, never a float and never a raw minor unit.
eq('the money reads as money', events[0].title.includes(formatMoney(15000, 'KHR')), true)
// Every resource gets its own calendar, plus the neutral one, so a colour means
// exactly one chair.
const calendars = calendarsFor(range.resources)
eq('each resource is its own calendar', Object.keys(calendars).length, 3)
eq('and the neutral one exists for unassigned bookings', 'unassigned' in calendars, true)
```

Import `toCalendarEvents` and `calendarsFor` from `'../src/lib/calendar/events.ts'`. `formatMoney` is already imported in `db/test.mjs`.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run db:test`
Expected: FAIL, module not found.

- [ ] **Step 4: Write the pure mapping**

Create `src/lib/calendar/events.ts`. No `server-only`, no React, no schedule-x import: it returns plain objects the component hands to the library.

Read `src/lib/time/cambodia.ts` first and use its existing helpers for the zone conversion. Do NOT reach for `toLocaleString('km-KH', ...)` or any `km-KH` locale: Node and Chrome disagree on its separators and that is a hydration mismatch on every string it touches.

schedule-x expects `start` and `end` as `YYYY-MM-DD HH:mm` in the calendar's own zone. Write a comment saying that the shop's zone is the calendar's zone, because a booking shown an hour out is worse than no calendar at all.

The event title carries the customer, the service and the money through `formatMoney()`. The event's `calendarId` is the `resourceId`, or `'unassigned'` when there is none.

`calendarsFor(resources)` returns a record keyed by resource id plus `unassigned`, each with the light and dark colour pair schedule-x's theme expects. Derive the colours deterministically from the resource id so a chair keeps its colour between reloads, and reuse `mulberry32` from `src/lib/storefront/style.ts` rather than writing a second generator.

- [ ] **Step 5: Widen the query**

In `src/lib/queries/calendar.ts`, rename `getCalendarDay(businessId, day)` to `getCalendarRange(businessId, from, to)` and rename `CalendarDay` to `CalendarRange`. Keep `LaneBooking` exactly as it is: it already carries what an event needs and renaming it would touch the live-booking hook for nothing.

Update the doc comment at the top of the file. It currently says lanes are "the shape of the business, not a display preference", which the spec deliberately reverses. Say what is true now: the resource still travels on every booking and becomes a colour rather than a column, so the information survives the view change.

- [ ] **Step 6: Verify and commit**

Run: `npm run db:test`, `npx tsc --noEmit`

```bash
git add package.json package-lock.json src/lib/calendar/events.ts src/lib/queries/calendar.ts db/test.mjs
git commit -m "A booking becomes an event in the shop's own hour"
```

---

### Task 3: The calendar itself

**Files:**
- Create: `src/components/app/calendar-view.tsx`
- Delete: `src/components/app/calendar-lanes.tsx`
- Modify: `src/app/app/calendar/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Build the component**

Create `src/components/app/calendar-view.tsx`, a client component. It holds no business logic: it receives the mapped events and calendars as props and renders them.

Use `@schedule-x/react`'s `useCalendarApp` with the day, week and month views from `@schedule-x/calendar`, and `createEventsServicePlugin()` from `@schedule-x/events-service`.

Keep the existing SSE behaviour: call `useLiveBookings(businessId)` exactly as `calendar-lanes.tsx` does today, and when a booking arrives push it in through the events service's `add`, rather than re-rendering the calendar. Deduplicate against the ids already present, because the hook can redeliver.

Read `calendar-lanes.tsx` before deleting it: it handles the connected and disconnected SSE states and shows a channel icon per booking. Do not silently drop behaviour the owner has today. Anything you decide not to carry over, say so in your report.

- [ ] **Step 2: Wire the page**

`src/app/app/calendar/page.tsx` calls `getCalendarRange` for the day, maps through `toCalendarEvents` and `calendarsFor` on the server, and passes plain data down. Update the page's Khmer subtitle: it currently promises "one column per staff member or room", which will no longer be true. Say what is true, that each resource has its own colour.

- [ ] **Step 3: Khmer inside the library's DOM**

Add an unlayered scoped rule to `src/app/globals.css`, the same cascade-layer trick already used for `.sf` and `:lang(km)`. Tailwind emits utilities inside `@layer utilities`, so an unlayered rule wins with no `!important`.

It must set `line-height: 1.75` and `letter-spacing: normal` on Khmer text inside the calendar's root, and feed the library's theme variables from the project's own tokens so the calendar matches the rest of `/app` rather than shipping its default palette. Read how `.sf` does the token remap and follow it.

- [ ] **Step 4: Verify**

Run: `npm run db:test`, `npx tsc --noEmit`, `npm run build`.

Then render. `next start` FAILS SILENTLY ON A BUSY PORT: it logs `errno: -48` and exits while the old server serves a stale build whose CSS chunk 404s, which makes the page look unstyled. Always `lsof -ti:3000 | xargs kill -9 2>/dev/null; npm start &` first and confirm the page and its CSS chunk both return 200.

`/app/calendar` is behind Clerk. If you cannot sign in, say exactly what you could and could not verify. Do NOT disable or weaken the auth gate to obtain a screenshot, ever.

Run `npm run shoot` at desktop and mobile in both colour schemes.

- [ ] **Step 5: Commit**

```bash
git add src/components/app/calendar-view.tsx src/app/app/calendar/page.tsx src/app/globals.css
git rm src/components/app/calendar-lanes.tsx
git commit -m "A resource is a colour now, not a column"
```

---

### Task 4: Close the phase

**Files:**
- Modify: `ARCHITECTURE.md`, `CREDITS.md`, `PLAN.md`, `CLAUDE.md`

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

- [ ] **Step 2: ARCHITECTURE.md**

It rejects Cal.com on the ground that a salon is three chairs and a guesthouse is twelve rooms, which is the exact reasoning this phase reverses. Do not delete that reasoning: record that the resource MODEL is unchanged and still travels on every booking, and that only the resource VIEW was given up, because the paid plugin cannot be obtained through npm at any price short of a licence. The data still knows which chair; the screen shows it as a colour.

- [ ] **Step 3: CREDITS.md**

Replace the existing "hand built calendar" gap entry, which is no longer true, with the four schedule-x packages, their versions, their MIT licence, their source, and their local usage. Note in the entry that both resource-scheduler package names 404 on npm as of 3 September 2026, so nobody checks a fourth time.

- [ ] **Step 4: PLAN.md and CLAUDE.md**

Add a Phase 12.6 section in the same voice as the others. Add to CLAUDE.md's "Things already decided, do not relitigate":

```
- **The calendar is schedule-x's MIT core and has no resource lanes** (decided
  3 September 2026, reversing the earlier hand-built decision). Both
  `@schedule-x/resource-scheduler` and `@sx-premium/resource-scheduler` 404 on npm,
  so the paid view is not obtainable at any price short of a licence. A resource is
  now a colour rather than a column: the model still carries `resourceId` on every
  booking, only the view changed.
```

- [ ] **Step 5: Commit**

```bash
git add ARCHITECTURE.md CREDITS.md PLAN.md CLAUDE.md
git commit -m "Phase 12.6: the calendar comes from a library, and the docs agree"
```

---

## Notes for the executor

- **The timezone is the thing most likely to be wrong and least likely to be noticed.** The database is UTC and the shop reads `Asia/Phnom_Penh`, UTC+7, no DST. A calendar that shows a booking an hour out is worse than no calendar, and it will look completely normal to anyone not checking.
- **Do not disable the Clerk gate for a screenshot.** Report the gap instead.
- **`next start` fails silently on a busy port.** Kill 3000 first and check the CSS chunk returns 200 before trusting what you see.
- **Do not install any resource-scheduler package.** Both names 404; that is settled and re-verified.

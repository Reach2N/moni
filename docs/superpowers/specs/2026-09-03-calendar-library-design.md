# The calendar comes from a library

Phase 12.6. Written 3 September 2026.

## The decision, and the decision it overrides

`src/components/app/calendar-lanes.tsx` is hand built. Its header carries an
honest record of why: FullCalendar's resource timeline is a paid plugin, and
schedule-x ships the resource DATA MODEL in its MIT core while keeping the
resource VIEW on a private registry. Both package names were re-checked on
3 September 2026 and both still 404 on npm, so that finding stands.

The owner has nonetheless decided to adopt the library and drop resource lanes.
That contradicts a recorded decision and this document says so plainly rather
than quietly reversing it. `src/lib/queries/calendar.ts:8-11` states that lanes
are "the shape of the business, not a display preference", and ARCHITECTURE.md
rejects Cal.com precisely because a salon is three chairs and a guesthouse is
twelve rooms. PLAN.md guardrail 9 forbids contradicting a recorded decision
silently, so both places are corrected in the same commit that changes the code.

The reasoning for the reversal is sound for the shops this product is actually
selling to. A one or two chair salon reads a day agenda perfectly well, and the
cost of the hand built grid is a bespoke component nobody else maintains.

## What is not lost

Dropping lanes must not drop the information lanes carried. schedule-x colours
events by `calendarId`, so each resource becomes its own colour-coded calendar
rather than its own column. An owner still sees at a glance which chair or room
a booking belongs to, and can filter to one. That is the whole reason this is a
viable trade rather than a downgrade.

A booking with no resource gets a neutral calendar rather than being hidden.

## The packages

All MIT, verified on npm 3 September 2026:

- `@schedule-x/react` 4.1.0
- `@schedule-x/calendar` 4.7.0
- `@schedule-x/theme-default` 4.7.0
- `@schedule-x/events-service` 4.7.0

`@schedule-x/resource-scheduler` and `@sx-premium/resource-scheduler` are both
404. Recorded here so nobody checks a fourth time.

Per CLAUDE.md's sourcing rule the selection goes in `CREDITS.md` with its source
and its local usage, replacing the existing "hand built" gap entry, which is no
longer true.

## The data

`getCalendarDay(businessId, day)` returns one day. The library's week and month
views need a range, so it becomes `getCalendarRange(businessId, from, to)` with
the day view calling it for a single day. `CalendarDay` becomes `CalendarRange`
carrying the same `resources` and `bookings` arrays.

`LaneBooking` keeps its shape. It is already close to what an event needs, and
renaming it would touch the live-booking hook for no gain.

The mapping from a booking to a schedule-x event is a PURE function in a
`server-only`-free module, so `db/test.mjs` proves it. That is this codebase's
standing pattern and it matters here for three specific reasons:

- times must be rendered in `Asia/Phnom_Penh`, not the browser's zone, and a
  calendar that silently shifts a booking by seven hours is worse than no
  calendar;
- money must go through `formatMoney()`, never a float;
- a booking with a null `resourceId` must still produce an event.

## Live bookings

`useLiveBookings(businessId)` is an SSE hook that already works and is not
touched. Its arrivals are pushed into schedule-x through
`@schedule-x/events-service` rather than by re-rendering the whole calendar, so
a booking taken on Telegram appears without a reload, which is the behaviour the
current page advertises in its own subtitle.

## Khmer

The library renders its own DOM, so the 1.75 line height has to reach it. A
scoped unlayered rule handles it, the same cascade-layer trick already used for
`.sf` and for `:lang(km)`. Khmer takes no letter spacing, so any tracking the
theme applies is neutralised in the same rule.

Day and month names come from the existing `DAY_NAMES_KM` and the project's own
formatting, never from a `km-KH` locale: Node and Chrome disagree on that
locale's separators and it is a hydration mismatch.

## Two parked items from Phase 12.5, fixed here

Neither belongs to the calendar, but both were parked with a ruling that they
would be fixed at the start of the next phase, and this is it.

- `PLAN.md` blames the Clerk gate for the tiles never having been seen. Tiles
  render on the public `/s/[slug]`; the real cause is the unrun backfill, which
  the preceding sentence already states correctly. One connective is wrong.
- `src/lib/setup/plan.ts:146` hardcodes `active: true` on a product update, so a
  re-parse silently un-archives a product the owner deliberately archived. It is
  the mirror of the bug Phase 12.5 fixed: setup will not retire a product, but it
  will resurrect one. `active` is omitted from the update values the same way
  `photo_path` already is.

## Acceptance

- `npm run db:test` proves the booking-to-event mapping: Phnom Penh times, money
  through `formatMoney()`, a null resource still producing an event, and every
  resource mapping to a distinct calendar id.
- The calendar renders day, week and month, with each resource a distinct colour
  and a booking with no resource visible in neutral.
- A booking arriving over SSE appears without a reload.
- Khmer renders at 1.75 line height with no letter spacing inside the library's
  own DOM.
- `npm run shoot` at desktop and mobile, both colour schemes.

## Deliberately not here

- **Resource lanes.** The paid view is not purchasable through npm at any price
  short of a licence, and the owner has decided against buying one.
- **Drag to reschedule.** `reschedule_booking` was removed from the tool surface
  in Phase 11 as never implemented. Adding it through a calendar interaction is
  its own piece of work with its own rules about notifying the customer.

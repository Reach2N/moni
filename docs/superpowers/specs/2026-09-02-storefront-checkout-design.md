# The shop site takes money

Phase 13. Written 2 September 2026.

## The problem

A published shop site at `{slug}.moni.cam` is a brochure. Its only action is a
Telegram link or a `tel:` href, so a customer who has already decided what she
wants has to leave the page, open another app, and start a conversation to buy a
coffee. Every part of the rail needed to serve her directly is already built and
none of it is connected to the page.

## What is already there, and what is missing

Already built and reused unchanged:

- `src/lib/orders/create.ts`. `createOrder` decrements stock with a conditional
  UPDATE, allocates a gapless invoice number under `for update`, and writes the
  order, its items and its invoice in one transaction. Prices, names and the
  total are read from the catalogue INSIDE the transaction, so a client cannot
  name its own price. This is the security property the public route depends on
  and it needs no change.
- `src/lib/payments/rails.ts`. `railsFor(currency, account)` prefers the shop's
  own Bakong account. The money is the shop's.
- `src/lib/payments/confirm.ts`. `confirmPayment` is the one place a person moves
  a payment to paid, shared by the owner tool, the inbox button and the money
  screen.
- `v_month_usage` counts `payments where status = 'paid' and booking_id is null`
  as a standalone paid sale. An order payment has a null `booking_id`, so it
  meters correctly with no change to the view. This gets an assertion rather
  than a shrug, because it is correct by coincidence and a later edit could
  quietly break it.

Missing:

- A public order route. `POST /api/orders` sits behind `requireMemberApi()` and a
  storefront customer is never signed in.
- `payments.order_id`. Payments hang off bookings only.
- A way to reach a QR by order code.
- Stock held by an unpaid order is never given back.
- A cart on the storefront.

## Decisions taken

**Products get a cart, services keep the contact action.** `createOrder` operates
on `products`: it decrements their stock and prices from their rows. A service
has no product row and no stock, and a haircut needs a time, not a basket. So a
storefront shows a cart for `kind === 'product'` rows and leaves the existing
book-or-contact action for services. A shop with both gets both, and neither
pretends to be the other.

**The public route is a new sibling, never a widened owner route.** Widening
`POST /api/orders` to accept an unauthenticated caller would put the tenancy
decision inside a request body. The new route derives `businessId` from the slug
in its own path, so the tenant is decided by the URL the customer is already on
and there is no field a caller could set to reach another shop.

**A shop that has not published takes no orders.** The route resolves the
business through the same published-storefront lookup the page uses. An
unpublished shop is a 404 on the page and a 404 on the route, consistently.

**Stock comes back.** `createOrder` takes stock at order time, which is right for
a Telegram order an agent is shepherding and wrong for a public page where
anybody can place a hundred unpaid orders. The cron tick cancels pending web
orders whose payment has expired and restores what they took. This is the one
real behaviour change to existing order handling and it is required, not
optional.

**The owner confirms, as she does for every other KHQR payment.** Bakong's
check-transaction blocks servers outside Cambodia, the rail is `pollBased: false`,
and the owner's banking app is the verifier. Nothing about a web order changes
that.

## Data model

`src/lib/types.ts` first, `db/schema.sql` follows.

Migration `20260903000100_order_payments`:

```sql
alter table payments
  add column if not exists order_id uuid references orders(id) on delete set null;

create index if not exists payments_order on payments (order_id)
  where order_id is not null;
```

`comment on column payments.order_id` records that a payment hangs off a booking
or an order and never both, and that a null `booking_id` is what makes a paid row
count as a standalone sale in `v_month_usage`.

No CHECK constraint forcing exactly one of the two. A standalone sale with
neither is already a legitimate row today and constraining it now would be a
migration written for tidiness against working data.

## The public order route

`POST /api/shop/[slug]/order`

Body:

```ts
{
  lines: Array<{ product_id: uuid, quantity: int 1..99 }>,  // 1..30 lines
  customer_name: string,   // required, 1..80
  customer_phone: string | null,
  note: string | null,     // 0..300
}
```

`customer_name` is required because the alternative is an owner reading
"Order A4F9C2, 23,000" with no idea whose it is. It creates or matches a
`customers` row on `(business_id, phone)` when a phone is given, and a bare row
with `display_name` when it is not.

Sequence:

1. `assertSameOriginBrowserPost(req)`, as every other browser POST does.
2. Resolve the slug to a published business, or 404.
3. Rate limit per IP and per slug. A public write endpoint on a page anyone can
   load needs one, and its absence is not something to notice in production.
4. `withTransaction` around `createOrder`, `channel: 'web'`.
5. `getPaymentSettings(businessId).account` and `railsFor(currency, account)`. An empty rail
   list is a real answer: the order stands and the customer is told to pay at the
   shop, exactly as `create_payment` already handles it.
6. Insert the payment with `order_id` set, `booking_id` null, and a time-bucketed
   `idempotencyKey()`. Never a static key: a static key plus the unique
   constraint permanently strands a customer whose QR lapsed unpaid.

Returns `{ code, total_minor, currency, expires_at, has_qr }`. The QR itself is
fetched as an image, so the JSON stays small and one code path serves the page,
a reload and a share.

`OrderError` maps as it already does in the owner route: 409 for out of stock,
400 for the rest. Its messages are customer-facing here, so the storefront
renders the Khmer sentence for each of the four codes rather than the raw text.

## Reaching the QR

`src/app/api/pay/order/[code]/route.ts`, mirroring the booking route beside it.

A separate route segment rather than a branch inside `/api/pay/[code]`, because
booking codes and order codes are both short uppercase alphanumerics from
different generators and can collide. A branch would serve one shop's QR for
another shop's code, silently. A distinct path cannot.

Same rules as the booking route: public and unauthenticated because the customer
scanning it never signs in, addressed by a code she already has, revealing an
amount and a shop name and nothing else. A lapsed payment stops rendering rather
than serving a QR that pays nobody.

## The order page

`src/app/s/[slug]/order/[code]/page.tsx`

Server-rendered, `force-dynamic`. Shows the lines, the total through
`formatMoney()`, the QR, the order code and the current status. Reloadable and
shareable, which an inline-only result is not: a customer who closes the tab
mid-payment has to be able to get back.

It renders inside the shop's own seeded style from Phase 12, so it reads as part
of the shop's site and not as a Moni checkout page bolted on.

Unknown code is a 404. A code belonging to another shop's slug is a 404, checked
against the business the slug resolves to and not against the code alone.

## The cart

`src/components/storefront/cart.tsx`, a client component. Per CLAUDE.md rule 9 it
holds no business logic: it holds quantities, renders a running total from the
prices the server already sent in `StorefrontData`, and POSTs product ids and
quantities. The authoritative total is the one `createOrder` computes.

The running total is a courtesy and is labelled as such by being recomputed on
the server before payment, so a stale page cannot commit an old price.

`StorefrontData` gains nothing. The cart reads the `items` array the themes
already receive, filtered to `kind === 'product'`.

Component sourcing rule: search Beautiful UI and then the listed sources for a
cart or line-item stepper before authoring one, and record the gap in
`CREDITS.md` if nothing fits.

## Giving stock back

`runExpiredOrders()` joins the cron tick beside the reminder and payment jobs,
independent and individually caught so it cannot take the tick down.

For each `orders` row that is `pending`, `channel = 'web'`, and whose newest
payment is `pending` with `expires_at` in the past:

1. Restore stock for each line, `where stock is not null`, in one transaction
   with the status change. A product with null stock is unlimited and untouched.
2. Set the order to `cancelled` and the payment to `expired`.

Scoped to `channel = 'web'` on purpose. A Telegram order is being shepherded by
an agent in a live conversation and must not be cancelled underneath it.

The invoice row is left alone. Invoice numbers are gapless per business by
design, and deleting one to tidy up a cancelled order is an accounting problem.

## Confirming

`confirmPayment` gains an order path. It currently resolves a code to a booking
and gives up if there is none. It will look up both, scoped to the business, and:

- a booking match confirms the booking, as today;
- an order match moves the order pending to confirmed and the payment to paid;
- a match on both is an ambiguity and returns an explicit outcome rather than
  guessing. Two generators can produce the same short code and picking one at
  random would confirm the wrong sale.

`pendingPaymentsFor` widens to include order payments so they appear in the
inbox with the existing confirm button, and the row shows the order lines so the
owner can see what she is confirming.

The customer is told on the channel she used. For a web order there is no channel
to reply on, so the order page shows the confirmed state on reload. That is the
honest answer: adding a notification channel for web customers is its own piece
of work and is not in this phase.

## Acceptance

`npm run db:test` assertions:

- A public order writes the order, its items, its invoice and its payment.
- A client-sent price is ignored and the total comes from the catalogue.
- An order against a slug that is not published is refused.
- An order for a product belonging to another business is refused.
- Out of stock returns the out-of-stock code, not a generic failure.
- An expired pending web order restores exactly what it took, and a null-stock
  product is untouched.
- A pending Telegram order is not cancelled by the expiry job.
- A paid order payment increments `txn_used` in `v_month_usage`.
- A code matching both a booking and an order returns the ambiguous outcome.
- A double confirm changes zero rows the second time and says so.

Live: a cafe's published menu, three items into a cart, a KHQR for the exact
total into the shop's own Bakong account, the owner confirming from her inbox,
and the order page showing paid on reload.

`npm run shoot` at desktop and mobile for the storefront with a cart and for the
order page.

## Deliberately not in this phase

- **Booking from the site.** Services keep the contact action. A time picker on a
  public page is its own design.
- **Telling a web customer her payment landed.** No channel exists to tell her on.
- **Card payments.** CutLuy stays the platform demo rail, USD only.
- **A saved cart.** Component state only. A customer who reloads mid-basket
  starts again, which for a four-item coffee order is acceptable.

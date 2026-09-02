# Moni: one universal app, shop-owned payments, and an agent that runs setup

Status: implemented 2 September 2026 (PLAN.md Phase 10). Scope: the gated owner app and the agent tool surface. It does not touch
the marketing homepage (`docs/HOMEPAGE.md`) or the customer storefront renderer.

Date: 2026-09-02. Author: design pass, following the brainstorming skill.

## Problem

Three gaps sit between what ships and "the agent starts the business."

1. **Payments are Moni's, not the shop's.** One platform `CUTLUY_TOKEN` means every
   customer of every shop pays into Moni's own CutLuy account. A shop owner cannot give
   their own Bakong account, there is no money settings screen, and the product cannot
   take a payment that is the shop's. The offline KHQR builder
   (`src/lib/khqr/payload.ts`) is verified byte for byte against `ts-khqr` but no rail
   uses it, because the direct Bakong rail was removed on 30 August 2026.
2. **The agent cannot run setup.** It can organize services, hours, staff and bookings,
   and it can operate the day. It cannot generate or publish the storefront, configure
   payments, or guide a channel connection. Those live on pages reachable only through
   the setup spine, and the spine is the only map to them.
3. **Setup ends too early.** Four rows: describe, catalogue, Telegram, first customer. An
   owner can reach "complete" with no way to get paid and no public site. The spine
   congratulates a shop that cannot be found or charged.

## Decision: the shop's own Bakong account

The owner pastes their **Bakong account id** (for example `sokha@wing`). A rail generates
the KHQR payload **offline** into that account, in KHR or USD, and the owner confirms
receipt. No third-party payment signup, no new account for the customer or the shop.

Why offline + owner confirm, and not a relay: NBC blocks `check_transaction` from
servers outside Cambodia, and Vercel is not in Cambodia (CLAUDE.md, the headstone in
`src/lib/payments/rails.ts`). The earlier direct rail built the QR offline but verified
through a relay that does not exist any more. Verification through the shop's own bank
app is the reliable signal, and the owner is the person who sees it.

This reverses the 30 August decision to drop the direct rail. The reversal is deliberate
and scoped: the direct rail is kept only as the **generation** half, and only for a
shop's own account, never with the platform CutLuy token. The CutLuy webhook rail stays
as-is for any deployment that still configures it, and for the case where a shop later
opens a CutLuy account.

## Scope

Three deliverables, in build order. Nothing else.

- **A. Money per shop.** A payment account on the business, a `khqr` rail that settles
  into it, an owner tool and an inbox action to confirm receipt, a `/app/money` screen,
  and a new spine row.
- **B. The agent runs setup.** A SETUP tool group on the owner agent: generate and
  publish the storefront (publish behind the approval card), set the payment account,
  report setup status, send the owner to the channel screen. The spine grows to five
  rows (one new row, receive money).
- **C. One shell.** Navigation for home, inbox, calendar, site, channels, money, on
  desktop and mobile.

## Architecture

### A. Money per shop

**`src/lib/types.ts` first** (hard rule 2), then `db/schema.sql`, then
`npm run db:test`.

`Business` and the `BusinessTypeDef` gain one optional group of columns for a shop's own
payment account. Modelling as columns rather than a child table on purpose: one account
per shop, and it belongs beside `businesses.phone` and `businesses.address`. Use a single
`attributes`-hosted block only if the schema stays frozen; the design prefers real columns
and accepts a migration.

```ts
// types.ts (as built: the businesses table already says "business", so the prefix names the rail)
khqr_account_id     string | null   // "sokha@wing"
khqr_merchant_name  string | null   // merchant name on the QR, defaults to shop name
khqr_merchant_city  string | null   // defaults to the shop's province, then Phnom Penh
```

`db/schema.sql` mirrors these three with the same nullability, inside the `businesses`
table. No CHECK constraint on the account id shape: accounts vary by bank.

**The `khqr` rail.** New in `src/lib/payments/rails.ts` (the seam already declared in
`src/lib/payments.ts`). Do not edit `src/lib/payments.ts` itself beyond adding the rail
if that is where it belongs; the file records PORTED comments that must survive.

```ts
// A rail that settles into the shop's OWN Bakong account, generated offline.
// Verification is the owner's own bank app, not a relay we can run from Vercel.
function shopKhqrRail(cfg: { accountId: string; merchantName: string; merchantCity: string }): PaymentProviderAdapter {
  return {
    id: 'khqr',
    pollBased: false,          // we cannot poll NBC from here; the owner confirms
    settlesCurrencies: ['KHR', 'USD'],
    async createCharge(req) {
      const qr_payload = buildKhqrPayload({ accountId: cfg.accountId, merchantName: cfg.merchantName, merchantCity: cfg.merchantCity }, {
        amount_minor: req.amount_minor,
        currency: req.currency,
        reference: req.reference,
      })
      return { qr_payload, provider_ref: khqrMd5(qr_payload), expires_at: new Date(Date.now() + QR_TTL_SECONDS * 1000).toISOString() }
    },
    async checkCharge() {
      return { status: 'pending', raw: { note: 'verify in the shop bank app; the owner confirms via confirm_payment' } }
    },
  }
}
```

`railsFor(currency)` gains a parameter: if the shop configured an account, prepend the
`khqr` rail (which settles both currencies) ahead of CutLuy. An empty configured set keeps
the current behaviour. Every call site that derives the rail from a booking already owns
the booking's `business_id`.

**Owner confirms receipt.** A new owner tool `confirm_payment` and a matching inbox
action. Semantics: only the owner can move a payment from `pending` to `paid`, and the
booking moves `pending` -> `confirmed` in the same step (mirroring what the CutLuy
webhook and `check_payment` do). Guard that the payment is still `pending`, so a double
confirm changes nothing. The `paid` status requires `paid_at` (schema CHECK), so set it
together.

**`/app/money` screen.** The owner's view of payments: their Bakong account, status, and
a **test card**. The test card renders a small fixed amount (the cheapest active service,
or an explicit "no services yet" state) into the owner's own account, so the owner scans
it with their own banking app to prove the account works. It is not tied to a booking, so
it never charges a customer. This is the acceptance the screen is for.

**New spine row: receive money.** The setup spine derives its rows from pure rules
(`src/lib/queries/setup-progress.ts`); add a `money` row complete when
`business_payment_account_id` is non-null, linking to `/app/money`. Row 3.5 in the
sequence, so the spine becomes describe, catalogue, receive money, Telegram, first
customer, and the publisher states five rows.

### B. The agent runs setup

An owner tool tries to complete it in one place, and publishes behind the approval card
(`AgentApprovalCard`), which is the established human-in-the-loop gate for owner commands
that change what a customer sees. New tools in `src/lib/agent/owner-tools.ts`:

- `report_setup_status` (read): the same pure rules the spine uses, as a short Khmer
  summary. The owner agent answers "what do I still have to do" without any new UI.
- `set_payment_account` (write): saves the account id, merchant name and city. Always
  behind the approval card, and the payment account is exactly the kind of change a shop
  must confirm. Never expose the account id as a customer-facing tool.
- `generate_shop_site` (write): calls the existing `POST /api/storefront` generate path
  (the agent never writes storefront markup), reports the warnings, and lets the owner
  review the draft on `/app/site`.
- `publish_shop_site` (write): **behind the approval card**. Publishing is the owner's act
  (the storefront API already enforces this); a tool that publishes must also be gated.

The agent never sends the owner to a channel-connect screen saying "paste your bot token
into chat": a BotFather token is a credential and chat history is not a credential store.
The agent's channel answer is a pointer to `/app/channels`.

The owner prompt (`src/lib/agent/owner-prompt.ts`) and its categories
(`src/lib/agent/categories.ts`) gain a SETUP group so a non-technical owner has a starting
point ("what is left before my shop is live?", "make me a web page", "I want to get paid
by QR").

### C. One shell

The current owner navigation is three tabs on mobile and four links on desktop, with the
site, channels and money pages reachable only through the setup spine. Extend both navs
to cover: home, inbox, calendar, site, channels, money. Source each nav per the
library-first rule (Beautiful UI first); do not hand-build a navigation component. The
setup spine already provides a map to these pages for an owner mid-setup; the shell makes
them reachable for an owner who is past it.

## Data flow

```
Owner /api/ask
  -> ownerTools() = existing tools + new set_payment_account,
     generate_shop_site, publish_shop_site, report_setup_status
  -> set_payment_account saves to businesses.business_payment_*
  -> create_payment (customer tool) reads the booking and railsFor(currency)
  -> shopKhqrRail.createCharge builds the QR offline into the shop account
  -> /app/money renders the QR card and a test card

Customer /api/chat or a webhook
  -> create_booking, create_payment (existing)
  -> customer's bank app pays the shop's account
  -> owner confirms via /api/ask "confirm_payment <code>" or the inbox action
  -> payments.status = paid, bookings.status = confirmed
```

Money never flows through Moni's account when the shop configured its own Bakong account.
The platform CutLuy token remains the fallback for a deployment that configures it and for
a payment the shop has not configured an account for.

### Found while building: the QR never reached a customer

`create_payment` stored a payload and returned it to the model, and no channel delivered
it: Telegram's `sendReply` sent text only, and the customer prompt said nothing about
paying. Scope A therefore also ships delivery. `deliverPaymentCard()` in
`src/lib/channels/deliver.ts` sends the code as a photo on Telegram (uploaded bytes, so a
tunnel works), as an image attachment by URL on Messenger (`/api/pay/{code}?format=png`,
with a text fallback when the deployment is not public HTTPS), and the web chat draws
`/api/pay/{code}` inline. Both webhooks call it for every `create_payment` in the turn,
after the text reply, best effort and logged, never thrown.

### Found while building: declared tools that did not exist

`OWNER_TOOLS` declared `archive_service`, `update_resource` and `set_business_profile`, none
of which `ownerTools()` built, and omitted four that it did. `ownerTools()` now ends with
`satisfies Record<OwnerTool, Tool>` (guardrail G3) and the list matches the code.

## Error handling

- `railsFor` returns an empty list when nothing is configured; `create_payment` already
  reports "this shop cannot take QR payments yet" rather than inventing one.
- A shop with no account, no services, or an empty account id: the test card and the
  spine row both report the real state, never a fabricated success.
- `confirm_payment` on an already-paid or already-confirmed row is a no-op that says
  "already settled", so a stale webhook or a double tap cannot double-book.
- The offline rail's `checkCharge` always returns `pending`. The cron payment poller
  (`/api/cron/tick`) must skip these rows rather than polling them forever: the poller
  already skips a missing rail, and `pollBased: false` on the adapter is the signal it
  should use.

## Testing

- `npm run db:test`: the rail generates the same payload through `buildKhqrPayload` (new)
  and asserts byte parity with `ts-khqr`, mirroring the existing KHQR cross check. New
  assertions: the shop account rail settles both currencies; `confirm_payment` moves
  `pending` -> `paid` and the booking `pending` -> `confirmed` and is idempotent; the
  spine derives five rows and the money row agrees with the account column.
- `npm run test:setup`: the spine rules with a money row, including the account-not-set
  state.
- `npm run test:models`: the `modelsFor`/`withFallback` chain still passes unchanged.
- `npm run lint`, `npm run build`.
- Manual: an owner pastes a Bakong account id, scans the test card with their own bank app,
  and confirms a real booking's payment.

## Non-goals

- Advertising management (a service layer already reserved in PLAN.md).
- The SwiftUI native app (the API-first rule keeps the door open; this pass does not build
  it).
- Instagram and TikTok channels (each needs its own app review).
- Content publishing (a `posts` table and one screen, deliberately out of scope).
- The marketing homepage and the customer storefront renderer stay frozen.

## Verification

The pass is complete when all of the following hold:

1. `npm run db:test` passes, extended per the Testing section.
2. `npm run test:setup`, `npm run test:models`, `npm run lint`, `npm run build` all pass.
3. `npm run shoot` produces clean captures at desktop and mobile widths, and the marketing
   captures are unchanged (the fork held).
4. `/app/money` shows the shop's own account and a working test card.
5. The agent answers "what do I still have to do" from `report_setup_status`, and runs
   `set_payment_account` and `publish_shop_site` behind the approval card.
6. The nav covers home, inbox, calendar, site, channels, money on desktop and mobile.

## Related documents

- `docs/ONBOARDING.md`: the owner onboarding contract; the spine change lands here.
- `src/lib/types.ts` and `db/schema.sql`: source of truth and its mirror, per hard rule 2.
- `src/lib/payments.ts`: READ-ONLY for the PORTED comments; do not simplify them.
- `src/lib/queries/setup-progress.ts`: the pure rules the agent and the spine share.

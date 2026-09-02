# Moni: architecture and stack research

This document is the **target architecture**: the data model,
the seams, the guardrails, and the record of which third-party things were adopted and
which were rejected and why.

It sits below the active agent contract and build plan:

- `AGENTS.md` is the active agent contract and current-surface declaration.
- `PLAN.md` is the build order: phases and acceptance checks.
- `docs/HOMEPAGE.md` is the active frontend contract for the homepage.
- **This file is the architectural what and why.** Where it conflicts with PLAN.md on
  architecture, this file wins and PLAN.md is corrected in the same commit, per
  PLAN.md guardrail 8.

The current requested surface is the light-only marketing homepage. The target
database migration, storefront, and dashboard rebuild below are future phases and must not
be pulled into homepage work.

---

## Context

Moni is an agentic assistant for Cambodian local businesses. The owner describes the shop
by voice or text, and the catalogue, the booking logic, the customer conversations and the
web store are all derived from that. It is being built for the AI in Motion program.
Execution is linear and acceptance-driven; this document does not promise a delivery date
or estimate how long a step will take.

The repository contains a 16-table Postgres schema with `tstzrange` occupancy and a GiST
exclusion constraint, a model router with provider-aware fallback, a parse loop whose
`sanityCheck()` catches the 100x currency bug, agent tool loops, authentication, onboarding,
voice, Telegram, and a public homepage. The dashboard and later product breadth are still
being rebuilt in later phases. Do not describe future work as if it is already installed.

Two forces shaped this document. The scope grew to include hosted web stores on subdomains,
products and orders for retail, and invoices. And the brief was to design for the end state,
to name what will not survive contact with real shops, and to stop rebuilding what exists.

---

## 1. The three findings that drive everything else

**PostgREST has no transactions.** `supabase-js` speaks to PostgREST, not to Postgres.
Decrementing stock while creating an order, and allocating a per-business invoice number,
are both atomic operations. The documented workaround is PL/pgSQL functions called by RPC,
which buries business logic in the database where neither TypeScript nor `db/test.mjs` can
reach it. This is a functional blocker for the current scope, not a matter of taste.

**The security risk is a planned step, not the vendor.** Today's setup is already the safe
one: RLS on with zero policies, service role only, `server-only` on `src/lib/db.ts`, and the
browser never touching Supabase. That is Supabase used as managed Postgres, which is what you
would build on RDS or Neon too. PLAN.md Phase 2 planned to reverse it by adding member policies
over Clerk JWTs, which ships the anon key to the browser and makes hand-written
SQL policies the only boundary between tenants. That is the misconfiguration class that produces
real breaches. **That step is cancelled.**

**Supabase Realtime respects RLS**, so with deny-all the browser receives nothing. Phase 5's
"row animates in" acceptance check therefore applies quiet pressure to open the Data API.
Replacing it with an owned SSE endpoint removes the pressure at its source.

The conclusion is not to leave Supabase. Postgres is correct: the whole booking model is range
types and exclusion constraints, which is Postgres-only and well done, and `ap-southeast-1` is
the right region. What changes is the client.

---

## 2. Stack verdict

### Changed

| Layer | From | To | Why |
|---|---|---|---|
| DB client | `@supabase/supabase-js` (PostgREST) | **`postgres` over Supavisor transaction mode, adopted 30 Aug where a transaction is actually needed** (`src/lib/orders/`); `drizzle-orm` layers onto the same driver later with no connection change | Transactions. Types inferred from schema, so `database.types.ts` stops being a hand-refreshed file that drifts. Portable: moving to Neon or RDS becomes a connection string, not a rewrite. |
| Tenant isolation | RLS policies per table (planned) | One server-side `requireMember()` plus a `businessId` argument on every query | One auditable choke point instead of twenty SQL policies. RLS stays on with zero policies as defence in depth. |
| Live updates | Supabase Realtime (planned) | Own SSE route `GET /api/stream/[businessId]` | Data API stays shut, satisfies the API-first rule, and Swift consumes SSE with `URLSession` and no vendor SDK. |
| LLM gateway | CLAUDE.md said OpenRouter | Vercel AI Gateway | PLAN.md and `package.json` already agreed. CLAUDE.md was the stale document and is corrected. |

Supabase keeps two jobs: managed Postgres, and Storage for shop photos. `@supabase/supabase-js`
stays installed for Storage uploads only.

This table describes the target after the later migration. The current homepage-first
session does not install Drizzle, change the database client, or touch owner-app queries.
Until that migration is explicitly started, existing Supabase query code is the current
implementation and must not be “partially modernized” by a homepage change.

**One configuration detail that will bite otherwise:** under Supavisor transaction mode you must
set `prepare: false` on the postgres.js client. Without it, the second request to any route fails
with "prepared statement already exists", because transaction mode cannot share named prepared
statements across sessions.

---

## 3. What not to build, because it exists

Every capability in scope is checked against what already ships. For showcase work,
selection is based on the strongest complete interaction and visual result, with Beautiful
UI preferred for every UI surface and required as the first check for agentic surfaces.
Defer all license review and licensing decisions until distribution work. A
selected component must still be inspectable, installable, and compatible with the route;
do not invent a replacement when no fit exists.

### Adopt

| Need | Take | Why it wins |
|---|---|---|
| **Agent execution trace** | **Beautiful UI [Thinking](https://www.beautifului.dev/#thinking), [Tool Chips](https://www.beautifului.dev/#tool-chips), and [Task Rows](https://www.beautifului.dev/#task-rows)** | These are the homepage's visible work trace. Existing local adaptations such as `src/components/app/owner-tool-trace.tsx` are historical implementation context, not the homepage source of truth. New work selects and installs the published source before any route code is written. |
| **Agent approval gate** | **Beautiful UI Approval Card** | Use the published component source and its documented theme hooks. Do not redraw or substantially rewrite it; if it does not fit, stop and report the gap. |
| **Chat and composer UI** | Homepage: **Beautiful UI [Chat](https://www.beautifului.dev/#chat)**. App surfaces: **Beautiful UI [Prompt Bar](https://www.beautifului.dev/#prompt-bar)** when a composer is in scope. | The homepage uses a scripted customer conversation, not a public owner composer. Install the selected source and keep its interaction model intact. shadcn/Radix primitives are low-level fallbacks, not a reason to invent a new composer. |
| **Streaming answer** | **Beautiful UI [Streaming Text](https://www.beautifului.dev/#streaming-text)** | The homepage may show a restrained answer-arrival state, but the settled answer must remain present and readable without animation. |
| **Grounding evidence** | **Beautiful UI [Context Cards](https://www.beautifului.dev/#context-cards)** | The conversation can show the shop facts that ground a reply. Illustrative data must be labelled as an example and never imply a live customer or booking. |
| **Telegram** | **grammY** | Typed update objects and `webhookCallback` for serverless, which is precisely the fiddly part. TS-native, actively maintained. Keep the agent loop outside grammY middleware so Messenger reuses it unchanged. |
| **Transactional email** | **react-email** with Resend | Same vendor as the already-chosen sender. Templates are React, so the Khmer `line-height: 1.75` rule applies naturally instead of fighting inlined email CSS. Ships receipt and invoice templates. |
| **Voice capture** | Select and install a complete Beautiful UI recorder when the voice surface is in scope | Browser `MediaRecorder`/`getUserMedia` can remain an integration seam, but it is not permission to invent a visual recorder. If no library component meets the interaction and accessibility requirements, pause and report the missing fit. |
| **Subdomain routing** | Read `vercel/platforms`, copy the pattern, install nothing | Its `proxy.ts` handles subdomain extraction across local, preview and production hosts. The rest of the kit is a blog CMS on its own schema and would fight the existing 16 tables. Its Vercel Domains API usage becomes relevant later for custom domains. |
| **Invoice document** | Use the markup pattern from `invoify` or a Postmark receipt template as the source | Render as a Next route with a print stylesheet. Browser makes the PDF. No PDF library in the serverless bundle. |
| **Observability** | **PostHog only** | Free tier is 100k errors and 5k session recordings against Sentry's 5k and 50, and it bundles product analytics and feature flags. For a program application, evidence of usage (shops onboarded, bookings completed, onboarding funnel) is worth more than stack traces. One script, one vendor. Add Sentry later only if error volume justifies it. |
| **Structural UI shells** | Beautiful UI first; shadcn blocks or Origin UI when a complete Beautiful UI shell is unavailable | Install or copy the selected source and use its documented theme hooks. Do not hand-redraw or substantially rewrite a library shell. |
| **Homepage theme bridge** | Moni semantic tokens mapped through each selected component's documented hooks | The copied Beautiful UI foundation is not the page ground. Keep its stripe, canvas, blue accent, dark variant, and page-level base rules out of the marketing subtree so the homepage stays white and light-only. |

### Reject, with the reason recorded so it is not revisited

| Candidate | Verdict |
|---|---|
| **Cal.com / cal.diy** | Wrong model, not just heavy. Cal.com does *personal* scheduling: one person, calendar sync, event types. Moni does *resource occupancy*: three chairs, twelve hotel rooms, two repair bays, with a database-level exclusion constraint preventing double-booking. The existing slot calculation already models the right domain. Adopting Cal.com means running a second schema and syncing it. |
| **FullCalendar** | Not a complete fit for the required resource-lane interaction in the current showcase scope. |
| **schedule-x** | The evaluated package did not provide a complete resource view. Do not hand-build a replacement. Re-evaluate Beautiful UI or another complete library component when the calendar phase begins; if none fits, pause and report. |
| **SaaS boilerplates** (`ixartz/SaaS-Boilerplate`, Next.js SaaS Starter, Open SaaS) | The repo is not empty, and its domain schema is better than a boilerplate's. Mine these projects only for useful wiring, tenant-resolution, testing, and CI patterns; do not import their visual system into the homepage. |
| **next-intl** | It requires a `[locale]` route segment that fights the subdomain rewrite, and its formatter does not solve the existing Khmer money-formatting constraint. Use the existing message dictionaries plus `formatMoney()` and `toKhmerDigits()`. |
| **tweakcn presets** | PLAN.md section 3 specifies exact Apple semantic token names so a SwiftUI port is find-and-replace. A generated preset destroys that mapping. Hand-write the token block once. |
| **Medusa / Saleor / Vendure** | Each is a full backend with its own database and admin. Products and orders for a shop with under fifty SKUs is two tables. |
| **Prisma** | Heavier, worse on serverless, and a second migration system. |
| **tRPC** | Breaks the API-first rule because a Swift client cannot consume it. Keep the existing JSON route contracts; revisit an OpenAPI-emitting option only as a separately approved architecture change. |
| **A second database for customers** | One Postgres, `business_id` on every row. A second store doubles the failure surface, breaks every join, and invents a consistency problem that does not currently exist. |
| **uploadthing / Vercel Blob** | Supabase Storage is already provisioned. One vendor. |
| **Redis, a queue, a monorepo, Instagram, TikTok** | Outside the current linear scope. Revisit only when the corresponding product need and external approvals are active. |
| **AI-generated storefront markup** | The model fills a validated content object and never emits markup, so a bad generation is a bad string and never a white screen shipped to a real shop owner. |

### The KHQR question specifically

`src/lib/payments.ts` is ported from working production code and CLAUDE.md forbids simplifying
its PORTED comments, which carry bugs already paid for once. Keep it. But `ts-khqr` (v2.2.2,
actively maintained) exists, so **write one test that generates the same payload through both and
asserts they match**. If the TLV encoding or CRC diverges, one of them is wrong, and you want to
find that out before a customer scans a bad QR, not after. That is a test, not a dependency. Add
`qrcode` only for rendering the payload to an image.


### Adoption note, 30 August 2026 (Phase 8)

The row above originally said adopt `drizzle-orm` plus `postgres` and rewrite the
data layer. What shipped is the `postgres` half, **only where it is needed**:
`src/lib/orders/` takes a two-method `Tx` interface, and every other read still
goes through `src/lib/db.ts` and PostgREST.

Two reasons, and they are the reasons this row exists at all. Stock decrement and
gapless per-business invoice numbering are precisely the operations PostgREST
cannot express, and they now run inside one real transaction. And a thin `Tx`
seam lets `db/test.mjs` run the REAL order code against PGlite, which is the same
Postgres engine, so "all or nothing" is asserted rather than asserted about: the
oversell, the repeated line, the cross-tenant product and the duplicate invoice
number are all proved against real row locks.

Drizzle sits on this exact driver, so adding its query builder later changes no
connection string and no SQL. `prepare: false` is set, per the warning recorded
above.

---

## 4. Gaps the scope did not mention and the build will hit

Not in PLAN.md. Each is small, cheap, and painful if discovered late.

**Cron is a hard blocker on Vercel Hobby.** Hobby cron expressions can only resolve to once per
day or less, and anything more frequent **fails at deploy time**, not at runtime. Three needs are
sub-daily: 24-hour and 1-hour booking reminders, KHQR payment polling, and the Supabase keep-alive.
The fix is one authenticated endpoint `POST /api/cron/tick` plus an external free scheduler
(cron-job.org or Upstash QStash) calling it every five minutes with a bearer secret. Three needs,
one endpoint, no platform lock-in, works on Hobby, and it is an HTTP endpoint so it fits the
API-first rule. Inngest is the upgrade if workflows ever get genuinely multi-step.

**Booking reminders are a Tier 1 feature in the archived feature research and absent from the
current homepage scope.** They are also
the highest-value retention feature for a Cambodian salon, because no-shows are the real cost.
The cron endpoint above is the whole implementation.

**AI cost runaway.** `messages.cost_micro_usd` records spend but nothing caps it. A single looping
conversation or an abusive Telegram user can generate an unbounded bill. Add a per-business monthly
spend ceiling checked before each model call, and a per-conversation cost cap alongside the
existing `stepCountIs` guard.

**Webhook abuse.** `/api/webhooks/telegram/[connectionId]` is a public URL. It needs the
per-connection secret check (already planned), plus a rate limit per chat id and a body size cap.

**Backups do not exist on the free tier.** Until the Pro upgrade, add a recurring
`pg_dump` to the same cron endpoint, writing to Supabase Storage before real-shop data is used.

**Privacy policy and terms pages gate Meta app review.** They appear in PLAN.md Phase 1's footer
and nowhere else. Messenger review cannot be submitted without them, so keep them in the homepage
surface before any review submission.

**Owner notifications.** When a conversation escalates to `needs_owner`, the owner needs to know
within seconds. Route the notification through the existing Telegram integration once that phase
is active.

---

## 5. Data model additions

Per hard rule 2: `src/lib/types.ts` changes first, `db/schema.sql` follows, `npm run db:test` proves it.

### New in `types.ts`

```ts
export const CATALOG_KINDS    = ['service', 'product'] as const
export const CAPABILITIES     = ['bookings', 'orders', 'storefront', 'invoices'] as const
export const ORDER_STATUSES   = ['draft','pending','confirmed','fulfilled','cancelled'] as const
export const FULFILMENT       = ['pickup', 'delivery', 'dine_in', 'digital'] as const
export const INVOICE_STATUSES = ['draft', 'issued', 'paid', 'void'] as const
```

`BusinessTypeDef` gains `sells: 'time' | 'goods' | 'both'`. All 42 entries get a value: salon and
clinic are `time`, cafe and pharmacy and print_shop are `both`, a shoe shop is `goods`.

### New tables

| Table | Shape | Notes |
|---|---|---|
| `products` | business_id, name, name_en, description, price_minor, currency, sku, stock_qty (null means untracked), photo_url, category, active, sort, attributes | Sibling of `services`, not a replacement. `services` and its 97 assertions stay untouched. |
| `orders` | business_id, customer_id, code, status, channel, fulfilment, address, note, subtotal_minor, delivery_minor, total_minor, currency, placed_at, attributes | `code` is the human-quotable handle, same idea as booking codes. |
| `order_items` | order_id, product_id, service_id, booking_id, name_snapshot, unit_price_minor, qty, line_total_minor | `check (num_nonnulls(product_id, service_id) = 1)`. Name and price are **snapshotted** so editing a product never rewrites history. |
| `invoices` | business_id, number, order_id, booking_id, issued_at, total_minor, currency, status, snapshot jsonb | `unique (business_id, number)`, allocated inside a transaction with `select coalesce(max(number),0)+1 ... for update`. This exact operation is what PostgREST cannot express, and is the clearest single proof of the Drizzle decision. |
| `storefronts` | business_id PK, theme_id, tokens jsonb, content jsonb, draft jsonb, published_at | Draft and published separate, so the AI proposes without going live. |
| `media` | business_id, storage_key, kind, width, height, alt | Supabase Storage keys. Reserved for the storefront phase. |

### Altered

- `payments` gains `order_id uuid references orders(id) on delete set null`. One payment table
  serves bookings and orders, so `v_month_usage` keeps metering correctly.
- `businesses` gains `capabilities text[]`, seeded from the business type's `sells` value but
  owner-editable. This preserves the rule already written at types.ts:46, that the type picks
  defaults and never locks a feature.
- New view `v_catalog` unions `services` and `products` into one shape, so the storefront and the
  agent read one thing rather than branching.

### Multi-vertical, restated

The existing design is already right and must not be replaced: one universal core with per-type
defaults. A hotel is a room resource with a night unit. A tailoring job is a range against a staff
resource. The only real gap was that a shop selling goods had no table, and `products` plus `orders`
closes it. Nothing forks per vertical. The dashboard reads `businesses.capabilities` and shows or
hides a panel. There must never be a per-vertical component tree.

---

## 6. Storefront architecture

**Routing.** `proxy.ts` at the repo root (Next 16 renamed `middleware.ts` to `proxy.ts`, and it runs
on the Node runtime only). It reads the `Host` header, extracts the first label, checks a reserved
list (`app`, `www`, `api`, `admin`, `mail`, `static`), and rewrites `{slug}.moni.cam` to `/s/{slug}`.
`app.moni.cam` rewrites to `/app` and is gated. The apex serves only the waitlist. Local development
uses `{slug}.localhost:3000`, which resolves without hosts-file edits. Vercel needs one wildcard
domain entry for `*.moni.cam`. One Next app, one deploy, no per-tenant provisioning.

**Themes.** `src/themes/registry.ts` holds `THEMES = ['atelier','market','clinic','stay'] as const`
and a `satisfies Record<ThemeId, ThemeModule>` map, so declaring a theme id without implementing it
is a compile error. Each module is `{ id, name, preview, supports: CatalogKind[], Component }` and
every `Component` takes the same `StorefrontData` prop. Themes come from the prior projects,
restyled into the token system.

**Generation.** `src/lib/storefront/content.ts` defines a zod `StorefrontContent` schema (hero,
about, sections, contact, cta). The owner agent fills it with `Output.object`, exactly the pattern
`src/lib/ai/parse.ts` already uses, followed by a `sanityCheck()` mirroring the one there that
catches what a schema cannot. The model also picks a `theme_id` and a small token set, writes to
`storefronts.draft`, and the owner reviews and publishes. The model never emits markup.

**Style, added Phase 12.** A shop's look is now decided in two layers, and the theme is only
the lower one. `src/lib/storefront/style.ts` exports a pure `styleFor(seed, vibe, theme)` that
turns the `storefronts.seed` integer and the model-picked `vibe` into a small set of `--sf-*`
CSS custom properties: an accent and surface pair already clamped past the WCAG contrast floors,
a radius, a type scale and ratio, a section and row rhythm, and a Khmer leading that cannot fall
below 1.75. `getStorefront()` in `src/lib/queries/storefront.ts` calls `styleFor()` once, on the
way out of the query, and hands the result to the page alongside the same `StorefrontData` the
theme has always taken. A theme's `Component` never receives the seed and computes no colour,
radius or spacing of its own: it renders the markup it already rendered before this phase, and an
unlayered `.sf` block in `globals.css` remaps whatever `--sf-*` values are already on the root
onto the runtime variables each theme resolves (`--accent`, `--surface`, `--green`, and so on),
the same cascade-layer technique the Khmer line-height fix already uses.

The style is computed in the query and not inside a theme for the same reason `v_catalog` is one
view and not four branches: a second call site is a second place to disagree. A theme that read
the seed itself could clamp contrast differently from its neighbour, or forget the clamp
entirely, and nothing would catch a real shop's page going unreadable until a person looked at
it. One function, called once, is what makes "no seed produces unreadable Khmer" a claim
`db/test.mjs` can prove rather than a habit each theme is trusted to keep. The same reasoning
sets `src/lib/media/tile.ts`'s `shouldDrawTile()` and `tileFor()` outside the theme layer too: a
product's photoless tile is a property of the row, keyed on the product id, not of whichever
theme happens to be rendering it.

---

## 7. The guardrail harness

Each item maps to a failure already visible in the repository, not to a hypothetical.

| # | Guardrail | Fixes |
|---|---|---|
| G1 | `src/lib/env.ts`, a zod-parsed env object imported at the top of `db.ts` and `models.ts`. Throws at boot naming the missing key. | "Database configured wrong." A missing `SUPABASE_*` key currently surfaces as an opaque runtime failure. |
| G2 | `npm run db:check`: `drizzle-kit pull` into a temp file, diff against the committed schema, exit 1 on drift. In CI. | `src/lib/database.types.ts` is hand-refreshed today and silently drifts from the live schema. That file is deleted. |
| G3 | `customerTools()` and `ownerTools()` typed `satisfies Record<CustomerTool, Tool>`. | Real drift today: `types.ts` declares 9 customer tools but 6 exist; declares 12 owner tools but 14 exist, 5 of them undeclared. This makes that a compile error forever. |
| G4 | `src/lib/api/contracts.ts`: one zod request and response pair per endpoint, plus shared `defineRoute()` and `callApi()` helpers. No new dependency. | Route handlers and their callers agree only by convention today. Also produces the JSON contract the Swift client needs. |
| G5 | Turn on `noUncheckedIndexedAccess` during the post-homepage hardening phase, with `tsc --noEmit` in CI. | The current homepage-first scope keeps the existing compiler setting stable; enabling it is a deliberate later migration, not an instruction for this session. |
| G6 | `StorefrontContent` zod schema plus `sanityCheck()`, and the `satisfies` theme registry. | A bad generation can never render a broken page to a real shop owner. |
| G7 | Extend `scripts/mvp-acceptance.mjs` (already boots a server and asserts against the database) to cover order, invoice and storefront paths. | The best asset in the repo and the migration's safety net. |
| G8 | `.github/workflows/ci.yml` running `tsc --noEmit`, `eslint`, `db:test`, `db:check`, `test:signals`. | There is no CI at all today. |
| G9 | Per-business monthly AI spend ceiling, per-conversation cost cap, webhook rate limit and body cap. | Nothing currently bounds cost or webhook abuse. |
| G10 | Recurring `pg_dump` to Supabase Storage via the cron endpoint, until the Pro upgrade. | Free tier has no backups, so protect data before using real shops. |

---

## 8. Linear sequencing

Work proceeds in this order. Finish the current item's acceptance check before starting the
next item. Do not parallelize work, pull later scope forward, or add an ETA.

| Order | Work | Acceptance |
|---|---|---|
| 1 | Harness, security, and the target database migration. | Database tests, typecheck, lint, and schema checks pass. |
| 2 | Clerk, the waitlist gate, and the public homepage. | A refused member is blocked, a permitted member reaches the app, and the homepage waitlist works in light mode. |
| 3 | Onboarding and voice. | A fresh account reaches a saved shop with a working web chat by voice or text. |
| 4 | Telegram and the complete customer booking loop. | A real phone can book while the owner does nothing. |
| 5 | Owner dashboard, inbox, calendar, and SSE. | A Telegram booking appears on the open dashboard without refresh. |
| 6 | Hosted shop site. | A shop can publish a coherent catalogue and booking or order action. |
| 7 | Payments, orders, stock, and invoices. | A KHQR payment, atomic stock update, and numbered invoice complete end to end. |
| 8 | Messenger and real usage. | Messenger and Telegram conversations land in the same inbox and calendar. |
| 9 | Operations, backup, and rehearsal. | The full acceptance run completes without a save. |

---

## 9. Files

**Later, when building:** `src/lib/env.ts`, `src/lib/db/{schema,client}.ts`,
`src/lib/api/contracts.ts`, `src/lib/auth/require-member.ts`, `src/lib/storefront/content.ts`,
`src/themes/registry.ts`, `proxy.ts`, `drizzle.config.ts`, `.github/workflows/ci.yml`,
`src/app/(marketing)/`, `src/app/s/[slug]/`, `src/app/app/onboarding/`,
`src/app/api/webhooks/telegram/[connectionId]/`, `src/app/api/stream/[businessId]/`,
`src/app/api/cron/tick/`.

**Reuse, never rewrite:** `src/lib/payments.ts`, `src/lib/format/khmer.ts`, `src/lib/ai/models.ts`
and its fallback logic, `src/lib/ai/parse.ts` and its `sanityCheck` pattern, `src/lib/agent/slots.ts`,
`src/components/app/panel.tsx`, `db/test.mjs`, `scripts/mvp-acceptance.mjs`, `scripts/shoot.mjs`.

**Delete when the time comes:** `src/lib/database.types.ts`, `src/lib/queries/demo-business.ts`.

---

## 10. Verification

Nothing is called done until all five pass:

1. `npm run db:test` on PGlite, extended from 97 assertions to cover orders, invoice number
   allocation under concurrency, and the `order_items` single-reference constraint.
2. `npm run db:check` for schema drift.
3. `tsc --noEmit` with the current compiler settings, plus `eslint`. The
   `noUncheckedIndexedAccess` migration is a later hardening task, not a homepage gate.
4. `npm run test:mvp` against a booted server and the live database, extended as each accepted
   feature is added.
5. `npm run shoot` at desktop and mobile widths, viewport shot included, per the `fullPage` and
   Chrome 500px clamp gotchas already recorded in CLAUDE.md.

Two manual checks no script covers: a real phone completing a Telegram booking in Khmer, and a real
shop owner completing onboarding by voice without being told what to say. Run them when the related
phase is active.

---

## Sources

- [vercel/platforms](https://github.com/vercel/platforms), [Vercel multi-tenant middleware and routing](https://vercel.com/docs/platforms/multi-tenant-platforms/middleware-and-routing)
- [Drizzle with Supabase](https://orm.drizzle.team/docs/connect-supabase), [drizzle-kit pull](https://orm.drizzle.team/docs/drizzle-kit-pull), [Drizzle with PGlite](https://orm.drizzle.team/docs/get-started/pglite-existing)
- [Supabase database transactions discussion](https://github.com/orgs/supabase/discussions/526), [Supavisor FAQ](https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI)
- [Supabase Realtime broadcast authorization](https://supabase.com/blog/supabase-realtime-broadcast-and-presence-authorization), [Supabase pricing](https://supabase.com/pricing)
- [vercel/ai-elements](https://github.com/vercel/ai-elements), [AI Elements announcement](https://vercel.com/changelog/introducing-ai-elements)
- [grammY](https://grammy.dev/guide/), [grammY long polling vs webhooks](https://grammy.dev/guide/deployment-types)
- [ts-khqr](https://www.npmjs.com/package/ts-khqr), [bakong-khqr](https://www.npmjs.com/package/bakong-khqr)
- [schedule-x](https://github.com/schedule-x/schedule-x), [FullCalendar](https://fullcalendar.io/)
- [Vercel limits](https://vercel.com/docs/limits), [Vercel cron jobs changelog](https://vercel.com/changelog/cron-jobs-now-support-100-per-project-on-every-plan)
- [ixartz/SaaS-Boilerplate](https://github.com/ixartz/SaaS-Boilerplate), [invoify](https://github.com/al1abb/invoify)
- [next-intl App Router setup](https://next-intl.dev/docs/getting-started/app-router)
- [PostHog vs Sentry](https://posthog.com/blog/posthog-vs-sentry)
- [react-audio-voice-recorder](https://www.npmjs.com/package/react-audio-voice-recorder)
- Cal.com and `cal.diy`: [self-hosted Calendly alternatives, 2026](https://pinggy.io/blog/self_hosted_calendly_alternatives/)
- [Beautiful UI](https://www.beautifului.dev/) AI-native interaction patterns and its [source repository](https://github.com/Kainiko943/beautiful-ui)
- [Velora UI](https://github.com/ColorlibHQ/velora-ui) shadcn registry and [component catalog](https://velora.colorlib.com/components)

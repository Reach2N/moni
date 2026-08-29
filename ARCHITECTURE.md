# Moni: architecture and stack research

Written 29 August 2026. This document is the **end-state architecture**: the data model,
the seams, the guardrails, and the record of which third-party things were adopted and
which were rejected and why.

It sits alongside two other documents and does not replace either:

- `CLAUDE.md` is the harness: hard rules and toolchain gotchas.
- `PLAN.md` is the build order: phases and acceptance checks.
- **This file is the what and the why.** Where it conflicts with PLAN.md on
  architecture, this file wins and PLAN.md is corrected in the same commit, per
  PLAN.md guardrail 8.

---

## Context

Moni is an agentic assistant for Cambodian local businesses. The owner describes the shop
by voice or text, and the catalogue, the booking logic, the customer conversations and the
web store are all derived from that. It is being built for the AI in Motion program, where
70 applicants are cut to 30. The window is roughly nine weeks, from 29 August to the end of
October 2026.

The repository today is about 70% documentation and 10% shipped app. What is built is
genuinely good and must not be thrown away: a 16-table Postgres schema with `tstzrange`
occupancy and a GiST exclusion constraint, 97 PGlite assertions, a model router with
provider-aware fallback, a parse loop whose `sanityCheck()` catches the 100x currency bug,
two agent tool loops, and one polished dashboard. What is missing is everything that makes
it a product: auth, tenancy, marketing, onboarding, voice, Telegram, calendar, inbox,
payment collection, and the design system PLAN.md section 3 already specifies.

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
over Clerk JWTs, which ships the anon key to the browser and makes roughly twenty hand-written
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
| DB client | `@supabase/supabase-js` (PostgREST) | `drizzle-orm` + `postgres` over Supavisor transaction mode | Transactions. Types inferred from schema, so `database.types.ts` stops being a hand-refreshed file that drifts. Portable: moving to Neon or RDS becomes a connection string, not a rewrite. |
| Tenant isolation | RLS policies per table (planned) | One server-side `requireMember()` plus a `businessId` argument on every query | One auditable choke point instead of twenty SQL policies. RLS stays on with zero policies as defence in depth. |
| Live updates | Supabase Realtime (planned) | Own SSE route `GET /api/stream/[businessId]` | Data API stays shut, satisfies the API-first rule, and Swift consumes SSE with `URLSession` and no vendor SDK. |
| LLM gateway | CLAUDE.md said OpenRouter | Vercel AI Gateway | PLAN.md and `package.json` already agreed. CLAUDE.md was the stale document and is corrected. |

Supabase keeps two jobs: managed Postgres, and Storage for shop photos. `@supabase/supabase-js`
stays installed for Storage uploads only.

**One configuration detail that will bite otherwise:** under Supavisor transaction mode you must
set `prepare: false` on the postgres.js client. Without it, the second request to any route fails
with "prepared statement already exists", because transaction mode cannot share named prepared
statements across sessions.

---

## 3. What not to build, because it exists

Every capability in scope, checked against what already ships. Adoption is only recommended
where it survives the project's own rules: MIT or similarly permissive, restylable into the
black/white/green token system, and not carrying its own database.

### Adopt

| Need | Take | Why it wins |
|---|---|---|
| **Agent execution trace** | **21st.dev Agent Elements ToolGroup** (local adaptation) | The repository already owns a strict Khmer adaptation at `src/components/app/owner-tool-trace.tsx`. It retains grouped disclosure and step states without importing Agent Elements' Base UI, Tabler, or theme variables. |
| **Agent approval gate** | **Beautiful UI Approval Card** (local adaptation) | Owner mutations need a visible human decision. `src/components/agent/approval-card.tsx` makes the proposed command, scope, and confirm/cancel actions reusable and testable instead of hiding them in a generic modal. |
| **Chat and composer UI** | **AI Elements** (`vercel/ai-elements`) for the future streaming surface; **Moni Prompt Bar** for current owner/customer flows | AI Elements remains the long-term AI SDK integration candidate. The current `src/components/agent/prompt-bar.tsx` adopts the 21st.dev InputBar interaction model while composing Moni's existing shadcn Textarea/Button, so it works with today's JSON endpoints and can grow into attachments, voice, modes, and model selection without another composer fork. |
| **Telegram** | **grammY** | Typed update objects and `webhookCallback` for serverless, which is precisely the fiddly part. TS-native, actively maintained. Keep the agent loop outside grammY middleware so Messenger reuses it unchanged. |
| **Transactional email** | **react-email** with Resend | Same vendor as the already-chosen sender. Templates are React, so the Khmer `line-height: 1.75` rule applies naturally instead of fighting inlined email CSS. Ships receipt and invoice templates. |
| **Voice capture** | **Nothing. Hand built** at `src/lib/voice/use-recorder.ts` (~90 lines), searched and rejected 29 August 2026 | This row used to say adopt `react-audio-voice-recorder` or equivalent. The search was done and nothing survived it. AI Elements, which this row said to check first, ships 30 components and **not one touches `getUserMedia` or `MediaRecorder`**, so there is no voice component there at all. On npm, `react-audio-voice-recorder` has not been published since September 2023 and depends on `@ffmpeg/ffmpeg`, a WASM build in the bundle; `react-media-recorder` is maintained but pulls the `extendable-media-recorder` plus wav-encoder worklet chain; `use-audio-recorder` is a 2022 stub. All three exist to transcode, and we want the browser's own Opus in webm and nothing else. The hook owns only the fiddly part: permission states, elapsed time, a duration cap, releasing the microphone, and refusing `audio/mp4` (CLAUDE.md records it being silently ignored, and Safari's MediaRecorder reaches for it first). |
| **Subdomain routing** | Read `vercel/platforms`, copy the pattern, install nothing | Its `proxy.ts` handles subdomain extraction across local, preview and production hosts, which is the part that wastes a day. The rest of the kit is a blog CMS on its own schema and would fight the existing 16 tables. Its Vercel Domains API usage becomes relevant later for custom domains. |
| **Invoice document** | Steal the markup from `invoify` or a Postmark receipt template | Render as a Next route with a print stylesheet. Browser makes the PDF. No PDF library in the serverless bundle. |
| **Observability** | **PostHog only** | Free tier is 100k errors and 5k session recordings against Sentry's 5k and 50, and it bundles product analytics and feature flags. For a program application, evidence of usage (shops onboarded, bookings completed, onboarding funnel) is worth more than stack traces. One script, one vendor. Add Sentry later only if error volume justifies it. |
| **Structural UI shells** | shadcn blocks (sidebar, dashboard shells), Origin UI | They install as source and get restyled, which is already the project's rule. |

### Reject, with the reason recorded so it is not revisited

| Candidate | Verdict |
|---|---|
| **Cal.com / cal.diy** | Wrong model, not just heavy. Cal.com does *personal* scheduling: one person, calendar sync, event types. Moni does *resource occupancy*: three chairs, twelve hotel rooms, two repair bays, with a database-level exclusion constraint preventing double-booking. That is a different and, here, better model. `agent/slots.ts` (121 lines) already computes free slots correctly. Adopting Cal.com means running a second schema and syncing it. Also relevant: Cal.com went closed-source in April 2026; only the MIT fork `cal.diy` remains, with Teams and Workflows dropped. |
| **FullCalendar** | Its core is MIT but **resource timeline is a paid plugin**, and resource lanes are exactly what a salon calendar is. Evaluate **schedule-x** (fully MIT) for resource views first; if it lacks them, hand-build, because UI-PLAN.md already specs roughly 150 lines of CSS grid and it needs Khmer line height and `formatMoney()` anyway. |
| **SaaS boilerplates** (`ixartz/SaaS-Boilerplate`, Next.js SaaS Starter, Open SaaS) | If the repo were empty, `ixartz` would be the right answer: MIT, Next 16, Clerk, Drizzle, Tailwind v4, multi-tenancy, Playwright, CI. The repo is not empty, and its domain schema is better than any boilerplate's. Adopting one means porting a good schema into someone else's conventions. **Mine it for three things only:** the Clerk-plus-Drizzle wiring, the tenant resolution pattern, and the Playwright and CI setup. |
| **next-intl** | Two independent reasons. It requires a `[locale]` route segment, which restructures every route and fights the subdomain rewrite. And CLAUDE.md documents that Node and Chrome disagree on `km-KH` number separators, a hydration mismatch on every money string; next-intl's formatter walks straight back into it. Use a plain `messages/{km,en}.ts` dictionary, keep money in the existing `formatMoney()` and `toKhmerDigits`. Khmer has no plural forms, so ICU pluralization buys nothing. Roughly twenty lines beats a library here. |
| **tweakcn presets** | PLAN.md section 3 specifies exact Apple semantic token names so a SwiftUI port is find-and-replace. A generated preset destroys that mapping. Hand-write the token block once. |
| **Medusa / Saleor / Vendure** | Each is a full backend with its own database and admin. Products and orders for a shop with under fifty SKUs is two tables. |
| **Prisma** | Heavier, worse on serverless, and a second migration system. |
| **tRPC** | Breaks the API-first rule: a Swift client cannot consume it. oRPC is the honest upgrade later because it emits OpenAPI, but adopting it now is a refactor with no payoff inside nine weeks. |
| **A second database for customers** | One Postgres, `business_id` on every row. A second store doubles the failure surface, breaks every join, and invents a consistency problem that does not currently exist. |
| **uploadthing / Vercel Blob** | Supabase Storage is already provisioned. One vendor. |
| **Redis, a queue, a monorepo, Instagram, TikTok** | No payoff in the window. Instagram and TikTok each need their own app review, measured in weeks. |
| **AI-generated storefront markup** | The model fills a validated content object and never emits markup, so a bad generation is a bad string and never a white screen shipped to a real shop owner. |

### The KHQR question specifically

`src/lib/payments.ts` is ported from working production code and CLAUDE.md forbids simplifying
its PORTED comments, which carry bugs already paid for once. Keep it. But `ts-khqr` (v2.2.2,
actively maintained) exists, so **write one test that generates the same payload through both and
asserts they match**. If the TLV encoding or CRC diverges, one of them is wrong, and you want to
find that out before a customer scans a bad QR, not after. That is a test, not a dependency. Add
`qrcode` only for rendering the payload to an image.

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

**Booking reminders are a Tier 1 feature in FEATURES.md and absent from PLAN.md.** They are also
the highest-value retention feature for a Cambodian salon, because no-shows are the real cost.
The cron endpoint above is the whole implementation.

**AI cost runaway.** `messages.cost_micro_usd` records spend but nothing caps it. A single looping
conversation or an abusive Telegram user can generate an unbounded bill. Add a per-business monthly
spend ceiling checked before each model call, and a per-conversation cost cap alongside the
existing `stepCountIs` guard.

**Webhook abuse.** `/api/webhooks/telegram/[connectionId]` is a public URL. It needs the
per-connection secret check (already planned), plus a rate limit per chat id and a body size cap.

**Backups do not exist on the free tier.** Until the Pro upgrade in demo week, add a weekly
`pg_dump` to the same cron endpoint, writing to Supabase Storage. Real shops will be entering real
data from week 5.

**Privacy policy and terms pages gate Meta app review.** They appear in PLAN.md Phase 1's footer
and nowhere else. Messenger review cannot be submitted without them, and review is the long pole,
so they ship in week 2, not week 8.

**Owner notifications.** When a conversation escalates to `needs_owner`, the owner needs to know
within seconds. A Telegram message to the owner's own chat is roughly ten lines once the bot
exists, and is worth more than most of the dashboard.

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
| `media` | business_id, storage_key, kind, width, height, alt | Supabase Storage keys. Reserved now, filled week 6. |

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

---

## 7. The guardrail harness

Each item maps to a failure already visible in the repository, not to a hypothetical.

| # | Guardrail | Fixes |
|---|---|---|
| G1 | `src/lib/env.ts`, a zod-parsed env object imported at the top of `db.ts` and `models.ts`. Throws at boot naming the missing key. | "Database configured wrong." A missing `SUPABASE_*` key currently surfaces as an opaque runtime failure. |
| G2 | `npm run db:check`: `drizzle-kit pull` into a temp file, diff against the committed schema, exit 1 on drift. In CI. | `src/lib/database.types.ts` is hand-refreshed today and silently drifts from the live schema. That file is deleted. |
| G3 | `customerTools()` and `ownerTools()` typed `satisfies Record<CustomerTool, Tool>`. | Real drift today: `types.ts` declares 9 customer tools but 6 exist; declares 12 owner tools but 14 exist, 5 of them undeclared. This makes that a compile error forever. |
| G4 | `src/lib/api/contracts.ts`: one zod request and response pair per endpoint, plus a roughly 60-line `defineRoute()` and `callApi()`. No new dependency. | Route handlers and their callers agree only by convention today. Also produces the JSON contract the Swift client needs. |
| G5 | `noUncheckedIndexedAccess: true` now, plus `tsc --noEmit` in CI and a pre-commit hook. | CLAUDE.md defers this to "after the demo". At 68 files it is a morning. After the demo it is a week. |
| G6 | `StorefrontContent` zod schema plus `sanityCheck()`, and the `satisfies` theme registry. | A bad generation can never render a broken page to a real shop owner. |
| G7 | Extend `scripts/mvp-acceptance.mjs` (813 lines, already boots a server and asserts against the database) to cover order, invoice and storefront paths. | The best asset in the repo, and what makes the week 1 migration provably safe. |
| G8 | `.github/workflows/ci.yml` running `tsc --noEmit`, `eslint`, `db:test`, `db:check`, `test:signals`. | There is no CI at all today. |
| G9 | Per-business monthly AI spend ceiling, per-conversation cost cap, webhook rate limit and body cap. | Nothing currently bounds cost or webhook abuse. |
| G10 | Weekly `pg_dump` to Supabase Storage via the cron endpoint, until the Pro upgrade. | Free tier has no backups, and real shop data starts arriving in week 5. |

---

## 8. Sequencing

The booking spine is the part a real shop can use on day one. Storefront, orders and invoices are
demo breadth. Finish the spine first, get real shops onto it in week 5, and build breadth while
they generate real usage. Twelve real shops and four hundred real bookings beats any feature list
in front of a shortlist panel.

| Week | Work | Acceptance |
|---|---|---|
| 1 (Sep 1) | **Harness plus the fused migration.** G1, G2, G5, G8. Drizzle replaces supabase-js across `lib/queries/*`, `agent/tools.ts`, `agent/owner-tools.ts`, `agent/slots.ts`, `setup/persist.ts`, each function gaining a `businessId` argument in the same pass. G3 and G4 land here. New design tokens replace the Invitation palette in `globals.css`. | `db:test` and `test:mvp` both pass against rewritten queries. `sokha-beauty` appears nowhere. Tokens render light and dark. |
| 2 (Sep 8) | **Clerk, the gate, the landing page.** `proxy.ts`, `requireMember()`, waitlist form, Resend confirmation via react-email, privacy and terms pages, PostHog. | A non-waitlisted email is refused. Two members cannot read each other's rows, tested at the database level. |
| 3 (Sep 15) | **Onboarding and voice.** `/onboarding` composer on AI Elements, `useAudioRecorder` webm as an AI SDK `file` part, editable catalogue table, `ai_instructions`. `products` and `capabilities` ship in the schema here. | A fresh account reaches a saved shop with a working web chat in under three minutes, by voice alone. |
| 4 (Sep 22) | **Telegram** via grammY, the full customer booking loop, owner escalation notifications, the cron endpoint and reminders. | A real phone books end to end while the owner does nothing. A reminder arrives 1 hour before. |
| 5 (Sep 29) | **Dashboard, inbox, calendar, SSE.** Rebuilt in the new language. **First real shops onboarded.** | A Telegram booking appears on an open dashboard in under two seconds, right amount, right currency. |
| 6 (Oct 6) | **Storefront.** Subdomain routing, four themes, AI content generation, draft and publish, media uploads. | Three different verticals produce three coherent live sites on their own subdomains. |
| 7 (Oct 13) | **Money.** Implement `create_payment` and `check_payment`, wire `payments.ts`, the `ts-khqr` cross-check test, orders and stock, numbered invoices. | A customer pays by KHQR in Telegram, stock decrements atomically, a numbered invoice renders. |
| 8 (Oct 20) | **Messenger and real usage.** Meta test-user flow, same inbox. Onboard to target shop count. Fix what real owners actually broke. | A test-user conversation books into the same inbox and calendar as Telegram. |
| 9 (Oct 27) | **Supabase Pro, rehearsal, buffer.** | The demo runs three times without a save. |

Weeks 8 and 9 carry the slack. If something slips, Messenger is cut first, because PLAN.md already
records that Meta review gates public availability and not the demo.

---

## 9. Files

**Later, when building:** `src/lib/env.ts`, `src/lib/db/{schema,client}.ts`,
`src/lib/api/contracts.ts`, `src/lib/auth/require-member.ts`, `src/lib/storefront/content.ts`,
`src/themes/registry.ts`, `proxy.ts`, `drizzle.config.ts`, `.github/workflows/ci.yml`,
`src/app/(marketing)/`, `src/app/s/[slug]/`, `src/app/onboarding/`,
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
3. `tsc --noEmit` with `noUncheckedIndexedAccess` on, plus `eslint`.
4. `npm run test:mvp` against a booted server and the live database, extended each week.
5. `npm run shoot` at desktop and mobile widths, viewport shot included, per the `fullPage` and
   Chrome 500px clamp gotchas already recorded in CLAUDE.md.

Two manual checks no script covers, weekly from week 4: a real phone completing a Telegram booking
in Khmer, and a real shop owner completing onboarding by voice without being told what to say.

---

## Sources

- [vercel/platforms](https://github.com/vercel/platforms), [Vercel multi-tenant middleware and routing](https://vercel.com/docs/platforms/multi-tenant-platforms/middleware-and-routing)
- [Drizzle with Supabase](https://orm.drizzle.team/docs/connect-supabase), [drizzle-kit pull](https://orm.drizzle.team/docs/drizzle-kit-pull), [Drizzle with PGlite](https://orm.drizzle.team/docs/get-started/pglite-existing)
- [Supabase database transactions discussion](https://github.com/orgs/supabase/discussions/526), [Supavisor FAQ](https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI)
- [Supabase Realtime broadcast authorization](https://supabase.com/blog/supabase-realtime-broadcast-and-presence-authorization), [Supabase pricing](https://supabase.com/pricing)
- [vercel/ai-elements](https://github.com/vercel/ai-elements), [AI Elements announcement](https://vercel.com/changelog/introducing-ai-elements)
- [grammY](https://grammy.dev/guide/), [grammY long polling vs webhooks](https://grammy.dev/guide/deployment-types)
- [ts-khqr](https://www.npmjs.com/package/ts-khqr), [bakong-khqr](https://www.npmjs.com/package/bakong-khqr)
- [schedule-x](https://github.com/schedule-x/schedule-x), [FullCalendar licensing](https://fullcalendar.io/license)
- [Vercel limits](https://vercel.com/docs/limits), [Vercel cron jobs changelog](https://vercel.com/changelog/cron-jobs-now-support-100-per-project-on-every-plan)
- [ixartz/SaaS-Boilerplate](https://github.com/ixartz/SaaS-Boilerplate), [invoify](https://github.com/al1abb/invoify)
- [next-intl App Router setup](https://next-intl.dev/docs/getting-started/app-router)
- [PostHog vs Sentry](https://posthog.com/blog/posthog-vs-sentry)
- [react-audio-voice-recorder](https://www.npmjs.com/package/react-audio-voice-recorder)
- Cal.com licence change and the `cal.diy` MIT fork: [self-hosted Calendly alternatives, 2026](https://pinggy.io/blog/self_hosted_calendly_alternatives/)
- [Beautiful UI](https://www.beautifului.dev/) AI-native interaction patterns and its [MIT source repository](https://github.com/Kainiko943/beautiful-ui)
- [Velora UI](https://github.com/ColorlibHQ/velora-ui) MIT shadcn registry and [component catalog](https://velora.colorlib.com/components)

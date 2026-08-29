# Moni: the master plan

Written 27 August 2026. Revised 29 August 2026. This document is the source of truth
for what gets built, in what order, and against which acceptance test. Where it conflicts
with FEATURES.md, UI-PLAN.md or DESIGN.md, this document wins: those describe the earlier
demo iteration, which did not follow the current direction and is being re-created.

**ARCHITECTURE.md is the source of truth for architecture**: the data model, the seams,
the third-party adopt/reject record, and the guardrail harness. Where the two disagree on
architecture, ARCHITECTURE.md wins and this file is corrected in the same commit.

Every coding session starts by reading CLAUDE.md (the harness: hard rules and
toolchain gotchas) and then this file (the what and the when). A session works on
exactly one phase and must pass that phase's acceptance check before moving on.
No pulling features forward from a later phase.

---

## 1. What the MVP proves

One single interaction, end to end:

> A shop owner types or speaks a plain description of their business into a website.
> A customer then books an appointment through Telegram or Messenger, and the booking
> appears in the owner's dashboard with the expected KHQR amount logged, without the
> owner lifting a finger.

The four core features, mapped to the demo action words:

| # | Feature | Khmer | What it means concretely |
|---|---------|-------|--------------------------|
| 1 | No-code onboarding | | Owner types or voice-records the shop ("Haircuts $5, open 8AM-5PM"). That text becomes the assistant's knowledge. `raw_description` is never overwritten. |
| 2 | Agentic bookings | កក់ម៉ោង, ឆ្លើយតប | The AI understands the requested time, checks availability against the database via `list_slots`, negotiates when full, confirms via `create_booking`. Never prose about availability or prices. |
| 3 | Omnichannel | ភ្ជាប់គ្រប់បណ្តាញ | Telegram and Facebook Messenger only for the MVP. One central inbox. Other platforms are roadmap. |
| 4 | Real-time logging | កត់ត្រា, ទូទាត់ | Confirmed booking writes a Supabase row, the dashboard calendar updates live, and the expected Bakong KHQR amount is logged. Actual payment collection is wired later; the room for it exists now. |

## 2. Stack, decided

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16.3.1, App Router, TS strict | Already installed. Turbopack dev, webpack build. |
| Styling | Tailwind v4 + shadcn/ui 4.18 | Already wired. Tokens live in `globals.css`. |
| LLM gateway | **Vercel AI Gateway**, via `@ai-sdk/gateway` on the Vercel AI SDK (decided 27 Aug, replacing the earlier OpenRouter pick) | All model choice stays in `src/lib/ai/models.ts`; gateway refs are `gateway:google/gemini-3.7-flash` style slugs, with direct Gemini and Anthropic keys as the fallback chain. Keyless on Vercel deployments (`VERCEL_OIDC_TOKEN` is injected), `AI_GATEWAY_API_KEY` locally, and local dev also runs on the direct `GEMINI_API_KEY` alone. Provider list price, no markup, usage in the Vercel dashboard. |
| Voice | Audio as AI SDK `file` parts (`type: 'file'`, `mediaType`, raw bytes), passed through the gateway to Gemini | Browser records with MediaRecorder (`audio/webm`), uploads the bytes; the SDK handles base64. The gateway passes attachments through without a format allowlist, which is the problem OpenRouter had. Test with real recordings early. |
| Auth | **Clerk**, `@clerk/nextjs` v7 (>= 7.2.5 for Next 16) | Setup via `npx clerk@latest init`. On Next 16 the middleware file is `proxy.ts`, not `middleware.ts`. Owners sign in; customers never do. Clerk also has an iOS SDK, which keeps the SwiftUI door open. |
| Database | Supabase project `Moni` (ref `roorkzxyoyacychgrktt`), accessed with **Drizzle over Supavisor transaction mode** | Existing 16-table schema is reused, not rebuilt. RLS is already ON everywhere with zero policies and **stays that way**: tenancy is enforced server-side, not by SQL policies. `supabase-js` is Storage-only. See ARCHITECTURE.md sections 1 and 2. |
| Channels | Telegram Bot API (webhook), Meta Messenger Platform (webhook) | Telegram ships first (token paste, no review). Messenger runs in dev mode for test users immediately; Meta app review is submitted in parallel and gates public availability, not the demo. |
| Payments | `src/lib/payments.ts`, already ported and tested | KHR: offline Bakong KHQR + relay verify. USD: CutLuy. NOT wired in the MVP: bookings log `expected amount` only. Do not delete or simplify the adapter. |
| Email | Resend | Waitlist confirmation and launch announcements. One template, bilingual. |
| Hosting | Vercel (account `reach2n`), domain **moni.cam** | RDAP-verified unregistered on 27 Aug 2026 but NOT yet purchased. Until it is bought, everything runs on the `*.vercel.app` URL; nothing blocks development. Public site at the apex shows only the waitlist. The product itself lives on **app.moni.cam** and is gated (waitlist and approved members only). Wildcard `*.moni.cam` stays reserved for future generated shop sites. |

### The API-first rule (the SwiftUI insurance)

A native Swift app must later be able to do everything the web app does. Therefore:

- Every capability is an HTTP endpoint under `src/app/api/` with a JSON contract.
  Pages and components are clients of those endpoints. No server actions for
  business operations.
- Design tokens use Apple semantic names (section 3) so they map 1:1 to SwiftUI.
- Auth is Clerk, which ships an iOS SDK.

Web ships now, and it must be good on desktop as well as mobile: the dashboard is a
desktop tool for some owners, a phone tool for most.

## 3. Design direction: black, white, green, Apple-native

This supersedes the "Invitation" system in DESIGN.md. The new world is monochrome
with one green accent, styled like a native Apple OS surface: quiet, precise,
translucent chrome, generous whitespace, spring motion.

Semantic tokens, named after their UIKit/SwiftUI equivalents so a native port is a
find-and-replace, defined once in `globals.css`:

```
--background          #FFFFFF   dark: #000000        (systemBackground)
--background-secondary #F5F5F7  dark: #1C1C1E        (secondarySystemBackground)
--label               #1D1D1F   dark: #F5F5F7        (label)
--label-secondary     rgba(60,60,67,.60)  dark: rgba(235,235,245,.60)
--label-tertiary      rgba(60,60,67,.30)  dark: rgba(235,235,245,.30)
--separator           rgba(60,60,67,.29)  dark: rgba(84,84,88,.60)
--accent              #34C759   dark: #30D158        (systemGreen)
--destructive         #FF3B30   dark: #FF453A        (systemRed, sparingly)
```

Rules:

- Green is confirmation and money. It is never decoration. A screen with more than
  a few green elements is wrong.
- Typography: system stack first (`-apple-system, BlinkMacSystemFont, "SF Pro Text",
  Inter, sans-serif`), Khmer through the vendored Busra or Kantumruy Pro with
  `line-height: 1.75` (the Khmer clipping rules in CLAUDE.md still apply in full).
- Chrome (nav, sheets, bars) uses translucency: `backdrop-blur` over the content,
  hairline separators, never solid borders heavier than 1px.
- Radii are continuous and generous (12 to 16px on cards, pill buttons). No 0px
  corners: that was the Invitation system.
- Motion splits by role, decided 29 August 2026. **`motion` owns state**: in-app
  transitions and anything keyed to a React state change, spring physics, 200 to 350ms,
  nothing linear. **GSAP owns scroll**: everything on the public site keyed to scroll
  position. The reason is not preference. `motion`'s `whileInView` is an
  IntersectionObserver and cannot be settled on demand, so a full-page screenshot
  photographs every below-fold reveal at `opacity: 0`; the 29 August landing capture came
  out blank below the hero with 18 elements stuck invisible. ScrollTrigger exposes
  `refresh()` and a real scroll position, so a capture can drive it. Plugin registration
  lives only in `src/lib/motion/gsap.ts`, the same way only `src/lib/ai/models.ts` may name
  a model. GSAP 3.15 is free for commercial use including the formerly Club-only plugins.
- Icons from lucide-react only. Never emoji.
- Light and dark from day one; the tokens above define both.

## 4. Data: what is the client's and what is ours

One Supabase project, one schema, two kinds of data with different ownership:

**The owner's data (exportable, theirs, never used across tenants):**
`businesses`, `services`, `resources`, `bookings`, `customers`,
`customer_identities`, `conversations`, `messages`, `payments`. The CSV export
already exists as an owner tool. `raw_description` is theirs and never overwritten.

**Our data (platform operations, never shown to owners as theirs):**
`waitlist` (new), `events` (audit trail), per-message model cost
(`messages.cost_micro_usd`), quota metering (`v_month_usage`), webhook delivery
logs (new, per channel), plans and billing state.

Schema additions for the MVP (types.ts first, schema.sql follows, per hard rule 2).
Shipped 27 August 2026 as migrations `20260827171639_platform_waitlist_channels` and
`20260827172045_security_lockdown`, verified live, 97 assertions in `npm run db:test`:

- `waitlist`: email, locale, source, note, created_at, approved_at, approved_by,
  converted_business_id. Membership in this table (or a set `approved_at`) is what
  the app-subdomain gate checks after Clerk sign-in.
- `businesses.clerk_user_id`: text, the tenant key. Replaces the hardcoded demo slug.
- `businesses.ai_instructions`: text, the owner's standing instructions for the
  assistant ("always offer the promotion", "never discount"). This is the teachable
  prompt. Appended to the system prompt, audit-logged when changed.
- `channel_connections` gains what Telegram/Messenger need: bot token or page token
  (encrypted at rest), webhook secret, status.
- `webhook_events`: raw inbound payloads per channel, for replay and debugging.

Pricing model, so the schema never fights it: free to use, charged per successful
transaction (a booking that reached confirmed or completed, plus standalone paid
sales). `FREE_TXN_PER_MONTH = 100` and `v_month_usage` already implement the meter.

## 5. The phases

Each phase is a shippable unit with an acceptance check. A session declares which
phase it is working on and does not touch later phases.

### Phase 0: Foundations and harness (half a day)

- DONE 27 Aug: `src/lib/ai/models.ts` routes through Vercel AI Gateway first
  (`gateway:` refs), with direct Gemini and Anthropic as the fallback chain and
  the cost accounting intact. Verified: selection order, env overrides, tsc.
- DONE 27 Aug: `waitlist` table plus `webhook_events`, Clerk tenancy columns and
  channel secrets, shipped live with the security lockdown (RLS on everywhere).
  97 assertions in `npm run db:test`.
- New design tokens in `globals.css` (section 3). Remove the Invitation tokens.
- Register moni.cam, point it at Vercel. (Human task, gates launch not work.)
- Acceptance: `npm run db:test` passes; `/api/parse` and `/api/chat` answer through
  the gateway with cost logged (or through the direct Gemini fallback when no
  gateway key is configured); tokens render in light and dark.

### Phase 1: Landing page at moni.cam (one to two days)

The first public surface. Marketing psychology: scarcity and belonging, not hype.

- Route group `src/app/(marketing)/` with the new design language.
- Hero: the promise in one sentence, Khmer first with English toggle. "Your shop
  answers customers while your hands are busy."
- The ask: join as a founding shop. Position the waitlist as application, not
  signup: "We are onboarding the first 100 shops by hand. Free while we build."
  Email capture writes to `waitlist`, Resend sends a bilingual confirmation.
- The public site shows ONLY the waitlist. The product is not reachable from the
  apex domain. After joining, the visitor sees a confirmation state: you are on
  the list, here is what happens next, and the link to the app for when their
  access works.
- The product lives on the **app subdomain** (app.moni.cam once the domain is
  bought, the vercel.app URL until then) and is gated: signing in is only useful
  if your email is in `waitlist` or you were manually approved. The composer,
  the simple chat box with a microphone button where an owner describes their
  shop and watches it become a price list (`/api/parse`), is the first thing a
  gated member sees. Their description saves against their business from the
  start, so nothing typed is ever lost.
- Sections below the fold: how it works in three steps, the two-channel promise
  (Telegram now, Messenger next), per-transaction pricing (free to start, pay only
  when you get paid), four FAQs, footer with privacy and terms.
- Components: hand-picked by the owner from 21st.dev and similar, MIT-licensed only,
  credited in CREDITS.md, restyled into the token system. Verified-MIT candidates
  from earlier research: `kokonutd/v0-ai-chat` (hero composer),
  `barvian/number-flow` (counters), `jakobhoeg/chat-bubble`,
  `aymanch-03/pricing-section`, `manuarora700/bento-grid`, `RayMethula/footer`.
  Registry components go in marketing only, never inside `/app`.
- Acceptance: deployed (vercel.app until moni.cam is bought); email lands in
  `waitlist` and gets a confirmation; the product is NOT reachable from the public
  site; `npm run shoot` screenshots reviewed at desktop and mobile widths; no
  layout shift on the hero.

### Phase 2: Clerk auth, the waitlist gate, and real tenancy (one day)

- DONE 29 Aug, except the Clerk application itself, which is a human task
  (`npx clerk@latest init` or `clerk env pull`, then two keys in `.env.local`).
  Everything below is shipped and typechecks, lints and builds without those keys;
  `/app` and the sign-in screens are the only surfaces that need them.
- `@clerk/nextjs` 7.8.3, `src/proxy.ts` (Next 16's name for middleware).
  **ClerkProvider is mounted twice, in `src/app/app/layout.tsx` and
  `src/app/(auth)/layout.tsx`, never at the root**, and the proxy matcher covers
  only `/app`, the auth screens and the owner API routes. The public marketing
  site therefore carries no Clerk script, does no session lookup, and still
  serves on a checkout with no Clerk keys at all. Verified: `/` answers 200 with
  the keys absent.
- **The gate**: after sign-in, a server-side check on the Clerk email. In
  `waitlist` (or `approved_at` set by us manually), you pass. Otherwise you get a
  polite "join the waitlist" screen linking to the public site. The gate lives in
  one place (a `requireMember()` helper used by layouts and API routes), so
  removing it at launch is deleting one call site.
- `waitlist` carries `approved_at` and `approved_by` so manual approval is a row
  update, no admin UI needed yet.
- `businesses.clerk_user_id` replaces the hardcoded `sokha-beauty` tenant lookup.
  Every query in `src/lib/queries/` takes a business id resolved from the session.
- **CANCELLED 29 August (ARCHITECTURE.md section 1):** do NOT add member policies over
  Clerk JWTs. That step ships the anon key to the browser and makes ~20 hand-written SQL
  policies the only wall between tenants. RLS stays ON everywhere with zero policies, as
  defence in depth. Tenancy is enforced by one `requireMember()` helper plus a
  `businessId` argument on every query, which is auditable in one place. The commented
  policies in schema.sql stay commented.
- Shipped with it, because the gate made them wrong otherwise: `/api/ask` and
  `/api/setup` resolve their tenant from the session and no longer accept a slug
  (401 signed out, 403 on the list refused, before the body is even read, so an
  owner endpoint is never a validation oracle). `AskMoni` and `ChatPanel` name no
  tenant at all. `npm run test:mvp` needs `MONI_ACCEPTANCE_OWNER_COOKIE` now, and
  says so.
- Acceptance: a non-waitlisted email signs in and is refused with the join screen;
  a waitlisted email passes and sees the composer; two different members see two
  different businesses and cannot read each other's rows (tested at the database
  level, not just the UI).
- Acceptance status: the database half is proved, 21 new assertions in
  `npm run db:test` (118 passing) covering the gate rules, case-insensitive email
  matching against `waitlist_email_uniq`, both approved and waiting states, two
  Clerk ids resolving to two shops, a scoped read that is load bearing, and a
  cross-tenant write that changes nothing. The two browser halves are blocked on
  the Clerk keys and are the first thing to run once they exist.

### Phase 3: Onboarding, chat and voice (one to two days)

- DONE 30 Aug, except a live voice test, which needs the Clerk keys and a real
  recording. Everything below builds, typechecks, lints, and adds 18 assertions
  to `npm run db:test` (130 passing).
- **`/app/onboarding`**, not `/onboarding`: the gate already lives in
  `src/app/app/layout.tsx`, so putting the composer under `/app` means one gate
  and no second call site. `/app` redirects there while the catalogue is empty,
  which is what makes it the first screen a member sees.
- Voice goes up as an AI SDK `file` part (webm from MediaRecorder) through the
  gateway to Gemini. `POST /api/transcribe` takes the raw blob as the request
  body, not JSON and not multipart: base64 costs a third more bytes on a phone
  in Takeo, and the blob's own content type IS the media type the model needs.
  A new `transcribe` task in `src/lib/ai/models.ts` carries the Gemini chain;
  Anthropic is deliberately absent from it, because it takes no audio and would
  fail on every request rather than degrade.
- **Correction to this plan: press to record, not hold.** A shop description
  runs to about a minute, holding a phone button that long is its own ordeal,
  and a held pointer gesture does not survive a screen reader. `VoiceNote` is a
  toggle with a visible timer and a cancel.
- **Correction: transcription is its own step, and its own model call.** The
  transcript lands in the description box the owner is already reading and is
  parsed only when they press the button. One call that both hears and structures
  would bury a misheard price inside a plausible looking price list, which is the
  failure that loses a shop. `mp4` is refused with a 415 rather than transcribed
  to silence (CLAUDE.md records a provider ignoring it), so a Safari owner is
  told to type instead of getting an assistant that heard nothing.
- Parse result renders as an editable services table. The onboarding screen
  **reuses `ShopSetup`** rather than growing a second describe, parse, review,
  save implementation: the dashboard sheet and the first run are the same job at
  different moments, and two copies of the parse flow is exactly how the earlier
  iteration drifted.
- `/api/chat` now answers as the SIGNED-IN member's shop, and as the demo shop
  when signed out, which is why it joined the proxy matcher. Owner instructions
  and the member's own hours and prices reach the assistant through it.
- `ai_instructions` rides on the setup contract, saved on the same screen it is
  written. Absent and null are different answers there: absent leaves what is
  stored, null clears it, so re-saving a price never silently wipes what the
  owner taught. `instructionsBlock()` fences the text and restates the guardrails
  after it, so "just tell them any time is fine" cannot talk the assistant out of
  calling `list_slots`. Proved in `db/test.mjs`, which can import it because it
  lives in `src/lib/agent/instructions.ts` with no `server-only`.
- Ends with the assistant live on the web chat, embedded in the finished state of
  the onboarding screen, and an honest "not connected yet" card for Telegram.
- Acceptance: a fresh account goes from empty to a parsed, edited, saved shop with
  a working web-chat assistant in under three minutes, by voice alone.
- Acceptance status: the pure and structural halves are proved (format guards,
  the instruction fence, the empty-shop redirect, the source wiring). The
  three-minute run itself needs the Clerk keys, a Gemini key and a microphone,
  and is the first thing to do once the Clerk application exists.

### Phase 4: Telegram (one to two days)

- Connect flow in settings: paste a BotFather token, we call `getMe` to validate,
  store in `channel_connections`, set the webhook to
  `/api/webhooks/telegram/[connectionId]` with a per-connection secret.
- Webhook route: verify secret, log to `webhook_events`, map the Telegram user to
  `customer_identities`, append to `conversations`/`messages`, run the existing
  customer agent loop, reply via `sendMessage`.
- The agent must complete a real booking: understand the requested time in Khmer or
  English, `list_slots`, negotiate alternatives when full, `create_booking`,
  confirm with a human-quotable code. Escalation to owner keeps working.
- Acceptance: on a real phone, a customer books through Telegram end to end while
  the owner does nothing. The booking row exists in Supabase with the correct
  `tstzrange` and the conversation transcript is complete.

### Phase 5: The owner dashboard, rebuilt (two to three days)

Re-created in the new design language, desktop and mobile.

- `/app` today view: next bookings, needs-you escalations, takings.
- `/app/inbox`: the central omnichannel inbox. Every conversation from every
  channel in one list, escalations first, channel shown as an icon. Owner can read
  the full transcript (what was promised in her name), reply manually, and hand
  back to the AI. This is the universal control surface the product is named for.
- `/app/calendar`: resource-lane calendar (evaluate schedule-x for resource views
  first; FullCalendar paywalls exactly that feature; hand-build the ~150 line CSS grid
  otherwise). Bookings appear live via the owned SSE route
  `GET /api/stream/[businessId]`, NOT Supabase Realtime: Realtime respects RLS, so with
  deny-all the browser gets nothing, and reaching for it would reopen the Data API.
  SSE also keeps the API-first rule and is trivially consumable from Swift.
- Expected KHQR amount shown per booking from `services.price_minor`, rendered
  through `formatMoney()`, logged at confirmation time.
- Acceptance: booking made on Telegram appears on the open dashboard without a
  refresh, in under two seconds, with the right amount in the right currency.

### Phase 6: Messenger (one day of code, weeks of Meta review in parallel)

- Meta app with `pages_messaging`, webhook verify (`hub.challenge`), page token
  stored per connection, `/api/webhooks/messenger`.
- Same agent, same inbox, channel = `messenger`. Works immediately for admins and
  test users in dev mode; the demo uses a test user, honestly labelled.
- Submit app review in parallel; public Messenger is not a launch blocker.
- Acceptance: a test-user conversation books end to end and lands in the same
  inbox and calendar as Telegram.

### Phase 7: The hosted shop site (one to two days)

Each shop gets `{slug}.moni.cam`. See ARCHITECTURE.md section 6 for the full design.

- `proxy.ts` reads the Host header, checks a reserved-subdomain list, rewrites
  `{slug}.moni.cam` to `/s/{slug}`. One Next app, one deploy, no per-tenant
  provisioning. Wildcard `*.moni.cam` is one Vercel domain entry.
- `src/themes/registry.ts`: four hand-built themes, all consuming one typed
  `StorefrontData` prop, `satisfies Record<ThemeId, ThemeModule>` so a declared theme
  that is not implemented is a compile error.
- The owner agent picks a theme and fills a zod `StorefrontContent` object with
  `Output.object`, the same pattern as `src/lib/ai/parse.ts`, followed by a
  `sanityCheck()`. It writes to `storefronts.draft`. The owner publishes.
  **The model never emits markup**, so a bad generation is a bad string and never a
  white screen shipped to a real shop.
- Acceptance: three different verticals produce three coherent live sites on their own
  subdomains, each with a working catalogue and a book-or-order action.

### Phase 8: Money, orders and invoices (two days)

- Implement `create_payment` and `check_payment`, which are declared in `CUSTOMER_TOOLS`
  and deliberately unimplemented. Wire `src/lib/payments.ts` as-is: the PORTED comments
  carry bugs already paid for once.
- One test generates the same KHQR payload through `payments.ts` and through `ts-khqr`
  and asserts they match. A divergence in TLV or CRC means one is wrong, and you want to
  know before a customer scans a bad QR. A test, not a dependency.
- `products`, `orders`, `order_items` and `invoices` ship. Stock decrement and order
  creation happen in one transaction. Invoice numbers are allocated with
  `select coalesce(max(number),0)+1 ... for update` inside that transaction, which is the
  operation PostgREST cannot express and the reason for the Drizzle move.
- The invoice is a Next route with a print stylesheet. No PDF library.
- Acceptance: a customer pays by KHQR in Telegram, stock decrements atomically, and a
  numbered invoice renders and emails.

### Phase 9: Operations (half a day, but do it in week 4)

Small, cheap, and painful if discovered late. Detail in ARCHITECTURE.md section 4.

- **`POST /api/cron/tick`**, bearer-authenticated, called every five minutes by a free
  external scheduler. Vercel Hobby cron cannot fire more than once a day and **fails at
  deploy time** for anything more frequent, so the three sub-daily needs all ride this one
  endpoint: 24-hour and 1-hour booking reminders, KHQR payment polling, and the Supabase
  keep-alive. It also carries the weekly `pg_dump` to Storage until the Pro upgrade.
- Per-business monthly AI spend ceiling and a per-conversation cost cap.
  `messages.cost_micro_usd` records spend today but nothing bounds it.
- Webhook rate limit per chat id and a body size cap.
- Owner notification on `needs_owner` escalation, over the owner's own Telegram chat.
- Acceptance: a reminder arrives one hour before a booking; a synthetic runaway
  conversation is cut off by the cost cap rather than by the bill.

### Explicit room left, not built now

Four items moved INTO scope on 29 August and are now phases 7 and 8: payment
collection, invoices, generated shop sites, and product businesses. What remains
reserved, with seams that must not be casually implemented or deleted:

- **Ads management** for owners: the "we do the technical work" service layer.
- **SwiftUI native app**: enabled by the API-first rule and Clerk iOS. Every choice in
  ARCHITECTURE.md that looks fussy (SSE over Realtime, REST over tRPC, typed contracts in
  one file) exists to keep this door open.
- **Instagram and TikTok**: each needs its own app review, measured in weeks. The
  `CHANNELS` taxonomy already carries them.
- **Content publishing**: the unified inbox is the omnichannel story for the MVP.
  Composing and publishing posts is a `posts` table and one screen, and it is not in
  the nine weeks.

## 6. Vibecoding guardrails (why past iterations drifted, and the fix)

1. Read CLAUDE.md, then PLAN.md, before writing code. State the phase being worked.
2. One phase per session. The acceptance check is the definition of done; run it.
3. `src/lib/types.ts` changes first, `db/schema.sql` follows, `npm run db:test`
   proves it. Never the reverse order.
4. No component is hand-built before the sourcing search (CLAUDE.md rule); no
   registry component ships unstyled; nothing non-MIT ships at all.
5. Every user-facing surface is checked with `npm run shoot` at desktop and mobile
   widths before being called done.
6. All model calls go through `src/lib/ai/models.ts`. Nothing else may import a
   provider or name a model.
7. No em dashes, no emoji, money through `formatMoney()`, Khmer line-height 1.75.
8. When a decision here proves wrong, update PLAN.md in the same commit that
   changes the code. The document and the code never disagree for more than one
   commit. Architecture decisions go in ARCHITECTURE.md, not here.
9. Before hand-building anything, check ARCHITECTURE.md section 3. It records what was
   already adopted, what was rejected, and why, so the same evaluation is not repeated.
   Adding to either list is welcome; silently contradicting one is not.

## 7. What only the human can do (current blockers)

- Buy **moni.cam** (verified available 27 Aug 2026, CentralNic registry, not yet
  purchased). Development and even the public show can run on vercel.app URLs
  until then, so this gates launch, not work.
- Create an **AI Gateway key** in the Vercel dashboard and put
  `AI_GATEWAY_API_KEY` in `.env.local` (deployments need nothing, OIDC is
  automatic; until then local dev keeps running on the direct Gemini key).
- Create the **Clerk** application (then `clerk env pull` or paste keys). This is
  now the ONLY thing between Phase 2 and its browser-side acceptance check.
  `npx clerk@latest init` claims to create one non-interactively with no account,
  which is worth trying first. Two keys land in `.env.local`:
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
- Create the **Resend** account and verified sending domain.
- Hand-pick the landing page components (candidates listed in Phase 1).
- Create the **Meta developer app** and a test page for Messenger dev mode.
- A **BotFather** token for the first Telegram bot takes two minutes when Phase 4
  starts.
- Create a free **external cron account** (cron-job.org or Upstash QStash) pointed at
  `POST /api/cron/tick`. Vercel Hobby cron cannot fire more than once a day and rejects a
  more frequent expression **at deploy time**, so reminders and payment polling depend on
  this. Five minutes of setup.
- Create a **PostHog** project. Chosen over Sentry: its free tier is 100k errors and 5k
  session recordings against Sentry's 5k and 50, and it bundles the product analytics that
  turn "we built it" into "twelve shops took four hundred bookings".
- Decide the **Supabase Pro** upgrade date. Free pauses after seven days idle, which was
  already hit on 27 August. Current decision is to upgrade before demo week, which makes
  the keep-alive ping in Phase 9 mandatory until then, and means there are no backups
  until then either.
- Recruit the **first real shops** for week 5. This is the long-lead human task and the
  strongest thing you can put in front of a shortlist panel.

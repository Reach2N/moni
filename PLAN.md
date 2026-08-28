# Moni: the master plan

Written 27 August 2026. This document is the single source of truth for what gets
built, in what order, and against which acceptance test. Where it conflicts with
FEATURES.md, UI-PLAN.md or DESIGN.md, this document wins: those describe the earlier
demo iteration, which did not follow the current direction and is being re-created.

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
| Database | Supabase project `Moni` (ref `roorkzxyoyacychgrktt`) | Existing 14-table schema is reused, not rebuilt. RLS stays written-but-off until Clerk lands, then turns on via Clerk third-party auth JWT. |
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
- Motion via the `motion` package, spring physics, 200 to 350ms. Nothing linear.
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

- `npx clerk@latest init`: `proxy.ts`, ClerkProvider, sign-in routes.
- **The gate**: after sign-in, a server-side check on the Clerk email. In
  `waitlist` (or `approved_at` set by us manually), you pass. Otherwise you get a
  polite "join the waitlist" screen linking to the public site. The gate lives in
  one place (a `requireMember()` helper used by layouts and API routes), so
  removing it at launch is deleting one call site.
- `waitlist` carries `approved_at` and `approved_by` so manual approval is a row
  update, no admin UI needed yet.
- `businesses.clerk_user_id` replaces the hardcoded `sokha-beauty` tenant lookup.
  Every query in `src/lib/queries/` takes a business id resolved from the session.
- Add the member policies over Clerk third-party auth JWTs. RLS itself is already
  ON everywhere with zero policies (locked down 27 August); the policies are
  written and commented in schema.sql, keyed on `auth.jwt()->>'sub'`.
- Acceptance: a non-waitlisted email signs in and is refused with the join screen;
  a waitlisted email passes and sees the composer; two different members see two
  different businesses and cannot read each other's rows (tested at the database
  level, not just the UI).

### Phase 3: Onboarding, chat and voice (one to two days)

- `/onboarding`: the composer, the first screen a gated member sees. Type or
  hold-to-record. Voice goes up as an AI SDK `file` part (webm from
  MediaRecorder) through the gateway to Gemini, transcript shown for
  confirmation before parsing.
- Parse result renders as an editable services table (existing `/api/parse` and
  `/api/setup`, retargeted from the demo business to the session's business).
- `ai_instructions` field: "anything your assistant should always know or do".
- Ends with the assistant live on the web chat and a prompt to connect Telegram.
- Acceptance: a fresh account goes from empty to a parsed, edited, saved shop with
  a working web-chat assistant in under three minutes, by voice alone.

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
- `/app/calendar`: resource-lane calendar (hand-built CSS grid per the earlier
  research; shadcn's calendar is a date picker). Bookings appear live via Supabase
  Realtime, which is the "row animates in" demo moment.
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

### Explicit room left, not built now

These have reserved seams and must not be casually implemented or deleted:

- **Payment collection**: `src/lib/payments.ts` wires into `create_payment` /
  `check_payment` (declared in CUSTOMER_TOOLS, unimplemented on purpose).
- **Invoices**: a rendered, numbered document per paid booking. Depends on payments.
- **Generated shop sites** on `*.moni.cam` subdomains: template-based, one command
  from the owner agent. The public booking page `/s/[slug]` is its ancestor.
- **Product businesses** (coffee shops): catalogue, orders and revenue dashboards
  differ from service businesses. `BUSINESS_TYPES` taxonomy already carries the
  distinction; dashboards branch on it later.
- **Ads management** for owners: the "we do the technical work" service layer.
- **SwiftUI native app**: enabled by the API-first rule and Clerk iOS.

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
   commit.

## 7. What only the human can do (current blockers)

- Buy **moni.cam** (verified available 27 Aug 2026, CentralNic registry, not yet
  purchased). Development and even the public show can run on vercel.app URLs
  until then, so this gates launch, not work.
- Create an **AI Gateway key** in the Vercel dashboard and put
  `AI_GATEWAY_API_KEY` in `.env.local` (deployments need nothing, OIDC is
  automatic; until then local dev keeps running on the direct Gemini key).
- Create the **Clerk** application (then `clerk env pull` or paste keys).
- Create the **Resend** account and verified sending domain.
- Hand-pick the landing page components (candidates listed in Phase 1).
- Create the **Meta developer app** and a test page for Messenger dev mode.
- A **BotFather** token for the first Telegram bot takes two minutes when Phase 4
  starts.

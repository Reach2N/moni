# Moni: the master plan

This document is the source of truth for product scope, build order, and acceptance tests.
The active agent contract is `AGENTS.md`; the active homepage UI contract is
`docs/HOMEPAGE.md`.

The former `FEATURES.md`, `UI-PLAN.md`, `DESIGN.md`, and `PRODUCT.md` are archived under
`docs/archive/`. Their research is not an implementation instruction.

**ARCHITECTURE.md is the source of truth for architecture**: the data model, the seams,
the third-party adopt/reject record, and the guardrail harness. Where the two disagree on
architecture, ARCHITECTURE.md wins and this file is corrected in the same commit.

Every coding session starts by reading `AGENTS.md`, then this file, then
`ARCHITECTURE.md` when the work touches architecture. The current session scope is
`homepage-first`: the public `/` marketing homepage, in light mode only. A session works
on exactly one declared surface and must pass its acceptance check before moving on. Do
not pull features or visual rules forward from a later phase.

For the current request, this plan is being consolidated as documentation only. Do not edit
frontend/source files, install UI packages, or treat implementation acceptance checks below as
permission to do frontend work.

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

## 3. Design direction: light Apple-native homepage

The active homepage direction is monochrome with one green accent, styled like a native
Apple OS surface: quiet, precise, translucent chrome, generous whitespace, and spring
motion. It is **light-only** in the current phase. The homepage must remain light when a
visitor's operating system prefers dark mode. A dark product theme is not an implicit
future requirement and needs a separate decision.

Semantic tokens, named after their UIKit/SwiftUI equivalents so a native port is a
find-and-replace, defined once in `globals.css`:

```
--background          #FFFFFF        (systemBackground)
--background-secondary #F5F5F7       (secondarySystemBackground)
--label               #1D1D1F        (label)
--label-secondary     rgba(60,60,67,.60)
--label-tertiary      rgba(60,60,67,.30)
--separator           rgba(60,60,67,.29)
--accent              #34C759        (systemGreen)
--destructive         #FF3B30        (systemRed, sparingly)
```

Rules:

- Green is confirmation and money. It is never decoration. A screen with more than
  a few green elements is wrong.
- Typography: system stack first (`-apple-system, BlinkMacSystemFont, "SF Pro Text",
  Inter, sans-serif`), with vendored Busra as the Khmer fallback and
  `line-height: 1.75` (the Khmer clipping rules in CLAUDE.md still apply in full).
- Chrome (nav, sheets, bars) uses translucency: `backdrop-blur` over the content,
  hairline separators, never solid borders heavier than 1px.
- Radii are continuous and generous (12 to 16px on cards, pill buttons). No 0px
  corners: that was the Invitation system.
- Motion splits by role. **`motion` owns state**: in-app
  transitions and anything keyed to a React state change, spring physics, 200 to 350ms,
  nothing linear. **GSAP owns scroll**: everything on the public site keyed to scroll
  position. The reason is not preference. `motion`'s `whileInView` is an
  IntersectionObserver and cannot be settled on demand, so a full-page screenshot
  photographs every below-fold reveal at `opacity: 0`; the landing capture came
  out blank below the hero with 18 elements stuck invisible. ScrollTrigger exposes
  `refresh()` and a real scroll position, so a capture can drive it. Plugin registration
  lives only in `src/lib/motion/gsap.ts`, the same way only `src/lib/ai/models.ts` may name
  a model. GSAP 3.15 is free for commercial use including the formerly Club-only plugins.
- Icons use Lucide for interface controls, official simple-icons marks for external channels,
  and an authored SVG only where no complete library mark exists. Never emoji or invented
  brand marks.
- Light only for the homepage. Do not add `prefers-color-scheme: dark` branches to the
  marketing layout or homepage components.

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

### Phase 0: Foundations and harness

- DONE: `src/lib/ai/models.ts` routes through Vercel AI Gateway first
  (`gateway:` refs), with direct Gemini and Anthropic as the fallback chain and
  the cost accounting intact. Verified: selection order, env overrides, tsc.
- DONE: `waitlist` table plus `webhook_events`, Clerk tenancy columns and
  channel secrets, shipped live with the security lockdown (RLS on everywhere).
  97 assertions in `npm run db:test`.
- Homepage token contract in `globals.css` (section 3). Legacy Invitation tokens remain
  scoped to the existing `/app` surface until the separately scheduled dashboard rebuild;
  they are not available to homepage work.
- Register moni.cam, point it at Vercel. (Human task, gates launch not work.)
- Acceptance: `npm run db:test` passes; `/api/parse` and `/api/chat` answer through
  the gateway with cost logged (or through the direct Gemini fallback when no
  gateway key is configured); the homepage remains light under both light and dark
  browser preference emulation.

### Phase 1: Landing page at moni.cam (current surface)

The first public surface and the only active frontend scope in the current session.
Marketing psychology: scarcity and belonging, not hype. The page is light-only.

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
- Sections below the fold: how it works in three steps, a full channel-breadth showcase
  using the official Telegram, Messenger, Facebook, Instagram, and Grab marks, per-transaction
  pricing (free to start, pay only when you get paid), four FAQs, footer with privacy and terms.
  All five marks render at equal weight. Copy and onboarding state which connections are
  available to a shop; the visual set must not be read as five verified live integrations.
- Components: use Beautiful UI first for every homepage interaction, especially agentic
  surfaces, and install or copy the strongest complete source component for the showcase.
  Choose by visual clarity, interaction quality,
  Khmer readability, responsive behavior, and screenshot performance. Use 21st.dev Agent
  Elements, DaisyUI, or another established library only when Beautiful UI has no complete
  fit. Use shadcn or Radix only for low-level primitives. Defer all license review and licensing
  decisions until distribution; they are not a selection gate for this showcase. Record the
  source URL and install/copy reference
  in `CREDITS.md`. Do not invent, redraw, or substantially rewrite a component with Tailwind.
  If no library component fits, stop and report the gap. Homepage source components stay in
  marketing during this phase; do not copy them into the legacy `/app` surface.
- Agent proof: the public page visibly shows one complete customer turn and the agent work
  trace that grounds it. Use the exact source selections in `docs/HOMEPAGE.md` and
  `CREDITS.md`; do not substitute generic demo data, a public owner composer, or a page-level
  library foundation that changes the white marketing ground.
- Acceptance: deployed (vercel.app until moni.cam is bought); email lands in
  `waitlist` and gets a confirmation; the product is NOT reachable from the public
  site; `npm run shoot` screenshots reviewed at desktop and mobile widths; no
  layout shift on the hero; the light marketing root remains white with no hidden settled
  content under reduced motion.

### Phase 2: Clerk auth, the waitlist gate, and real tenancy

- DONE, except the Clerk application itself, which is a human task
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
- **CANCELLED (ARCHITECTURE.md section 1):** do NOT add member policies over
  Clerk JWTs. That step ships the anon key to the browser and makes hand-written SQL
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

### Phase 3: Onboarding, chat and voice

- DONE, except a live voice test, which needs the Clerk keys and a real
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
  runs for an arbitrary recording length, so holding a phone button is its own ordeal,
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
  a working web-chat assistant in one uninterrupted voice-led pass.
- Acceptance status: the pure and structural halves are proved (format guards,
  the instruction fence, the empty-shop redirect, the source wiring). The
  live run itself needs the Clerk keys, a Gemini key and a microphone,
  and is the first thing to do once the Clerk application exists.

### Phase 4: Telegram

- DONE, except the live phone run, which needs a BotFather token, a public
  HTTPS address and the Supabase keys. 27 new assertions in `npm run db:test`
  (157 passing).
- `/app/channels`: paste a BotFather token, `getMe` proves it, the token is stored
  AES-256-GCM encrypted under `MONI_TOKEN_KEY` (never plaintext, never in an audit
  row), and the webhook is set to `/api/webhooks/telegram/[connectionId]`.
  Verify, then store, then set the webhook: a token stored without being verified
  leaves a shop looking connected while every message vanishes.
- **The webhook proves its caller two ways.** The connection id in the path says
  which shop; Telegram's own `secret_token`, returned in an
  `X-Telegram-Bot-Api-Secret-Token` header, says the call is really Telegram. The
  id alone would be a bearer token sitting in every access log. A bad secret and
  an unknown connection get the identical 404, so the endpoint cannot be used to
  discover which connection ids exist.
- `/api/webhooks/*` is deliberately OFF the Clerk proxy matcher. Telegram carries
  no session, and running the proxy there would 500 every inbound message.
- The customer agent loop moved OUT of `/api/chat` into
  `src/lib/agent/customer-loop.ts` rather than being copied. The rule that the
  assistant never states a price it did not get from a tool has to hold on every
  channel, and it will not stay true in three transcriptions of the same logic. Web chat and
  Telegram now run the identical loop; Messenger reuses it
  unchanged in Phase 6, which is what ARCHITECTURE.md means by keeping the loop
  outside grammY middleware.
- **grammY is used for its `Api` client and its types, not its middleware.**
  `new Api(token)` needs no bot to initialise, so a multi-tenant webhook serves
  any number of shops with no `getMe` round trip per message.
- **`customer_identities` is unique on (channel, external_id) globally, not per
  business**, so every channel scopes its external id by business id. Without
  that, one Telegram user messaging two shops collapses into one customer row and
  each shop reads the other's thread. The web chat did this already with a slug
  prefix; `scopedExternalId()` is now the one implementation.
- **The webhook answers 200 to almost everything, on purpose.** A non-2xx makes
  Telegram redeliver, and the agent can book. Each update is written to
  `webhook_events` before the agent runs, so a redelivery is recognised as a
  duplicate and refused by the unique index. The cost is that a failed turn is
  not retried; the alternative is two bookings for one customer. The customer's
  message is stored before the model runs, so a model failure loses an answer and
  never a customer's words.
- The agent must complete a real booking: understand the requested time in Khmer or
  English, `list_slots`, negotiate alternatives when full, `create_booking`,
  confirm with a human-quotable code. Escalation to owner keeps working.
- Acceptance: on a real phone, a customer books through Telegram end to end while
  the owner does nothing. The booking row exists in Supabase with the correct
  `tstzrange` and the conversation transcript is complete.
- Acceptance status: everything that can be proved without a phone is proved.
  Encryption round trip and tamper refusal, timing-safe secret comparison, token
  shape, update extraction (text, bot, sticker), two shops sharing one Telegram
  user, one bot per shop per channel, and the redelivery that must not book
  twice. The phone run needs a BotFather token, an HTTPS address and the
  Supabase keys.

### Phase 5: The owner dashboard, rebuilt

Re-created in the new design language, desktop and mobile.

- `/app` today view: next bookings, needs-you escalations, takings.
- `/app/inbox`: the central omnichannel inbox. Every conversation from every
  channel in one list, escalations first, channel shown as an icon. Owner can read
  the full transcript (what was promised in her name), reply manually, and hand
  back to the AI. This is the universal control surface the product is named for.
- `/app/calendar`: resource-lane calendar (evaluate schedule-x for resource views
  first; FullCalendar paywalls exactly that feature. Use a complete library calendar
  component or pause and report that no library fit exists. Do not hand-build a replacement.
  Bookings appear live via the owned SSE route
  `GET /api/stream/[businessId]`, NOT Supabase Realtime: Realtime respects RLS, so with
  deny-all the browser gets nothing, and reaching for it would reopen the Data API.
  SSE also keeps the API-first rule and is trivially consumable from Swift.
- Expected KHQR amount shown per booking from `services.price_minor`, rendered
  through `formatMoney()`, logged at confirmation time.
- Acceptance: booking made on Telegram appears on the open dashboard without a
  refresh, in under two seconds, with the right amount in the right currency.
- DONE, except the today view's visual rebuild. Shipped: `/app/inbox`
  (every channel in one list, escalations first, full transcript, manual reply,
  hand back to Moni), `/app/calendar` (resource lanes, live), and
  `GET /api/stream/[businessId]`.
- **The stream polls, and that is deliberate.** A serverless instance shares no
  memory with the one that handled the Telegram webhook, so an in-process emitter
  would only ever see its own requests, and `LISTEN/NOTIFY` needs a session-mode
  connection Supavisor's transaction mode does not give us. It polls
  `updated_at > cursor` every 1.5s on indexed columns and sends nothing when
  nothing changed. `v_bookings_agent` gained `updated_at`, appended at the end
  because `create or replace view` accepts new columns only there.
- **schedule-x was evaluated and is not a complete fit** (ARCHITECTURE.md):
  its package does not provide the required resource-lane interaction. Do not hand-build a
  replacement. Re-evaluate Beautiful UI or another complete library component when the
  calendar phase begins; if no fit exists, pause and report it.
- **Partial, and named as such:** the `/app` today view is still the Invitation
  design. The two NEW surfaces are the ones this phase promised; re-skinning the
  old one is cosmetic work that does not block Phases 6 to 8.
- Acceptance status: the cursor mechanism the check depends on is proved in
  `db/test.mjs` (a confirmed booking moves `updated_at` and comes back from the
  cursor query), and the inbox ordering rule with it. The two-second wall clock
  needs the Supabase keys.

### Phase 6: Messenger

- Meta app with `pages_messaging`, webhook verify (`hub.challenge`), page token
  stored per connection, `/api/webhooks/messenger`.
- Same agent, same inbox, channel = `messenger`. Works immediately for admins and
  test users in dev mode; the demo uses a test user, honestly labelled.
- Submit app review in parallel; public Messenger is not a launch blocker.
- Acceptance: a test-user conversation books end to end and lands in the same
  inbox and calendar as Telegram.
- DONE, pending the Meta app itself (a human task) and its review.
  `GET /api/webhooks/messenger` echoes `hub.challenge` as PLAIN TEXT, which is
  the step that silently fails if you return JSON. `POST` verifies Meta's
  HMAC over the RAW body, resolves the shop from the page id (one URL serves the
  whole app, unlike Telegram's per-connection path), and runs the identical
  `handleCustomerMessage` loop.
- Three Messenger-specific traps are handled and asserted: the signature is over
  the bytes Meta sent, so the route parses the string it already read and never
  re-serialises; `is_echo` messages are dropped, or the assistant answers itself
  forever; and `subscribed_apps` is called on connect, without which everything
  verifies and no message ever arrives.
- `META_APP_SECRET` is OURS, not a shop's, so it is resolved by name through
  `channel_connections.secret_ref` rather than stored per row.
- Acceptance status: signature verification (including the re-serialisation
  trap), echo suppression and envelope extraction are proved in `db/test.mjs`.
  The test-user conversation needs the Meta app.

### Phase 7: The hosted shop site

Each shop gets `{slug}.moni.cam`. See ARCHITECTURE.md section 6 for the full design.

- `proxy.ts` reads the Host header, checks a reserved-subdomain list, rewrites
  `{slug}.moni.cam` to `/s/{slug}`. One Next app, one deploy, no per-tenant
  provisioning. Wildcard `*.moni.cam` is one Vercel domain entry.
- `src/themes/registry.ts`: library-derived themes, all consuming one typed
  `StorefrontData` prop, `satisfies Record<ThemeId, ThemeModule>` so a declared theme
  that is not implemented is a compile error. Beautiful UI is the first source to check;
  do not hand-build a theme when no library fit exists.
- The owner agent picks a theme and fills a zod `StorefrontContent` object with
  `Output.object`, the same pattern as `src/lib/ai/parse.ts`, followed by a
  `sanityCheck()`. It writes to `storefronts.draft`. The owner publishes.
  **The model never emits markup**, so a bad generation is a bad string and never a
  white screen shipped to a real shop.
- Acceptance: three different verticals produce three coherent live sites on their own
  subdomains, each with a working catalogue and a book-or-order action.
- Acceptance status: the routing and the safety rails are proved (24 assertions):
  a shop subdomain resolves, the apex and `www` do not, a Vercel preview host is
  never mistaken for a shop, reserved names are refused, and the sanity check
  catches markup, an em dash, an invented claim and a price written into prose.
  Verified live by curl with a Host header. The three real verticals need the
  Supabase keys and a Gemini key.

### Phase 8: Money, orders and invoices

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
- DONE 30 Aug except the email, which is named below. 17 new assertions in
  `npm run db:test` (215 passing).
- **`create_payment` and `check_payment` are implemented.** The agent never picks
  an amount: it names a booking, and the figure comes from that booking's own
  price, because a model that can choose a number can undercharge a shop. The
  idempotency key stays time bucketed, PORTED and unchanged: a static key plus
  the unique constraint permanently strands any customer whose first QR lapsed.
- **The KHQR builder is cross checked against `ts-khqr`, byte for byte.**
  `payments.ts` took `buildPayload` and `md5` as injected functions and never had
  them; `src/lib/khqr/payload.ts` is that implementation, and the test generates
  the same payment through both and asserts the strings are identical including
  the CRC and the md5 the relay verifies by. ts-khqr stamps its own creation
  time, so the test reads it back out of their payload and gives both sides the
  same clock. `ts-khqr` is a devDependency: a second opinion, not a runtime
  dependency, exactly as this plan asked.
- **The transaction is real and it is tested.** `src/lib/orders/create.ts` takes a
  two-method `Tx` and nothing else, so `db/test.mjs` runs the actual code against
  PGlite, which is the same Postgres engine with the same row locks. Proved:
  stock decrements by exactly what sold, an uncounted product (NULL stock, which
  is not zero) is never driven negative, the last item cannot be sold twice, the
  same product listed twice in one order is summed before the check rather than
  checked twice, another shop's product is not orderable, and invoice numbers are
  per business, consecutive, and unique.
- **The invoice is a Next route with a print stylesheet**, no PDF library. The
  browser already has a typesetting engine and a PDF writer, and a server-side
  library would reproduce them badly while getting Khmer shaping wrong.
- **NOT done, and named: the email.** Resend is not installed and there is no key,
  so the invoice renders and prints but nothing is sent. That is one template and
  one call once the account exists (a human task in section 7).

### Phase 9: Operations

Small, cheap, and painful if discovered late. Detail in ARCHITECTURE.md section 4.

- **`POST /api/cron/tick`**, bearer-authenticated, called every five minutes by an external
  scheduler. Vercel Hobby cron cannot fire more than once a day and **fails at
  deploy time** for anything more frequent, so the three sub-daily needs all ride this one
  endpoint: 24-hour and 1-hour booking reminders, KHQR payment polling, and the Supabase
  keep-alive. It also carries the recurring `pg_dump` to Storage until the Pro upgrade.
- Per-business monthly AI spend ceiling and a per-conversation cost cap.
  `messages.cost_micro_usd` records spend today but nothing bounds it.
- Webhook rate limit per chat id and a body size cap.
- Owner notification on `needs_owner` escalation, over the owner's own Telegram chat.
- Acceptance: a reminder arrives one hour before a booking; a synthetic runaway
  conversation is cut off by the cost cap rather than by the bill.

### Phase 10: One universal app, the shop's own money, and an agent that runs setup

Design: `docs/superpowers/specs/2026-09-02-universal-app-design.md`. Shipped 2 September
2026, 26 new assertions in `npm run db:test` (289 passing).

- **Money is the shop's.** `businesses` gains `khqr_account_id`, `khqr_merchant_name` and
  `khqr_merchant_city` (`types.ts` first, migration `20260902120000_shop_payment_account`).
  `src/lib/payments/shop-khqr.ts` is the rail: the KHQR is built offline into the shop's
  own Bakong account, both currencies, and `railsFor(currency, account)` puts it ahead of
  the platform CutLuy token, which stays only as a demo and webhook safety net.
  Verification is the owner's own banking app: the rail is `pollBased: false`, the cron
  poller skips it, and `confirm_payment` (an owner tool, an inbox button, and
  `POST /api/payments/confirm`) is the one place a row goes pending to paid, idempotent,
  confirming the booking and telling the customer in the same step.
- **The QR reaches the customer.** Until now `create_payment` stored a payload nobody
  delivered. Telegram now gets the code as a photo (`sendPhoto`, uploaded bytes), Messenger
  as an image attachment by URL (`/api/pay/{code}?format=png`, text fallback off a laptop),
  and the web chat draws `/api/pay/{code}` inline. The customer prompt says how to talk
  about paying and never to call a payment received without proof.
- **`/app/money`**: paste the account, scan your own test card (`/api/money/test-card`,
  1,000 riel or 25 cents, reference TEST, never a payment row). The setup spine gains a
  money row before the channel row, so setup cannot complete for a shop that cannot be
  paid.
- **The agent runs setup.** A SETUP group on the owner agent: `report_setup_status`,
  `set_payment_account`, `generate_shop_site`, `publish_shop_site`, sharing
  `src/lib/storefront/generate.ts` with `/api/storefront`. `ownerTools()` is typed
  `satisfies Record<OwnerTool, Tool>` (guardrail G3), which is what caught three tools
  declared and never built. The token rule stands: the agent sends her to `/app/channels`
  and never asks for a BotFather token in chat.
- **One shell.** `AppShell` wraps every owner screen: a six-entry rail on a desk (home,
  inbox, calendar, site, channels, money), a three-tab bar plus a "more" sheet on a phone,
  active state from the route. The "back to dashboard" links are gone with the reason for
  them.
- Acceptance: an owner pastes her Bakong id, scans her own test card and sees her account
  name in her banking app; a Telegram customer receives a QR as a picture; the owner
  confirms from the thread and the customer is told. The pure and structural halves are
  proved in `db/test.mjs` and `scripts/setup-progress-test.mjs`; the phone run needs the
  keys listed in section 7.

### Phase 11: Products, photos, and the menu

Design: `docs/superpowers/specs/2026-09-02-products-photos-menu-design.md`. Plan:
`docs/superpowers/plans/2026-09-02-products-photos-menu.md`. Shipped 2 September 2026,
32 new assertions in `npm run db:test` (321 passing).

- **A cafe could not be modelled**, and that was the bug. The parse correctly answers
  `business_type: cafe`, and then every consumer downstream read `services`: the setup
  spine's catalogue row could never complete, the storefront listed nothing, the customer
  agent said the shop offered nothing, and `/app` redirected a shop with a full menu back
  to onboarding on every visit.
- **`v_catalog`** unions services and products into one shape (ARCHITECTURE.md section 5).
  Every read of what a shop sells goes through it and every write goes to the table that
  owns the row, so no consumer branches on business type: the branch is where a cafe gets
  forgotten. `products` gains `category`, `photo_path` and `photo_alt`, migration
  `20260902140000_product_catalogue`.
- **What a shop sells is `sells` on the 42 business types**, in TypeScript per hard rule 5,
  not a column. `businesses.capabilities` stays reserved rather than shipped for a
  hypothetical. No current type is `goods` because the taxonomy has no pure retail entry,
  which is why `other` sells both.
- **Photos** live in a public `shop-media` Supabase Storage bucket, keyed
  `{business}/{product}/{uuid}.{ext}` so one shop is one prefix. Upload takes raw bytes
  like `/api/transcribe`; the rules (three types, six megabytes, a refused missing content
  type) are pure and asserted because they decide what reaches a public bucket. The row's
  pointer moves before the old file is dropped.
- **Generation is offered and allowed to be refused.** Verified against the live key: six
  image models are visible and every one answers 429 with the free tier's daily per-model
  quota spent, and the gateway refuses them outright. So the refusal is a result carrying
  one of four reasons, each with its own status and its own Khmer sentence, because the
  owner's next move differs: enable billing, wait, retry, or photograph it herself. No job
  queue was built for a capability that cannot currently run once.
- **The tools**: `create_product`, `create_products_bulk`, `update_product`,
  `generate_product_photo` and `search_catalogue` on the owner agent; `search_catalogue`
  and a catalogue-returning `get_business` on the customer agent, every entry flagged
  bookable so the model never offers a time for a cup of coffee.
- **`customerTools()` gained the `satisfies` guard** the owner set got in Phase 10, and it
  immediately found the same class of drift: `reschedule_booking` was declared from the
  beginning and never built. Removed rather than invented; a customer moving a booking is
  served today by cancel plus rebook, or by escalation. Worth building deliberately later.
- **`/app/products`** is the seventh destination in the shell. The component search found
  no fit and the gap is recorded in `CREDITS.md` as the sourcing rule requires.
- Acceptance: a cafe can be described, given a menu with photos, and that menu appears on
  its own address. Proved so far in `db/test.mjs` and the pure suites; the live run needs
  the Supabase keys, and generation needs billing enabled.

### Phase 12: A seeded look per shop

Design: `docs/superpowers/specs/2026-09-02-seeded-storefront-design.md`. Plan:
`docs/superpowers/plans/2026-09-03-seeded-storefronts.md`. Shipped 3 September 2026,
58 new assertions in `npm run db:test` (379 passing).

- **Every shop of a given theme looked the same shop**, and that was the bug. `counter`
  is one hand-built component with one literal accent, one radius, one type scale. Two
  cafes describing themselves in completely different words got pixel-identical pages
  with different sentences in them, which tells an owner her site was not derived from
  anything.
- **A shop's look is now a theme, a vibe and a seed, applied in that order.** The theme
  still comes from what the shop is, unchanged from Phase 11. The vibe is three closed
  enums, `WARMTHS`, `VOICES` and `DENSITIES` on `StorefrontContent['vibe']`, that the
  model reads from the owner's own `raw_description`, optional on the type and required
  by the zod schema so a generation that omits it fails validation rather than rendering
  with an invented mood; `vibeOf()` is the one place a stored or malformed value falls
  back to `DEFAULT_VIBE`. The seed is a plain `storefronts.seed` integer
  (migration `20260903000000_storefront_seed`), column-defaulted so every existing row
  got one for free, and the owner is the only one who can change it: `/api/storefront/seed`
  and a four-candidate `SeedPicker` on `/app/site` let her reroll and keep the one she
  wants.
- **`styleFor(seed, vibe, theme)`, in `src/lib/storefront/style.ts`, is pure and is the
  only function in the codebase that turns a seed into anything.** It returns a small set
  of `--sf-*` CSS custom properties, already clamped: an accent and surface pair that
  clears WCAG contrast against both white text and the page ground, a radius, a type
  scale and ratio, a section and row rhythm, and a Khmer leading floored at 1.75 whatever
  the density asked for. `getStorefront()` calls it once, on the way out of the query
  (ARCHITECTURE.md section 6), and an unlayered `.sf` block in `globals.css` remaps the
  result onto the runtime variables the four theme components already resolve, the same
  cascade-layer technique the Khmer line-height fix used. No theme component was
  restructured: this phase changes the tokens they resolve, not the tags they emit.
- **The assertions prove the one claim that matters:** that no seed can put unreadable
  Khmer on a real shop's public site. `db/test.mjs` sweeps the full 10800-palette space,
  400 sampled seeds by all 27 vibes, and checks contrast on every pair a real page draws
  a call to action, accent text and body copy against the page ground, plus determinism
  (the same seed and vibe give a byte-identical style forever) and the four-candidate
  picker's own reproducibility.
- **A product with no photo draws a seeded geometric tile instead of a stock photo.**
  `src/lib/media/tile.ts` keys `tileFor()` on the product id, not the name, so correcting
  a spelling does not redraw the menu, and `patternGeometry()` is pure so the harness
  rotates the actual coordinates to prove `ROTATIONS_FOR` names only the rotations a
  pattern's symmetry actually repeats under. `shouldDrawTile(kind, photoUrl)` gates on
  `kind === 'product'`, so a service, which never had a photo and never asked for one,
  renders exactly as it did before this phase. The same function backs both `ProductTile`
  and the new photoless-item count on `/app/products`, so the two can never disagree
  about which rows are affected.
- **Two defects, unrelated to the seed work, were found and fixed while closing the
  phase.** `globals.css` had no `@source` directive, so Tailwind v4's automatic content
  heuristic was scanning `docs/**` and lifting literal class strings out of plan
  documents into the shipped stylesheet: a dead rule pairing an `aria-pressed` variant
  with a `border-accent` colour, present nowhere in this app's own source, was in the
  production build. `@source not "../../docs";` removed it and every
  other docs-only rule (106630 to 105470 bytes, about 1.1% smaller), verified against a
  clean rebuild with no real utility lost. Separately, `npm run shoot` had no `/s/[slug]`
  entry, which meant this phase's own acceptance check had no repeatable tool and every
  storefront verification in tasks 4 to 7 used one-off scripts; it now captures the one
  published storefront at desktop and mobile widths, slug configurable through
  `MONI_CAPTURE_SLUG`, and reports the HTTP status of every route so an unresolved slug
  fails loudly instead of quietly becoming a screenshot of a 404 page.
- **A named blocking prerequisite for Phase 13.** Onboarding writes every parsed
  catalogue row into `services` and never into `products`: `src/lib/setup/schema.ts` and
  `src/lib/setup/persist.ts` contain zero occurrences of the word "product", `db/seed.sql`
  has two `insert into services` and zero `insert into products`, and the live `products`
  table is empty database-wide. The only writers to `products` today are the manual and
  agent tools on `/app/products` and the owner conversation. Consequences:
  - the tile feature built in this phase is correct but currently INERT for every shop
    that came through onboarding, because none of them has a product row to be
    photoless;
  - this is the same bug class Phase 11 already named for `v_catalog`, where the
    storefront and the `/app` redirect were fixed but the setup WRITE path was not;
  - it blocks more than tiles: Phase 13's checkout is built on `createOrder`, which
    operates on `products` only, so a shop onboarded today could never take an order
    either;
  - the fix is well defined and simply not yet applied: `src/lib/types.ts` already
    exports `sellsFor()`, and CLAUDE.md already decides that what a shop sells is
    `sells` on the business type. This needs its own spec before Phase 13 starts, not a
    patch inside it.
- Acceptance, as verified in this environment: `npm run db:test`, `npm run test:signals`,
  `npx tsc --noEmit` and `npm run build` all pass. `npm run shoot` captures the one shop
  published in the live database, `sansethireach`, cleanly at both widths, and its menu
  (two `services` rows, per the finding above, not products) renders with no gaps. The
  spec's literal acceptance check asks for four published shops of one business type on
  four different seeds; only one shop is published in the live database and `/app/site`
  is behind Clerk with no test credentials in this environment, so that specific
  four-shop comparison was not run against real browser output. The stronger claim, that
  no seed in the full vibe space produces unreadable text, is what `db/test.mjs`'s
  10800-palette sweep proves instead, and it is proof rather than a spot check. The
  tile's live rendering on a real shop's page is likewise unconfirmed beyond synthetic
  and service data, for the reason named above: no live shop has a product row yet.
- Deliberately left out, per the spec: composition variation (section order, hero and
  item-row variants; the token layer is built so this can be added without redoing it),
  photo-derived palettes, an explicit owner-set brand colour override, and a second
  vendored font family. None of these have stubs or reserved fields.

### Explicit room left, not built now

Four items moved INTO scope and are now phases 7 and 8: payment
collection, invoices, generated shop sites, and product businesses. What remains
reserved, with seams that must not be casually implemented or deleted:

- **Ads management** for owners: the "we do the technical work" service layer.
- **SwiftUI native app**: enabled by the API-first rule and Clerk iOS. Every choice in
  ARCHITECTURE.md that looks fussy (SSE over Realtime, REST over tRPC, typed contracts in
  one file) exists to keep this door open.
- **Instagram and TikTok**: each needs its own app review and remains outside the current scope. The
  `CHANNELS` taxonomy already carries them.
- **Content publishing**: the unified inbox is the omnichannel story for the MVP.
  Composing and publishing posts is a `posts` table and one screen, and it is not in
  the current scope.

## 6. Vibecoding guardrails (why past iterations drifted, and the fix)

1. Read CLAUDE.md, then PLAN.md, before writing code. State the phase being worked.
2. One phase per session. The acceptance check is the definition of done; run it.
3. `src/lib/types.ts` changes first, `db/schema.sql` follows, `npm run db:test`
   proves it. Never the reverse order.
4. No component is invented before the sourcing search. Beautiful UI is the primary source for
  showcase UI, followed by an established library with a complete fit. Install or copy the
  selected source and use its documented theme hooks; do not redraw or substantially rewrite it.
  If no library fit exists, stop and report it. Defer all license review and licensing decisions
  until distribution.
5. Every user-facing surface is checked with `npm run shoot` at desktop and mobile
   widths before being called done.
6. All model calls go through `src/lib/ai/models.ts`. Nothing else may import a
   provider or name a model.
7. No em dashes, no emoji, money through `formatMoney()`, Khmer line-height 1.75.
8. When a decision here proves wrong, update PLAN.md in the same commit that
   changes the code. The document and the code never disagree for more than one
   commit. Architecture decisions go in ARCHITECTURE.md, not here.
9. Before selecting a component, check ARCHITECTURE.md section 3 and the Beautiful UI
   catalog. Reuse an existing source component and record the selection. If no library fit
   exists, stop and report it. Never invent a replacement or silently contradict a recorded
   decision.

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
- Select and install the strongest Beautiful UI landing components, then record the sources.
- Create the **Meta developer app** and a test page for Messenger dev mode.
- A **BotFather** token for the first Telegram bot is required when Phase 4 starts.
- Create a free **external cron account** (cron-job.org or Upstash QStash) pointed at
  `POST /api/cron/tick`. Vercel Hobby cron cannot fire more than once a day and rejects a
  more frequent expression **at deploy time**, so reminders and payment polling depend on
  this.
- Create a **PostHog** project. Chosen over Sentry: its free tier is 100k errors and 5k
  session recordings against Sentry's 5k and 50, and it bundles the product analytics that
  turn "we built it" into "twelve shops took four hundred bookings".
- Decide whether to upgrade **Supabase Pro** before using real-shop data. The free tier can
  pause idle projects and does not provide backups, so the keep-alive and backup job remain
  required until that decision is made.
- Recruit the **first real shops** after the booking spine and showcase acceptance checks pass.
  This is a human dependency, not a scheduled phase.

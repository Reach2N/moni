# Moni

AI assistant that answers customer messages and takes bookings and payments for local
Cambodian businesses. The owner describes the shop in plain language, by typing or by
voice. Everything else is derived from that.

Built for the AI in Motion program application. Scope discipline beats feature count.

**AGENTS.md is the active agent contract.** Read it first. Then read `PLAN.md` for
product scope and build order, `ARCHITECTURE.md` for architectural decisions, and
`docs/HOMEPAGE.md` for the active homepage UI contract. The former feature, UI, product,
and Invitation design documents are archived under `docs/archive/`.

The active implementation pass is the seeded storefront look, per
`docs/superpowers/specs/2026-09-02-seeded-storefront-design.md` and
`docs/superpowers/plans/2026-09-03-seeded-storefronts.md` (PLAN.md Phase 12), following
the product catalogue pass in Phase 11. Homepage files stay frozen: `src/components/marketing/**`, `src/app/(marketing)/**`, and the two scripted
primitives `src/components/primitives/TaskRows.tsx` and
`src/components/primitives/ThinkingState.tsx` are not modified by this pass.

## Hard rules

1. **No em dashes.** Not in UI copy, not in marketing text, not in AI output, not in
   commit messages. Use a colon, a comma, or a full stop. The agent system prompt states
   this explicitly because the model produces them by default.
2. **`src/lib/types.ts` is the source of truth.** It changes first, `db/schema.sql`
   follows. Never the reverse.
3. **Money is integer minor units plus a currency code, per row.** KHR has 0 decimals,
   so 15000 means 15,000 riel. USD has 2, so 1500 means $15.00. Never a float. Always
   render through `formatMoney()`.
4. **Time is `timestamptz`.** UTC in the database, `Asia/Phnom_Penh` for display.
   Occupancy is a `tstzrange`, which is why sessions, hours and hotel nights all work
   through one mechanism.
5. **Taxonomies that grow are `text` in Postgres and `as const` in TypeScript.** Business
   type, channel, payment provider. Only closed sets get a CHECK constraint. This is what
   makes adding a vertical a code change rather than a migration.
6. **Two agent tool sets.** `CUSTOMER_TOOLS` can read the catalogue, book, and take
   payment. `OWNER_TOOLS` can write the catalogue. A customer-facing conversation is never
   given an owner tool, whatever the customer types.
7. **The agent never states availability or prices in prose.** It calls `list_slots` and
   quotes `services.price_minor`. Hallucinated commitments are the failure mode that loses
   a shop owner permanently.
8. **`raw_description` is never overwritten.** It is the parse input, the re-parse source,
   and the best training data this product will have.
9. **No business logic in components.** Pages and client components call the HTTP API
   contracts. Do not add server actions for business operations. Components take props.
10. **Icons only, never emoji.** Every glyph in the UI comes from lucide-react or an
    authored SVG in the world's own stroke weight. An emoji standing in for an icon is a
    defect, not a placeholder.
11. **Khmer needs `line-height: 1.75`.** Subscript consonants clip at Tailwind's default.

## Stack facts, verified August 2026

- Next.js **16.3.1** is current. `--ts`, `--tailwind`, `--app` and Turbopack are defaults.
  Pass `--no-agents-md` because this project uses CLAUDE.md.
- shadcn CLI **`@latest` (4.18.0)**, never `@canary`. Canary is stuck at 4.2.0-canary.0, so
  it is a downgrade. The "v4 needs canary" advice is a 2025 artifact.
- `components.json`: `tailwind.config` must be `""` on v4. `baseColor` and `cssVariables`
  are immutable after init.
- **shadcn hardcodes `leading-none` in CardTitle, DialogTitle and Label**, which clips Khmer
  coeng subscripts. Fixed with `@theme --text-*--line-height` overrides plus an unlayered
  `:lang(km)` rule. See `docs/HOMEPAGE.md` for the active homepage contract.
- **Source metadata is per component.** Record the source URL and component choice for the
  showcase. Defer all license review and licensing decisions; neither is a selection gate in
  this phase.
  Free-tier and authentication limits still apply when installing.
- **Clerk is `@clerk/nextjs` 7.8.3**, installed 29 August 2026. Its peer range is
  `next: ^16.1.0-0`, so 16.3.1 is fine. On Next 16 the middleware file is `proxy.ts`, not
  `middleware.ts`; the export you put in it is still `clerkMiddleware`, which is the part
  that reads wrong at first. Scaffold with `npx clerk@latest init`, keys via
  `clerk env pull`. `auth()` is async, always awaited, and returns a signed-out object
  unless the proxy actually ran for that path: an API route left off the matcher fails
  OPEN into "signed out", not closed. `ClerkProvider` is mounted per subtree here
  (`src/app/app/layout.tsx` and `src/app/(auth)/layout.tsx`), never at the root, so the
  public marketing site loads no Clerk script and a checkout with no Clerk keys still
  builds and serves. Without keys every matched path 500s in the proxy before the route
  runs, which makes the matcher the isolation boundary and worth keeping narrow.
  `appearance.variables` was renamed at some point and the old names are a type error, not
  a silent no-op: it is `colorForeground`, `colorInput`, `colorBorder` and
  `colorPrimaryForeground`, not `colorText` or `colorInputBackground`.
- **Vercel AI Gateway is the only LLM gateway** (decided 27 August 2026, replacing the
  earlier OpenRouter pick; `package.json` and PLAN.md already agreed, this paragraph was
  the last stale copy). `@ai-sdk/gateway` plugs into the Vercel AI SDK; model refs are
  `gateway:google/gemini-3.7-flash` style slugs and live only in `src/lib/ai/models.ts`,
  with direct Gemini and Anthropic keys as the fallback chain. Keyless on Vercel
  deployments (`VERCEL_OIDC_TOKEN` is injected), `AI_GATEWAY_API_KEY` locally, and local
  dev also runs on `GEMINI_API_KEY` alone. Audio goes up as an AI SDK `file` part
  (`type: 'file'`, `mediaType`, raw bytes), which the gateway passes through without a
  format allowlist. Still record `webm` or `wav` and never label a voice note mp4: that
  was an OpenRouter bug (provider issue #393) but the habit is cheap insurance.

## Component sourcing rule

**Never invent or hand-build a UI component.** Moni's primary UI source is **Beautiful UI**
because its agentic coding patterns cover prompt bars, chat, streaming, thinking/tool
traces, approvals, task rows, records, and insight cards. Select the closest complete
Beautiful UI component first and install or copy it as source during an implementation
task.

If Beautiful UI does not have the needed component, search in this order and stop at the
first complete fit:

1. Existing installed source component with the required contract.
2. **21st.dev Agent Elements** or another agent component with the required interaction.
3. **DaisyUI** or another established UI library that supplies the full interaction.
4. **shadcn/ui or Radix** only for a missing low-level primitive or accessibility behavior.

Keep the selected library component's structure and behavior. Use its documented theme
hooks and the active surface contract. Do not redraw it with Tailwind, substantially
rewrite it into a Moni-specific component, or replace it with guessed markup. If no
library component fits, stop and report the gap. Record the source URL, install or copy
  reference, and local usage in `CREDITS.md`; defer all license review and licensing decisions
  until distribution work.

When using 21st.dev, inspect the installed file: a registry entry can be a link stub rather
than code. A browser login does not provide the CLI API key, and the free tier is limited.
These checks protect the library-first rule; they are not permission to invent a fallback.

## Toolchain gotchas, all hit and solved on 19 August 2026

- **`shadcn init` hangs** in a non-TTY even with `--yes`, and `--base-color` no longer
  exists (base colour moved into a `--preset` system). Do not fight it: write
  `components.json` and `src/lib/utils.ts` by hand, then `npx shadcn@latest add <name>
  --yes` works non-interactively and correctly.
- **npx cache corruption** produced `ERR_MODULE_NOT_FOUND` for `zod/v3/external.js` when
  running shadcn. Fix: `rm -rf ~/.npm/_npx/<hash>` and rerun.
- **`timeout` does not exist on macOS.** It is `gtimeout` from coreutils, or use the
  harness timeout.
- **Next 16 rewrites `CLAUDE.md` on every `next dev` boot**, appending an agent rules
  block. `--no-agents-md` on create-next-app does not stop the dev server doing it. Set
  `agentRules: false` in `next.config.ts`. The block it adds is worth reading once: Next 16
  has breaking changes from earlier versions and ships its own docs at
  `node_modules/next/dist/docs/`.
- **Verified, not assumed:** in the compiled stylesheet `.leading-none` sits inside
  `@layer utilities` while our `:lang(km)` rule is unlayered, so the Khmer line height
  wins by cascade layer with no `!important`. Re-check this if Tailwind ever changes how
  it emits utilities.
- `tsconfig.json` keeps `allowImportingTsExtensions: true` so `node db/test.mjs` can
  import `src/lib/*.ts` with no build step. Do not remove it.
- **`import 'server-only'` makes a module unimportable from `db/test.mjs`.** Outside the
  `react-server` export condition that package resolves to a file that throws, so the test
  harness dies with "This module cannot be imported from a Client Component module", which
  names the wrong problem entirely. Keep pure logic in a sibling module with no
  `server-only` and re-export it: `src/lib/agent/instructions.ts` next to `prompt.ts`, and
  `src/lib/auth/gate.ts` next to `member.ts`. That is what makes a guardrail testable.
- **AI Elements has no voice component.** Verified against
  `registry.ai-sdk.dev/all.json`: 30 components, and not one references `getUserMedia` or
  `MediaRecorder`. It is a shadcn registry, and `prompt-input.tsx` has
  a microphone BUTTON but no capture behind it. ARCHITECTURE.md said to check it first for
  voice; it has been checked, and the answer is recorded there so it is not checked again.
- **Chrome headless clamps `--window-size` to a 500px minimum on macOS.** Both `--headless`
  and `--headless=new` reported `innerWidth=500` when asked for 390, so a 390px screenshot
  was really a 500px render cropped, which looked exactly like horizontal overflow and sent
  me chasing a layout bug that did not exist. Real mobile emulation needs CDP: use
  `puppeteer-core` with `setViewport({width, height, deviceScaleFactor, isMobile})`, driving
  the installed Chrome so nothing is downloaded. `npm run shoot`.
- **`fullPage: true` renders `position: fixed` at its first-viewport position**, so a pinned
  bottom nav appears stranded mid-page in a stitched capture. Always take a viewport-only
  shot as well before reporting fixed chrome as broken. `screenshots/mobile-viewport.png`
  is that shot.
- **`whileInView` and a full-page screenshot cannot both be right.** `motion`'s
  `whileInView` is an IntersectionObserver, and `page.screenshot({fullPage:true})` stitches
  rather than scrolls, so a reveal below the fold never fires and photographs at
  `opacity: 0`. The 29 August landing capture came out blank under the hero with 18
  elements stuck invisible, which looks exactly like a broken stylesheet. `npm run shoot`
  now walks the page before every full-page shot and then waits for GSAP's global timeline
  to go idle, and it reports an `invisible=` count so the failure names itself. This is
  also why scroll animation on the public site is GSAP, not `motion`: see PLAN.md section 3.
- **Khmer takes no letter-spacing.** A cluster is drawn as one unit, so `tracking-*` pulls
  the coeng and the vowel signs off the consonant they attach to. The uppercase eyebrow
  labels carried `0.2em` into the Khmer copy. `globals.css` neutralises it for
  `:lang(km)`, unlayered, the same cascade-layer trick as the 1.75 line height.
- **A grid item defaults to `min-width: auto`**, so any child wider than the column raises
  the column's floor. A `w-max` marquee track inside a `1.15fr` column resolved it to
  2445px inside a 1088px container and dragged the whole band off axis, while
  `overflow-x: clip` on `body` hid the document-level symptom. `min-w-0` on the item is the
  fix, and the capture script's `overflowing=` counter is what surfaced it.
- **The screenshot script emulates the colour scheme now.** Headless Chrome reports the
  host's setting, which is how a set of "the landing page is dark" screenshots got taken of
  a page that is white for half its visitors. `npm run shoot` states `prefers-color-scheme`
  per capture and also takes one `prefers-reduced-motion: reduce` shot, which is the proof
  that a reveal is decorating content rather than hiding it. Output is `screenshots/`,
  gitignored. Capture against `next start`, not `next dev`: the dev overlay's indicator
  renders into the corner of every shot.
- **`next start` fails silently on a busy port.** It logs `errno: -48` (EADDRINUSE) and exits,
  the OLD server keeps serving a stale build, and its CSS chunk 404s, so the page renders
  completely unstyled and looks like the stylesheet broke. Always
  `lsof -ti:3000 | xargs kill -9` before restarting, and check the CSS URL returns 200.
- **Node and Chrome swap the km-KH number separators.** With
  `{ numberingSystem: 'khmr' }`, Node (ICU 78) formats 15000 as `១៥.០០០` and 5.00 as `៥,០០`;
  Chrome 151 formats them as `១៥,០០០` and `៥.០០`. On a server rendered page that is a
  hydration mismatch on every money string and a decimal point that moves between SSR and
  hydration. Never format a user facing quantity through a `km-KH` locale: group through
  `en-US` and transliterate with `toKhmerDigits`. All of it lives in
  `src/lib/format/khmer.ts` and nowhere else.
- **shadcn's Tabs pins its active mark at `bottom-[-5px]`**, an offset tuned to its own
  `p-[3px]` list. Any list that draws its own bottom border instead gets the mark floating
  five pixels below that border as a stray rectangle in the content underneath. Its `h-9` is
  also applied through a `group-data-*` variant, which tailwind-merge cannot dedupe against a
  plain `h-*` utility, so a caller cannot set its own touch target height. Both are patched in
  `src/components/ui/tabs.tsx`.
- `noUncheckedIndexedAccess` is deliberately OFF for now. It is worth turning on after the
  demo ships, not during.

## Live infrastructure, set up 19 August 2026

- **Supabase project `Moni`**, ref `roorkzxyoyacychgrktt`, region `ap-southeast-1`
  (Singapore, closest to Cambodia and matching the other projects on the account).
  Schema applied as tracked migrations (`20260819000001_moni_schema`, then on 27 August
  `20260827171639_platform_waitlist_channels` and `20260827172045_security_lockdown`),
  seed applied over MCP. Live: 16 tables, 5 views, RLS on everywhere with zero policies.
  The free tier can pause the project after inactivity (status may become INACTIVE);
  restore over MCP or the dashboard and wait for ACTIVE_HEALTHY.
- The db password is in `.env.local` as `SUPABASE_DB_PASSWORD` and nowhere else. Supabase
  shows it once. It belongs in a password manager.
- **The Supabase access token lives in the macOS Keychain**, service `Supabase CLI`, not in
  a file and not in a shell profile. `.mcp.json` therefore does NOT use
  `${SUPABASE_ACCESS_TOKEN}`; it wraps the server in `sh -c` and reads the token with
  `security find-generic-password -s 'Supabase CLI' -w`. Do not "simplify" that back to an
  env var: the var is not set, and exporting it would put the token in plaintext.
- `src/lib/database.types.ts` is GENERATED from the live schema. Never hand edit it. Refresh
  with `npx supabase gen types typescript --project-id roorkzxyoyacychgrktt --schema public`.
  `src/lib/types.ts` stays the hand-written source of truth for money, taxonomies, the tool
  surface and plans; the generated file is only row shapes.
- **Vercel** account `reach2n`. The CLI login flow changed: `--github` now redirects to a
  changelog page instead of authorizing. Use `vercel login --future` (OAuth Device
  Authorization), which prints a URL with the code embedded and polls, so it works without a
  TTY and without a localhost callback.

## Commands

```bash
npm run db:test       # applies schema.sql + seed.sql to a real Postgres (PGlite/WASM)
                      # and runs the full assertion suite. Run after ANY schema change.
npm run test:signals  # the notice board's rules, including the first-run and
                      # channel-down states no seed data can ever show. No server.
npm run shoot         # desktop + mobile + mobile-viewport captures via CDP
```

## Layout

```
db/schema.sql       16 tables, 5 views. RLS ON everywhere with zero policies (deny by
                    default, service role only). The commented Clerk member policies are
                    CANCELLED: see ARCHITECTURE.md section 1. Do not enable them.
db/seed.sql         two demo businesses: a salon (sessions) and a guesthouse (nights)
db/test.mjs         the proof. Full assertion suite, no server required
src/lib/format/khmer.ts   every user facing quantity. One implementation, on purpose
src/lib/queries/signals.ts what the shop needs from its owner, ranked. Pure, and tested
src/components/app/panel.tsx  the panel grammar: header, rows, note, count badge
src/proxy.ts        Clerk, scoped to /app, the auth screens and owner API routes
src/lib/auth/gate.ts   the waitlist gate as pure rules, so db/test.mjs can prove them
src/lib/auth/member.ts requireMember(): the ONE place tenancy is decided. RLS has zero
                    policies, so a query that forgets its businessId has nothing to catch it
src/lib/types.ts    source of truth: money, taxonomies, row types, tool surface, plans
src/lib/payments.ts KHQR provider adapter interface. Provider choice is config
src/lib/ai/models.ts the only file allowed to name a model or provider
AGENTS.md            active agent contract and current surface
PLAN.md              THE build order: MVP definition, phases, acceptance checks
ARCHITECTURE.md      target architecture and guardrails
docs/HOMEPAGE.md     active light-only homepage UI contract
docs/archive/        historical research, never an implementation source
```

## Things already decided, do not relitigate

- Telegram first because its BotFather token has no app-review dependency. Messenger requires
  Meta app review and remains the next channel when that review is active.
- **Telegram, learned building Phase 4 on 30 August 2026.** `setWebhook` takes a
  `secret_token`, which Telegram returns in an `X-Telegram-Bot-Api-Secret-Token` header on
  every delivery: that, not the URL, is what proves a caller. Telegram only calls public
  HTTPS, so a laptop needs a tunnel before a bot can be connected. It redelivers on a slow
  response, and the agent can BOOK, so every update is written to `webhook_events` before
  the agent runs and a redelivery is refused by the dedupe index; the webhook answers 200
  to almost everything, because a non-2xx buys retries we cannot safely honour. grammY is
  used as `new Api(token)` only, never `Bot`: `Api` needs no init, so one webhook serves
  every tenant without a `getMe` per message. And `/api/webhooks/*` must stay OFF the Clerk
  proxy matcher, or every inbound customer message 500s on a missing session.
- KHQR payments: **the money is the shop's** (decided 2 September 2026, replacing the
  earlier "route by currency" rule and the 30 August platform-CutLuy-only state).
  - The owner pastes her own Bakong account on `/app/money`; it lives in the three
    `businesses.khqr_*` columns. `src/lib/payments/shop-khqr.ts` builds the KHQR offline
    into that account, KHR and USD, and `railsFor(currency, account)` prefers it.
  - No relay. Bakong's check-transaction blocks servers outside Cambodia and Vercel is not
    in Cambodia, so the rail is `pollBased: false` and the owner's own banking app is the
    verifier: `confirm_payment` (owner tool, inbox button, `POST /api/payments/confirm`)
    moves a row pending to paid, once, and confirms the booking.
  - **CutLuy** (`https://cutluy.com`, USD only) stays as the platform token's rail: a demo
    and a webhook safety net, never the product, because it settles into Moni's account.
  - The QR goes to the customer as a picture: Telegram `sendPhoto` with uploaded bytes,
    Messenger by URL (`/api/pay/{code}?format=png`, needs public HTTPS), web chat inline.
- `src/lib/payments.ts` is **ported from working production code** at
  `/Users/mense/tiktok-bot-private/store/src/lib/payments/`. Comments marked PORTED carry a
  bug that was already paid for once. Do not simplify them away.
- Idempotency keys are **time bucketed** (`idempotencyKey()`), never static. A static key
  plus a unique constraint permanently strands any customer whose QR lapsed unpaid.
- Free tier is 100 transactions per month, where a transaction is a booking that reached
  confirmed or completed, plus standalone paid sales. Metered in `v_month_usage`.
  Revenue model is per successful transaction: free to use, charged when the shop gets paid.
- Auth is **Clerk** (PLAN.md Phase 2). Customers never log in, only owners. Since
  27 August 2026 **RLS is ON for every table with zero policies**: deny by default, the
  service role is the only way in, so the open-Data-API hole is closed before anything
  public deploys. **It stays that way permanently.** The plan to add Clerk-JWT member
  policies in Phase 2 is cancelled (ARCHITECTURE.md section 1): opening the Data API would
  make hand-written SQL policies the only wall between tenants. Tenancy is enforced
  instead in one server-side `requireMember()` plus a `businessId` argument on every query,
  which is auditable in one place. RLS stays as defence in depth. Views are
  `security_invoker` and `moni_touch` has a pinned search_path, per Supabase advisors.
- **The database client is Drizzle over Supavisor transaction mode**, not `supabase-js`
  (ARCHITECTURE.md section 2). PostgREST has no transactions, and stock decrement plus
  invoice numbering both need one. Set `prepare: false` on the postgres.js client or the
  second request to any route dies with "prepared statement already exists".
  `@supabase/supabase-js` remains installed for Storage uploads only.
- **Vercel AI Gateway** is the LLM gateway, decided 27 August 2026. Gemini-family models
  stay the default because they handle Khmer, voice and instruction-following well. Nothing
  outside `src/lib/ai/models.ts` may name a provider or model.
- The domain is **moni.cam**, RDAP-verified unregistered on 27 August 2026, NOT yet
  purchased. Everything runs on vercel.app URLs until it is bought, so it gates launch,
  not work. Wildcard `*.moni.cam` is reserved in planning for future generated shop sites.
- Design direction is **light-only black and white with a single green accent, Apple-native
  style** for the homepage (PLAN.md section 3 and `docs/HOMEPAGE.md`). The homepage does
  not follow `prefers-color-scheme: dark`. The earlier "Invitation" system is archived and
  must not be copied into homepage work.
- **API-first**: every capability is an HTTP endpoint under `src/app/api/` with a JSON
  contract, so a native Swift client can later do everything the web app does. No server
  actions for business operations.
- The landing page ships first, with a waitlist positioned as a founding-shops application.
  The public site shows ONLY the waitlist. The product lives on the app subdomain
  (app.moni.cam once bought, vercel.app until then) behind a gate: after Clerk sign-in,
  the email must be in `waitlist` or manually approved (`approved_at`). The gate is one
  `requireMember()` helper so launch is deleting one call site.
- Hotels, courts and tailoring jobs need no new tables. Resource plus range covers them.
- **The calendar is schedule-x's MIT core and has no resource lanes** (decided
  3 September 2026, reversing the earlier hand-built decision). Both
  `@schedule-x/resource-scheduler` and `@sx-premium/resource-scheduler` 404 on npm,
  so the paid view is not obtainable at any price short of a licence. A resource is
  now a colour rather than a column: the model still carries `resourceId` on every
  booking, only the view changed. It reads the GLOBAL `Temporal`, so
  `src/components/app/calendar-view.tsx` imports `temporal-polyfill/global` for its side
  effect; a named import of the same polyfill fails the library's `instanceof` check and
  the calendar renders nothing at all.
- **A catalogue is `v_catalog`, never `services`** (decided 2 September 2026). A cafe has
  products and no services, so any code asking "does this shop have anything to sell"
  reads the view. Three places got this wrong at once and all three shipped: the setup
  spine, the storefront and the `/app` redirect.
- **A walk-in row is a product, a timed row is a service** (decided 3 September 2026).
  `catalogKindFor(businessType, unit)` in types.ts is the one rule, and it needed no column
  because `sells` already lives on the business type and `unit` already rides on every parsed
  row. Phase 11 fixed three READ paths for the cafe bug and missed the WRITE path in
  `setup/persist.ts`, which is why a real cafe's published page showed no photographs: the
  tile feature was not broken, it was unreachable.
- **Setup never deactivates a product, only a service.** A service list is the shop's
  description of itself, so dropping a service from that description is a real retirement.
  A product list is inventory: it carries uploaded photographs, stock and categories, and it
  is edited from another screen by other tools. Re-saving a shop description must never empty
  a menu.
- **`products.photo_path` is a Supabase Storage key, never a URL.** `publicMediaUrl()` in
  `src/lib/media/storage.ts` is the only function that knows the `shop-media` bucket is
  public, so if that ever changes, one function changes and no row does.
- **What a shop sells is `sells` on the business type**, in TypeScript, not a column.
  `businesses.capabilities` is reserved and deliberately unbuilt.
- **Image generation needs billing.** Verified 2 September 2026: every Gemini image model
  the key can see refuses with the free tier's daily per-model quota spent, and the Vercel
  gateway refuses them on its free tier. The feature ships and reports which refusal it
  was; upload is the path that always works.
- **A shop's look is a vibe plus a seed** (decided 3 September 2026). The theme comes
  from what the shop is, the vibe is three closed enums the model reads from
  `raw_description`, and the seed is a column the owner picks from four candidates.
  `styleFor()` is pure so `db/test.mjs` proves the only claim that matters: no seed
  produces unreadable Khmer on a real shop's public site. Tokens vary, composition
  does not, and that narrowing is deliberate rather than unfinished.
- **A product with no photo gets a seeded tile, never a stock photo.** A photograph of
  somebody else's food beside a real shop's real price is the failure that loses an
  owner permanently. `tileFor()` is keyed on the product id, so renaming an item does
  not redraw the menu.
- **The tile is for products only, never services.** A haircut or a room-night never had
  a photograph and never asked for one: decorating every row of a salon's menu with
  generated art is a change nobody asked for. `shouldDrawTile()` in `src/lib/media/tile.ts`
  gates on `kind === 'product'` and a missing `photoUrl`, and the same function backs both
  the storefront renderer and the owner-facing photoless count on `/app/products`, so the
  two can never disagree about which rows are affected.

## Known gaps

- **Fonts, settled.** `Futura 100 KHM` is **Futura®100 Khmer**, TypeTogether under
  authorization from Bauer Types, Khmer script by Sovichet Tep, released September 2025,
  12 styles. It was active on this machine via Adobe Fonts sync around 1 May and has since
  been deactivated, which is why no file exists locally.
  - The Adobe Fonts subscription grants **web project use only**, served from Adobe's CDN.
    It does **not** grant self hosting.
  - The TypeTogether EULA **prohibits converting their fonts to a web format**, in two
    separate clauses. Converting the desktop file or the Adobe sync blob to woff2 is a
    licence breach. Do not do it.
  - Path for this project: reactivate in Creative Cloud, create an Adobe Fonts web project,
    and paste the embed into the root layout. Free with the existing subscription and no
    pageview cap.
  - Self hosted fallbacks in the stack: **Kantumruy Pro** (OFL, by Sovichet Tep, the same
    designer who drew the Khmer in Futura®100 Khmer, so the closest legal match) and
    **Busra** (OFL, SIL, already vendored at `public/fonts` with its licence text).
  - If self hosting ever becomes a requirement, TypeTogether must be contacted for a
    perpetual webfont quote. Desktop prices are published: complete 12-font package
    USD 567.53, individual styles from about USD 74. Webfont tier prices are not published.
- Domain, settled: **moni.cam**, verified unregistered by RDAP on 27 August 2026
  (CentralNic registry), not yet purchased. The 19 August survey below stands as the
  record of what else was open:
  bare `moni` and bare `mony` are gone on
  .com, .app, .dev, .io, .co, .me, .cc, .asia, .tech, .pro and .systems.
  **Available .com:** `monikhmer.com`, `monykh.com`, `monykhmer.com`.
  **Available other:** `moni.shop`, `moni.biz`, `moni.site`, `moni.online`, `moni.link`,
  `moniapp.app`, `monishop.app`, `mony.shop`, `mony.biz`, `mony.site`, `mony.store`,
  `mony.cc`.
  Taken and relevant: `moniapp.com` (parked at NameBright), `moni.com` (Cloudflare),
  `mony.com` (MarkMonitor since 1991, it was Mutual Of New York, an insurer, so typo
  traffic leaks to a financial institution). `krama.com` and `krama.app` both taken, so
  krama is dead. `trymoni.com` is already registered.
- Housekeeping, not a leak: `.env`, `.env.bak-cutluy` and `store/.env.local` in the
  tiktok-bot-private repo are all correctly gitignored and absent from git history. But
  ~40 generated KHQR PNGs sit in `~/Downloads` named after real transaction references.
  Worth deleting.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes: APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev`: verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

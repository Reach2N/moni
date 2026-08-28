# Moni

AI assistant that answers customer messages and takes bookings and payments for local
Cambodian businesses. The owner describes the shop in plain language, by typing or by
voice. Everything else is derived from that.

Built for the AI in Motion program application. Deadline driven, so scope discipline
beats feature count.

**PLAN.md is the build order.** Read it after this file. It defines the MVP, the
phases, and each phase's acceptance check. A session works on one phase and states
which. FEATURES.md, UI-PLAN.md and DESIGN.md describe the earlier demo iteration
and are superseded where they conflict with PLAN.md.

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
9. **No business logic in components.** Pages call queries or server actions. Components
   take props.
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
  `:lang(km)` rule. See UI-PLAN.md.
- **21st.dev is not blanket MIT.** Licence is per component and often blank, which means
  default copyright, not permissive. Only install components whose metadata says `mit` and
  credit the author. Free tier is 2 installs per day.
- **Clerk supports Next 16 from `@clerk/nextjs` 7.2.5.** On Next 16 the middleware file
  is `proxy.ts`, not `middleware.ts` (same contents). Scaffold with `npx clerk@latest init`,
  keys via `clerk env pull`. `auth()` is async, always awaited.
- **OpenRouter is the only LLM gateway** (decided 27 August 2026). `@openrouter/ai-sdk-provider`
  plugs into the Vercel AI SDK; model refs are `openrouter:google/gemini-2.5-flash` style
  slugs and live only in `src/lib/ai/models.ts`. Audio goes up as base64 `input_audio`
  (`wav` and `webm` are reliable; `audio/mp4` was silently ignored per provider issue #393,
  so never label voice notes mp4). Pure transcription can use
  `POST /api/v1/audio/transcriptions`. Env: `OPENROUTER_API_KEY`.

## Component sourcing rule

**Never hand-build a component before searching for an existing one.** Search in this
order and stop at the first real fit:

1. **shadcn/ui** which is already wired here: `npx shadcn@latest add <name> --yes`.
2. **21st.dev**: `npx shadcn@latest add "https://21st.dev/r/<author>/<slug>?api_key=$KEY" --yes`.
   The key lives in `~/.config/21st/auth.json`; a browser login alone does NOT reach the
   CLI, and without the `api_key` query param every install fails with
   `[Authentication required]`. Free tier is 2 installs per day. Only install components
   whose metadata says `license: mit`, and credit the author in CREDITS.md.
3. **A focused MIT npm package** that does one thing well, for example
   `@number-flow/react` for transitioning digits.
4. **Hand-build only when none of the above fits**, and say so in a one line comment at
   the top of the file naming what was searched and why it did not fit.

Two things learned on 19 August: a 21st.dev entry can be a **link stub rather than code**
(`barvian/number-flow` installed a file containing only a URL and still consumed one of
the two daily installs), so open the file after every install. And an adopted component
must be **restyled into the committed visual world**; shipping a library component with
its own default styling inside a committed design is a lapse, not a shortcut.

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
- **Chrome headless clamps `--window-size` to a 500px minimum on macOS.** Both `--headless`
  and `--headless=new` reported `innerWidth=500` when asked for 390, so a 390px screenshot
  was really a 500px render cropped, which looked exactly like horizontal overflow and sent
  me chasing a layout bug that did not exist. Real mobile emulation needs CDP: use
  `puppeteer-core` with `setViewport({width, height, deviceScaleFactor, isMobile})`, driving
  the installed Chrome so nothing is downloaded. `npm run shoot`.
- **`fullPage: true` renders `position: fixed` at its first-viewport position**, so a pinned
  bottom nav appears stranded mid-page in a stitched capture. Always take a viewport-only
  shot as well before reporting fixed chrome as broken. `.impeccable/review/mobile-viewport.png`
  is that shot.
- **`next start` fails silently on a busy port.** It logs `errno: -48` (EADDRINUSE) and exits,
  the OLD server keeps serving a stale build, and its CSS chunk 404s, so the page renders
  completely unstyled and looks like the stylesheet broke. Always
  `lsof -ti:3000 | xargs kill -9` before restarting, and check the CSS URL returns 200.
- **A JSX comment never reaches the DOM.** `{/* ... */}` is a JavaScript comment and the
  compiler strips it. The impeccable direction contract has to survive the production build,
  so it is emitted through `dangerouslySetInnerHTML` on a `hidden` div in the root layout.
  Audit it with `curl -s localhost:3000/app | grep "seed f1fef148"`.
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
  The free tier PAUSES the project after ~a week idle (hit 27 August, status INACTIVE);
  restore over MCP or the dashboard and wait for ACTIVE_HEALTHY, about three minutes.
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
                      # and runs 80 assertions. Run this after ANY schema change.
npm run test:signals  # the notice board's rules, including the first-run and
                      # channel-down states no seed data can ever show. No server.
npm run shoot         # desktop + mobile + mobile-viewport captures via CDP
```

## Layout

```
db/schema.sql       16 tables, 5 views. RLS ON everywhere with zero policies (deny by
                    default, service role only); Clerk member policies commented until Phase 2
db/seed.sql         two demo businesses: a salon (sessions) and a guesthouse (nights)
db/test.mjs         the proof. 80 assertions, no server required
src/lib/format/khmer.ts   every user facing quantity. One implementation, on purpose
src/lib/queries/signals.ts what the shop needs from its owner, ranked. Pure, and tested
src/components/app/panel.tsx  the panel grammar: header, rows, note, count badge
src/lib/types.ts    source of truth: money, taxonomies, row types, tool surface, plans
src/lib/payments.ts KHQR provider adapter interface. Provider choice is config
src/lib/ai/models.ts the only file allowed to name a model or provider
PLAN.md             THE build order: MVP definition, phases, acceptance checks
FEATURES.md         feature tiers and competitor position (pre-plan, still useful)
UI-PLAN.md          earlier iteration's UI plan, superseded where it conflicts
DESIGN.md           earlier "Invitation" design system, superseded by PLAN.md section 3
```

## Things already decided, do not relitigate

- Telegram first because BotFather is a two minute token paste. Messenger needs Meta app
  review, which takes weeks. Messenger is the larger channel in Cambodia, so it is next,
  and the pitch says exactly that.
- KHQR payments: **route by currency, not by preference.**
  - KHR goes through local offline KHQR generation from `BAKONG_ACCOUNT`, verified through
    the relay at `BAKONG_RELAY_API_URL`. Riel is the default for local shops, so this is
    the primary rail.
  - USD goes through **CutLuy** (`https://cutluy.com`, `POST /v1/payments`, check with
    `GET /v1/payments/:id`). CutLuy **settles USD only**, so it cannot serve a riel shop.
  - Bakong's own check-transaction blocks calls from servers outside Cambodia and Vercel is
    not in Cambodia. Generation is offline and unaffected. Only the check needs the relay.
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
  public deploys. Phase 2 adds the member policies (written and commented in schema.sql,
  keyed on `auth.jwt()->>'sub'` because Clerk user ids are text, not uuid). Views are
  `security_invoker` and `moni_touch` has a pinned search_path, per Supabase advisors.
- **OpenRouter** is the LLM gateway, decided 27 August 2026. Gemini-family models stay the
  default because they handle Khmer, voice and instruction-following well. Nothing outside
  `src/lib/ai/models.ts` may name a provider or model.
- The domain is **moni.cam**, RDAP-verified unregistered on 27 August 2026, NOT yet
  purchased. Everything runs on vercel.app URLs until it is bought, so it gates launch,
  not work. Wildcard `*.moni.cam` is reserved in planning for future generated shop sites.
- Design direction is **black and white with a single green accent, Apple-native style**
  (PLAN.md section 3). Tokens use Apple semantic names so a future SwiftUI app maps 1:1.
  The earlier "Invitation" system is retired.
- **API-first**: every capability is an HTTP endpoint under `src/app/api/` with a JSON
  contract, so a native Swift client can later do everything the web app does. No server
  actions for business operations.
- The landing page ships first, with a waitlist positioned as a founding-shops application.
  The public site shows ONLY the waitlist. The product lives on the app subdomain
  (app.moni.cam once bought, vercel.app until then) behind a gate: after Clerk sign-in,
  the email must be in `waitlist` or manually approved (`approved_at`). The gate is one
  `requireMember()` helper so launch is deleting one call site.
- Hotels, courts and tailoring jobs need no new tables. Resource plus range covers them.

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
    paste the embed into the root layout. Free with the existing subscription, no pageview
    cap, about ten minutes.
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
  krama is dead. `trymoni.com` was registered on 13 August, six days ago.
- Housekeeping, not a leak: `.env`, `.env.bak-cutluy` and `store/.env.local` in the
  tiktok-bot-private repo are all correctly gitignored and absent from git history. But
  ~40 generated KHQR PNGs sit in `~/Downloads` named after real transaction references.
  Worth deleting.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes: APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev`: verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

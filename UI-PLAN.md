# Moni: UI build plan

Mark up anything here and I will swap it. Nothing below is built yet.

House rules for this codebase:
1. No em dashes in any user-facing string, marketing copy, or AI output. Colons, commas,
   or a full stop instead. The system prompt gets an explicit instruction about it,
   because the model will otherwise produce them constantly.
2. All money through `formatMoney()` from `src/lib/types.ts`. Never a raw number in JSX.
3. No business logic inside a component. Components read props and call server actions.
4. Khmer and English strings live in `src/lib/i18n.ts` from day one, even with two keys.
   Retrofitting i18n after 40 components is the single most expensive rewrite there is.

## Stack

| Layer | Choice | Why this and not the alternative |
|---|---|---|
| Framework | Next.js 16.3.1, App Router, TS strict | Current default as of today. Server actions remove an entire API layer for owner mutations |
| Styling | Tailwind v4 | Tokens live in CSS, no JS config to drift |
| Components | shadcn/ui 4.18 as the base, 21st.dev for marketing sections only | You own the code. No version upgrade breaks your design |
| Data | Supabase Postgres, service role server side only | Auth is deferred, RLS already written and commented in schema.sql |
| Agent | Anthropic SDK, tool calling, two tool sets | Tools are typed in `types.ts` already |
| Deploy | Vercel | Free, instant, custom domain in two minutes |

Deliberately NOT in the MVP: TanStack Table (plain table until you need virtualization),
Zustand or Redux (server state belongs on the server), FullCalendar (see calendar section),
next-intl (a plain dictionary object is enough for two languages).

## Typography

Futura KHM is the request. One caveat to resolve before it goes on the web: if it arrived
through Adobe Creative Cloud, the desktop licence does not permit self hosting the file on
a website. In that case it stays legal for the logo, the video titles, and thumbnails, all
of which are desktop use.

Web plan, pending what is actually on disk:
- Latin: Jost. It is the closest free geometric sans to Futura, and it is on Google Fonts.
- Khmer: Kantumruy Pro. Real Khmer design, not a Latin font with fallback glyphs.
- Khmer line height 1.75 minimum. Khmer stacks subscript consonants below the baseline and
  clips at Tailwind's default 1.5. This one setting is the difference between looking local
  and looking like a foreign template.

```css
/* app/globals.css */
:lang(km), .km { font-family: 'Kantumruy Pro', sans-serif; line-height: 1.75; }
```

## Verified install, August 2026

Two of my earlier calls were wrong and are corrected here.

```bash
# Next is 16.3.1 now, not 15. --ts, --tailwind and --app are defaults in 16,
# Turbopack is default, and --agents-md is on by default (we use CLAUDE.md, so opt out).
npx create-next-app@latest moni --src-dir --import-alias "@/*" --eslint --no-agents-md

# shadcn@latest, NOT @canary. The "Tailwind v4 needs canary" advice is a 2025
# artifact: canary is stuck at 4.2.0-canary.0 while latest is 4.18.0, so canary
# is now a downgrade.
npx shadcn@latest init
npx shadcn@latest add button input textarea table badge card dialog sheet tabs sonner
```

`components.json` for this stack. Note `tailwind.config` must be an empty string on v4,
and `baseColor` plus `cssVariables` are immutable after init, so get them right the first time.

```json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": { "config": "", "css": "src/app/globals.css", "baseColor": "zinc", "cssVariables": true, "prefix": "" },
  "aliases": { "components": "@/components", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks", "utils": "@/lib/utils" }
}
```

Untested combination to check early: shadcn 4.18 against Next 16.3.1 has no published
compatibility matrix. Run `init` first, before any components are written, so a failure
costs five minutes rather than an afternoon.

## Khmer clipping: shadcn actively breaks this

This is not theoretical. shadcn hardcodes `leading-none`, meaning `line-height: 1`, in
exactly the components that hold headings and labels:

- `CardTitle`: `cn("leading-none font-semibold", className)`
- `DialogTitle`: `cn("text-lg leading-none font-semibold", className)`
- `Label`: `"text-sm leading-none font-medium"`

At `line-height: 1` Khmer coeng subscripts clip outright. On top of that, every Tailwind v4
`text-*` utility ships its own paired line height, so `text-sm` lands near 1.43 even without
`leading-none`. Both need overriding:

```css
/* globals.css, after @import "tailwindcss"; */
@theme {
  --text-xs--line-height: 1.75;
  --text-sm--line-height: 1.75;
  --text-base--line-height: 1.75;
  --text-lg--line-height: 1.6;
  --text-xl--line-height: 1.5;
}

/* Unlayered on purpose. Tailwind emits utilities inside @layer utilities, and
   unlayered declarations beat layered ones regardless of specificity, so this
   defeats leading-none with no !important and no patching generated files.
   Scoped to text elements: a blanket * rule breaks icon button centring. */
:lang(km) :is(p, span, h1, h2, h3, h4, li, td, th, label, button, a) {
  line-height: 1.75;
}
```

Set `lang="km"` on `<html>` or on a wrapper for `:lang(km)` to match. Verify this renders
before relying on it: the layer precedence behaviour is correct per the CSS cascade spec but
is not documented by Tailwind, which only suggests `!important`.

## 21st.dev licensing: read before installing anything

Aggregator sites still say "100% MIT, unlimited commercial use". That is out of date and
wrong for a product you intend to charge for.

- 21st.dev's own terms grant use "solely through the official 21st.dev platform", prohibit
  redistribution without authorisation, and require a visible link back to the component
  page when code is copied elsewhere.
- Licence is per component metadata and is **frequently blank**. Observed values include
  `mit`, `mpl-2.0`, `no-license`, and a large number of empty strings. Blank is not
  permissive, it means default copyright.
- **Rule for this project: only install components whose metadata says `mit`, and record the
  author in a `CREDITS.md`. Treat blank and `no-license` as do-not-ship.**
- The free tier allows **2 component installs per day**. That is the real constraint on a
  deadline. Builder is $6/month if you need more, which is inside the $40 budget, but note
  that no paid tier grants commercial rights the component's own licence does not already
  give you.

## Component picks, existence verified

| Need | Take this | Licence |
|---|---|---|
| Hero with a large text input | `21st.dev/r/kokonutd/v0-ai-chat` | mit |
| Animated counter | `21st.dev/r/barvian/number-flow` | mit, wraps @number-flow/react |
| Chat bubbles | `21st.dev/r/jakobhoeg/chat-bubble` plus `message-loading` | mit |
| Pricing table | `21st.dev/r/aymanch-03/pricing-section` | mit, zero extra deps |
| Bento grid for the 42 shop types | `21st.dev/r/manuarora700/bento-grid` | mit, no deps |
| FAQ | `shadcn add accordion` | mit |
| Footer | `21st.dev/r/RayMethula/footer` | mit, no deps |
| Sidebar | `shadcn add sidebar` | mit |

Avoid `easemize/ai-prompt-box` despite it being the most downloaded hero input: its licence
field is blank.

One dependency hygiene note: older 21st components import `framer-motion` and newer ones
import `motion`. Mixing vintages puts both in your tree. Normalise on `motion` and rewrite
the import if a component brings the old one.

## Hand built, confirmed by the research

Neither registry serves these, so the earlier list stands and the reasons are now verified:

- **Data table.** 21st has no real data table at all. The closest is styled markup with no
  sorting, pagination or virtualization. Plain shadcn `table` for the MVP, TanStack later.
- **Calendar with resource lanes.** shadcn's is a date picker. The one decent 21st event
  calendar is a single contributor's month view with no resource columns.
- **Stat tiles.** The 21st stats category is genuinely bad and mostly unlicensed. It is a
  grid of cards, so write it.
- **Chat thread container.** The bubble primitive is fine, but there is no thread, no
  streaming state, no virtualization.

## Design tokens

One accent, one surface family, nothing else. Set once in `globals.css` as CSS variables so
a rebrand is one file.

```
surface   #0B0F14   near black, warm side
raised    #141A21
border    #1F2933
text      #E6EDF3
muted     #8B98A5
accent    #00D0A0   teal green. Reads as money and as confirmation, and it is
                    distinguishable for the common forms of colour blindness
warn      #FFB020   pending, expiring QR
danger    #FF5C5C   no show, cancelled
radius    10px
```

## Routes

| Route | What it is | Build when |
|---|---|---|
| `/` | Marketing home. The paste box is the hero. | MVP |
| `/pricing` | Three tiers, the free 100 transactions front and centre | MVP |
| `/privacy` | Privacy policy | MVP, required before you ask anyone to log in |
| `/terms` | Terms of service | MVP |
| `/onboarding` | Three steps to a live assistant | MVP |
| `/app` | Today view. The dashboard. | MVP |
| `/app/calendar` | Day and week, one column per resource | MVP |
| `/app/inbox` | Conversations, escalations first | MVP |
| `/app/services` | Editable price list | MVP |
| `/s/[slug]` | Public booking page per shop. No app install for the customer. | MVP |
| `/app/bookings` | Full table with filters | after |
| `/app/resources` | Staff, rooms, bays. Bulk add. | after |
| `/app/payments` | Transactions and the quota meter | after |
| `/app/settings` | Hours, closures, channels, CSV export | after |
| `/app/activity` | Audit log from `events` | after |

## `/` the homepage, top to bottom

The product is the marketing. The hero is not a picture of the app, it is the app.

```
┌──────────────────────────────────────────────────────────────┐
│  moni            ព្រឹត្តិការណ៍  Pricing   ភាសាខ្មែរ ▾   [Try free] │  sticky, blurred
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   Your shop answers messages                                 │
│   while your hands are busy.                                 │
│                                                              │
│   Type what you sell. In Khmer, in English, however you       │
│   say it. Your assistant is live in one minute.              │
│                                                              │
│   ┌────────────────────────────────────────────────┐         │
│   │ កាត់សក់ 15000៛ 30 នាទី។ លាបសក់ 45000៛...        │  ← REAL
│   │                                          [🎤] │    input
│   └────────────────────────────────────────────────┘         │
│              [ Build my assistant  → ]                       │
│   ២៤ ហាង បានចាប់ផ្តើមសប្តាហ៍នេះ · no card, no install        │
└──────────────────────────────────────────────────────────────┘
```

Then, in order:

1. **The parse reveal.** Same viewport, no scroll needed. Text collapses into a services
   table with prices and durations, each row animating in. Caption: "This is your price list.
   Edit anything." This is the moment that sells the product, so it happens above the fold
   on the first interaction, not three sections down.
2. **Live conversation.** Two panels side by side. Left, a phone frame in Telegram colours
   where a customer asks in Khmer. Right, the bookings table with a row sliding in and a
   KHQR square appearing. Autoplays once, then a Replay control. Not a video, real components
   driving off a scripted transcript, so it can never look stale.
3. **Three counters.** Bookings taken, minutes the owner spent, riel collected. The middle one
   reads 0 and that is the joke that lands.
4. **Every kind of shop.** A grid of the 42 business types with Khmer labels. This is the
   proof that it is not a salon app. Hotels, tailors, karaoke, clinics, moto repair.
5. **Payment.** One phone showing a KHQR code, one line of copy: money arrives before the
   customer does. Deposits are how no shows stop.
6. **Not a flow builder.** A two column comparison. Left, a screenshot of a node graph, the
   caption "what other tools ask you to build". Right, your text box. One sentence:
   they sell a builder, this sells the result.
7. **Pricing strip.** Free to 100 transactions a month. Then a link to `/pricing`.
8. **Four FAQs.** Do my customers install anything (no). Does it speak Khmer (yes, and it
   answers in whatever language it is asked in). What if it gets something wrong (it hands
   the conversation to you and stops). Do I need a bank merchant account (no, KHQR works
   with the account you already have).
9. **Footer.** Privacy, terms, Telegram contact, language switch.

## `/onboarding`, three steps, one screen each

Progress dots, back always available, no step longer than one question.

1. **What kind of shop is this?** Card grid, ten most common types with Khmer labels and
   icons, plus a search field for the other 32. Sets unit, resource kind, default duration,
   and whether deposits are suggested. Never locks a feature.
2. **Tell me what you sell.** The same composer as the homepage, prefilled with a template
   for the chosen type so the owner edits rather than faces a blank box. Microphone button
   records, transcribes, and drops the text in. The recording is kept in
   `messages.audio_url`, the transcript in `body`.
3. **Confirm.** The parsed services table, editable inline. One toggle for opening hours,
   which arrives prefilled from whatever the text said. Button: Start my assistant.

Then straight to `/app` with the assistant already answering. No verification email in the
demo path, because every extra screen is a place the judge loses interest.

## `/app` today view

```
┌────────┬─────────────────────────────────────────────────────┐
│ moni   │  Today, Wednesday 19 August          [ Ask Moni ▾ ] │
│        ├─────────────────────────────────────────────────────┤
│ Today  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│ Calen. │  │ 6      │ │ 240,000│ │ 2      │ │ 0 min  │       │
│ Inbox 2│  │bookings│ │ ៛ today│ │waiting │ │ you    │       │
│ Servic.│  └────────┘ └────────┘ └────────┘ └────────┘       │
│ Money  │                                                     │
│ ─────  │  NEXT UP                          NEEDS YOU (2)     │
│ Setting│  09:00 Ratana   កាត់សក់   ✓paid   Dara wants a      │
│        │  14:00 Sophea   លាបសក់   ✓paid    discount →        │
│ 98/100 │  16:30 Chan     សក់អ៊ុត   ⧗QR 8m  Srey asks about   │
│ this mo│                                    Sunday →          │
└────────┴─────────────────────────────────────────────────────┘
```

`Ask Moni` is the owner side agent, with the write tools. "Add rooms 101 to 120",
"raise all colouring prices by 5000", "close Thursday afternoon". One command bar
instead of five settings screens, which is also the demo that makes judges sit up.

## The calendar, and why it is hand built

shadcn's Calendar is a date picker, not a schedule. FullCalendar is 200KB and you will
spend the afternoon fighting its CSS to match your tokens. This view is 150 lines of CSS
grid and you own it:

- Columns are resources, read straight from the `resources` table. Two chairs for a salon,
  twenty rooms for a guesthouse, scrolls horizontally on mobile.
- Rows are 15 minute increments from opening to closing, read from `businesses.hours`.
- A booking is an absolutely positioned block. Top and height come from `starts_at` and
  `ends_at`, which is why storing a range rather than a start plus duration matters.
- Buffer time renders as a hatched strip under the block, so the owner can see why 14:00
  is unavailable even though the haircut ended at 13:45.
- Closures render as a diagonally striped overlay across every column.
- Status maps to colour: accent for confirmed, warn for pending, hollow outline for
  cancelled, danger stripe for no show.
- Hotel mode is the same component with rows switched from minutes to days. One prop.
- Drag to reschedule is the only interaction, and it is `after` scope, not MVP. Tapping a
  block opens the detail sheet.

## The bookings table

Plain shadcn Table plus server side sorting. No TanStack until there is a reason.

Columns: time, customer with no show count as a small badge, service, resource, status
pill, paid over total, channel icon, code. Row click opens a sheet showing the full
conversation that produced the booking, which is the trust feature the owner actually
wants: she can read exactly what was promised in her name.

Filters as pills, not a filter builder: Today, This week, Needs payment, No shows.
Empty state matters more than the table. When there is nothing, it shows the share link
for `/s/[slug]` and a copy button, because the fix for no bookings is to send the link out.

## `/s/[slug]` the public booking page

The escape hatch that removes the whole integration problem. Owner puts the link in her
Facebook bio and takes bookings today, with no page review, no tokens, no OAuth. Native
Messenger becomes an upgrade rather than a requirement.

Shop name, services with prices, a chat box, and the same agent behind it. Mobile first,
because every visitor arrives from a phone.

## Privacy and terms

Not filler. You are asking shop owners to hand you their customer lists, and you are
processing Cambodian personal data, so write these properly and keep them short:

- Privacy: what is collected (shop details, customer names and phone numbers, message
  content, voice recordings), why, that messages go to Anthropic for processing and are
  not used to train models, retention period, that the customer list is the owner's
  property and exportable at any time, deletion on request, contact address.
- Terms: the free tier is 100 transactions per month, no uptime guarantee during beta,
  the owner is responsible for what her assistant agrees to on her behalf (this clause
  matters, do not skip it), payments settle bank to bank through KHQR and Moni never holds
  funds, either side can stop at any time.

Both in English and Khmer. Two plain pages, no dark patterns, and they take an hour total.

## Component inventory

**shadcn/ui, install these ten and stop:** button, input, textarea, table, badge, card,
dialog, sheet, tabs, sonner. Add select, switch, popover, skeleton, dropdown-menu when a
screen genuinely needs one.

**21st.dev, for marketing sections only:** hero with input, animated counters, bento grid
for the business type wall, pricing table, FAQ accordion, footer. Exact registry names are
being confirmed. The rule stays: nothing from a registry goes inside `/app`, because a
registry component is styled for a landing page and will fight your dashboard tokens.

**Hand built, seven components, and these are the product:**

| Component | Why it cannot be a registry component |
|---|---|
| `PasteComposer` | Text plus microphone plus the parse animation. Nothing on any registry does this |
| `ServicesEditor` | Inline editing with money formatting per currency and Khmer input |
| `ChatPanel` | Renders tool calls inline, so the owner sees what the agent did |
| `ResourceCalendar` | Resource columns and range blocks. Explained above |
| `KhqrDialog` | QR render, countdown to expiry, live poll, paid state |
| `QuotaMeter` | Transactions used against the plan, with the upgrade path |
| `EscalationCard` | The needs-owner handoff. The feature competitors do not have |

## File structure

```
src/
  app/
    (marketing)/            page.tsx, pricing, privacy, terms   shared marketing layout
    (app)/app/              page.tsx, calendar, inbox, services  shared sidebar layout
    s/[slug]/               public booking page
    api/agent/route.ts      the tool calling loop
    api/webhooks/telegram/  inbound messages
  components/
    ui/                     shadcn output, never hand edited
    marketing/              registry sections, adapted
    app/                    the seven components above
  lib/
    types.ts                source of truth, already written
    payments.ts             provider adapter, already written
    db.ts                   Supabase client, server only
    queries/                every SQL call, typed, one file per table
    agent/tools.ts          ToolName to implementation, Zod validated at the edge
    agent/prompt.ts         system prompt, built from v_agent_business
    i18n.ts                 km and en dictionaries
```

The rule that keeps this maintainable: a page may call a query or a server action, and
nothing else. No component ever touches the database client. When something breaks you
know which of three layers to look in.

## Build order

| Order | Thing | Rough time |
|---|---|---|
| 1 | Scaffold, tokens, fonts, shadcn init | 30 min |
| 2 | Schema and seed into Supabase, typed queries | 30 min |
| 3 | Parse endpoint and `PasteComposer` | 60 min |
| 4 | `ServicesEditor` | 45 min |
| 5 | Agent loop with customer tools, `ChatPanel` | 90 min |
| 6 | `/app` today view and stat tiles | 45 min |
| 7 | `ResourceCalendar` | 60 min |
| 8 | `KhqrDialog`, mock provider until the API is confirmed | 45 min |
| 9 | Homepage sections | 90 min |
| 10 | Onboarding three steps | 45 min |
| 11 | Privacy, terms, pricing | 45 min |
| 12 | Owner tools and `Ask Moni` command bar | 45 min |

Steps 1 to 6 are the demo. Everything after 8 is polish that makes the video better.
If time runs short, cut 12 and 10, in that order, and hardcode onboarding for the video.

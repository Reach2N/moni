# Moni: feature spec
Local-business ops assistant. Owner types their shop in plain language; an AI assistant
sells, books, and logs on their behalf.

> **Note, 27 August 2026.** PLAN.md now defines the MVP and build order. The tiering in
> Part 2 described the pre-submission demo; in the current plan Messenger is in the MVP
> (dev mode first, Meta review in parallel). Parts 1, 3 and 4 (the failure-mode list,
> competitor position, payment rails) remain accurate and load-bearing.

Naming: application draft says **Danit**, this doc says **Moni**. Pick one before the demo
video, the video, the domain, and the application field must match.

---

## Part 1, The features nobody talks about

Every booking-bot landing page shows the same three screens: chat bubble, calendar, "0 missed
leads." None of them show the list below. This list is the product. It is also the pitch -
naming these is how you prove you understand the problem instead of the demo.

### A. The AI-behaviour ones (where every vibe-coded bot dies)

1. **Off-script collapse.** ManyChat/Chatfuel are flow builders: the conversation breaks the
   moment the customer types something the owner didn't anticipate. Real customers open with
   "still open?", "how much for my mum too", "can I come now". An LLM handles this natively -
   this is the single largest gap versus the incumbents, and it's free for you.
2. **Hallucinated commitments.** The bot promising a 3pm that's taken, or a service the shop
   doesn't offer, or last month's price. Fix: the AI never writes prose about availability -
   it calls `list_slots()` / `create_booking()` and the DB is the only source of truth. Prices
   come from the `services` row, never from the model's memory.
3. **Knowing when to shut up.** Complaints, refunds, "my hair got ruined", medical questions,
   haggling past a floor price. The bot must escalate to the owner instead of improvising.
   `conversations.status = 'needs_owner'`. Nobody demos the failure path; judges notice when
   you do.
4. **Owner override + undo.** The owner must be able to see exactly what the AI said and did,
   and reverse it. Trust is the adoption blocker, not accuracy. Hence the `events` audit table.
5. **Price/service drift.** Owner raises a price verbally and forgets the app. The bot quotes
   the old one, the customer argues in the shop. Editable services table + `updated_at` +
   audit trail.

### B. The scheduling ones (the actual hard part)

6. **Double-booking.** Enforced in the database with an exclusion constraint, not in app code.
   App-level checks lose the race the first time two customers message at once.
7. **Capacity and buffers.** A salon has 3 chairs; a mechanic has 2 bays; a clinic room needs
   15 minutes cleanup between patients. Every toy booking app models 1 resource with 0 buffer
   and is useless on day two. Hence `resources`, `capacity`, `buffer_min`.
8. **Reschedule and cancel.** Everyone builds `create`. Real life is 40% "can I move it".
   Needs a confirmation code the customer can quote, they will not remember a UUID.
9. **Holidays and closures.** Pchum Ben, Khmer New Year, "closed this Thursday for a wedding."
   A calendar that doesn't know the shop is shut books customers into an empty shop.
10. **Walk-ins.** Bookings that arrive in person must land in the same calendar, or the
    calendar is a lie and the owner goes back to the notebook. One "add manually" button.

### C. The money ones

11. **No-shows.** Salons and spas run 15–30% no-show rates; automated confirm + 24h + 1h
    reminders take that to ~5%. That is the ROI sentence in your pitch, not "saves time",
    but "recovers X bookings a month you were already losing."
12. **Deposits.** The real no-show fix. Not v1 (needs ABA/Bakong), but the schema has
    `requires_deposit` / `deposit_minor` so the roadmap slide is credible.
13. **Dual currency, done right.** Cambodia quotes in riel and dollars in the same sentence.
    Store integer minor units + currency per row. KHR has **no decimal places**: 15000 means
    15,000៛, while USD 1500 means $15.00. Getting this wrong by 100x in front of judges is a
    real risk and a one-line fix.
14. **API cost per conversation.** Your own margin. A spam loop on a free-tier shop burns your
    credits. `messages.cost_micro_usd` + per-customer rate limit. Also the number that makes
    your unit economics answerable when an investor asks.

### D. The identity/data ones

15. **Same human, three channels.** She messages on Telegram, her husband calls, she walks in.
    `customer_identities` maps many channel IDs to one customer, so history and no-show count
    actually mean something.
16. **Khmer datetime parsing.** "ស្អែក", "10 ម៉ោង" (10 which, am or pm?), Khmer numerals
    ១២៣, "next Tuesday" when the week starts Sunday. Always resolve to an explicit timestamp
    and **read it back** to the customer for confirmation.
17. **Data ownership.** The customer list is the owner's asset, not yours. A CSV export button
    is a 20-minute feature that removes the biggest objection to trusting a new platform.

---

## Part 2, What to actually build, in order

### Tier 0, the demo (this is all you build before submission)
One hardcoded shop. No login. No tenancy. No Messenger.

| # | Feature | Why it earns the slot |
|---|---------|----------------------|
| 1 | Paste screen, one textarea, one button | The entire onboarding thesis in one screen |
| 2 | Parse → editable services table | The money shot. ~40 lines, looks like magic |
| 3 | Chat panel (Telegram-styled) with tool-calling AI | Proves it isn't a flow builder |
| 4 | Bookings table, row animates in live | The "it did the work" moment |
| 5 | One stat strip, messages handled / bookings / revenue / owner minutes: 0 | Judges read numbers, not features |
| 6 | Replies in the customer's language (Khmer in ≥1 demo exchange) | Free with an LLM, impossible for ManyChat's keyword AI |
| 7 | One escalation exchange ("needs owner") | 10 seconds of video that beats every competitor demo |

Cut without discussion: auth, billing, multi-tenant, settings pages, marketing site,
Messenger, staff management, analytics charts.

### Tier 1, the 2-month program
Auth + real tenancy (RLS on), Telegram bot via BotFather token paste, reminders (24h/1h cron),
reschedule/cancel with codes, owner override + audit view, walk-in entry, CSV export,
revenue dashboard, quota metering.

### Tier 2, the roadmap slide (say it, never build it now)
Facebook Messenger (app review takes weeks, that's why it isn't in v1), ABA/Bakong deposits,
stock + cashier + shift audit, multi-location, staff payroll. This is the "operates the whole
business" vision. It belongs in the last 8 seconds of the video, not in the repo.

---

## Part 3, Competitor positioning (updated with real 2026 numbers)

- **ManyChat**: free tier was cut to **25 contacts** in March 2026; $14/mo for 500. Its "AI
  Step" is a **$29/mo add-on** that is closer to keyword matching, it can't be trained on the
  business and doesn't hold context across a conversation.
- **Chatfuel**: from **$39/mo** (150 contacts), and shares the same core defect, flow-based
  conversations break off-script.
- Both require the owner to *build the flow*. That is a second job for someone whose hands are
  literally busy.

One-sentence position: **they sell a builder, we sell a result.** The owner writes one
paragraph about their shop; there is no flow to draw, and the customer installs nothing.

The honest competitor, though, is a paper notebook and a Messenger inbox with 40 unread.

## Channel decision, say it accurately
Messenger is the **larger** channel in Cambodia (~8.9M users, ~49.7% of the population, growth
driven by merchant bots); Telegram leads in share of visits and is where deal/community groups
live. So Telegram-first is a **build-speed** decision, not a claim that Cambodia doesn't use
Messenger: BotFather is a 2-minute token paste with no review, Meta's messaging permissions
take weeks. Pitch it as: *"Telegram ships today, Messenger is next because that's where the
reach is."* Claiming otherwise gets you corrected on stage.

---

## Part 4, Payments (KHQR) and the provider question

**Resolved: the provider is CutLuy, at `cutluy.com`.** It did not surface in search, which
is why the first pass could not find it, but it is already integrated in the DiGi Cambodia
store on this machine with a live `CUTLUY_API_TOKEN`. Confirmed contract:

```
POST /v1/payments      { amount, reference_id, idempotency_key, payment_link_id? }
                    -> { id, qr_string, expires_at }
GET  /v1/payments/:id  -> { status, amount }     only "paid" settles, and only if
                                                 the amount also agrees
Authorization: Bearer <CUTLUY_API_TOKEN>        amounts on the wire are DOLLARS
```

**The constraint that shapes the product: CutLuy settles USD only.** Local shops price in
riel, so riel cannot go through it. Riel uses offline KHQR generation from the Bakong
merchant account, verified through the relay. Currency picks the rail.

These other services were the earlier candidates, and remain useful as a second USD rail:

| Service | What it is |
|---|---|
| [TolaAPI](https://tola-api.com/) | Bakong + ABA KHQR generation and real-time verification, free account, add your own provider |
| [KHPAY](https://khpay.site/) | Wraps your `link.payway.com.kh` merchant link; free plan ~100 requests/day |
| [KHQRPay](https://khqr.cc/) | KHQR + ABA Pay + Binance Pay, Telegram alerts, developer API |
| [khqrapi.com](https://www.khqrapi.com/) | Bakong KHQR API, auto-renews the NBC bearer token |

Confirm the real domain before you sign up. **It does not block anything**: `provider` is
`text` in the DB and `src/lib/payments.ts` is one adapter interface, so picking or switching
is config, not a migration.

### The constraint that actually shapes the architecture

Bakong's own `check-transaction` endpoint **rejects calls from servers outside Cambodia** in
production. A Vercel function does not run in Cambodia. So calling NBC directly is not an
option on the intended host, which is the real reason to sit behind a Cambodian wrapper, and
a good detail to say out loud in the pitch: it shows you have read the docs, not the landing
page.

Also true and worth knowing: **ABA PayWay direct requires a registered merchant account**
(business registration, bank onboarding). That is weeks, not days. The wrapper services exist
precisely because of that gap.

### How it works in this schema
1. `create_payment` tool → `payments` row with an `idempotency_key` (`booking:<id>:deposit`).
2. Provider returns the EMVCo string → stored as `qr_payload`; `md5(qr_payload)` becomes
   `provider_ref`, which is the handle the check endpoint takes.
3. Poll. Every reply appends to `payment_events`: the payments row is only a summary.
4. Unique `(provider, provider_ref)` means one QR can never be counted as two payments.
   Unique `(business_id, idempotency_key)` means a retry cannot mint a second QR.

Tested: reusing either key is rejected, `status='paid'` without `paid_at` is rejected, and
deposit-then-balance on one booking works.

## Part 5, Name shortlist

Domain availability is **unverified**: no registrar API here. Check each at a registrar
before committing.

| Name | Meaning / story | Risk |
|---|---|---|
| **Krama** | ក្រមា, the checkered Khmer scarf, famous for having a hundred uses. Perfect metaphor for one tool that runs the whole shop, and it gives the pitch a line: *"one krama, a hundred uses."* | `krama.com` likely taken; use `krama.app` / `usekrama.com` |
| **Moni** | មុនី (wise/sage) and reads as "money" in English, revenue association is free | Crowded: several fintechs named Moni |
| **Chuop** | ជួប, "to meet". Booking is meeting | Harder for non-Khmer speakers to pronounce |
| **Danit** | current application name; already submitted | No meaning working for you |

Recommendation: **Krama** for the story, **Moni** if you want zero rename risk. Renaming later
is a find-and-replace on `moni_touch` / `moni_is_member` plus the directory, deliberately kept
that shallow.

Two names to avoid: **Angkar** ( អង្គការ, the Khmer Rouge's term for itself; Angkor with an
`o` is fine but generic) and **Sabay** (an established Cambodian tech company).

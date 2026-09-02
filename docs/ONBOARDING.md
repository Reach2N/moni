# Moni owner onboarding contract

Status: active. Scope: the gated `/app/onboarding` route and the setup spine it hands to
`/app`. Current mode: owner-app surface, not the public homepage.

This is the frontend source of truth for owner setup. It turns PLAN.md Phase 3 into rules
that can be implemented and checked. It does not define the public homepage
(`docs/HOMEPAGE.md`), the customer storefront at `/s/[slug]`, or the runtime assistant
prompt.

The current repository request is documentation-only. Nothing below authorizes a source
change, a package install, or a component fetch until an implementation pass is explicitly
authorized.

## The problem this contract solves

`/app/onboarding` already works. `ShopSetup` runs a real state machine, the parse is real,
and the save is real. What is missing is any sense of the whole journey.

The owner currently sees a static three-item list, `១. ពិពណ៌នា ២. ពិនិត្យ និងរក្សាទុក ៣.
សាកជាអតិថិជន`, that never updates and then vanishes on save. Setup does not end there:
the shop still has to connect Telegram and serve a first customer. Nothing carries the
owner across that gap, and a shop that describes itself and then stops is a shop that
never earns Moni a transaction.

So onboarding is not a wizard problem. It is a "show the owner where they are, and what
Moni has already done for them" problem.

## Non-negotiable decisions

**Moni does the work, the owner approves it.** Every screen in this flow reads as an agent
proposing something a person confirms, never as a form a person fills in. This is why the
component selection below is drawn from the agentic set and not from a stepper library. A
guided flow that asks the owner to type structured data has already lost the argument the
product is making.

**Every status is derived from the database, never from local component state.** A row that
says Telegram is connected must mean a `channel_connections` row says so. This is the whole
difference between guidance and decoration, and it is the rule most likely to be quietly
broken by an implementation in a hurry.

**Beautiful UI is the source, and its components are not redrawn.** Per the sourcing rule in
`AGENTS.md` and `CLAUDE.md`, select the complete component, copy its source, keep its
structure and interaction, and map its theme hooks. If a needed component does not exist,
stop and report the gap rather than hand-building a substitute.

**The owner-app token vocabulary stays as it is.** Onboarding uses the existing owner
surface utilities: `bg-paper`, `text-ink`, `text-rule`, `text-seal-text`, `bg-ink`,
`text-on-ink`, `border-hairline`. `CREDITS.md` records that owner-app components retain
their legacy styling until the dashboard rebuild, and onboarding is not the place to start
that rebuild. Do not import homepage tokens (`text-label`, `bg-surface`,
`border-separator`) into this route, and do not copy this route's tokens back into
homepage work. Revisit this section when the dashboard rebuild lands.

## Foundation, already installed

Beautiful UI's foundation is installed verbatim at `src/app/beautifui/foundation.css` and
imported at `src/app/globals.css:25`. It carries the `@theme` that generates the utilities
its components are written against (`text-ink-2`, `bg-hover-2`, `rounded-control`), the
`primitive-card-*` rules, and the keyframes.

Five palette keys collide with Moni's own and are already reclaimed below that import:
`--color-ink`, `--color-surface`, `--color-green`, `--color-red`, and `--accent`. The
comment above the import records why each is reclaimed. An implementation pass adds no new
theme layer, introduces no new palette, and does not edit `foundation.css`.

## The setup spine

A five-row checklist, rendered by a prop-driven Task Rows variant. It appears at the top of
`/app/onboarding` and again on `/app`, and it stops rendering permanently once all five
rows are complete.

| Row | Khmer label | Complete when | Source |
| --- | --- | --- | --- |
| 1. Describe | ពិពណ៌នាហាង | `businesses.raw_description` is non-null | `getBusinessById(businessId)` |
| 2. Catalogue | បញ្ជីអ្វីដែលលក់ | at least one active row in `v_catalog`, service or product | `hasCatalogue(businessId)` |
| 3. Money | ទទួលប្រាក់តាម KHQR | `businesses.khqr_account_id` is non-null: the shop's own Bakong account is set on `/app/money` | `loadSetupProgress` reads the column |
| 4. Channel | ភ្ជាប់ Telegram | a `channel_connections` row has `status = 'connected'` | `getChannelConnections(businessId)` |
| 5. First customer | អតិថិជនដំបូង | at least one booking that reached confirmed or completed, or one paid standalone sale | **not yet written**, see below |

Rows 1 to 3 are already served by existing queries in `src/lib/queries/business.ts`. No new
data code is needed for them.

Row 4 needs one new query. The implementation pass adds it to `src/lib/queries/business.ts`
alongside its siblings:

```ts
export async function hasFirstTransaction(businessId: string): Promise<boolean>
```

It takes `businessId` as an argument like every other query, because tenancy lives in
`requireMember()` plus that argument and RLS has zero policies to catch a miss. Its
definition of a transaction must match the one already metered in `v_month_usage`: a
booking that reached confirmed or completed, plus standalone paid sales. Two different
definitions of "a transaction" in one product is a billing bug waiting to happen, so this
query and the usage view agree or the query is wrong.

**Failure is a first-class row state.** Task Rows ships running, failed, and completed
states with a retry action. When `getChannelConnections` returns a row carrying
`last_error`, row 3 renders failed with that error and a retry, rather than sitting
pending forever while the owner wonders what went wrong. This is the reason Task Rows was
selected over a plain checklist.

The spine is read-only status. It does not perform the steps. Each row links to the screen
that does.

## The describe sequence

`ShopSetup`'s existing state machine is preserved exactly:
`describe → parsing → review → saving → saved`, with `error` reachable from `parsing` and
`saving`. The states do not change. What changes is the surface each one presents.

| State | Beautiful UI component | Contract |
| --- | --- | --- |
| `describe` | [Prompt Bar](https://www.beautifului.dev/#prompt-bar) | Already adapted at `src/components/agent/prompt-bar.tsx`. `VoiceNote` goes in its `leading` slot so press-to-record survives untouched. The sample-description affordance stays. |
| `parsing` | [Thinking](https://www.beautifului.dev/#thinking), steps variant | Steps come from the real request lifecycle. The scripted `STAGES` array is deleted from the app variant. |
| `review` | [Diff Table](https://www.beautifului.dev/#diff-table) | Not yet vendored. Parsed services render as proposed rows the owner accepts or corrects. |
| `saving`, `saved` | [Approval Card](https://www.beautifului.dev/#approval-card) | Already adapted at `src/components/agent/approval-card.tsx`. It is the save gate: `POST /api/setup` fires on confirm, never before. |

### Why Diff Table for the review step

This is the highest-value change in the contract, and the reason approach A was chosen over
wrapping the existing flow in a checklist.

The review step is the exact moment an owner decides whether to trust Moni with their
prices. `ParseResponse` already carries `warnings: { field: string; issue: string }[]`,
which the current plain editable table barely surfaces. In a Diff Table a warned field is a
flagged row, so the owner's eye lands on the price Moni was unsure about instead of
scanning a uniform grid where a misheard 15,000 riel looks exactly like a correct one.

Editing a price must read as correcting a proposal, not as data entry into a blank grid.
That framing is the component's job and the reason it is worth vendoring.

**If Diff Table proves a poor fit for editable rows**, stop and report the gap. Do not
hand-build a substitute. Records Table is already vendored and is the documented fallback,
at the cost of losing the proposed-change framing and the warning flags.

`ShopSetup` remains the single implementation of describe, parse, review, save. The
dashboard sheet and the first run stay the same job at different moments. A second copy of
the parse flow is exactly how the earlier iteration drifted, and PLAN.md Phase 3 records
that correction.

## The marketing fork

`src/components/primitives/TaskRows.tsx` and `src/components/primitives/ThinkingState.tsx`
are demo-scripted. `TaskRows` runs on `const TICKS = [600, 900, 2400, 1400, 2400, 600]`
through a `useTick` hook; `ThinkingState` runs on `const STAGES = [800, 600, 1800, 2600,
1600]`. They perform a fixed animation regardless of input.

That is correct for the marketing page, which imports both today through
`src/components/marketing/agent-conversation.tsx` and
`src/components/marketing/how-sequence.tsx`. It is wrong for onboarding, where a row must
go green when Telegram actually connects.

**Both marketing primitives stay byte-identical. Do not touch them.**

The app gets prop-driven siblings:

| New file | Forked from | Change |
| --- | --- | --- |
| `src/components/agent/setup-tasks.tsx` | `primitives/TaskRows.tsx` | State arrives as props. `TICKS` and `useTick` deleted. |
| `src/components/agent/agent-thinking.tsx` | `primitives/ThinkingState.tsx` | Steps arrive as props. `STAGES` deleted. |

Same visual language, same Beautiful UI markup and class names, one source. `CREDITS.md`
records each as the same upstream source with two local adaptations, marketing and app.

Duplication is accepted here deliberately. The alternative, one component that takes a
scripted prop sequence, means any onboarding change can regress the homepage, and the
homepage has a screenshot acceptance target that a setup change should never be able to
break.

## Data and API contract

No new HTTP endpoints. Onboarding uses what exists:

- `POST /api/parse` for the describe step.
- `POST /api/transcribe` for voice, raw blob as the request body, not JSON and not
  multipart. `mp4` is refused with 415 rather than transcribed to silence.
- `POST /api/setup` for the save, fired from the Approval Card's confirm.
- `POST /api/channels/telegram` for row 3.

The spine's status reads are server-component queries taking `businessId`, following the
existing pattern in `src/app/app/onboarding/page.tsx`. That page already imports its
queries dynamically to keep database configuration out of the build-time module graph so a
clean clone still builds the public site. Preserve that.

Components take props and call HTTP contracts. No business logic, database client, provider
import, or model selection in a component. No server actions for business operations.

## Prohibited patterns

- Rebuilding onboarding as a wizard or stepper. Beautiful UI has no such component, and
  inventing one violates the sourcing rule.
- Redrawing a Beautiful UI component in Tailwind, or substantially rewriting it into a
  Moni-specific component.
- Editing `src/app/beautifui/foundation.css`, or adding a second theme layer or palette.
- Editing `src/components/primitives/TaskRows.tsx` or `ThinkingState.tsx`, which the
  marketing page depends on.
- Spine rows driven by local component state, `useState`, or an optimistic flag rather than
  a query.
- A second implementation of describe, parse, review, or save alongside `ShopSetup`.
- Homepage tokens (`text-label`, `bg-surface`, `border-separator`) on this route.
- Emoji as a status mark. Every glyph is lucide-react or an authored SVG.
- Em dashes in any Khmer or English copy added here.
- Letter-spacing on a Khmer element. Khmer keeps `line-height: 1.75` and
  `letter-spacing: normal`, so Task Rows label rows need the `km` class.
- A model or provider named anywhere outside `src/lib/ai/models.ts`.

## Verification

Implementation-pass checks only. The current request is documentation-only, so do not run
or change frontend code while consolidating this contract.

```bash
npm run lint
npm run build
npm run db:test
npm run shoot
```

`npm run db:test` matters here because row 4 adds a query, and `hasFirstTransaction` must
be asserted to agree with `v_month_usage` on what counts as a transaction.

Review the captures for:

- The spine renders with real row states, and a disconnected channel shows the failed state
  rather than a pending one.
- The `prefers-reduced-motion: reduce` capture still reads as a checklist. Task Rows and
  Thinking both animate, and the reduced-motion shot is the proof that motion decorates the
  status rather than carrying it.
- Khmer labels are readable with `line-height: 1.75` and no tracking.
- The marketing captures are unchanged, which is the evidence the fork held.

## The money row, added 2 September 2026

Row 3 sits before the channel on purpose: a shop that answers on Telegram but has no
account to be paid into has a customer at the counter with nowhere to send money. It is
complete when the owner has pasted her own Bakong account on `/app/money`, and the owner
agent reads the same rule through `report_setup_status`. The design is
`docs/superpowers/specs/2026-09-02-universal-app-design.md`.

## Current implementation state

`/app/onboarding` renders the five-row setup spine through
`src/components/agent/setup-tasks.tsx`, a prop-driven fork of Beautiful UI's Task
Rows, fed by `loadSetupProgress()` over the pure rules in
`src/lib/queries/setup-progress.ts`. `ShopSetup` keeps its original state machine
and now presents Prompt Bar, the forked Thinking trace, and its own purpose-built
review table at its four states.

Diff Table was evaluated for the review step and rejected: the fetched source had
no `<input>` element, only row-level include or exclude of a scripted employee
diff, and its documented fallback, Records Table, was checkbox-only input in a CRM
grid. Neither can edit a price or a duration. The review step instead keeps Moni's
existing editable table, with each parse warning from `sanityCheck` attached to
the row it concerns and marked with a lucide `TriangleAlert`, plus a summary block
for warnings that name no row. `sanityCheck` now lives in `src/lib/ai/sanity.ts`,
extracted out of `src/lib/ai/parse.ts` so the browser can recompute warnings live
as the owner edits a service, without pulling the AI SDK or `src/lib/ai/models.ts`
into a client bundle. `parse.ts` re-exports it for the server-side callers.

The save is gated behind `AgentApprovalCard`
(`src/components/agent/approval-card.tsx`), rendered below the review table.
`POST /api/setup` fires only from the card's confirm handler, never from a plain
button and never on parse. That is the one call site in the component, verified
with `grep -rn "api/setup" src/components src/app`.

The marketing primitives are unmodified. Provenance for every component is in
`CREDITS.md`.

## Related documents

- `AGENTS.md`: authority, current surface, and non-negotiable rules.
- `PLAN.md` Phase 3: why transcription and parsing are separate steps, and why
  `/app/onboarding` sits under the existing gate.
- `docs/HOMEPAGE.md`: the public homepage contract, deliberately separate from this one.
- `CREDITS.md`: source provenance for every selected component.

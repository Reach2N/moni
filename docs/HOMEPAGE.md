# Moni homepage contract

Status: active. Scope: the public `/` marketing homepage only. Current mode: light-only.

This is the frontend source of truth for the homepage. It turns the product direction into
rules that can be implemented and checked. It does not define the owner dashboard or the
runtime assistant prompt.

## Non-negotiable visual decisions

The homepage is a quiet, light Apple-native showcase surface. It never follows
`prefers-color-scheme: dark` in this phase. Keep `color-scheme: light` on the marketing
subtree and use the light values below even when the host operating system is dark.

White is the ground, not a light wrapper around a dark hero. The page root and every
primary section use `#FFFFFF`; `#F5F5F7` is reserved for secondary bands and recessed
surfaces. A copied library stylesheet must not introduce a stripe texture, gradient,
dark-theme branch, blue accent, or a second canvas behind the marketing root. Library
theme hooks may be mapped to the tokens below, but the library's page-level foundation
must not be imported as the page background.

| Role | Value | Utility family |
| --- | --- | --- |
| Page background | `#FFFFFF` | `bg-surface` |
| Secondary band | `#F5F5F7` | `bg-surface-2` |
| Primary label | `#1D1D1F` | `text-label` |
| Secondary label | `rgba(60,60,67,.60)` | `text-label-2` |
| Tertiary label | `rgba(60,60,67,.30)` | `text-label-3` |
| Separator | `rgba(60,60,67,.29)` | `border-separator` |
| Accent | `#34C759` | `text-green`, `bg-green` |
| Accent foreground | `#0B2E16` | `text-on-green` |
| Destructive | `#FF3B30` | `text-red`, `bg-red` |

Do not introduce another palette, a coloured gradient, glass decoration, or an arbitrary gray.
An edge-only white fade may soften the shop-object illustrations in the hero when it improves
copy contrast. Green means confirmation or money. It is not a decorative fill repeated across
a section.

## Type and language

Use the system stack first for Latin: `-apple-system, BlinkMacSystemFont, "SF Pro Text",
Inter, sans-serif`. Busra is the Khmer fallback. Licensed Futura may remain available to
other surfaces, but it is not the homepage default and must not displace the system stack.
Do not add a second display face or a monospace face. Khmer uses `line-height: 1.75` and
`letter-spacing: normal`; never put tracking on a Khmer element.

Use the typed dictionaries in `src/lib/marketing/copy.ts`. The default locale is Khmer and
`?lang=en` selects English. The markup and information hierarchy must stay identical across
locales. Do not hardcode a new user-facing string in a page or component when it belongs in
the dictionary.

## Geometry and spacing

- Content max width: `72rem`.
- Mobile gutter: `1.25rem`; wide-screen gutter: `2rem`.
- Section vertical rhythm: `5rem` mobile, `7rem` wide screens unless the existing section
  contract needs a smaller transition.
- Card radius: `14px`, via `rounded-[var(--radius-card)]`.
- Large product stage radius: `24px`, via `rounded-[var(--radius-stage)]`.
- Compact controls and status marks may use `rounded-full`; do not turn every card into a
  pill.
- Card shadow: `shadow-[var(--shadow-card)]`. Floating overlays may use
  `shadow-[var(--shadow-float)]`.
- Borders are one-pixel hairlines using `border-separator`. Use separators to structure a
  section, not heavy boxes around every line of copy.
- Every grid child that can contain long text or a wide artifact gets `min-w-0`.

## Page information architecture

The page should tell one story in this order:

1. Header with Moni mark, compact navigation, language switch, and a clear waitlist action.
2. Hero: one concrete promise and the assistant/product proof close to the promise.
3. Assistant conversation: customer message, grounded answer, and visible work trace.
4. Capabilities: what the assistant organizes, plans, and operates.
5. Booking/payment proof: catalogue, slot, booking, and expected amount, without invented
   traction.
6. Shop types and channels: show breadth honestly, with channel status in copy rather than
   color alone.
7. Pricing: free to start, transaction-based explanation, no unconfirmed paid-tier claim.
8. FAQ: installation, Khmer, uncertainty/handoff, and payment account questions.
9. Founding-shop waitlist application and footer with privacy and terms.

The waitlist is the only public conversion action. The owner product remains behind the app
subdomain and gate. Do not add a public dashboard link that bypasses this boundary.

### The agent is the subject

The first proof artifact is a readable customer conversation, not a generic dashboard or a
decorative “AI” badge. It shows one complete turn in which Moni receives a Khmer or English
request, answers from the shop's stated catalogue, and exposes the work that made the answer
safe: read the shop data, check a real slot, hold or create the booking, then present the
expected KHQR amount. The trace is illustrative and must be labelled as an example; it must
not imply a live customer, a real booking, or unverified traction.

The five channel marks remain in the channels section as official platform marks. Their
presence communicates breadth, while the accompanying copy states the actual integration
status. Do not replace the conversation with logos, a model picker, or a public owner
composer. The apex page is a waitlist showcase, so its agent proof is scripted and readable
without a model call.

## Component selection

Select the strongest complete Beautiful UI component for each homepage interaction, with
particular priority for agentic interactions, before writing homepage code. The showcase
decision is based on visual clarity, interaction quality, Khmer readability, responsive
behavior, and screenshot performance. The selection record below is documentation only. The
implementation pass must fetch or copy each selected source before wiring it, preserve its
interaction model, and record the exact install or copy reference in `CREDITS.md`. Defer all
license review and licensing decisions until distribution; they are not a selection gate for
this phase.

| Homepage proof | Beautiful UI source | Intended use |
| --- | --- | --- |
| Assistant conversation | [Chat](https://www.beautifului.dev/#chat) | Customer message, grounded Moni reply, and the message rhythm of a real conversation. |
| Answer arriving | [Streaming Text](https://www.beautifului.dev/#streaming-text) | A restrained text-arrival state inside the scripted reply. The settled answer remains readable. |
| Visible reasoning | [Thinking](https://www.beautifului.dev/#thinking) | Expandable, plain-language work trace beside the reply. |
| Tool work | [Tool Chips](https://www.beautifului.dev/#tool-chips) | Compact calls for catalogue lookup, slot checking, booking, and payment preparation. |
| Multi-step progress | [Task Rows](https://www.beautifului.dev/#task-rows) | A complete example run when the trace needs explicit pending, complete, or handoff states. |
| Grounding evidence | [Context Cards](https://www.beautifului.dev/#context-cards) | Shop facts and source snippets that explain where an answer came from. |

Approval Card is reserved for the gated owner product because the public homepage must not
invite an owner to mutate a real shop. Prompt Bar is also not a homepage conversion control:
the public page demonstrates the agent's conversation and sends visitors to the waitlist.
Those exclusions keep the showcase honest while preserving the source patterns for later app
surfaces.

Do not invent a component, recreate a library component with Tailwind, or substantially
rewrite a source component. If no existing library component fits, pause and report the
gap instead of creating a fallback.

The copied Beautiful UI foundation is not itself a homepage component. It currently carries
its own canvas, stripe background, blue accent, and dark variant. If a selected component
depends on that foundation, use its documented variable hooks under the Moni marketing scope
and map them to `bg-surface`, `bg-surface-2`, `text-label`, `border-separator`, and
`text-green`. Do not import its page-level base rules or silently let its `--dark` branch
repaint the homepage.

### Current implementation state

The marketing route now uses the copied Beautiful UI Chat and Task Rows sources through
`src/components/marketing/agent-conversation.tsx` and `src/components/marketing/how-sequence.tsx`.
The FAQ uses the installed Radix Accordion source at `src/components/ui/accordion.tsx`, with
measured-height open and close keyframes in `src/app/globals.css`. The foundation's page-level
canvas and stripe are neutralized under `.moni-hig`, while its component hooks are mapped to the
homepage tokens. The homepage is pinned to the light system stack with Kantumruy Pro for Khmer;
it does not follow a dark operating-system preference. Provenance and local usage are recorded in
`CREDITS.md`.

## Component recipes

### Header and controls

Use a light, translucent or opaque-on-scroll header with a one-pixel separator. Primary
actions use `bg-label text-surface`; the waitlist submit action uses `bg-green text-on-green`.
Buttons have at least a 44px hit target, visible keyboard focus, and no icon-only action
without an accessible name.

### Cards and proof artifacts

Use the 14px card radius, a one-pixel separator, a light surface, and the canonical card
shadow. Keep one clear visual subject per card. Proof artifacts are data-shaped UI, not
fake screenshots: every displayed price or count must come from typed copy or a formatting
helper and must be labelled as an example when it is illustrative.

### Waitlist form

The email field and optional note must be full-width and readable at 390px. The submit
button is the strongest green element on the page. Preserve focus movement to the success
message and announce validation/server errors with `role="alert"` or an equivalent live
region. Never expose provider errors or secrets in the UI.

## Motion

GSAP owns scroll-position reveals and is registered only in `src/lib/motion/gsap.ts`.
`motion` may own React state transitions. Do not use `whileInView` for homepage content that
must appear in a full-page capture. All content exists in the DOM before animation and is
visible in reduced motion. A screenshot script may settle animation, but it must not be
needed to reveal the page to a real visitor.

The scroll story is explicit: the hero message enters with a short transform reveal; the
conversation and its work trace scrub in as one readable turn; the capabilities and proof
artifacts use small opposing parallax offsets; the channel marks and pricing band settle into
place; FAQ disclosure height follows the native `<details>` state; and the waitlist success
panel remains a React state transition. ScrollTrigger may animate transforms, clip bounds, or
progress indicators, but it must not be the only path that makes copy exist.

The hero's long supporting description is the one intentional progressive reveal. On a normal
motion device GSAP starts it quiet and brings it in over the first scroll movement, keeping the
headline and action visible as the edge objects gather. Server-rendered markup and the reduced
motion branch leave that description visible from the start.

Visibility is an invariant. Content nodes ship at `opacity: 1`, normal visibility, and normal
layout in the server-rendered markup. No heading, card, platform mark, or form field may start
at `opacity: 0`, `visibility: hidden`, or `display: none` to await an observer. The hero
supporting description is the documented scroll-progress exception, and it is only quieted
after hydration when motion is allowed.
Reduced motion clears the animation properties and leaves the complete conversation, trace,
artifacts, and waitlist form on screen. A transient typing indicator is optional decoration,
not a required content node.

## Prohibited patterns

- Legacy Invitation tokens or styles in homepage code: `bg-paper`, `text-ink`, `text-rule`,
  `text-seal`, `border-hairline`, `rounded-none` as a default, or paper/ink-only rules.
- The archived dark-teal palette from the old UI plan.
- Dark-mode branches on the marketing layout or homepage components.
- Emoji, invented channel marks, fake testimonials, fake customer counts, or unsupported
  “live” claims.
- A second copy of the waitlist, assistant conversation, or parse flow.
- Business logic, database clients, provider imports, or model selection in components.

## Verification

These are implementation-pass checks only. The current request is documentation-only, so do
not run or change frontend code while consolidating this contract.

Run:

```bash
npm run lint
npm run build
npm run shoot
```

Review `landing-desktop.png`, `landing-mobile.png`, `landing-desktop-still.png`, and the
console/overflow output from `npm run shoot`. The acceptance target is light desktop,
light mobile, and reduced motion. Dark mode is intentionally not an acceptance target for
the homepage in this phase. Also verify that the marketing root computes to `#FFFFFF` in the
light capture, that no settled content node is hidden, and that Latin text uses the system
stack while Khmer remains readable with Busra and `line-height: 1.75`.

# Credits

Moni selects existing library components for showcase quality first. Beautiful UI is the
primary source for agentic surfaces, followed by 21st.dev, DaisyUI, shadcn/ui, and other
libraries when they provide a better complete fit. Homepage components follow
`docs/HOMEPAGE.md`, the active light-only contract. License review and licensing decisions are
deferred for showcase selection and are not a gate. Record the source now and revisit licensing
before distribution.

Owner-app components retain their legacy styling only until the dashboard rebuild. Do not
copy that legacy styling into homepage work.

Entries below record existing or researched sources. They do not authorize a local rewrite.
For new homepage work, select the strongest complete Beautiful UI component, install or copy
its source, and record the exact source URL and local path here. License review remains deferred
until distribution work.

## 21st.dev Agent Elements: ToolGroup

- Project: [21st-dev/agent-elements](https://github.com/21st-dev/agent-elements)
- Registry item: [ToolGroup](https://agent-elements.21st.dev/r/tool-group.json)
- Source file: `lib/agent-ui/components/tools/tool-group.tsx`
- Pinned commit: `b04b36cb6381a1dd1a0e86cc7c90564ddcd56d37`
- License: MIT
- Copyright: 2026 21st.dev
- Local adaptation: `src/components/app/owner-tool-trace.tsx`

Moni retains the grouped disclosure, controlled open state, and step-reveal structure.
It replaces untyped agent payloads, Base UI, Tabler icons, Agent Elements CSS, and generic
developer language with strict owner-facing props, shadcn Radix Collapsible, Lucide icons,
Khmer copy, and Moni's existing surface contract.

## Beautiful UI: Approval Card

- Project: [Beautiful UI](https://www.beautifului.dev/)
- Pattern: [Approval Card](https://www.beautifului.dev/#approval-card)
- License: MIT (the site publishes the component set under MIT)
- Local adaptation: `src/components/agent/approval-card.tsx`

This is the human-in-the-loop gate for owner commands that can change prices,
hours, bookings, or payment records. The local component keeps Beautiful UI's
decision grammar: proposed action, visible scope, and explicit continue/skip
actions, but uses Moni's separator-only panels, Khmer line-height rules, and
existing shadcn Button. No runtime dependency or opaque stylesheet is added.

## 21st.dev Agent Elements: InputBar

- Project: [21st-dev/agent-elements](https://github.com/21st-dev/agent-elements)
- Registry item: [InputBar documentation](https://agent-elements.21st.dev/docs/input-bar)
- License: MIT
- Local adaptation: `src/components/agent/prompt-bar.tsx`

The shared owner/customer composer retains the source pattern's multiline input,
keyboard send affordance, helper/status row, and extension slots. Base UI,
Tabler icons, and Agent Elements' theme variables were intentionally not copied;
the local component composes the shadcn Textarea and Button already owned by Moni.

## shadcn/ui: Collapsible

- Project: [shadcn/ui](https://github.com/shadcn-ui/ui)
- Documentation: [Collapsible](https://ui.shadcn.com/docs/components/radix/collapsible)
- License: MIT
- Copyright: 2023 shadcn
- Local component: `src/components/ui/collapsible.tsx`

The file is the official Radix Collapsible wrapper produced by `shadcn@latest` for this
project's installed Radix base.

## Beautiful UI: homepage agent proof selection

The official [Beautiful UI catalog](https://www.beautifului.dev/) was checked before this
documentation-only pass. These are the complete agentic patterns selected for the public
homepage contract. No new package install is authorized by this record; the implementation
pass must copy or install the published source first, preserve its interaction model, and then
record the resulting local path here.

Published source repository: [Kainiko943/beautiful-ui](https://github.com/Kainiko943/beautiful-ui).
Beautiful UI is a source component catalog, not a runtime npm dependency. The source repository
and the catalog links below are the provenance to verify when the implementation pass begins.

| Pattern | Source | Homepage role |
| --- | --- | --- |
| Chat | [beautifului.dev/#chat](https://www.beautifului.dev/#chat) | The customer message and Moni's grounded reply. |
| Streaming Text | [beautifului.dev/#streaming-text](https://www.beautifului.dev/#streaming-text) | Readable answer arrival inside the scripted conversation. |
| Thinking | [beautifului.dev/#thinking](https://www.beautifului.dev/#thinking) | Expandable plain-language reasoning trace. |
| Tool Chips | [beautifului.dev/#tool-chips](https://www.beautifului.dev/#tool-chips) | Catalogue, availability, booking, and payment-preparation calls. |
| Task Rows | [beautifului.dev/#task-rows](https://www.beautifului.dev/#task-rows) | A complete agent run with pending, completed, and handoff states. |
| Context Cards | [beautifului.dev/#context-cards](https://www.beautifului.dev/#context-cards) | The shop facts that ground the reply. |

The homepage uses these patterns as a scripted product explanation. It does not expose the
owner's approval action on the public route. The selected source files are copied intact and
configured through the documented theme hooks; the marketing wrapper only supplies Moni's
localized example data.

## Beautiful UI: adopted homepage source

- [Chat](https://www.beautifului.dev/#chat), local source: `src/components/primitives/ChatComposer.tsx`.
  Used by `src/components/marketing/agent-conversation.tsx` for the customer turn and Moni's
  grounded reply.
- [Task Rows](https://www.beautifului.dev/#task-rows), local source: `src/components/primitives/TaskRows.tsx`.
  Used by `src/components/marketing/agent-conversation.tsx` and `src/components/marketing/how-sequence.tsx`
  for the visible catalogue, availability, booking, and payment run.
- [Accordion](https://ui.shadcn.com/docs/components/radix/accordion), local source:
  `src/components/ui/accordion.tsx`. This is the installed Radix primitive used for the FAQ;
  `src/app/globals.css` supplies its measured-height open and close keyframes.

The Beautiful UI files remain source-owned components. Moni does not redraw their interaction
grammar with a second Tailwind implementation; the marketing layer passes copy and keeps the
light homepage token bridge in `src/app/globals.css`.

## Adaptive Notch Navigation Bar

- Source: complete component source supplied for this implementation request.
- Local source: `src/components/ui/adaptive-notch-navigation-bar.tsx`.
- Dependencies: `framer-motion` and `lucide-react`.
- Homepage usage: `src/components/marketing/header-notch-nav.tsx` is the whole site header,
  built from the source component's exported `NotchItem` (with its layout-animated pill) and
  its `NotchLeftWing` / `NotchRightWing`. `src/components/marketing/chrome.tsx` mounts it and
  passes the mark and the Apply button in as slots, the way the source component takes its own
  `logo` and `rightContent`.

The complete source component is kept in the canonical shadcn UI directory. The homepage does
not mount its fixed full-screen `NotchNav` shell because that shell is `fixed inset-0 h-screen
w-screen` and owns a nested scroll viewport: the page would scroll inside it, so every GSAP
window-scroll scene would sit at scroll position zero. The shell is the only part that cannot
ship here. Its notch is composed from the component's own exports, unmodified, and none of it is
redrawn in Tailwind.

One element, two states. At the top of the page it is the full-width white header: mark left,
destinations centred, language toggle and Apply right. Past 24px of scroll `data-compact` flips
and it morphs into the compact black island, transitioning max-width, padding, ground and bottom
radius together while the wings scale out of its edges. Below `lg` the compact state shows the
current destination as a disclosure and opens the rest in a drawer beneath itself, which is the
shape the source component's own compact island uses; an open drawer forces the compact styling
because its rows are light-on-dark.

Three things the header used to do are gone. A notice strip that compacted into an empty
decorative notch on scroll. A `hidden lg:flex` row of links, one row below, that duplicated the
same three destinations and that no phone ever saw. And the bottom hairline, which drew a second
edge for the island to sit across. `copy.nav.notice` is no longer rendered anywhere.

The active destination comes from GSAP `ScrollTrigger` and the pill from `motion`, which is the
split AGENTS.md asks for. A press holds its destination until the smooth scroll arrives: without
that hold the pill swept through every intermediate tab on the way, reporting the journey rather
than the destination.

The component's 44 `dark:` utilities are inert here rather than fighting the light-only contract:
`src/app/beautifui/foundation.css` declares `@custom-variant dark (&:where(.dark, .dark *))`, and
nothing in the app carries a `.dark` class. That is why the vendored file needs no edit.

## Read, and deliberately not adopted

The landing page's scroll work was designed after reading these. None of their code ships;
the entries are here because the sourcing rule in CLAUDE.md is to search first, and the
result of a search is worth recording whether or not it ends in an install.

- **Aceternity UI, ContainerScroll** (Manu Arora), mirrored on 21st.dev as
  `manuarora700/container-scroll-animation`. Its recipe is a 1000px perspective with the
  card tilted on X and flattening as it enters. The existing Moni stage predates the current
  library-first contract; do not extend or copy that local adaptation for new homepage work.
- **MagicUI, Marquee** (`https://magicui.design/r/marquee.json`). A duplicated flex
  track and a CSS keyframe. The channel messages were built as a marquee first and then
  removed entirely. A marquee makes text unreadable while it moves and requires a separate
  static fallback under reduced motion. The existing ruled list is historical and is not a
  reason to invent another local presentation.

Both registries are public and need no API key, which is why no 21st.dev install quota was
spent: `~/.config/21st/auth.json` does not exist on this machine, and without it every
`npx shadcn add "https://21st.dev/r/..."` fails with `[Authentication required]`.

## simple-icons: the channel marks

- Project: [simple-icons](https://simple-icons.org)
- Icon files: CC0 1.0 Universal. The trademarks they depict are NOT waived and
  remain the property of Telegram, Meta and Grab.
- Local adaptation: `src/components/marketing/channel-marks.tsx`

The paths are reproduced unmodified in each brand's published colour, because a
brand mark redrawn in someone else's palette stops being that brand's mark. They
are the only colour on the public site that is not black, white or the accent.

All five are shown at equal weight, each captioned with what Moni handles on that
channel. See THIRD_PARTY_NOTICES.md for the trademark position and for the note
on where channel availability is communicated instead.

## Moni's own marks

`src/components/marketing/icons.tsx` is an existing authored set. New homepage work should
use the selected library's icons or Lucide; do not extend this local set as a replacement for
a library component.

## Homepage image cutouts

The hero's edge objects are raster cutouts generated with the Codex image generation tool,
then copied into `public/images/marketing/`. They are intentionally unbranded so they read as
the real objects a shop owner handles: `apple-cutout.png`, `coffee-cup-cutout.png`,
`paint-roller-cutout.png`, `receipt-cutout.png`, and `payment-terminal-cutout.png`. Each source
file has an alpha channel and is animated by the GSAP scroll scene in `hero.tsx`.

The KHQR wordmark remains the existing local payment asset at
`public/images/payment/khqr-wordmark.webp`. The requested ABA image could not be downloaded
from its host, which returned HTTP 403 to the local fetch, so it is not represented as a
fake or placeholder asset.

## Beautiful UI: Task Rows (second adaptation)

- Project: [Beautiful UI](https://www.beautifului.dev/)
- Pattern: [Task Rows](https://www.beautifului.dev/#task-rows)
- License: MIT (the site publishes the component set under MIT)
- Local adaptations, both from one upstream source:
  - `src/components/primitives/TaskRows.tsx`, marketing, scripted, unmodified
  - `src/components/agent/setup-tasks.tsx`, owner app, prop-driven

The app adaptation keeps Task Rows' row grammar, badge states, expand animation,
and class names. It deletes the scripted `TICKS` timeline and the demo data, and
takes every row state from `src/lib/queries/setup-progress.ts` instead. The
marketing copy is deliberately not shared: the homepage has a screenshot
acceptance target that an onboarding change must not be able to break.

## Beautiful UI: Thinking (second adaptation)

- Project: [Beautiful UI](https://www.beautifului.dev/)
- Pattern: [Thinking](https://www.beautifului.dev/#thinking)
- License: MIT (the site publishes the component set under MIT)
- Local adaptations, both from one upstream source:
  - `src/components/primitives/ThinkingState.tsx`, marketing, scripted, unmodified
  - `src/components/agent/agent-thinking.tsx`, owner app, prop-driven, Steps variant only

The app adaptation keeps the header shimmer, the expandable trace, the connecting
line and its measured height, and the class names. It deletes the scripted
`STAGES` timeline and the Search, Reasoning, and Coding variants, and takes its
steps from the real `/api/parse` lifecycle. It also drops the source's
`max-w-95` on the outer wrapper: that fixed width suits the marketing card, but
this fork renders in a full-width form column, so it fills that column instead.
Every other class is kept.

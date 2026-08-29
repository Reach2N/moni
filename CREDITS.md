# Credits

Moni adapts selected open-source components only when their source, license, and fit are
verified. Every adopted component is restyled into the Invitation design system.

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
Khmer copy, and Moni's existing Motion and Invitation tokens.

## Beautiful UI: Approval Card

- Project: [Beautiful UI](https://www.beautifului.dev/)
- Pattern: [Approval Card](https://www.beautifului.dev/#approval-card)
- License: MIT (the site publishes the component set under MIT)
- Local adaptation: `src/components/agent/approval-card.tsx`

This is the human-in-the-loop gate for owner commands that can change prices,
hours, bookings, or payment records. The local component keeps Beautiful UI's
decision grammar—proposed action, visible scope, and explicit continue/skip
actions—but uses Moni's separator-only panels, Khmer line-height rules, and
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

## Read, and deliberately not adopted

The landing page's scroll work was designed after reading these. None of their code ships;
the entries are here because the sourcing rule in CLAUDE.md is to search first, and the
result of a search is worth recording whether or not it ends in an install.

- **Aceternity UI, ContainerScroll** (Manu Arora, MIT), mirrored on 21st.dev as
  `manuarora700/container-scroll-animation`. Its recipe is a 1000px perspective with the
  card tilted on X and flattening as it enters. Good for a picture of an app; the Moni
  stage shows a piece of paper, and a sheet on a counter has no vanishing point, so
  `src/components/marketing/product-stage.tsx` scrubs a small z-rotation and a rise
  instead.
- **MagicUI, Marquee** (MIT, `https://magicui.design/r/marquee.json`). A duplicated flex
  track and a CSS keyframe. The channel messages were built as a marquee first and then
  removed entirely: a marquee makes text unreadable while it moves, needs a duplicate
  track to loop, and needs a separate static fallback under reduced motion.
  `src/components/marketing/message-log.tsx` is a ruled list, which is both readable and
  closer to what the section is claiming.

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

Every mark carries a status badge from `copy.channels.platforms`. Telegram is the
only live channel; Messenger is waiting on Meta app review, and the rest are
roadmap. See THIRD_PARTY_NOTICES.md for why that is not optional.

## Moni's own marks

`src/components/marketing/icons.tsx` is authored, not adopted. Lucide is round-cap and
round-join; these are drawn on a 24 unit grid at 1.5 stroke with butt caps and miter
joins, so the public site's glyphs belong to the shop's printed matter rather than reading
as a second icon set dropped onto the page.

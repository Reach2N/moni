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

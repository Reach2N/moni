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

## shadcn/ui: Collapsible

- Project: [shadcn/ui](https://github.com/shadcn-ui/ui)
- Documentation: [Collapsible](https://ui.shadcn.com/docs/components/radix/collapsible)
- License: MIT
- Copyright: 2023 shadcn
- Local component: `src/components/ui/collapsible.tsx`

The file is the official Radix Collapsible wrapper produced by `shadcn@latest` for this
project's installed Radix base.

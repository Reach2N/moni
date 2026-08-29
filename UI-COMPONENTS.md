# Moni agent UI components

This is the source-of-truth for agent-facing UI. Moni uses shadcn/ui and Tailwind
CSS as the base, then adopts focused interaction patterns from Beautiful UI and
21st.dev Agent Elements. Components are copied into the repository as source,
not consumed as an opaque runtime package. That keeps the UI type-checkable,
Khmer-safe, and portable to a future Swift client/API without locking the app to
someone else's theme variables.

## The agent lifecycle

```text
Prompt Bar  →  Approval Card (only for mutations)  →  ToolGroup trace  →  Receipt
```

The same lifecycle is used by the owner's Ask Moni surface. The customer
simulator uses the Prompt Bar and receives the assistant response; it never sees
an owner approval gate.

## Adopted components

| Component | Source pattern | Local source | Used by |
| --- | --- | --- | --- |
| `AgentPromptBar` | 21st.dev Agent Elements `InputBar` | `src/components/agent/prompt-bar.tsx` | `AskMoni`, `ChatPanel`, future onboarding and storefront chat |
| `AgentApprovalCard` | Beautiful UI `Approval Card` | `src/components/agent/approval-card.tsx` | `AskMoni` for `organize` and `operate` commands |
| `OwnerToolTrace` | 21st.dev Agent Elements `ToolGroup` | `src/components/app/owner-tool-trace.tsx` | `AskMoni` after a command is approved |
| shadcn `Button`, `Textarea`, `Collapsible`, `Tabs` | shadcn/ui | `src/components/ui/` | All agent surfaces |

### Why Approval Card is the most important addition

Beautiful UI's Approval Card is the best fit for Moni's highest-risk moment:
the agent is about to change a real shop. A generic alert or modal only asks
"are you sure?". This component shows the exact command, its category, the
guardrail statement, and two explicit actions. The component is inline so the
decision remains in the conversation and is usable on a narrow phone screen.

The card is rendered only for commands that can mutate the shop. Read-only
planning commands go directly from the Prompt Bar to the trace. The server
still owns authorization and validation; this card is a human confirmation
layer, not a security boundary.

## Component contracts

### `AgentPromptBar`

`AgentPromptBar` is controlled. It does not fetch, parse, or own agent state.
The caller supplies `value`, `onChange`, and `onSubmit`, so the same component
works with the current JSON routes and a future AI SDK `useChat` stream.

- `helper` communicates a Khmer-safe status or trust statement.
- `leading` and `trailing` are extension slots for voice, attachments, mode,
  and model controls planned in later phases.
- `submitDisabled` is separate from `disabled`, allowing a caller to show a
  non-submittable empty state while preserving a usable input.
- `Cmd/Ctrl + Enter` submits and is advertised only at `sm` widths and above.
- A native `<form>` means enter/click submission works without JavaScript
  keyboard listeners outside the component.

### `AgentApprovalCard`

`AgentApprovalCard` is intentionally action-agnostic. It receives a command,
optional labelled details, and callbacks. It does not know what a booking,
price, or payment is. That keeps business policy in the agent route and makes
the card reusable for future order, invoice, and storefront publishing approvals.

- `titleId` can be supplied when more than one card is present on a page.
- `statusLabel` keeps the small lifecycle badge localizable; the Khmer default is
  `មុនធ្វើការ` (before action).
- `disabled` freezes both actions while the mutation is being submitted.
- Details are plain strings; format money and Khmer digits before passing them
  in, using the existing format helpers.
- The card has no destructive colour by default. Moni's design system uses the
  green seal for a trusted action and reserves red for a true destructive state.

### `OwnerToolTrace`

This is the existing 21st.dev ToolGroup adaptation. It remains the source of
truth for execution visibility: a collapsed summary, expandable step list,
state icons, reduced-motion transitions, and a final receipt. Do not create a
second tool timeline for orders or storefront generation; extend its typed
`OwnerToolTraceStep` data instead.

## Sourcing and update policy

1. Check the upstream registry/docs and license before adopting a pattern.
2. Prefer shadcn registry/source installs over package-only UI libraries.
3. Pin a commit or registry URL in `CREDITS.md` for every copied source block.
4. Adapt the source to `cn`, existing shadcn primitives, Busra line-height, and
   Moni's semantic tokens. Do not add a second colour or radius system.
5. Keep network, database, and model calls outside presentational components.
6. Verify keyboard focus, screen-reader names, reduced motion, disabled/loading,
   error, and narrow (390px) layouts before reusing a component elsewhere.

The next candidate is AI Elements' streaming message renderer once the backend
returns AI SDK `UIMessage` parts. Until that API exists, adding the full registry
would add dependencies and adapters without reducing code.

## References

- [shadcn/ui](https://ui.shadcn.com/docs) — source-owned component distribution
- [Beautiful UI](https://www.beautifului.dev/) — Approval Card, Tool Chips,
  Task Rows, Thinking, and other AI-native patterns (MIT)
- [21st.dev Agent Elements](https://agent-elements.21st.dev/docs) — typed agent
  components for Vercel AI SDK (MIT)
- [Moni credits and local adaptations](CREDITS.md)

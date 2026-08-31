# Moni agent UI components

This is the inventory and interaction contract for agent-facing UI. It is subordinate to
the root `AGENTS.md` and, for any homepage usage, `docs/HOMEPAGE.md`. Moni uses **Beautiful UI
as the primary source** for agentic surfaces, then uses 21st.dev, DaisyUI, shadcn/ui, or
another established library only when Beautiful UI has no complete fit. Components are
installed or copied into the repository as source,
not consumed as an opaque runtime package. That keeps the UI type-checkable,
Khmer-safe, and portable to a future Swift client/API without locking the app to
someone else's theme variables. Existing owner-app adaptations may still use the legacy
Invitation surface until the dashboard rebuild. That legacy styling is not a homepage
reference.

## The agent lifecycle

```text
Prompt Bar  →  Approval Card (only for mutations)  →  ToolGroup trace  →  Receipt
```

The same lifecycle is used by the owner's Ask Moni surface. The customer
simulator uses the Prompt Bar and receives the assistant response; it never sees
an owner approval gate.

## Existing components (owner-app history)

These files document existing owner-app adaptations. They are not the homepage source of
truth and are not a reason to create another local adaptation. New homepage work starts with
the published Beautiful UI source and installs or copies the selected component directly.

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

1. Search Beautiful UI first and select the strongest complete pattern for the interaction.
2. If Beautiful UI has no complete fit, check an existing installed source component before
   moving to another registry.
3. Install or copy the selected library component as source. Defer all license review and
   licensing decisions until distribution; they are not a selection gate for the showcase.
4. Pin a commit or registry URL in `CREDITS.md` for every copied source block.
5. Keep the library's structure and behavior. Use documented theme hooks and the active
   surface contract for its route. Homepage usage must follow `docs/HOMEPAGE.md`.
   Do not invent, redraw, or substantially rewrite a component.
6. If no library component fits, stop and report the gap. Do not create a custom fallback.
7. Keep network, database, and model calls outside presentational components.
8. Verify keyboard focus, screen-reader names, reduced motion, disabled/loading,
   error, and narrow (390px) layouts before reusing a component elsewhere.

The next candidate is Beautiful UI's streaming message renderer once the backend
returns AI SDK `UIMessage` parts. Use AI Elements only if Beautiful UI has no complete
fit. Until that API exists, adding a full registry would add dependencies and adapters
without reducing code.

## References

- [shadcn/ui](https://ui.shadcn.com/docs): source-owned component distribution
- [Beautiful UI](https://www.beautifului.dev/): Approval Card, Tool Chips,
  Task Rows, Thinking, and other AI-native patterns
- [21st.dev Agent Elements](https://agent-elements.21st.dev/docs): typed agent
  components for Vercel AI SDK
- [Moni credits and local adaptations](CREDITS.md)

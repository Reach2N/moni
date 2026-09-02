---
project: Moni
status: active
current_surface: owner-app
current_phase: universal-app
current_theme: light-only
current_task_mode: implementation
---

# Moni agent instructions

This is the active instruction file for coding agents working in the repository. Read it
before changing code. The current work is the gated owner app as one universal app, per
`docs/superpowers/specs/2026-09-02-universal-app-design.md` and PLAN.md Phase 10: the
shop's own Bakong account as the payment rail, the owner agent's SETUP tools, and one
shell around every owner screen. The homepage sections below remain the frozen contract
for `/`; do not modify `src/components/marketing/**`, `src/app/(marketing)/**`, or the two
scripted primitives while working on the owner app.

## Authority and document map

Use this precedence when two active documents disagree:

1. `AGENTS.md`: current scope, workflow, and non-negotiable implementation rules.
2. `PLAN.md`: product direction, phase order, and acceptance criteria.
3. `ARCHITECTURE.md`: data model, API seams, security, and infrastructure decisions.
4. `docs/HOMEPAGE.md`: the single frontend contract for the homepage.
5. Source code and tests: the implementation to inspect and verify.

The following files are historical reference only. Never copy their design, routes, stack,
or product decisions into new work:

- `docs/archive/DESIGN.invitation.md`
- `docs/archive/UI-PLAN.legacy.md`
- `docs/archive/FEATURES.legacy.md`
- `docs/archive/PRODUCT.legacy.md`

If an active document and the implementation disagree, stop and identify the mismatch. In this
documentation-only request, record the intended direction in the active markdown and leave the
implementation untouched. Do not silently choose whichever nearby example looks convenient.

`CLAUDE.md` remains useful for toolchain gotchas and project hard rules, but this file is
the root contract for agents that do not automatically load `CLAUDE.md`. There is no need
to read archived documents for ordinary implementation work.

## Consistency failures this contract prevents

- Multiple “current” design systems made agents alternate between Invitation paper styling,
  dark teal, and Apple light surfaces. Only `docs/HOMEPAGE.md` defines the homepage surface;
  the other systems are archived or scoped to legacy routes.
- Plans mixed homepage, dashboard, storefront, and backend work. `current_surface` is one
  declared surface, and later phases cannot be pulled into it.
- Component names were treated as permission to redraw them locally. A library source must
  be selected first, installed or copied intact during a separately authorized implementation,
  and recorded in `CREDITS.md`; no fit means stop and report.
- Runtime prompt behavior was assumed to come from planning prose. Runtime rules live in the
  prompt and tool files and require their own tests.
- Invented delivery dates and line-count estimates encouraged skipping acceptance checks.
  Work is linear and acceptance-driven with no ETA, deadline, or parallel track.

## Current scope: homepage first

The only active frontend surface for this phase is the public homepage:

- Route: `src/app/(marketing)/page.tsx` at `/`.
- Layout: `src/app/(marketing)/layout.tsx`.
- Components: `src/components/marketing/` and `src/components/motion/`.
- Copy: `src/lib/marketing/copy.ts`.
- Tokens: `src/app/globals.css`.
- Specification: `docs/HOMEPAGE.md`.

The homepage is a light-mode marketing page. It must render light regardless of the
visitor's operating-system preference. Do not add dark-mode branches, dark screenshots, or
dark-only colors to the homepage. The owner dashboard is still a legacy surface and is
outside this phase; do not use it as a visual reference.

## Product and code rules

- No em dashes in user-facing copy, marketing copy, AI output, or commit messages. Use a
  comma, colon, or full stop.
- No emoji. Use Lucide icons or an authored SVG with the established stroke weight.
- Money is integer minor units plus a currency code. Use `formatMoney()` or the Khmer
  formatting helpers. Never put a raw money number in JSX.
- User-facing quantities must use the existing deterministic formatting helpers. Never
  format a user-facing quantity through a `km-KH` locale.
- Khmer text must have `line-height: 1.75` and no letter spacing. Keep the document
  language correct and test real Khmer strings.
- `src/lib/types.ts` is the hand-written type source of truth. Change it before
  `db/schema.sql`, then run the database tests.
- All model/provider names live in `src/lib/ai/models.ts`. Do not name a provider or model
  in a route, component, or page.
- Business operations are HTTP APIs under `src/app/api/`; do not add server actions for
  business operations.
- Keep database, network, and model calls outside presentational components. Components
  receive props and emit user intent through callbacks.
- Tenant identity comes from the authenticated server session and `requireMember()`, never
  from a request body, query string, or client-controlled slug.
- Do not simplify or replace the payment adapter in `src/lib/payments.ts`.

## Homepage visual contract

`docs/HOMEPAGE.md` is the detailed visual contract. Its short version is:

- Light Apple-native surface only: white background, `#F5F5F7` secondary bands, near-black
  labels, one green accent, and restrained red only for destructive state.
- Canonical utility families are `bg-surface`, `bg-surface-2`, `text-label`,
  `text-label-2`, `text-label-3`, `border-separator`, `text-green`, and `text-red`.
- Do not use legacy Invitation utilities (`bg-paper`, `text-ink`, `text-rule`,
  `text-seal`, `border-hairline`) in `src/components/marketing/` or new shared components.
- Cards use the canonical 14px radius and card shadow. Larger stages may use the 24px
  radius. Pills are reserved for compact controls and status marks, not every container.
- Use the system stack first for Latin and Busra as the Khmer fallback. Do not introduce a
  second display face, decorative gradients, or arbitrary palette colors.
- Section structure is quiet and generous: max-width `72rem`, responsive gutters, hairline
  separators, and a clear primary call to join the founding-shop waitlist.
- Scroll-position animation belongs to GSAP through `src/lib/motion/gsap.ts`. React state
  transitions may use `motion`. Every reveal must remain readable with reduced motion.

In a future implementation request, select and install the closest Beautiful UI component
first, then use `docs/HOMEPAGE.md` only for light-mode placement, content, and token
constraints. Never copy a legacy file or an unmodified shadcn default. This request remains
documentation-only, so do not perform that installation now.

## Component sourcing: library-first, no invented UI

UI must come from an existing component library or a verified source on the internet. The
primary source for Moni UI is **Beautiful UI**, especially its agentic patterns for prompt
bars, chat, streaming, thinking/tool traces, approvals, task rows, records, and insight
cards. For every homepage component, check Beautiful UI first and use its complete source
whenever it covers the interaction.

Use this order:

1. Beautiful UI source or registry component, with its source URL recorded. License review
   is deferred for this showcase selection and is not a gate.
2. An existing installed source component that already matches the needed contract.
3. 21st.dev Agent Elements or another agent component with the needed interaction.
4. DaisyUI or another established library when it provides the complete interaction.
5. shadcn/ui or Radix only for a missing low-level primitive or accessibility behavior.

Install or copy the selected component as source during an implementation task. Keep the
library's component structure and behavior. Configure its documented theme/token hooks;
do not invent a replacement, redraw it from scratch, or substantially rewrite it into a
Moni-specific component. Tailwind is a layout and token utility layer, not a component
library to improvise UI from.

If no library component fits, stop and report the missing fit. Do not hand-build a new
component, create a custom interaction, or silently fall back to generic shadcn markup.
Every adopted component must have its source URL, install/copy reference, and local usage
recorded in `CREDITS.md`. Defer all license review and licensing decisions until distribution;
they must not consume showcase selection time or block a component now.

## Homepage content and interaction rules

- The homepage is the public waitlist application. It does not expose the owner product.
- Khmer is the default language. English is available through the existing `?lang=en`
  dictionary path. Keep both locales structurally identical.
- The promise is concrete: the shop answers customers while the owner's hands are busy.
- Show the product as a real, readable sequence: assistant conversation, catalogue or
  booking proof, supported shop types/channels, pricing, FAQs, and the waitlist form.
- Claims must be honest. Do not invent customers, ratings, testimonials, revenue, or
  launch status. Distinguish Telegram availability from Messenger's review status.
- The waitlist form is the primary conversion action. Preserve its success, error,
  keyboard, screen-reader, and narrow-layout states.
- Do not add a new homepage animation without a reduced-motion fallback and a screenshot
  check. Animation decorates already-present content; it must never be the only way content
  becomes visible.

## Linear workflow for documentation changes

Work in order and continue until the current acceptance check is complete. Do not invent
durations, ETAs, deadlines, parallel tracks, or “quick” replacement components.

1. State the surface in the work summary: `homepage-first`, or explain why an explicitly
   requested exception is needed.
2. Inspect the existing document set before editing. Reuse the active contract instead of
   creating another plan or parallel design system.
3. Record the strongest complete Beautiful UI source for each proposed agentic interaction.
   Do not install it or write frontend code in this documentation-only task.
4. Make the smallest coherent markdown change. Keep unrelated user changes, including
   untracked files, intact.
5. Run documentation checks only: `git diff --check`, targeted `rg` searches for archived
   tokens and conflicting sources, and a review of the authority links.
6. If a rule cannot be met in the documents, report the exact blocker. Do not weaken the rule.

## Acceptance checklist: homepage implementation reference

The following checks apply only if the user later requests implementation. They are not an
instruction to change frontend code during the current documentation-only request.

The homepage change is complete only when all applicable checks pass:

- `npm run lint`
- `npm run build`
- `npm run shoot` produces clean light desktop, light mobile, and reduced-motion captures.
- No horizontal overflow, invisible below-fold content, or console/page errors are reported.
- `/` is available without Clerk or database secrets.
- The waitlist form has a success and failure state and does not expose the gated product.
- Khmer and English use the same layout and remain readable with a 1.75 line height.
- The page remains light when `prefers-color-scheme: dark` is emulated.
- No new legacy token usage appears in marketing code.

## Runtime AI boundary

This file and the planning documents guide coding agents. They do not configure Moni's
runtime assistant. Runtime behavior belongs in `src/lib/agent/prompt.ts`,
`src/lib/agent/owner-prompt.ts`, and the tool contracts. If the request concerns what the
assistant says or does, update and test those prompts and tools instead of assuming a plan
document will be sent to the model.

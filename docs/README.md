# Moni documentation map

This directory separates active implementation instructions from historical research.

Owner onboarding is under active implementation per `ONBOARDING.md`. Homepage files and the
scripted marketing primitives stay frozen during that pass.

## Active documents

| Document | Scope | Use it for |
| --- | --- | --- |
| [`../AGENTS.md`](../AGENTS.md) | All coding-agent work | Authority, current surface, workflow, and non-negotiable rules |
| [`../PLAN.md`](../PLAN.md) | Product and sequencing | MVP, phases, and acceptance checks |
| [`../ARCHITECTURE.md`](../ARCHITECTURE.md) | Target architecture | Data model, security, API seams, and adoption decisions |
| [`HOMEPAGE.md`](HOMEPAGE.md) | Public `/` homepage | Light-only visual, content, interaction, and screenshot contract |
| [`ONBOARDING.md`](ONBOARDING.md) | Gated `/app/onboarding` | Owner setup flow, the four-row setup spine, and Beautiful UI component selection |

`CLAUDE.md` contains verified toolchain gotchas and remains relevant when the active agent
loads it. It is subordinate to `AGENTS.md` for current scope and frontend decisions.

## Archived documents

The files in [`archive/`](archive/) preserve earlier thinking for historical context only.
They are not design or implementation instructions:

- `DESIGN.invitation.md`: retired paper and square-corner system.
- `UI-PLAN.legacy.md`: pre-plan UI routes, dark-teal tokens, and wireframes.
- `FEATURES.legacy.md`: pre-plan feature tiers and naming research.
- `PRODUCT.legacy.md`: pre-plan product and brand brief.

When a historical decision is needed, copy only the research. Record a new active decision
in `AGENTS.md`, `PLAN.md`, `ARCHITECTURE.md`, `HOMEPAGE.md`, or `ONBOARDING.md` before implementing it.

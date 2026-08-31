# Owner Onboarding on Beautiful UI: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/app/onboarding` so a shop owner always knows where they are in setup and what Moni has already done for them, using Beautiful UI components and a four-row setup spine whose every row is derived from the database.

**Architecture:** A pure derivation module turns four query results into four typed rows. A prop-driven fork of Beautiful UI's Task Rows renders them on `/app/onboarding` and `/app`. `ShopSetup`'s existing `describe → parsing → review → saving → saved` state machine is preserved exactly; each state is re-dressed with a Beautiful UI surface (Prompt Bar, Thinking, Diff Table, Approval Card). The two marketing primitives stay byte-identical and the app gets siblings.

**Tech Stack:** Next.js 16.3.1 (App Router, Turbopack dev, webpack build), React 19, Tailwind v4 with `@theme`, Beautiful UI foundation already installed at `src/app/beautifui/foundation.css`, Supabase JS with the service-role client, PGlite for schema assertions, Node test scripts with `--experimental-strip-types`.

**Spec:** `docs/ONBOARDING.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **No em dashes.** Not in UI copy, not in Khmer copy, not in comments, not in commit messages. Use a colon, a comma, or a full stop.
- **Khmer needs `line-height: 1.75` and `letter-spacing: normal`.** Any element carrying Khmer text gets the `km` class. Never put `tracking-*` on Khmer.
- **Icons only, never emoji.** lucide-react or an authored SVG in the surrounding stroke weight.
- **No business logic in components.** Components take props and call HTTP contracts. No server actions for business operations.
- **`src/lib/types.ts` is the source of truth**, `db/schema.sql` follows. Never the reverse.
- **Money is integer minor units plus a currency code.** Always render through the existing formatters in `src/lib/format/khmer.ts` and `src/components/app/dashboard-format.ts`.
- **Never invent or hand-build a UI component.** Select the complete Beautiful UI source, copy it, keep its structure and interaction. If no component fits, stop and report the gap.
- **Do not edit `src/app/beautifui/foundation.css`**, and do not add a second theme layer or palette. The five colliding keys (`--color-ink`, `--color-surface`, `--color-green`, `--color-red`, `--accent`) are already reclaimed below the import at `src/app/globals.css:25`.
- **Do not edit `src/components/primitives/TaskRows.tsx` or `src/components/primitives/ThinkingState.tsx`.** `src/components/marketing/agent-conversation.tsx` and `src/components/marketing/how-sequence.tsx` depend on them and the homepage has a screenshot acceptance target.
- **Owner-app token vocabulary only on this route:** `bg-paper`, `text-ink`, `text-rule`, `text-seal-text`, `bg-ink`, `text-on-ink`, `border-hairline`. Do not import homepage tokens (`text-label`, `bg-surface-2`, `border-separator`) here. A copied Beautiful UI component keeps its own utilities, which resolve through the reclaimed foundation; that is not a violation.
- **Tenancy:** every query takes `businessId` as an argument. Never resolve a tenant from anything a request supplied. RLS has zero policies, so a query that forgets its `businessId` has nothing to catch it.
- **`import 'server-only'` makes a module unimportable from a Node test script.** Pure, testable logic goes in a sibling module with no `server-only`, following `src/lib/auth/gate.ts` beside `src/lib/auth/member.ts`.
- **This repo has no component test framework.** Real assertions exist for pure logic (`scripts/*-test.mjs`) and schema (`db/test.mjs`). Component tasks verify with `npm run lint`, `npm run build`, and `npm run shoot`. Do not scaffold a new test runner as part of this plan.
- **Before starting:** the documentation-only restriction in `CLAUDE.md` and `docs/README.md` must be lifted by the user. Task 0 covers it. Do not modify source before that task is done.

---

### Task 0: Lift the documentation-only restriction

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: permission for every later task to modify source.

- [ ] **Step 1: Authorization, already granted**

The controller confirmed this with the user before dispatch: they chose subagent-driven
execution and directed the checkpoint commit `9ee4bed`. Do not ask again. Proceed to Step 2.
The exact sentence to replace in `CLAUDE.md` is:

> For the current repository request, work is documentation-only. Do not modify frontend/source
> files, install packages, or make frontend changes. The homepage contract is being prepared for
> a later implementation pass.

Ask, and wait for a yes.

- [ ] **Step 2: Replace that paragraph in `CLAUDE.md`**

Replace the block above with:

```markdown
The active implementation pass is owner onboarding, per `docs/ONBOARDING.md` and
`docs/superpowers/plans/2026-08-31-onboarding-beautiful-ui.md`. Homepage files stay
frozen: `src/components/marketing/**`, `src/app/(marketing)/**`, and the two scripted
primitives `src/components/primitives/TaskRows.tsx` and
`src/components/primitives/ThinkingState.tsx` are not modified by this pass.
```

- [ ] **Step 3: Update the same claim in `docs/README.md`**

Replace:

```markdown
The current request changes documentation only. Frontend/source files and dependencies stay
untouched until a later, explicitly authorized implementation pass.
```

with:

```markdown
Owner onboarding is under active implementation per `ONBOARDING.md`. Homepage files and the
scripted marketing primitives stay frozen during that pass.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/README.md
git commit -m "docs: open the onboarding implementation pass, keep homepage frozen"
```

---

### Task 1: The setup spine as pure logic

The whole judgement of what setup progress means lives here, and the component that renders it holds none of it. This mirrors `src/lib/queries/signals.ts`, which is pure and tested for the same reason.

**Files:**
- Create: `src/lib/queries/setup-progress.ts`
- Create: `scripts/setup-progress-test.mjs`
- Modify: `package.json` (add one script)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type SetupStepKey = 'describe' | 'catalogue' | 'channel' | 'customer'`
  - `type SetupStepState = 'done' | 'pending' | 'failed'`
  - `type SetupStep = { key: SetupStepKey; label: string; amount: string; state: SetupStepState; error: string | null; href: string }`
  - `type SetupProgressInput = { hasDescription: boolean; hasCatalogue: boolean; serviceCount: number; channels: readonly { channel: string; status: string; lastError: string | null }[]; hasFirstTransaction: boolean }`
  - `function deriveSetupProgress(input: SetupProgressInput): SetupStep[]`
  - `function setupComplete(steps: readonly SetupStep[]): boolean`

- [ ] **Step 1: Write the failing test**

Create `scripts/setup-progress-test.mjs`:

```js
/**
 * The setup spine tells an owner what is left to do, so its rules get asserted
 * rather than eyeballed. The states that matter most are the ones seed data can
 * never show: a shop on its first second, and a channel that connected and then
 * dropped.
 *
 *   node --experimental-strip-types scripts/setup-progress-test.mjs
 */
import assert from 'node:assert/strict'
import { deriveSetupProgress, setupComplete } from '../src/lib/queries/setup-progress.ts'

const failures = []
function check(name, run) {
  try {
    run()
    console.log(`  ok   ${name}`)
  } catch (error) {
    failures.push(name)
    console.log(`  FAIL ${name}\n       ${error.message.split('\n')[0]}`)
  }
}

/** A shop on its first second: signed in, nothing described, nothing wired. */
function input(overrides = {}) {
  return {
    hasDescription: false,
    hasCatalogue: false,
    serviceCount: 0,
    channels: [],
    hasFirstTransaction: false,
    ...overrides,
  }
}

const byKey = (steps) => Object.fromEntries(steps.map((s) => [s.key, s]))

check('a brand new shop shows four rows, all pending', () => {
  const steps = deriveSetupProgress(input())
  assert.equal(steps.length, 4)
  assert.deepEqual(steps.map((s) => s.key), ['describe', 'catalogue', 'channel', 'customer'])
  assert.ok(steps.every((s) => s.state === 'pending'))
})

check('a described shop marks only the first row done', () => {
  const steps = byKey(deriveSetupProgress(input({ hasDescription: true })))
  assert.equal(steps.describe.state, 'done')
  assert.equal(steps.catalogue.state, 'pending')
})

check('the catalogue row counts services in its amount', () => {
  const steps = byKey(deriveSetupProgress(input({ hasCatalogue: true, serviceCount: 5 })))
  assert.equal(steps.catalogue.state, 'done')
  assert.ok(steps.catalogue.amount.includes('៥'), 'service count renders in Khmer digits')
})

check('a connected telegram marks the channel row done', () => {
  const steps = byKey(deriveSetupProgress(input({
    channels: [{ channel: 'telegram', status: 'connected', lastError: null }],
  })))
  assert.equal(steps.channel.state, 'done')
  assert.equal(steps.channel.error, null)
})

check('a channel that dropped is FAILED, not pending', () => {
  const steps = byKey(deriveSetupProgress(input({
    channels: [{ channel: 'telegram', status: 'error', lastError: 'webhook 401' }],
  })))
  assert.equal(steps.channel.state, 'failed')
  assert.equal(steps.channel.error, 'webhook 401')
})

check('a channel row with an error but no message still fails cleanly', () => {
  const steps = byKey(deriveSetupProgress(input({
    channels: [{ channel: 'telegram', status: 'error', lastError: null }],
  })))
  assert.equal(steps.channel.state, 'failed')
  assert.equal(steps.channel.error, null)
})

check('a connected channel wins over a broken one on another channel', () => {
  const steps = byKey(deriveSetupProgress(input({
    channels: [
      { channel: 'messenger', status: 'error', lastError: 'app review pending' },
      { channel: 'telegram', status: 'connected', lastError: null },
    ],
  })))
  assert.equal(steps.channel.state, 'done')
})

check('every row carries a destination, because a row that leads nowhere is worse than no row', () => {
  for (const step of deriveSetupProgress(input())) {
    assert.ok(step.href.startsWith('/app'), `${step.key} has no destination`)
  }
})

check('no em dash reaches any label', () => {
  for (const step of deriveSetupProgress(input({ hasCatalogue: true, serviceCount: 3 }))) {
    assert.ok(!step.label.includes('—'), `${step.key} label has an em dash`)
    assert.ok(!step.amount.includes('—'), `${step.key} amount has an em dash`)
  }
})

check('setup is complete only when all four are done', () => {
  const partial = deriveSetupProgress(input({ hasDescription: true, hasCatalogue: true }))
  assert.equal(setupComplete(partial), false)
  const all = deriveSetupProgress(input({
    hasDescription: true,
    hasCatalogue: true,
    serviceCount: 2,
    channels: [{ channel: 'telegram', status: 'connected', lastError: null }],
    hasFirstTransaction: true,
  }))
  assert.equal(setupComplete(all), true)
})

console.log(`\n${failures.length === 0 ? '\x1b[32m' : '\x1b[31m'}${failures.length} failed\x1b[0m\n`)
process.exit(failures.length === 0 ? 0 : 1)
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node --experimental-strip-types scripts/setup-progress-test.mjs
```

Expected: fails immediately, `Cannot find module '../src/lib/queries/setup-progress.ts'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/queries/setup-progress.ts`. Note there is no `import 'server-only'` here, deliberately, so the test script can import it.

```ts
/**
 * What is left before this shop can serve a customer, in the order it has to
 * happen, in the words the owner would use.
 *
 * This file holds the whole judgement (CLAUDE.md rule 9) and the component that
 * renders it holds none of it. It is a pure function of four answers, which is
 * what lets `scripts/setup-progress-test.mjs` assert the states no seed data can
 * ever show: a shop on its first second, and a channel that dropped.
 *
 * There is no `server-only` import here on purpose. See CLAUDE.md: that import
 * makes a module unimportable from the test harness.
 */
import { toKhmerDigits } from '../format/khmer.ts'

export type SetupStepKey = 'describe' | 'catalogue' | 'channel' | 'customer'

/**
 * `failed` exists because a channel that connected and then dropped is not the
 * same as a channel never wired up, and an owner told "pending" for a broken
 * webhook will wait forever. Beautiful UI's Task Rows draws all three.
 */
export type SetupStepState = 'done' | 'pending' | 'failed'

export type SetupStep = {
  key: SetupStepKey
  /** Khmer, rendered with the `km` class by the component. */
  label: string
  /** The short right-hand fact, Khmer digits. Never a duplicate of the label. */
  amount: string
  state: SetupStepState
  /** Only ever set on a `failed` row, and shown verbatim to the owner. */
  error: string | null
  /** Where this row sends the owner. Every row has one. */
  href: string
}

export type SetupProgressInput = {
  hasDescription: boolean
  hasCatalogue: boolean
  serviceCount: number
  channels: readonly { channel: string; status: string; lastError: string | null }[]
  hasFirstTransaction: boolean
}

/** A channel counts as wired only when a row says so. */
function channelState(channels: SetupProgressInput['channels']): {
  state: SetupStepState
  error: string | null
  amount: string
} {
  const connected = channels.find((c) => c.status === 'connected')
  if (connected) return { state: 'done', error: null, amount: 'ភ្ជាប់រួច' }

  const broken = channels.find((c) => c.status !== 'connected')
  if (broken) return { state: 'failed', error: broken.lastError, amount: 'ដាច់' }

  return { state: 'pending', error: null, amount: 'មិនទាន់ភ្ជាប់' }
}

export function deriveSetupProgress(input: SetupProgressInput): SetupStep[] {
  const channel = channelState(input.channels)

  return [
    {
      key: 'describe',
      label: 'ពិពណ៌នាហាង',
      amount: input.hasDescription ? 'រួចរាល់' : 'មិនទាន់',
      state: input.hasDescription ? 'done' : 'pending',
      error: null,
      href: '/app/onboarding',
    },
    {
      key: 'catalogue',
      label: 'បញ្ជីសេវា',
      amount: input.hasCatalogue ? `${toKhmerDigits(input.serviceCount)} សេវា` : 'គ្មានសេវា',
      state: input.hasCatalogue ? 'done' : 'pending',
      error: null,
      href: '/app/onboarding',
    },
    {
      key: 'channel',
      label: 'ភ្ជាប់ Telegram',
      amount: channel.amount,
      state: channel.state,
      error: channel.error,
      href: '/app/channels',
    },
    {
      key: 'customer',
      label: 'អតិថិជនដំបូង',
      amount: input.hasFirstTransaction ? 'មកដល់ហើយ' : 'មិនទាន់មាន',
      state: input.hasFirstTransaction ? 'done' : 'pending',
      error: null,
      href: '/app/inbox',
    },
  ]
}

/** The spine stops rendering forever once this is true. */
export function setupComplete(steps: readonly SetupStep[]): boolean {
  return steps.every((step) => step.state === 'done')
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
node --experimental-strip-types scripts/setup-progress-test.mjs
```

Expected: every check prints `ok`, exit code 0. If `toKhmerDigits` is not exported from `src/lib/format/khmer.ts` under that name, read that file and use the real export rather than adding a second implementation.

- [ ] **Step 5: Register the script**

In `package.json`, add to `scripts`, after `test:signals`:

```json
"test:setup": "node --experimental-strip-types scripts/setup-progress-test.mjs"
```

- [ ] **Step 6: Run it through npm and typecheck**

```bash
npm run test:setup
npx tsc --noEmit
```

Expected: both clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/queries/setup-progress.ts scripts/setup-progress-test.mjs package.json
git commit -m "feat: derive setup progress as pure, tested rules"
```

---

### Task 2: hasFirstTransaction, and proving it agrees with the meter

**Files:**
- Modify: `src/lib/queries/business.ts` (append after `getChannelConnections`)
- Modify: `db/test.mjs` (append before the `── result ──` block at the end)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `async function hasFirstTransaction(businessId: string): Promise<boolean>`

**Why this is its own task:** the definition of a transaction is already fixed by `v_month_usage` at `db/schema.sql:608`, which counts bookings with `status in ('confirmed','completed')` plus payments with `status = 'paid' and booking_id is null`. Two different definitions of "a transaction" in one product is a billing bug. The spine asks "ever", the meter asks "this month", so the time window differs on purpose and the counted set must not.

- [ ] **Step 1: Write the failing assertions**

Append to `db/test.mjs`, immediately before the `// ── result ──` comment:

```js
console.log('\nthe setup spine: has this shop ever served a customer')

// The spine's question is "ever", the meter's is "this month". The WINDOW may
// differ; the counted set may not. These assertions are what stops the two
// drifting apart into a billing bug.
const everTxn = `
  select (exists (select 1 from bookings
                   where business_id = $1 and status in ('confirmed','completed'))
       or exists (select 1 from payments
                   where business_id = $1 and status = 'paid' and booking_id is null)) as ok`

const spineSays = async (biz) =>
  (await one(db, everTxn.replaceAll('$1', `'${biz}'`))).ok === true

eq('the seeded salon has already served someone', await spineSays(B_SALON), true)

await db.exec(`
  insert into businesses (id, slug, name, business_type, category, locale, default_currency)
  values ('b0000000-0000-4000-8000-000000000099', 'brand-new', 'Brand New',
          'salon', 'beauty', 'km', 'KHR')
  on conflict (id) do nothing`)
const B_NEW = 'b0000000-0000-4000-8000-000000000099'

eq('a brand new shop has served nobody', await spineSays(B_NEW), false)

await db.exec(`
  insert into bookings (business_id, service_id, resource_id, customer_id, starts_at, ends_at,
                        status, unit, price_minor, currency, channel, created_by)
  values ('${B_NEW}','${S_CUT}','${R_SOKHA}','${C_SOPHEA}',
          ${at(30, '09:00')}, ${at(30, '09:30')},
          'pending','session',15000,'KHR','web','ai')`)
eq('a PENDING booking is not a transaction (it may never happen)', await spineSays(B_NEW), false)

await db.exec(`update bookings set status = 'confirmed'
                where business_id = '${B_NEW}' and status = 'pending'`)
eq('a CONFIRMED booking is a transaction', await spineSays(B_NEW), true)

// and the counted set matches the meter's, which is the assertion that matters
const meterSet = await one(db, `
  select count(*) c from bookings
   where business_id = '${B_NEW}' and status in ('confirmed','completed')`)
eq('and the meter counts exactly the same booking', Number(meterSet.c), 1)
```

- [ ] **Step 2: Run to verify the new block fails**

```bash
npm run db:test
```

Expected: the new assertions run. If any fails, the failure text names which. Do not proceed past a red assertion by loosening it: read `db/schema.sql:608` and fix the SQL to match the view.

- [ ] **Step 3: Write the query**

Append to `src/lib/queries/business.ts`:

```ts
/**
 * Has this shop ever served a real customer?
 *
 * The counted set is the one `v_month_usage` meters (db/schema.sql): a booking
 * that got real, plus a standalone paid sale with no booking behind it, so a
 * booking that is also paid counts once. The WINDOW is deliberately different:
 * the meter asks about this month, the setup spine asks whether it has ever
 * happened at all. Change the set here only by changing the view too, or the
 * product will meter one thing and congratulate the owner for another.
 *
 * Two head counts rather than one join: either is a yes, so the second is
 * skipped whenever the first answers.
 */
export async function hasFirstTransaction(businessId: string): Promise<boolean> {
  const bookings = await db
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .in('status', ['confirmed', 'completed'])
  throwIfDbError('count billable bookings', bookings.error)
  if ((bookings.count ?? 0) > 0) return true

  const sales = await db
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'paid')
    .is('booking_id', null)
  throwIfDbError('count standalone sales', sales.error)
  return (sales.count ?? 0) > 0
}
```

- [ ] **Step 4: Run the full schema suite and typecheck**

```bash
npm run db:test
npx tsc --noEmit
```

Expected: all assertions pass, including the pre-existing ones. The suite prints `N passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries/business.ts db/test.mjs
git commit -m "feat: hasFirstTransaction, asserted to count what the meter counts"
```

---

### Task 3: Fork Task Rows into a prop-driven app variant

**Files:**
- Create: `src/components/agent/setup-tasks.tsx`
- Modify: `CREDITS.md`
- Read only, do not modify: `src/components/primitives/TaskRows.tsx`

**Interfaces:**
- Consumes: `SetupStep`, `SetupStepState` from `src/lib/queries/setup-progress.ts` (Task 1).
- Produces: `function SetupTasks(props: { steps: readonly SetupStep[]; retryLabel: string; className?: string }): JSX.Element`

- [ ] **Step 1: Copy the source verbatim, then strip the script**

Copy `src/components/primitives/TaskRows.tsx` to `src/components/agent/setup-tasks.tsx`. Keep every class name, every SVG, every animation string, and the expand/collapse grammar. The sourcing rule forbids redrawing it.

Then make exactly these changes and no others:

1. Delete `const TICKS = [600, 900, 2400, 1400, 2400, 600]` and the whole `useTick` function.
2. Delete `const TASK_ROWS: TaskRow[] = [...]`, the demo data.
3. Delete the `TaskRow`, `TaskDetail`, and `TaskRowsLabels` type declarations. This component takes `SetupStep` instead.
4. Delete the `row2` variable and the `"sequence"` branch in `badgeFor` and `pillFor`. The state is now `step.state`.
5. Delete the `variant` prop and the `list` branch. The app uses one presentation.
6. Change the default `open` from `manualOpen[row.key] ?? (row.key === "index" && tick === 2)` to `manualOpen[step.key] ?? false`.
7. The failed pill's retry becomes a real button, not a permanently spinning icon.

- [ ] **Step 2: Write the component**

`src/components/agent/setup-tasks.tsx`:

```tsx
'use client'

/**
 * The setup spine. Forked from Beautiful UI's Task Rows
 * (src/components/primitives/TaskRows.tsx), which stays byte-identical because
 * the marketing page renders it and the homepage has a screenshot acceptance
 * target.
 *
 * The fork is one change: the scripted TICKS timeline is gone and every row's
 * state arrives as a prop derived from the database. A row that says Telegram is
 * connected means a channel_connections row says so. That is the whole
 * difference between guidance and decoration.
 */
import { useState } from 'react'
import Link from 'next/link'
import type { SetupStep } from '@/lib/queries/setup-progress.ts'

function SpinnerRing({ children }: { children?: React.ReactNode }) {
  const size = 24, stroke = 2
  const r = (size - stroke) / 2
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      </svg>
      <span className="relative text-[10.5px] font-semibold tabular-nums text-ink">{children}</span>
    </span>
  )
}

function Badge({ tone, children }: { tone: 'red' | 'green'; children: React.ReactNode }) {
  return (
    <span
      className={`flex size-5.5 shrink-0 items-center justify-center rounded-full text-white
        ${tone === 'red' ? 'bg-red' : 'bg-green'}`}
      style={{ animation: 'pop-in 300ms cubic-bezier(0.23,1,0.32,1) both' }}
    >
      {children}
    </span>
  )
}

const XIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
)
const CheckIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
)

export function SetupTasks({
  steps,
  retryLabel,
  className,
}: {
  steps: readonly SetupStep[]
  /** Khmer, for example 'សាកម្តងទៀត'. Passed in so no copy is hardcoded here. */
  retryLabel: string
  className?: string
}) {
  const [manualOpen, setManualOpen] = useState<Record<string, boolean>>({})

  const badgeFor = (step: SetupStep, index: number) => {
    if (step.state === 'done') return <Badge tone="green">{CheckIcon}</Badge>
    if (step.state === 'failed') return <Badge tone="red">{XIcon}</Badge>
    return <SpinnerRing>{index + 1}</SpinnerRing>
  }

  return (
    <div className={`flex w-full flex-col gap-2${className ? ` ${className}` : ''}`}>
      {steps.map((step, i) => {
        const open = manualOpen[step.key] ?? false
        const expandable = step.state === 'failed' && step.error !== null
        return (
          <div
            key={step.key}
            className="self-stretch overflow-hidden bg-surface shadow-card transition-[border-radius,background-color] duration-300 hover:bg-inset"
            style={{
              borderRadius: open ? 14 : 22,
              animation: `fade-up 450ms cubic-bezier(0.23,1,0.32,1) ${i * 80}ms both`,
            }}
          >
            <div className="flex min-h-14 w-full items-center gap-2.5 px-2.5 py-2 sm:min-h-11 sm:py-0">
              <span className="flex size-6 shrink-0 items-center justify-center">
                {badgeFor(step, i)}
              </span>
              <Link
                href={step.href}
                className="km flex min-w-0 flex-1 flex-col gap-0.5 text-left sm:flex-row sm:items-center sm:gap-2"
              >
                <span className="km min-w-0 text-[13px] font-medium text-ink sm:flex-1 sm:truncate">
                  {step.label}
                </span>
                <span className="km text-[12px] text-ink-2">{step.amount}</span>
              </Link>
              {step.state === 'failed' && (
                <Link
                  href={step.href}
                  className="km inline-flex h-5.5 shrink-0 items-center rounded-full bg-red-tint px-2 text-[11.5px] font-medium text-red"
                >
                  {retryLabel}
                </Link>
              )}
              {expandable && (
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={step.label}
                  onClick={() => setManualOpen((current) => ({ ...current, [step.key]: !open }))}
                  className="-ml-1 flex size-7 shrink-0 items-center justify-center rounded-full text-ink-3"
                >
                  <svg
                    width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                    className="transition-transform duration-300"
                    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              )}
            </div>

            {expandable && (
              <div
                className="grid transition-[grid-template-rows,opacity] duration-300"
                style={{
                  gridTemplateRows: open ? '1fr' : '0fr',
                  opacity: open ? 1 : 0,
                  transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
                }}
              >
                <div className="overflow-hidden">
                  <div className="mb-2.5 grid grid-cols-[24px_1fr] gap-2.5 px-2.5">
                    <span aria-hidden className="mx-auto h-full w-px bg-line" />
                    <p className="font-mono text-[11.5px] break-words text-ink-3">{step.error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Typecheck and lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: both clean.

- [ ] **Step 4: Prove the marketing primitive is untouched**

```bash
shasum -c .superpowers/sdd/2026-08-31-onboarding-beautiful-ui/frozen-baseline.sha256
```

Expected: every line ends `OK`. These files are UNTRACKED, so `git diff` reports nothing
about them no matter what you do: the checksum baseline is the only real guard. A `FAILED`
line on `TaskRows.tsx` means the fork edited the marketing copy. Revert that file.

- [ ] **Step 5: Record the fork in CREDITS.md**

Append a section, following the format of the existing Beautiful UI entry:

```markdown
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
```

- [ ] **Step 6: Commit**

```bash
git add src/components/agent/setup-tasks.tsx CREDITS.md
git commit -m "feat: prop-driven Task Rows fork for the setup spine"
```

---

### Task 4: Render the spine on both surfaces

This is the task that makes the spine real. After it, the feature ships value on its own even if Tasks 5 to 8 never happen.

**Files:**
- Create: `src/lib/queries/setup.ts`
- Modify: `src/app/app/onboarding/page.tsx`
- Modify: `src/app/app/page.tsx`
- Modify: `src/components/app/onboarding.tsx`

**Interfaces:**
- Consumes: `deriveSetupProgress`, `setupComplete`, `SetupStep` (Task 1); `hasFirstTransaction`, `hasCatalogue`, `getBusinessById`, `getChannelConnections` (Task 2 and existing); `SetupTasks` (Task 3).
- Produces: `async function loadSetupProgress(businessId: string): Promise<SetupStep[]>`

- [ ] **Step 1: Write the server-side assembler**

Create `src/lib/queries/setup.ts`. This one DOES carry `server-only`: it touches the database. The pure rules stay in `setup-progress.ts` where the test harness can reach them.

```ts
import 'server-only'
import { db } from '../db.ts'
import { throwIfDbError } from '../db-result.ts'
import { getChannelConnections, hasFirstTransaction } from './business.ts'
import { deriveSetupProgress, type SetupStep } from './setup-progress.ts'

/**
 * The four answers the setup spine needs, in one round of parallel reads.
 *
 * `businessId` is an argument, like every query in this directory: RLS has zero
 * policies, so a query that forgets its tenant has nothing to catch it.
 */
export async function loadSetupProgress(businessId: string): Promise<SetupStep[]> {
  const [described, services, channels, served] = await Promise.all([
    db.from('businesses').select('raw_description').eq('id', businessId).single(),
    db
      .from('services')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('active', true),
    getChannelConnections(businessId),
    hasFirstTransaction(businessId),
  ])
  throwIfDbError('load shop description', described.error)
  throwIfDbError('count active services', services.error)

  const serviceCount = services.count ?? 0
  return deriveSetupProgress({
    hasDescription: Boolean(described.data?.raw_description),
    hasCatalogue: serviceCount > 0,
    serviceCount,
    channels,
    hasFirstTransaction: served,
  })
}
```

- [ ] **Step 2: Load it on the onboarding page**

In `src/app/app/onboarding/page.tsx`, extend the existing dynamic import block. It imports dynamically on purpose, to keep database configuration out of the build-time module graph so a clean clone still builds the public site. Preserve that.

Replace the body of `OnboardingPage` with:

```tsx
export default async function OnboardingPage() {
  // Same reason as the dashboard: keep database configuration out of the
  // build-time module graph so a clean clone still builds the public site.
  const [{ requireMember }, { getBusinessById, hasCatalogue }, { loadSetupProgress }] =
    await Promise.all([
      import('@/lib/auth/member.ts'),
      import('@/lib/queries/business.ts'),
      import('@/lib/queries/setup.ts'),
    ])
  const member = await requireMember()
  const [business, catalogued, steps] = await Promise.all([
    getBusinessById(member.businessId),
    hasCatalogue(member.businessId),
    loadSetupProgress(member.businessId),
  ])

  return (
    <Onboarding
      shopName={business.name}
      initialInstructions={business.ai_instructions}
      hasCatalogue={catalogued}
      steps={steps}
    />
  )
}
```

- [ ] **Step 3: Render it in the Onboarding component**

In `src/components/app/onboarding.tsx`:

1. Add `import { SetupTasks } from '@/components/agent/setup-tasks.tsx'` and
   `import { setupComplete, type SetupStep } from '@/lib/queries/setup-progress.ts'`.
2. Add `steps: readonly SetupStep[]` to the props type and destructure it.
3. **Delete** the static three-item `<ol>` that currently reads
   `១. ពិពណ៌នា`, `២. ពិនិត្យ និងរក្សាទុក`, `៣. សាកជាអតិថិជន`. It is the thing this
   feature replaces, and leaving it means two competing progress indicators.
4. Insert the spine directly above the `<h1>` in the not-yet-saved branch, and above the
   check heading in the saved branch, so it is present in both:

```tsx
{!setupComplete(steps) && (
  <div className="mb-6">
    <SetupTasks steps={steps} retryLabel="សាកម្តងទៀត" />
  </div>
)}
```

- [ ] **Step 4: Render it on the dashboard too**

In `src/app/app/page.tsx`, extend the existing dynamic import block at line 23 to four entries:

```tsx
const [{ requireMember }, { getDashboardSnapshot }, { shopSignals }, { loadSetupProgress }] =
  await Promise.all([
    import('@/lib/auth/member.ts'),
    import('@/lib/queries/dashboard.ts'),
    import('@/lib/queries/signals.ts'),
    import('@/lib/queries/setup.ts'),
  ])
```

Load it after the existing `redirect` guard, not before. That guard sends any shop with an
empty catalogue to `/app/onboarding`, so the work is wasted on exactly the members who never
reach this render:

```tsx
if (snapshot.services.length === 0) redirect('/app/onboarding')
const signals = shopSignals(snapshot)
const urgent = signals.filter((signal) => signal.tone === 'act').length
const steps = await loadSetupProgress(member.businessId)
```

Then render the spine immediately above `<ShopSignals signals={signals} />`, inside the same
padded container:

```tsx
{!setupComplete(steps) && (
  <div className="mb-3 xl:mb-6">
    <SetupTasks steps={steps} retryLabel="សាកម្តងទៀត" />
  </div>
)}
<ShopSignals signals={signals} />
```

Add the two imports at the top of the file, in the existing alphabetical block:
`import { SetupTasks } from '@/components/agent/setup-tasks.tsx'` and
`import { setupComplete } from '@/lib/queries/setup-progress.ts'`.

Note what that redirect means for this surface: a member who reaches the dashboard at all
already has a catalogue, so rows 1 and 2 are always done here and the spine is showing them
the two steps that remain. That is the intended behaviour, not a bug to design around. The
spine stops rendering permanently once all four rows are done, which is what
`docs/ONBOARDING.md` requires.

- [ ] **Step 5: Typecheck, lint, build**

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all three clean. `npm run build` uses webpack here, per `package.json`.

- [ ] **Step 6: Look at it**

```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null
npm run start &
npm run shoot
```

`next start` fails silently on a busy port: it logs `errno: -48` and exits while the OLD server keeps serving a stale build whose CSS 404s, which renders the page completely unstyled and looks like a broken stylesheet. So kill the port first, and confirm the CSS URL returns 200 before trusting any capture.

Check in the captures that the four rows render, that Khmer labels are not clipped, and that the `prefers-reduced-motion: reduce` shot still reads as a checklist.

- [ ] **Step 7: Commit**

```bash
git add src/lib/queries/setup.ts src/app/app/onboarding/page.tsx src/app/app/page.tsx src/components/app/onboarding.tsx
git commit -m "feat: render the setup spine on onboarding and the dashboard"
```

---

### Task 5: Fork Thinking for the parse step

**Files:**
- Create: `src/components/agent/agent-thinking.tsx`
- Modify: `src/components/app/shop-setup.tsx`
- Modify: `CREDITS.md`
- Read only, do not modify: `src/components/primitives/ThinkingState.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `function AgentThinking(props: { steps: readonly { label: string; done: boolean }[]; working: boolean; activeLabel: string; doneLabel: string }): JSX.Element`

- [ ] **Step 1: Copy and strip**

Copy `src/components/primitives/ThinkingState.tsx` to `src/components/agent/agent-thinking.tsx`, then make exactly these changes:

1. Delete `const STAGES = [800, 600, 1800, 2600, 1600]` and the `useSequence` function.
2. Delete the `VARIANTS` map, the `Row` type, the `Dot` component, and `TONES`. The app uses the Steps variant only, so the Search, Reasoning, and Coding branches all go.
3. Replace the derived `working`, `visible`, and `v` with props.
4. Keep the header button, the shimmer-text treatment, the expandable grid, the connecting line and its `useLayoutEffect` measurement, and every class name.

- [ ] **Step 2: Write the component**

```tsx
'use client'

/**
 * The parse trace. Forked from Beautiful UI's Thinking, Steps variant
 * (src/components/primitives/ThinkingState.tsx), which stays byte-identical for
 * the marketing page.
 *
 * The fork deletes the scripted STAGES timeline. Steps arrive as props from the
 * real request lifecycle, so a slow parse shows a slow trace and a finished one
 * settles. A trace that animates on a fixed schedule while the request is still
 * in flight is a lie about what the product is doing.
 */
import { useLayoutEffect, useRef, useState } from 'react'

export type ThinkingStep = { label: string; done: boolean }

export function AgentThinking({
  steps,
  working,
  activeLabel,
  doneLabel,
}: {
  steps: readonly ThinkingStep[]
  working: boolean
  /** Khmer, shown while working. */
  activeLabel: string
  /** Khmer, shown once settled. */
  doneLabel: string
}) {
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null)
  const expanded = manualExpanded ?? working
  const traceRef = useRef<HTMLDivElement>(null)
  const [lineHeight, setLineHeight] = useState(0)

  useLayoutEffect(() => {
    if (traceRef.current) setLineHeight(traceRef.current.offsetHeight)
  }, [steps, expanded])

  return (
    <div
      className="flex w-full flex-col"
      style={{
        minHeight: working || expanded ? 176 : undefined,
        transition: 'min-height 400ms cubic-bezier(0.23,1,0.32,1)',
      }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setManualExpanded((current) => !(current ?? working))}
        className="-mx-1.5 flex w-fit items-center gap-2 rounded-control px-1.5 py-1 transition-colors duration-100 hover:bg-hover-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={working ? 'var(--ink-2)' : 'var(--ink-3)'}>
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
        </svg>
        <span role="status" className="contents">
          {working ? (
            <span
              className="km bg-clip-text text-[13px] font-medium text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, var(--ink-3) 35%, var(--ink) 50%, var(--ink-3) 65%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer-text 1.4s linear infinite',
              }}
            >
              {activeLabel}
            </span>
          ) : (
            <span
              className="km text-[13px] font-medium text-ink-2"
              style={{ animation: 'fade-in 350ms ease-out both' }}
            >
              {doneLabel}
            </span>
          )}
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          className="transition-transform duration-300"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div
        className="grid transition-[grid-template-rows,opacity] duration-400"
        style={{
          gridTemplateRows: expanded ? '1fr' : '0fr',
          opacity: expanded ? 1 : 0,
          transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        <div className="overflow-hidden">
          <div className="relative mt-1 ml-[5px] pl-4">
            <span
              aria-hidden
              className="absolute left-[3px] w-px bg-line"
              style={{
                top: -8,
                height: lineHeight ? lineHeight - 2 : 0,
                transition: 'height 500ms cubic-bezier(0.23,1,0.32,1)',
              }}
            />
            <div ref={traceRef} className="flex flex-col gap-1 py-1">
              {steps.map((step, i) => (
                <div
                  key={step.label}
                  className="flex min-h-7 w-full items-center gap-2 rounded-[6px] px-1.5 py-0.5 text-left"
                  style={{ animation: `fade-up 320ms cubic-bezier(0.23,1,0.32,1) ${i * 120}ms both` }}
                >
                  {step.done ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <span
                      className="size-3 shrink-0 rounded-full border-[1.5px] border-line-strong border-t-ink-2"
                      style={{ animation: 'spin 700ms linear infinite' }}
                    />
                  )}
                  <span className="km min-w-0 text-[12.5px] font-medium text-ink">{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Use it for the `parsing` state**

In `src/components/app/shop-setup.tsx`, add a step-tracking state next to the existing ones:

```tsx
const [parseSteps, setParseSteps] = useState<ThinkingStep[]>([])
```

In `parse()`, replace the bare `setState('parsing')` with real lifecycle steps:

```tsx
setParsed(null)
setState('parsing')
setError('')
setParseSteps([
  { label: 'អានពិពណ៌នា', done: false },
  { label: 'រកសេវា និងតម្លៃ', done: false },
  { label: 'រៀបម៉ោងបើកទ្វារ', done: false },
])
try {
  setParseSteps((s) => s.map((step, i) => (i === 0 ? { ...step, done: true } : step)))
  const response = await fetch('/api/parse', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: description }),
  })
  const body = await response.json()
  if (!response.ok || body.error) throw new Error(body.error ?? 'parse failed')
  setParseSteps((s) => s.map((step) => ({ ...step, done: true })))
  setParsed(body as ParseResponse)
  setState('review')
} catch {
  setError('Moni មិនអាចអានព័ត៌មានហាងបាន។ ទិន្នន័យហាងមិនបានប្តូរទេ។')
  setState('error')
}
```

Then render it while parsing, in the `describe` branch of the JSX:

```tsx
{state === 'parsing' && (
  <AgentThinking
    steps={parseSteps}
    working
    activeLabel="កំពុងអាន"
    doneLabel="អានរួចរាល់"
  />
)}
```

Import both: `import { AgentThinking, type ThinkingStep } from '@/components/agent/agent-thinking.tsx'`.

- [ ] **Step 4: Verify, including that the marketing primitive is untouched**

```bash
npx tsc --noEmit
npm run lint
shasum -c .superpowers/sdd/2026-08-31-onboarding-beautiful-ui/frozen-baseline.sha256
```

Expected: first two clean, every checksum line ends `OK`. As in Task 3, these files are
untracked, so the checksum baseline is the only guard that means anything.

- [ ] **Step 5: Record the second fork in CREDITS.md**

Append, following the Task Rows entry's shape:

```markdown
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
steps from the real `/api/parse` lifecycle.
```

- [ ] **Step 6: Commit**

```bash
git add src/components/agent/agent-thinking.tsx src/components/app/shop-setup.tsx CREDITS.md
git commit -m "feat: show the real parse lifecycle with a forked Thinking trace"
```

---

### Task 6: Prompt Bar for the describe step

**Files:**
- Modify: `src/components/app/shop-setup.tsx`
- Read first: `src/components/agent/prompt-bar.tsx`, `src/components/app/voice-note.tsx`

**Interfaces:**
- Consumes: `AgentPromptBar` from `src/components/agent/prompt-bar.tsx`, which already exists with this signature: `{ id?, value, onChange, onSubmit, placeholder, submitLabel, ariaLabel, helper?, leading?, trailing?, disabled?, submitDisabled?, submitClassName?, rows?, className?, textareaClassName? }`.
- Produces: nothing new. This task changes presentation only.

- [ ] **Step 1: Read both files before editing**

`AgentPromptBar` already exists and already has a `leading` slot. Do not add a second prompt component. Read `voice-note.tsx` to see exactly what `VoiceNote` renders, because it goes in that slot unchanged. It draws its own record, stop, timer, and cancel controls, and its own error line. PLAN.md records that voice is press to record, not hold, with a visible timer and a cancel: that behaviour must survive this task untouched.

- [ ] **Step 2: Replace the describe-state textarea**

In `shop-setup.tsx`'s `describe` branch, replace the raw `Textarea` and its submit button with:

```tsx
<AgentPromptBar
  value={description}
  onChange={setDescription}
  onSubmit={parse}
  placeholder="ប្រាប់ Moni ពីហាងរបស់អ្នក៖ សេវា តម្លៃ ម៉ោងបើក"
  submitLabel="រៀបចំឱ្យខ្ញុំ"
  ariaLabel="ពិពណ៌នាហាង"
  rows={6}
  disabled={busy}
  submitDisabled={busy}
  leading={<VoiceNote onTranscript={(text) => setDescription(text)} />}
  textareaClassName="km"
/>
```

`VoiceNote`'s props are `{ onTranscript: (text: string) => void; disabled?: boolean }`, verified
against the file, so that call is correct as written. It posts the raw blob to
`/api/transcribe` with the blob's own type as the content type, and hands back trimmed text.
Do not change `VoiceNote` to fit this call site.

- [ ] **Step 3: Keep the sample-description affordance**

`parse()` currently fills the box with `SAMPLE` when the description is shorter than 8 characters, rather than erroring. That behaviour stays: it is how an owner who does not know what to type gets unstuck. Verify it still fires by submitting an empty box.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Expected: clean. Then run the app and confirm by hand: the microphone still records on press and stops on press, the timer shows, cancel works, and a transcript lands in the box without being parsed automatically. Transcription is its own step and its own model call, per PLAN.md: one call that both hears and structures would bury a misheard price inside a plausible price list.

- [ ] **Step 5: Commit**

```bash
git add src/components/app/shop-setup.tsx
git commit -m "feat: describe the shop through the Prompt Bar, voice note intact"
```

---

### Task 7: Diff Table for the review step

This is the highest-value change in the whole plan. The review step is the exact moment an owner decides whether to trust Moni with their prices.

**Files:**
- Create: `src/components/agent/parsed-services-table.tsx`
- Modify: `src/components/app/shop-setup.tsx`
- Modify: `CREDITS.md`

**Interfaces:**
- Consumes: `ParseResponse` from `src/lib/parse-types.ts`, whose shape is `{ shop: ParsedShop; warnings: { field: string; issue: string }[]; model: string; cost_micro_usd: number; tokens_in: number; tokens_out: number }`.
- Produces: `function ParsedServicesTable(props: { services: ParsedShop['services']; warnings: readonly { field: string; issue: string }[]; currency: string; onEdit: (index: number, field: 'name' | 'price_minor' | 'duration_min', value: string | number) => void; disabled: boolean }): JSX.Element`

- [ ] **Step 1: Fetch the Diff Table source**

```bash
npx shadcn@latest add https://www.beautifului.dev/r/diff-table.json --yes
```

Then **inspect the installed file before using it**. A registry entry can be a link stub rather than code. If the file is a stub, or if the CLI fails on the free tier, stop and report the gap. Do not hand-build a substitute.

If Diff Table turns out not to support editable cells, the documented fallback in `docs/ONBOARDING.md` is Records Table, already vendored at `src/components/primitives/RecordsTable.tsx`. Taking the fallback is a decision to report, not one to make silently.

- [ ] **Step 2: Wrap it, do not redraw it**

Create `src/components/agent/parsed-services-table.tsx`. It keeps the Diff Table's structure and adds exactly two things:

1. A row is **flagged** when `warnings` contains an entry whose `field` names that row's service or field. This is the point of the component: a warned price must catch the eye, so a misheard 15,000 riel does not look identical to a correct one.
2. Money renders through the existing formatter. Import `moneyKm` from `src/components/app/dashboard-format.ts`, which `shop-setup.tsx` already uses. Do not add a second money formatter.

Every price is integer minor units plus a currency code. KHR has 0 decimals so 15000 means 15,000 riel; USD has 2 so 1500 means $15.00. Never a float.

- [ ] **Step 3: Swap it into the review state**

In `shop-setup.tsx`, replace the current editable services table in the `review` branch with `ParsedServicesTable`, passing the existing `updateService` as `onEdit`. `updateService` already has the right signature: `(index: number, field: 'name' | 'price_minor' | 'duration_min', value: string | number) => void`. Do not rewrite it.

Keep the existing "កែពិពណ៌នា" back button and the service count line above the table.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Then by hand: parse a description containing an ambiguous price, and confirm the warned row is visually distinct from the others in a greyscale screenshot. Colour alone is not enough, matching the rule the notice board already follows in `src/lib/queries/signals.ts`.

- [ ] **Step 5: Record it in CREDITS.md**

```markdown
## Beautiful UI: Diff Table

- Project: [Beautiful UI](https://www.beautifului.dev/)
- Pattern: [Diff Table](https://www.beautifului.dev/#diff-table)
- License: MIT (the site publishes the component set under MIT)
- Local adaptation: `src/components/agent/parsed-services-table.tsx`

Moni keeps the proposed-change framing and the row grammar. It binds the rows to
`ParseResponse.shop.services` and flags any row named in `ParseResponse.warnings`,
so the price the model was unsure about is the one the owner's eye lands on.
Money renders through the existing `moneyKm` formatter, never a second one.
```

- [ ] **Step 6: Commit**

```bash
git add src/components/agent/parsed-services-table.tsx src/components/app/shop-setup.tsx CREDITS.md
git commit -m "feat: review the parse as proposed rows, with warnings flagged"
```

---

### Task 8: Approval Card as the save gate, then final verification

**Files:**
- Modify: `src/components/app/shop-setup.tsx`
- Read first: `src/components/agent/approval-card.tsx`
- Modify: `docs/ONBOARDING.md` (implementation-state section)

**Interfaces:**
- Consumes: `AgentApprovalCard` from `src/components/agent/approval-card.tsx`, which already exists: `{ titleId?, title, description, command, details?, statusLabel?, confirmLabel, cancelLabel, onConfirm, onCancel, disabled?, className? }`, with `AgentApprovalDetail = { label: string; value: string }`.
- Produces: nothing new.

- [ ] **Step 1: Put the save behind the card**

In `shop-setup.tsx`, the save currently fires from a plain button. Replace that with the existing Approval Card, rendered below the review table:

```tsx
<AgentApprovalCard
  title="រក្សាទុកព័ត៌មានហាង"
  description="Moni នឹងឆ្លើយអតិថិជនតាមតម្លៃ និងម៉ោងខាងលើ។"
  command="POST /api/setup"
  details={[
    { label: 'សេវា', value: `${toKhmerDigits(parsed?.shop.services.length ?? 0)}` },
    { label: 'រូបិយប័ណ្ណ', value: parsed?.shop.default_currency ?? '' },
  ]}
  confirmLabel="រក្សាទុក"
  cancelLabel="កែម្តងទៀត"
  onConfirm={save}
  onCancel={() => {
    setParsed(null)
    setError('')
    setState('describe')
  }}
  disabled={busy}
/>
```

`POST /api/setup` fires on confirm and never before. That is the whole point of the gate: it is the last moment before a real shop's prices change.

- [ ] **Step 2: Verify no second parse flow was created**

```bash
grep -rn "api/setup" src/components src/app | grep -v node_modules
```

Expected: exactly one call site, inside `shop-setup.tsx`. `ShopSetup` remains the single implementation of describe, parse, review, save. The dashboard sheet and the first run are the same job at different moments, and a second copy of the parse flow is how the earlier iteration drifted.

- [ ] **Step 3: Run everything**

```bash
npm run lint
npm run build
npm run db:test
npm run test:signals
npm run test:setup
```

Expected: all clean, `db:test` prints `N passed, 0 failed`.

- [ ] **Step 4: Capture and read the screenshots**

```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null
npm run start &
npm run shoot
```

Confirm before calling this done:

- The spine renders four rows with real states, and a disconnected channel shows the failed badge and a retry, not a pending spinner.
- The `prefers-reduced-motion: reduce` capture still reads as a checklist. Task Rows and Thinking both animate, and that shot is the proof motion decorates the status rather than carrying it.
- Khmer labels are readable, with no clipped coeng subscripts, which means `line-height: 1.75` reached them and no `tracking-*` did.
- `npm run shoot` reports `invisible=0` and no new `overflowing=` entries.
- The marketing captures are unchanged from before this branch. That is the evidence the fork held.

- [ ] **Step 5: Prove both marketing primitives survived the whole plan**

```bash
shasum -c .superpowers/sdd/2026-08-31-onboarding-beautiful-ui/frozen-baseline.sha256
```

Expected: all 19 lines end `OK`. This covers both scripted primitives, the Beautiful UI
foundation, and every file in `src/components/marketing/`. A single `FAILED` line means a
frozen file moved and the homepage is at risk. Fix it before merging.

- [ ] **Step 6: Record the implementation state in the contract**

Append to `docs/ONBOARDING.md`, mirroring how `docs/HOMEPAGE.md` carries its own "Current implementation state" section:

```markdown
## Current implementation state

`/app/onboarding` renders the four-row setup spine through
`src/components/agent/setup-tasks.tsx`, a prop-driven fork of Beautiful UI's Task
Rows, fed by `loadSetupProgress()` over the pure rules in
`src/lib/queries/setup-progress.ts`. `ShopSetup` keeps its original state machine
and now presents Prompt Bar, the forked Thinking trace, Diff Table, and Approval
Card at its four states. The marketing primitives are unmodified. Provenance for
every component is in `CREDITS.md`.
```

- [ ] **Step 7: Commit**

```bash
git add src/components/app/shop-setup.tsx docs/ONBOARDING.md
git commit -m "feat: gate the shop save behind the Approval Card"
```

---

## Notes for the executor

**If you find yourself hand-building a UI component, stop.** The sourcing rule is not advisory. Report the gap and wait.

**If a task's verification fails, do not loosen the assertion.** In particular, the `hasFirstTransaction` assertions in Task 2 exist to keep the spine and the billing meter agreeing about what a transaction is. A red assertion there is a real disagreement, and the fix is in the SQL, not the test.

**Task boundaries are review gates.** Tasks 1, 2, 3 and 4 together ship the setup spine, which is useful on its own. Tasks 5 through 8 re-dress the describe sequence. If the plan has to stop early, stopping after Task 4 leaves the product better than it started, and stopping mid-way through Task 7 does not.

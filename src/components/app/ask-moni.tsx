'use client'

import { startTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useReducedMotion } from 'motion/react'
import {
  ArrowUpRight,
  Bot,
  CalendarDays,
  CalendarRange,
  ImagePlus,
  ListChecks,
  RotateCcw,
  Tags,
  TriangleAlert,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AgentApprovalCard } from '@/components/agent/approval-card.tsx'
import { AgentPromptBar } from '@/components/agent/prompt-bar.tsx'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import type { AskSuggestion, SuggestionIcon } from '@/lib/agent/suggestions.ts'
import { isShopProposal, type ShopProposal, type ShopProposalBlocker } from '@/lib/agent/proposal.ts'
import { RECEIPT_EVENT, type MoniReceiptEvent } from '@/lib/moni-events.ts'
import { toKhmerDigits } from './dashboard-format.ts'
import { Panel, PanelHeader, PanelRow, PanelRows } from './panel.tsx'
import { VoiceNote } from './voice-note.tsx'
import {
  OwnerToolTrace,
  type OwnerToolTraceStatus,
  type OwnerToolTraceStep,
} from './owner-tool-trace.tsx'

type ApiStep = { tool: string; args: unknown; result: unknown }
type WorkState = 'idle' | 'working' | 'steps' | 'receipt' | 'error'

/** A glyph per suggestion, so a row is read before it is read word by word. */
const SUGGESTION_ICON: Record<SuggestionIcon, LucideIcon> = {
  catalogue: Tags,
  photo: ImagePlus,
  money: Wallet,
  day: CalendarDays,
  week: CalendarRange,
  checklist: ListChecks,
}

/**
 * One line, because there is one surface now.
 *
 * The four it replaces each named a category the browser had invented and never
 * sent: `/api/ask` is posted the text and nothing else, so "Moni is planning
 * from shop data" was said over a request that might have been changing a price.
 */
const WORKING_LABEL = 'Moni កំពុងអានហាងរបស់អ្នក ហើយធ្វើការងារនេះ…'

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function formatIdleGap(value: string) {
  const match = value.match(/^(\d{2}:\d{2}) to (\d{2}:\d{2}), (\d+) minutes free$/)
  if (!match) return toKhmerDigits(value)
  return `ទំនេរ ${toKhmerDigits(match[1]!)} ដល់ ${toKhmerDigits(match[2]!)} · ${toKhmerDigits(match[3]!)} នាទី`
}

const CHANGE_LABEL: Record<string, string> = {
  price_minor: 'តម្លៃថ្មី',
  duration_min: 'រយៈពេលថ្មី',
  name: 'ឈ្មោះថ្មី',
  active: 'ស្ថានភាពប្រើប្រាស់',
  category: 'ក្រុមក្នុងម៉ឺនុយ',
  stock: 'ចំនួនក្នុងស្តុក',
}

/**
 * Why a proposal is missing something, in her words. The decision itself is
 * made once in `lib/agent/proposal.ts` and travels as a code, so this file only
 * prints it (CLAUDE.md rule 9).
 */
const PROPOSAL_BLOCKER: Record<ShopProposalBlocker, string> = {
  no_catalogue: 'បន្ថែមមុខទំនិញ ឬសេវាយ៉ាងតិចមួយ មុនពេលរក្សាទុក',
  unnamed_row: 'មុខខ្លះមិនទាន់មានឈ្មោះ',
  unpriced_row: 'មុខខ្លះមិនទាន់មានតម្លៃ',
}

function proposalCount(summary: ShopProposal['summary']) {
  const parts = [
    summary.services > 0 ? `${toKhmerDigits(summary.services)} សេវា` : null,
    summary.products > 0 ? `${toKhmerDigits(summary.products)} មុខទំនិញ` : null,
  ].filter(Boolean)
  if (parts.length > 0) return parts.join(' និង ')
  return summary.kind_if_empty === 'service' ? `${toKhmerDigits(0)} សេវា` : `${toKhmerDigits(0)} មុខទំនិញ`
}

const BOOKING_STATUS: Record<string, string> = {
  completed: 'បានបញ្ចប់',
  no_show: 'មិនបានមក',
  cancelled: 'បានលុប',
  confirmed: 'បានបញ្ជាក់',
}

type OwnerStep = { title: string; details: string[]; failed: boolean; bookingCode?: string }

function ownerStep(step: ApiStep): OwnerStep {
  const result = record(step.result)
  const error = typeof result.error === 'string' ? result.error : null
  if (error) return { title: 'Moni មិនអាចបញ្ចប់ជំហាននេះបាន', details: [error], failed: true }

  if (step.tool === 'describe_shop' && isShopProposal(step.result)) {
    const proposal = step.result
    return {
      title: 'បានអានហាងរបស់អ្នកពីពិពណ៌នា',
      details: [
        proposalCount(proposal.summary),
        `បើក ${toKhmerDigits(proposal.summary.open_days)} ថ្ងៃ · ${toKhmerDigits(proposal.summary.resource_count)} កន្លែង`,
        ...proposal.blockers.map((blocker) => PROPOSAL_BLOCKER[blocker]),
        'មិនទាន់រក្សាទុកទេ។ បញ្ជាក់ខាងក្រោមសិន',
      ],
      failed: false,
    }
  }

  switch (step.tool) {
    case 'create_service':
      return { title: `បានបន្ថែមសេវា ${String(result.added ?? '')}`, details: [], failed: false }
    case 'update_service': {
      const changes = record(result.changes)
      const details = Object.entries(changes).map(([field, value]) => `${CHANGE_LABEL[field] ?? 'តម្លៃថ្មី'}: ${toKhmerDigits(String(value))}`)
      return { title: `បានកែសេវា ${String(result.updated ?? '')}`, details, failed: false }
    }
    case 'adjust_prices': {
      const changes = Array.isArray(result.changes) ? result.changes.map(record) : []
      return {
        title: `បានកែតម្លៃ ${toKhmerDigits(String(result.changed ?? changes.length))} សេវា`,
        details: changes.map((change) => `${String(change.name ?? '')}: ${toKhmerDigits(String(change.from ?? ''))} → ${toKhmerDigits(String(change.to ?? ''))}`),
        failed: false,
      }
    }
    case 'create_resource':
      return { title: `បានបន្ថែម ${String(result.added ?? 'ធនធានថ្មី')}`, details: [], failed: false }
    case 'create_resources_bulk':
      return {
        title: `បានបន្ថែម ${toKhmerDigits(String(result.added ?? 0))} កន្លែង`,
        details: [`${String(result.first ?? '')} ដល់ ${String(result.last ?? '')}`],
        failed: false,
      }
    case 'set_hours':
      return {
        title: 'បានកំណត់ម៉ោងបើកហាង',
        details: [
          `បើក ${toKhmerDigits(String(result.open_days ?? 0))} ថ្ងៃ · បិទ ${toKhmerDigits(String(result.closed_days ?? 0))} ថ្ងៃ`,
        ],
        failed: false,
      }
    case 'add_closure': {
      const clashes = Array.isArray(result.bookings_already_in_that_window)
        ? result.bookings_already_in_that_window.map(record)
        : []
      return {
        title: `បានបិទហាង ${toKhmerDigits(String(result.closed ?? ''))}`,
        details: clashes.length > 0
          ? clashes.map((clash) => `ត្រូវពិនិត្យ ${String(clash.code ?? '')} · ${String(clash.who ?? '')} · ${toKhmerDigits(String(clash.at ?? ''))}`)
          : ['គ្មានការណាត់ប៉ះពាល់ទេ'],
        failed: false,
      }
    }
    case 'get_day_plan':
      return {
        title: `ផែនការថ្ងៃនេះមាន ${toKhmerDigits(String(result.count ?? 0))} ការណាត់`,
        details: [
          `ប្រាក់រំពឹងទុក ${toKhmerDigits(String(result.expected_takings ?? ''))}`,
          `នៅត្រូវប្រមូល ${toKhmerDigits(String(result.still_to_collect ?? ''))}`,
          ...strings(result.idle_gaps).map(formatIdleGap),
        ],
        failed: false,
      }
    case 'get_week_plan':
      return {
        title: 'បានគ្រោងសប្ដាហ៍ខាងមុខ',
        details: strings(result.quiet_days).map((day) => `ថ្ងៃទំនេរសម្រាប់ផ្សព្វផ្សាយ: ${toKhmerDigits(day)}`),
        failed: false,
      }
    case 'get_money_owed': {
      const people = Array.isArray(result.people) ? result.people.map(record) : []
      return {
        title: `នៅត្រូវប្រមូល ${toKhmerDigits(String(result.total_owed ?? ''))}`,
        details: people.map((person) => `${String(person.who ?? '')} · ${String(person.code ?? '')} · ${toKhmerDigits(String(person.owes ?? ''))}`),
        failed: false,
      }
    }
    case 'get_service_performance': {
      const services = Array.isArray(result.services) ? result.services.map(record) : []
      return {
        title: 'បានប្រៀបធៀបសេវាកម្ម',
        details: services.slice(0, 4).map((service) => `${String(service.name ?? '')} · ${toKhmerDigits(String(service.earned ?? ''))} · ${toKhmerDigits(String(service.per_hour ?? ''))}/ម៉ោង`),
        failed: false,
      }
    }
    case 'mark_booking':
      return {
        title: `បានកែការណាត់ ${String(result.code ?? '')}`,
        details: [`ស្ថានភាពថ្មី: ${BOOKING_STATUS[String(result.status ?? '')] ?? 'បានកែរួច'}`],
        failed: false,
        bookingCode: String(result.code ?? ''),
      }
    case 'record_manual_payment':
      return {
        title: `បានកត់ប្រាក់ ${toKhmerDigits(String(result.recorded ?? ''))}`,
        details: [`សម្រាប់ការណាត់ ${String(result.against ?? '')}`],
        failed: false,
        bookingCode: String(result.against ?? ''),
      }
    case 'export_customers':
      return {
        title: `បានរៀបចំបញ្ជីអតិថិជន ${toKhmerDigits(String(result.count ?? 0))} នាក់`,
        details: [],
        failed: false,
      }
    case 'confirm_payment': {
      const code = String(result.code ?? '')
      if (result.outcome === 'confirmed') {
        return {
          title: `បានបញ្ជាក់ប្រាក់ ${toKhmerDigits(String(result.amount ?? ''))} សម្រាប់ ${code}`,
          details: [result.customer_told ? 'បានប្រាប់អតិថិជនរួច' : 'មិនអាចប្រាប់អតិថិជនបានទេ'],
          failed: false,
          bookingCode: code,
        }
      }
      if (result.outcome === 'already_paid') {
        return { title: `${code} បានបញ្ជាក់រួចហើយ`, details: [], failed: false, bookingCode: code }
      }
      return { title: `រកមិនឃើញការទូទាត់សម្រាប់ ${code}`, details: [], failed: true }
    }
    case 'report_setup_status': {
      const rows = Array.isArray(result.steps) ? result.steps.map(record) : []
      const STATE: Record<string, string> = { done: 'រួច', pending: 'មិនទាន់', failed: 'ដាច់' }
      return {
        title: result.complete ? 'ហាងរួចរាល់ដំណើរការ' : 'នៅសល់ជំហានរៀបចំ',
        details: rows.map((row) => `${String(row.step ?? '')}: ${STATE[String(row.state ?? '')] ?? String(row.state ?? '')}`),
        failed: false,
      }
    }
    case 'set_payment_account': {
      const saved = record(result.saved)
      return {
        title: `បានកំណត់គណនី Bakong ${String(saved.accountId ?? '')}`,
        details: [`ឈ្មោះលើ QR: ${String(saved.merchantName ?? '')}`],
        failed: false,
      }
    }
    case 'generate_shop_site': {
      const warnings = Array.isArray(result.warnings) ? result.warnings.map(record) : []
      return {
        title: 'បានសរសេរសេចក្តីព្រាងគេហទំព័រ',
        details: [
          `ចំណងជើង: ${String(result.headline ?? '')}`,
          ...warnings.slice(0, 3).map((warning) => `ត្រូវពិនិត្យ: ${String(warning.issue ?? '')}`),
          'មិនទាន់ផ្សាយ។ ពិនិត្យនៅ គេហទំព័រហាង',
        ],
        failed: false,
      }
    }
    case 'create_product':
      return { title: `បានបន្ថែម ${String(result.added ?? '')}`, details: [], failed: false }
    case 'create_products_bulk': {
      const names = strings(result.names)
      return {
        title: `បានបន្ថែម ${toKhmerDigits(String(result.added ?? 0))} មុខ`,
        details: names.slice(0, 6),
        failed: false,
      }
    }
    case 'update_product': {
      const changes = record(result.changes)
      return {
        title: `បានកែ ${String(result.name ?? '')}`,
        details: Object.entries(changes).map(([field, value]) => `${CHANGE_LABEL[field] ?? field}: ${toKhmerDigits(String(value))}`),
        failed: false,
      }
    }
    case 'search_catalogue': {
      const items = Array.isArray(result.items) ? result.items.map(record) : []
      return {
        title: `រកឃើញ ${toKhmerDigits(String(result.found ?? 0))} មុខ`,
        details: items.slice(0, 5).map((item) => `${String(item.name ?? '')} · ${toKhmerDigits(String(item.price ?? ''))}`),
        failed: false,
      }
    }
    case 'generate_product_photo':
      // A refusal is not a failure of Moni's, it is a fact about the plan, and
      // the owner can act on it. Show her sentence rather than a red row.
      if (result.refused) {
        return { title: 'មិនបានបង្កើតរូបភាពទេ', details: [String(result.message ?? '')], failed: false }
      }
      return { title: `បានបង្កើតរូបភាពសម្រាប់ ${String(result.drawn ?? '')}`, details: [], failed: false }
    case 'publish_shop_site':
      return {
        title: 'បានផ្សាយគេហទំព័រហាង',
        details: [String(result.address ?? result.path ?? '')].filter(Boolean),
        failed: false,
      }
    default:
      return { title: 'Moni បានពិនិត្យ និងធ្វើការងារ', details: [], failed: false }
  }
}

function wait(duration: number) {
  return new Promise((resolve) => window.setTimeout(resolve, duration))
}

/**
 * The shop is whoever is signed in. `/api/ask` resolves the tenant from the
 * Clerk session, so this component no longer names one: a component that can
 * name a tenant is a component that can be made to name the wrong one.
 *
 * It no longer asks her to pick a category either. `suggestions` arrives ranked
 * from `lib/agent/suggestions.ts`, which reads what the shop is missing, so the
 * judgement lives in one testable place and this file only prints it (CLAUDE.md
 * rule 9).
 */
export function AskMoni({ suggestions }: { suggestions: readonly AskSuggestion[] }) {
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const [text, setText] = useState('')
  const [lastCommand, setLastCommand] = useState('')
  const [state, setState] = useState<WorkState>('idle')
  const [steps, setSteps] = useState<OwnerStep[]>([])
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')
  /**
   * The ONE thing that waits for her. Every other tool has already run by the
   * time its row appears, which is the point of one prompt: she types and it
   * happens. `describe_shop` comes back as a proposal instead, so the shop's
   * whole profile, its hours and its catalogue are never rewritten from one
   * sentence without her seeing what the sentence was read as first.
   */
  const [proposal, setProposal] = useState<ShopProposal | null>(null)
  const [savingShop, setSavingShop] = useState(false)

  const busy = state === 'working' || state === 'steps' || savingShop
  const empty = text.trim().length === 0
  const firstSuggestion = suggestions[0]?.text ?? ''
  const traceSteps: OwnerToolTraceStep[] = steps.map((step, index) => ({
    id: `${index}-${step.title}`,
    label: step.title,
    details: step.details,
    state: step.failed ? 'error' : 'complete',
  }))
  const traceFailed = steps.some((step) => step.failed)
  const traceStatus: OwnerToolTraceStatus = state === 'receipt'
    ? traceFailed ? 'error' : 'complete'
    : 'working'

  async function send(command = text) {
    const trimmed = command.trim()
    if (!trimmed || busy) return

    setText(trimmed)
    setLastCommand(trimmed)
    setSteps([])
    setSummary('')
    setError('')
    setProposal(null)
    setState('working')

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      })
      const body = await response.json()
      if (!response.ok || body.error) throw new Error(body.error ?? 'request failed')

      const returned = Array.isArray(body.steps) ? (body.steps as ApiStep[]) : []
      const ownerSteps = returned.map(ownerStep)
      const failed = ownerSteps.some((step) => step.failed)
      const bookingCode = ownerSteps.find((step) => step.bookingCode)?.bookingCode
      const receiptSummary = typeof body.text === 'string' && body.text.trim()
        ? body.text.trim()
        : 'Moni បានបញ្ចប់ការងារនេះ។'

      const proposed = returned.find((step) => step.tool === 'describe_shop' && isShopProposal(step.result))
      setProposal(proposed && isShopProposal(proposed.result) ? proposed.result : null)

      setSteps(ownerSteps)
      setSummary(receiptSummary)
      setState('steps')
      await wait(reduceMotion ? 0 : 180)
      setState('receipt')

      const receipt: MoniReceiptEvent = {
        id: crypto.randomUUID(),
        command: trimmed,
        summary: receiptSummary,
        createdAt: new Date().toISOString(),
        status: failed ? 'failed' : 'success',
        ...(bookingCode ? { bookingCode } : {}),
      }
      window.dispatchEvent(new CustomEvent(RECEIPT_EVENT, { detail: receipt }))
      await wait(reduceMotion ? 0 : 220)
      startTransition(() => router.refresh())
    } catch {
      setError('ការតភ្ជាប់ដាច់ ហើយគ្មានអ្វីក្នុងហាងបានប្តូរទេ។ សូមសាកម្តងទៀត។')
      setState('error')
    }
  }

  /**
   * The approval, and the only one. It posts back exactly the body the tool
   * proposed, so the browser decides nothing about the shop: `/api/setup`
   * validates it with `SetupRequestSchema` and `persistSetup` writes it against
   * the businessId in the Clerk session, never one named here.
   */
  async function saveShop() {
    if (!proposal || !proposal.ready || savingShop) return
    setSavingShop(true)
    setError('')
    try {
      const response = await fetch('/api/setup', {
        // Bounded, like the setup screen's own save: a save that never returns
        // leaves her unable to tell whether her shop was written or not.
        signal: AbortSignal.timeout(35_000),
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(proposal.setup_request),
      })
      const body = await response.json()
      if (!response.ok || body.error) throw new Error(body.error ?? 'save failed')

      const saved = proposalCount(proposal.summary)
      setProposal(null)
      const receipt: MoniReceiptEvent = {
        id: crypto.randomUUID(),
        command: lastCommand,
        summary: `បានរក្សាទុកព័ត៌មានហាង · ${saved}`,
        createdAt: new Date().toISOString(),
        status: 'success',
      }
      window.dispatchEvent(new CustomEvent(RECEIPT_EVENT, { detail: receipt }))
      startTransition(() => router.refresh())
    } catch {
      setError('មិនអាចបញ្ជាក់ថាបានរក្សាទុកទេ។ សូមពិនិត្យអ៊ីនធឺណិត ហើយសាកម្តងទៀត។')
      setState('error')
    } finally {
      setSavingShop(false)
    }
  }

  return (
    <Panel id="moni" aria-labelledby="ask-moni-heading" aria-busy={busy} className="scroll-mt-4">
      <PanelHeader
        icon={Bot}
        titleId="ask-moni-heading"
        title="ប្រាប់ Moni ឱ្យធ្វើការ"
        note="សរសេរជាភាសាធម្មតា ដូចអ្នកប្រាប់បុគ្គលិក"
      />

      {suggestions.length > 0 ? (
        <PanelRows aria-label="សំណើពីហាងរបស់អ្នក" className="border-b border-hairline">
          {suggestions.map((suggestion) => {
            const Icon = SUGGESTION_ICON[suggestion.icon]
            return (
              <PanelRow key={suggestion.id}>
                <button
                  type="button"
                  onClick={() => setText(suggestion.text)}
                  disabled={busy}
                  className="km flex min-h-11 w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-rule transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:py-2"
                >
                  <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  <span className="min-w-0 flex-1">{suggestion.text}</span>
                  <ArrowUpRight className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                </button>
              </PanelRow>
            )
          })}
        </PanelRows>
      ) : null}

      <div className="p-2.5 sm:p-4">
        <AgentPromptBar
          value={text}
          onChange={setText}
          onSubmit={() => (empty ? setText(firstSuggestion) : void send())}
          disabled={busy}
          placeholder="ឧ. ថ្ងៃនេះមានអ្វីខ្លះ…"
          submitLabel={empty ? 'បំពេញឧទាហរណ៍' : 'ធ្វើការងារ'}
          ariaLabel="ប្រាប់ Moni ឱ្យធ្វើអ្វី"
          helper="Moni អានតម្លៃ និងម៉ោងពីហាងរបស់អ្នក វាមិនស្មានទេ"
          leading={
            /* The same composer the onboarding screen uses, down to the slot the
               microphone sits in: an owner who described her shop by voice must
               not find a box she can only type into on the next screen. */
            <VoiceNote
              disabled={busy}
              onTranscript={(spoken) =>
                setText((current) => (current.trim() ? `${current.trim()} ${spoken}` : spoken))
              }
            />
          }
          textareaClassName="border-0"
        />
      </div>

      <div aria-live="polite" aria-atomic="true">
        {state === 'error' ? (
          <Alert variant="inset">
            <TriangleAlert strokeWidth={2} aria-hidden />
            <AlertTitle>Moni មិនបានធ្វើការងារនេះទេ</AlertTitle>
            <AlertDescription>
              <p>{error}</p>
              <Button type="button" variant="ghost" onClick={() => void send(lastCommand)} className="km min-h-11 rounded-none px-0 font-semibold text-ink underline decoration-rule underline-offset-4">
                <RotateCcw data-icon="inline-start" aria-hidden />
                សាកម្តងទៀត
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      {state === 'working' || state === 'steps' || state === 'receipt' ? (
        <OwnerToolTrace
          status={traceStatus}
          steps={traceSteps}
          receipt={state === 'receipt' ? { command: lastCommand, summary } : undefined}
          labels={{ working: WORKING_LABEL }}
          defaultOpen
        />
      ) : null}

      {proposal ? (
        <AgentApprovalCard
          title="រក្សាទុកព័ត៌មានហាង"
          description="Moni នឹងឆ្លើយអតិថិជនតាមតម្លៃ និងម៉ោងទាំងនេះ។ ពិនិត្យមុនរក្សាទុក។"
          command={proposal.summary.shop_name ?? 'ព័ត៌មានហាងពីពិពណ៌នារបស់អ្នក'}
          details={[
            { label: 'ចំនួន', value: proposalCount(proposal.summary) },
            { label: 'រូបិយប័ណ្ណ', value: proposal.summary.currency },
            { label: 'ម៉ោងបើក', value: `${toKhmerDigits(proposal.summary.open_days)} ថ្ងៃ` },
            ...(proposal.blockers.length > 0
              ? [{
                  label: 'ត្រូវបំពេញ',
                  value: proposal.blockers.map((blocker) => PROPOSAL_BLOCKER[blocker]).join(' · '),
                }]
              : []),
            ...proposal.lines.slice(0, 4).map((line) => ({
              label: line.name,
              // `line.price` came through formatMoney, grouped in en-US. Only
              // the digits are transliterated, never a km-KH locale.
              value: line.unpriced ? 'មិនទាន់មានតម្លៃ' : toKhmerDigits(line.price),
            })),
          ]}
          cancelLabel="បោះបង់"
          confirmLabel={savingShop ? 'កំពុងរក្សាទុក' : 'រក្សាទុកព័ត៌មានហាង'}
          onCancel={() => setProposal(null)}
          onConfirm={() => void saveShop()}
          disabled={savingShop || !proposal.ready}
        />
      ) : null}
    </Panel>
  )
}

export { RECEIPT_EVENT }

/**
 * The first thing on the sheet, and the first thing she reads.
 *
 * This is a notice board, not a status dashboard. Every row is a whole sentence
 * about her shop, followed by the one place she can go about it. The judgement
 * of what belongs here lives in `lib/queries/signals.ts`; this file only prints
 * it (CLAUDE.md rule 9).
 *
 * Urgency is a shape before it is anything else: the alert triangle, the clock,
 * and the struck seal are three different silhouettes, so the board ranks itself
 * correctly in greyscale, in sunlight, and for anyone who cannot separate green
 * from grey. It also says the urgency in words, because no meaning on this
 * surface is carried by an icon alone.
 */
import {
  ArrowUpRight,
  BellRing,
  CalendarOff,
  CircleCheckBig,
  Clock3,
  Inbox,
  Radio,
  Tags,
  TriangleAlert,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Signal, SignalIcon, SignalTone } from '@/lib/queries/signals.ts'
import { Panel, PanelHeader, PanelRow, PanelRows } from './panel.tsx'

const SIGNAL_ICON: Record<SignalIcon, LucideIcon> = {
  inbox: Inbox,
  money: Wallet,
  clock: Clock3,
  channel: Radio,
  catalogue: Tags,
  closure: CalendarOff,
  quota: BellRing,
  clear: CircleCheckBig,
}

/** The word beside the glyph. Colour and shape both reinforce it; neither carries it. */
const TONE_LABEL: Record<SignalTone, string> = {
  act: 'ត្រូវធ្វើ',
  watch: 'ត្រូវដឹង',
  clear: 'រៀបរយ',
}

const TONE_MARK: Record<SignalTone, LucideIcon> = {
  act: TriangleAlert,
  watch: Clock3,
  clear: CircleCheckBig,
}

function SignalRow({ signal }: { signal: Signal }) {
  const Icon = SIGNAL_ICON[signal.icon]
  const Mark = TONE_MARK[signal.tone]
  const urgent = signal.tone === 'act'

  return (
    <PanelRow>
      <div className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1 px-3 py-3 sm:px-4">
        <Icon
          className={urgent ? 'mt-0.5 size-5 text-ink' : 'mt-0.5 size-5 text-rule'}
          strokeWidth={urgent ? 2 : 1.75}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="km flex flex-wrap items-baseline gap-x-2 text-base font-semibold text-ink">
            {signal.title}
            <span className="km inline-flex items-center gap-1 text-xs font-medium text-rule">
              <Mark className="size-3.5" strokeWidth={1.75} aria-hidden />
              {TONE_LABEL[signal.tone]}
            </span>
          </p>
          {signal.detail ? <p className="km mt-0.5 text-sm text-rule">{signal.detail}</p> : null}
          {signal.action ? (
            <a
              href={signal.action.href}
              className="km mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink underline decoration-rule underline-offset-4"
            >
              {signal.action.label}
              <ArrowUpRight className="size-4" strokeWidth={1.75} aria-hidden />
            </a>
          ) : null}
        </div>
      </div>
    </PanelRow>
  )
}

export function ShopSignals({ signals }: { signals: Signal[] }) {
  const urgent = signals.filter((signal) => signal.tone === 'act').length

  return (
    <Panel id="needs-now" aria-labelledby="signals-heading" className="scroll-mt-4">
      <PanelHeader
        icon={BellRing}
        titleId="signals-heading"
        title="ត្រូវពិនិត្យមុនគេ"
        note={urgent > 0 ? 'រឿងខាងក្រោមកំពុងរង់ចាំអ្នក' : 'Moni បានពិនិត្យហាងឱ្យអ្នករួចហើយ'}
        {...(urgent > 0 ? { count: urgent } : {})}
      />
      <PanelRows>
        {signals.map((signal) => (
          <SignalRow key={signal.id} signal={signal} />
        ))}
      </PanelRows>
    </Panel>
  )
}

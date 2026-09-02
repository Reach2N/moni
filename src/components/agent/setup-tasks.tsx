'use client'

/**
 * The setup spine. Forked from Beautiful UI's Task Rows
 * (src/components/primitives/TaskRows.tsx), which stays byte-identical because
 * the marketing page renders it and the homepage has a screenshot acceptance
 * target.
 *
 * The fork is two changes. First, the scripted TICKS timeline is gone and every
 * row's state arrives as a prop derived from the database. A row that says
 * Telegram is connected means a channel_connections row says so. That is the
 * whole difference between guidance and decoration.
 *
 * Second, the rows are one hairline-divided group rather than four floating
 * 22px pills with card shadows. docs/HOMEPAGE.md pins the card radius at 14px
 * and says in as many words not to turn every card into a pill; four shadowed
 * pills stacked above the composer were the loudest thing on the onboarding
 * screen and belonged to no other surface in the product. The radius comes from
 * --radius-card, so this reads square on the Invitation dashboard and 14px on
 * the Apple palette without a prop.
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
  detailLabel,
  className,
}: {
  steps: readonly SetupStep[]
  /** Khmer, for example 'សាកម្តងទៀត'. Passed in so no copy is hardcoded here. */
  retryLabel: string
  /** Khmer, names the disclosure action for screen readers, for example 'មើលកំហុស'. */
  detailLabel: string
  className?: string
}) {
  const [manualOpen, setManualOpen] = useState<Record<string, boolean>>({})

  const badgeFor = (step: SetupStep, index: number) => {
    if (step.state === 'done') return <Badge tone="green">{CheckIcon}</Badge>
    if (step.state === 'failed') return <Badge tone="red">{XIcon}</Badge>
    return <SpinnerRing>{index + 1}</SpinnerRing>
  }

  return (
    <div
      className={`w-full overflow-hidden rounded-[var(--radius-card)] border border-hairline${className ? ` ${className}` : ''}`}
    >
      {steps.map((step, i) => {
        const open = manualOpen[step.key] ?? false
        const expandable = step.state === 'failed' && step.error !== null
        return (
          <div
            key={step.key}
            className="border-t border-hairline transition-colors duration-300 first:border-t-0 hover:bg-inset"
            style={{ animation: `fade-up 450ms cubic-bezier(0.23,1,0.32,1) ${i * 80}ms both` }}
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
                  aria-label={`${detailLabel}: ${step.label}`}
                  aria-controls={`setup-detail-${step.key}`}
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
                id={`setup-detail-${step.key}`}
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

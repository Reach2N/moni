'use client'

import { memo, useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronRight,
  Circle,
  CircleAlert,
  CircleDashed,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx'
import { cn } from '@/lib/utils.ts'
import { toKhmerDigits } from './dashboard-format.ts'
import { Seal } from './seal.tsx'

/**
 * Adapted from the 21st.dev Agent Elements ToolGroup at commit
 * b04b36cb6381a1dd1a0e86cc7c90564ddcd56d37. The upstream controlled
 * disclosure and grouped-step structure are retained. Moni supplies strict
 * types, Khmer owner language, Radix, Lucide, and the Invitation visual world.
 * See CREDITS.md and THIRD_PARTY_NOTICES.md.
 */

export type OwnerToolTraceStatus =
  | 'working'
  | 'complete'
  | 'error'
  | 'interrupted'

export type OwnerToolTraceStepState =
  | 'waiting'
  | 'active'
  | 'complete'
  | 'error'

export type OwnerToolTraceStep = {
  id: string
  label: string
  details?: readonly string[]
  state: OwnerToolTraceStepState
}

export type OwnerToolTraceReceipt = {
  command: string
  summary: string
}

export type OwnerToolTraceLabels = {
  working: string
  complete: string
  error: string
  interrupted: string
  details: string
  receipt: string
}

export type OwnerToolTraceProps = {
  status: OwnerToolTraceStatus
  steps: readonly OwnerToolTraceStep[]
  receipt?: OwnerToolTraceReceipt
  labels?: Partial<OwnerToolTraceLabels>
  defaultOpen?: boolean
  className?: string
}

const DEFAULT_LABELS: OwnerToolTraceLabels = {
  working: 'Moni កំពុងធ្វើការងារ',
  complete: 'Moni បានបញ្ចប់ការងារ',
  error: 'Moni មិនអាចបញ្ចប់បាន',
  interrupted: 'Moni បានផ្អាកការងារ',
  details: 'មើលរបៀបដែល Moni ធ្វើ',
  receipt: 'បង្កាន់ដៃការងារ',
}

const STEP_STATE_LABEL: Record<OwnerToolTraceStepState, string> = {
  waiting: 'កំពុងរង់ចាំ',
  active: 'កំពុងធ្វើ',
  complete: 'បានបញ្ចប់',
  error: 'មិនបានបញ្ចប់',
}

function StepStateIcon({ state }: { state: OwnerToolTraceStepState }) {
  const props = {
    className: 'mt-1 size-4 shrink-0 text-rule',
    strokeWidth: 1.75,
    'aria-hidden': true,
  } as const

  if (state === 'complete') return <Check {...props} />
  if (state === 'error') return <CircleAlert {...props} />
  if (state === 'active') return <CircleDashed {...props} />
  return <Circle {...props} />
}

export const OwnerToolTrace = memo(function OwnerToolTrace({
  status,
  steps,
  receipt,
  labels,
  defaultOpen,
  className,
}: OwnerToolTraceProps) {
  const reduceMotion = useReducedMotion()
  const copy = { ...DEFAULT_LABELS, ...labels }
  const [open, setOpen] = useState(defaultOpen ?? status === 'working')
  const userToggledRef = useRef(false)
  const wasWorkingRef = useRef(status === 'working')
  const canExpand = steps.length > 0 || receipt !== undefined

  useEffect(() => {
    const wasWorking = wasWorkingRef.current

    if (status === 'working' && !wasWorking && !userToggledRef.current) {
      setOpen(true)
    }

    wasWorkingRef.current = status === 'working'
  }, [status])

  const statusLabel = copy[status]
  const stepCount = toKhmerDigits(steps.length)
  const detail = canExpand
    ? `${stepCount} ជំហាន · ${copy.details}`
    : copy.details

  const header = (
    <span className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left sm:px-4">
      <span className="flex size-8 shrink-0 items-center justify-center" aria-hidden>
        {status === 'complete' ? (
          <Check className="size-5 text-rule" strokeWidth={1.75} />
        ) : null}
        {status === 'working' ? (
          <CircleDashed className="size-5 text-rule" strokeWidth={1.75} />
        ) : null}
        {status === 'error' ? (
          <CircleAlert className="size-5 text-rule" strokeWidth={1.75} />
        ) : null}
        {status === 'interrupted' ? (
          <Circle className="size-5 text-rule" strokeWidth={1.75} />
        ) : null}
      </span>

      <span className="min-w-0 flex-1">
        <span className="km block text-sm font-semibold text-ink">{statusLabel}</span>
        <span className="km block truncate text-xs text-rule">{detail}</span>
      </span>

      {canExpand ? (
        <ChevronRight
          className="size-4 shrink-0 text-rule transition-transform duration-150 group-data-[state=open]:rotate-90"
          strokeWidth={1.75}
          aria-hidden
        />
      ) : null}
    </span>
  )

  if (!canExpand) {
    return (
      <div
        className={cn('border-t border-hairline', className)}
        role="status"
        aria-live="polite"
      >
        {header}
      </div>
    )
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={(nextOpen) => {
        userToggledRef.current = true
        setOpen(nextOpen)
      }}
      className={cn('border-t border-hairline', className)}
      aria-busy={status === 'working'}
    >
      <CollapsibleTrigger type="button" className="group w-full text-left">
        {header}
      </CollapsibleTrigger>

      <CollapsibleContent>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduceMotion ? 0 : 0.15,
            ease: [0.16, 1, 0.3, 1],
          }}
          aria-live="polite"
        >
          <ol className="border-t border-hairline">
            {steps.map((step, index) => (
              <motion.li
                key={step.id}
                aria-current={step.state === 'active' ? 'step' : undefined}
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: reduceMotion ? 0 : Math.min(index, 7) * 0.035,
                  duration: reduceMotion ? 0 : 0.15,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex items-start gap-2 border-b border-hairline px-3 py-2.5 sm:px-4"
              >
                <StepStateIcon state={step.state} />
                <span className="min-w-0 flex-1">
                  <span className="sr-only">{STEP_STATE_LABEL[step.state]}: </span>
                  <span className="km block text-sm font-semibold text-ink">
                    {step.label}
                  </span>
                  {step.details?.map((item, detailIndex) => (
                    <span
                      key={`${step.id}-${detailIndex}`}
                      className="km tnum mt-0.5 block text-xs text-rule"
                    >
                      {item}
                    </span>
                  ))}
                </span>
              </motion.li>
            ))}
          </ol>

          {receipt ? (
            <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 px-3 py-3 sm:px-4">
              <span className="flex size-10 items-center justify-center" aria-hidden>
                {status === 'complete' ? (
                  <Seal state="paid" pressed />
                ) : (
                  <CircleAlert className="size-6 text-rule" strokeWidth={1.75} />
                )}
              </span>
              <span className="min-w-0">
                <span className="km block text-xs font-semibold text-rule">
                  {copy.receipt}
                </span>
                <span className="km block text-sm font-semibold text-ink">
                  {receipt.command}
                </span>
                <span className="km mt-1 block whitespace-pre-wrap text-sm text-rule">
                  {receipt.summary}
                </span>
              </span>
            </div>
          ) : null}
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  )
})

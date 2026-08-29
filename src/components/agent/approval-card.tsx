'use client'

import { Check, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { cn } from '@/lib/utils.ts'

/**
 * Human-in-the-loop approval primitive.
 *
 * This follows Beautiful UI's Approval Card pattern: the agent states the
 * proposed action, the owner can see its scope, and the decision is explicit.
 * It is intentionally source-owned rather than pulled in as a runtime package,
 * which keeps the component compatible with Moni's shadcn primitives, Khmer
 * typography, and Invitation separator grammar.
 *
 * Source pattern: https://www.beautifului.dev/ (Approval Card, MIT)
 */
export type AgentApprovalDetail = {
  label: string
  value: string
}

export type AgentApprovalCardProps = {
  titleId?: string
  title: string
  description: string
  command: string
  details?: readonly AgentApprovalDetail[]
  statusLabel?: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  disabled?: boolean
  className?: string
}

export function AgentApprovalCard({
  titleId = 'agent-approval-title',
  title,
  description,
  command,
  details = [],
  statusLabel = 'មុនធ្វើការ',
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  disabled = false,
  className,
}: AgentApprovalCardProps) {
  return (
    <section
      data-slot="agent-approval-card"
      role="region"
      aria-live="polite"
      aria-labelledby={titleId}
      aria-describedby={`${titleId}-description`}
      className={cn('border-t border-hairline bg-paper', className)}
    >
      <header className="flex items-start gap-3 px-3 py-3 sm:px-4">
        <span
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center border border-seal/60 text-seal"
          aria-hidden
        >
          <ShieldCheck className="size-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="km text-sm font-semibold text-ink">
            {title}
          </h3>
          <p id={`${titleId}-description`} className="km mt-0.5 text-xs text-rule">{description}</p>
        </div>
        <span className="km shrink-0 border border-seal/60 px-2 py-0.5 text-xs font-semibold text-seal">
          {statusLabel}
        </span>
      </header>

      <div className="mx-3 border-y border-hairline py-3 sm:mx-4">
        <p className="km text-sm font-semibold text-ink">{command}</p>
        {details.length > 0 ? (
          <dl className="mt-2 grid gap-1 sm:grid-cols-2">
            {details.map((detail) => (
              <div key={detail.label} className="flex min-w-0 items-baseline gap-2 text-xs">
                <dt className="km shrink-0 text-rule">{detail.label}</dt>
                <dd className="km min-w-0 truncate font-semibold text-ink">{detail.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      <footer className="flex flex-col-reverse gap-2 px-3 py-3 sm:flex-row sm:justify-end sm:px-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={disabled}
          className="km min-h-11 rounded-none border-rule/70 bg-paper text-ink shadow-none"
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={disabled}
          className="km min-h-11 rounded-none"
        >
          <Check data-icon="inline-start" aria-hidden />
          {confirmLabel}
        </Button>
      </footer>
    </section>
  )
}

'use client'

import type { KeyboardEvent, ReactNode } from 'react'
import { ArrowUp, CornerDownLeft } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'
import { cn } from '@/lib/utils.ts'

/**
 * Source-owned prompt composer for Moni's owner and customer agents.
 *
 * The interaction model is adapted from 21st.dev Agent Elements' InputBar:
 * multiline drafting, keyboard send, a clear status/helper row, and a single
 * affordance for submission. It deliberately uses Moni's existing shadcn
 * Textarea/Button rather than importing Agent Elements' Base UI and Tabler
 * dependencies. Future voice, attachment, mode, and model controls belong in
 * `leading`/`trailing` slots so every agent surface keeps one composer grammar.
 *
 * Source pattern: https://agent-elements.21st.dev/docs/input-bar (MIT)
 */
export type AgentPromptBarProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder: string
  submitLabel: string
  ariaLabel: string
  helper?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
  disabled?: boolean
  submitDisabled?: boolean
  /** Optional class override for the action button when the composer sits on a themed surface. */
  submitClassName?: string
  rows?: number
  className?: string
  textareaClassName?: string
}

export function AgentPromptBar({
  id,
  value,
  onChange,
  onSubmit,
  placeholder,
  submitLabel,
  ariaLabel,
  helper,
  leading,
  trailing,
  disabled = false,
  submitDisabled = false,
  submitClassName,
  rows = 1,
  className,
  textareaClassName,
}: AgentPromptBarProps) {
  const inputId = id ?? `${ariaLabel.replace(/\s+/g, '-').toLowerCase()}-input`

  function submit() {
    if (disabled || submitDisabled) return
    onSubmit()
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form
      data-slot="agent-prompt-bar"
      className={cn('border border-rule/70 bg-paper', className)}
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div className="flex items-start gap-2 px-2.5 pt-2.5 sm:px-4 sm:pt-4">
        {leading ? <div className="shrink-0 pt-2">{leading}</div> : null}
        <label htmlFor={inputId} className="sr-only">
          {ariaLabel}
        </label>
        <Textarea
          id={inputId}
          name="agent-prompt"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          rows={rows}
          placeholder={placeholder}
          className={cn(
            'km min-h-14 flex-1 resize-none rounded-none border-0 bg-transparent px-1 py-1 text-base text-ink shadow-none ring-0 placeholder:text-rule focus-visible:ring-0 sm:min-h-16 md:text-base',
            textareaClassName,
          )}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 pb-2.5 pt-2 sm:px-4 sm:pb-4">
        <div className="flex min-w-0 items-center gap-2">
          {helper ? <div className="km min-w-0 text-xs text-rule">{helper}</div> : null}
          {trailing}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="km hidden items-center gap-1 text-[11px] text-rule sm:inline-flex" aria-hidden>
            <CornerDownLeft className="size-3" strokeWidth={1.75} />
            ⌘↵
          </span>
          <Button
            type="submit"
            disabled={disabled || submitDisabled}
            className={cn('km min-h-11 rounded-none', submitClassName)}
            aria-label={submitLabel}
          >
            <ArrowUp data-icon="inline-start" aria-hidden />
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  )
}

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

'use client'

/**
 * The claim the whole page rests on, shown rather than described: a customer
 * writes, and Moni answers from the shop's real data.
 *
 * The thread alone would only prove that something replied. What makes it read
 * as an agent is the run of work beside it: read the price list, check the
 * calendar, hold the slot, send a KHQR. Those are the actual tool calls in
 * CUSTOMER_TOOLS, in the order the agent takes them, which is why this is the
 * hero visual instead of a screenshot of a dashboard.
 *
 * The typing indicator is the one thing here that is NOT content. It is hidden
 * at rest and only exists inside the timeline, so a reader with reduced motion,
 * a crawler, and a screenshot all land on the finished exchange rather than on
 * a shop that is permanently about to answer.
 */

import { useRef } from 'react'
import {
  IconAgentReply,
  IconCheck,
  IconClock,
  IconMessage,
  IconQr,
  IconRiel,
  IconSlot,
} from '@/components/marketing/icons.tsx'
import { useScrollScene } from '@/lib/motion/gsap.ts'
import type { Copy } from '@/lib/marketing/copy.ts'

const TRACE_ICONS = [IconRiel, IconClock, IconSlot, IconQr] as const

export function AgentConversation({ copy }: { copy: Copy }) {
  const root = useRef<HTMLDivElement>(null)

  useScrollScene(root, ({ scope, motion, gsap }) => {
    if (!motion) return

    const timeline = gsap.timeline({
      defaults: { ease: 'power3.out' },
      scrollTrigger: { trigger: scope, start: 'top 78%', once: true },
    })

    timeline
      .from('[data-msg="in"]', { y: 14, opacity: 0, duration: 0.5 })
      .to('[data-typing]', { opacity: 1, duration: 0.2 }, '+=0.15')
      .to('[data-typing]', { opacity: 0, duration: 0.2 }, '+=0.7')
      .from('[data-msg="out"]', { y: 14, opacity: 0, duration: 0.5 }, '-=0.1')
      // The trace ticks through after the reply lands, so the order on screen
      // is the order of events: answer first, receipts for it second.
      .from('[data-trace-item]', { x: -10, opacity: 0, duration: 0.4, stagger: 0.12 }, '-=0.25')
  })

  return (
    <div
      ref={root}
      className="mx-auto grid max-w-5xl gap-px overflow-hidden rounded-[var(--radius-stage)] border border-separator bg-separator shadow-[var(--shadow-float)] lg:grid-cols-[1.15fr_0.85fr]"
    >
      {/* The conversation */}
      <div className="bg-surface p-5 sm:p-7">
        <div className="flex items-center gap-3 border-b border-separator pb-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green/12 text-green">
            <IconMessage className="size-4.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-label">{copy.channels.now}</p>
            <p className="truncate text-xs text-label-3">{copy.demo.example}</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div data-msg="in" className="flex justify-start">
            <p className="max-w-[85%] rounded-[18px] rounded-bl-[6px] bg-surface-2 px-4 py-2.5 text-[15px] text-pretty text-label">
              {copy.proof.customerMessage}
            </p>
          </div>

          {/* The typing bubble sits ON the reply's position, not above it.
              In flow it reserved a row of height that nothing ever filled at
              rest, so the finished thread had an unexplained gap between the
              question and the answer. Absolute keeps it out of layout entirely
              and the reply rises straight into the space it vacates. */}
          <div className="relative flex justify-end">
            <span
              data-typing
              className="absolute right-0 top-0 flex items-center gap-1.5 rounded-[18px] rounded-br-[6px] bg-green/15 px-4 py-3.5 opacity-0"
              aria-hidden
            >
              <span className="size-1.5 rounded-full bg-green" />
              <span className="size-1.5 rounded-full bg-green/70" />
              <span className="size-1.5 rounded-full bg-green/40" />
            </span>
            <p
              data-msg="out"
              className="max-w-[85%] rounded-[18px] rounded-br-[6px] bg-green px-4 py-2.5 text-[15px] text-pretty text-on-green"
            >
              {copy.proof.assistantMessage}
            </p>
          </div>
        </div>

        <p className="mt-5 flex items-start gap-2 border-t border-separator pt-4 text-xs text-label-2">
          <IconAgentReply className="mt-0.5 size-3.5 shrink-0 text-label-3" />
          <span className="min-w-0">{copy.agent.replyNote}</span>
        </p>
      </div>

      {/* What it did to get there */}
      <div className="bg-surface-2 p-5 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-label-3">
          {copy.agent.traceLabel}
        </p>

        <ol className="mt-4 space-y-3.5">
          {copy.agent.trace.map((step, index) => {
            const Icon = TRACE_ICONS[index] ?? IconCheck
            return (
              <li key={step} data-trace-item className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-separator bg-surface text-label-2">
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 pt-1 text-[14px] text-pretty text-label">{step}</span>
                <IconCheck className="ml-auto mt-1.5 size-3.5 shrink-0 text-green" />
              </li>
            )
          })}
        </ol>

        <div className="mt-6 flex items-center gap-3 rounded-[var(--radius-well)] border border-separator bg-surface px-4 py-3">
          <IconSlot className="size-4 shrink-0 text-green" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-label">{copy.proof.bookingValue}</p>
            <p className="truncate text-xs text-label-3">{copy.proof.bookingStatus}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

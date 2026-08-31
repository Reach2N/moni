'use client'

/**
 * The source-owned task grammar is also the clearest way to explain setup:
 * describe the shop, check what Moni made, then let it answer. Reusing the
 * same Beautiful UI rows as the hero keeps the page coherent and removes the
 * old receipt and fake-interface stack from this section.
 */

import TaskRows, { type TaskRow } from '@/components/primitives/TaskRows.tsx'
import { Reveal } from '@/components/motion/reveal.tsx'
import type { Copy } from '@/lib/marketing/copy.ts'

export function HowSequence({ copy }: { copy: Copy }) {
  const rows: TaskRow[] = copy.steps.items.map((item, index) => ({
    key: `setup-step-${index}`,
    label: item.title,
    amount: item.panel,
    status: 'done',
    details: [
      { label: item.panel, meta: copy.demo.example },
      { label: copy.agent.traceLabel, meta: item.body },
    ],
  }))

  return (
    <section id="how" className="scroll-mt-20 border-b border-separator" aria-labelledby="how-heading">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.82fr_1.18fr] lg:items-start lg:gap-20">
        <Reveal className="max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-label-2">
            {copy.steps.eyebrow}
          </p>
          <h2
            id="how-heading"
            className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-balance text-label sm:text-5xl"
          >
            {copy.steps.title}
          </h2>
          <p className="mt-5 text-lg text-pretty text-label-2">{copy.steps.body}</p>
        </Reveal>

        <Reveal y={18} delay={0.06} className="min-w-0">
          <TaskRows
            variant="List"
            rows={rows}
            labels={{ completed: copy.proof.bookingStatus, failed: copy.proof.handoff }}
            className="max-w-none"
          />
        </Reveal>
      </div>
    </section>
  )
}

'use client'

/**
 * The opening statement. Apple-native, per PLAN.md section 3: generous
 * whitespace, pill actions, quiet type, nothing decorative behind it.
 *
 * The hero deliberately carries no illustration of its own. The thing worth
 * looking at is the agent answering a customer, and that lands immediately
 * below in AgentConversation, so putting a second visual here would only
 * compete with it.
 */

import { useRef } from 'react'
import { IconCheck } from '@/components/marketing/icons.tsx'
import { useScrollScene } from '@/lib/motion/gsap.ts'
import type { Copy } from '@/lib/marketing/copy.ts'

export function Hero({ copy }: { copy: Copy }) {
  const root = useRef<HTMLElement>(null)

  useScrollScene(root, ({ motion, gsap }) => {
    if (!motion) return
    gsap
      .timeline({ defaults: { ease: 'power3.out' } })
      .from('[data-hero-headline]', { yPercent: 104, duration: 0.95 })
      .from('[data-hero-rise]', { y: 16, opacity: 0, duration: 0.7, stagger: 0.08 }, '-=0.6')
  })

  return (
    <section ref={root} className="bg-surface" aria-labelledby="hero-heading">
      <div className="mx-auto max-w-5xl px-5 pb-12 pt-16 sm:px-8 sm:pb-16 sm:pt-24">
        <p
          data-hero-rise
          className="inline-flex items-center gap-2 rounded-full border border-separator bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-label-2"
        >
          <span className="size-1.5 rounded-full bg-green" aria-hidden />
          {copy.hero.eyebrow}
        </p>

        <div className="mt-7 overflow-hidden pb-[0.14em]">
          <h1
            data-hero-headline
            id="hero-heading"
            className="max-w-[16ch] text-[2.5rem] font-semibold tracking-[-0.04em] text-balance text-label sm:text-6xl lg:text-7xl"
          >
            {copy.hero.headline}
          </h1>
        </div>

        <p data-hero-rise className="mt-6 max-w-2xl text-lg text-pretty text-label-2 sm:text-xl">
          {copy.hero.sub}
        </p>

        <div data-hero-rise className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="#apply"
            className="inline-flex min-h-12 items-center rounded-full bg-label px-6 text-[15px] font-semibold text-surface transition-transform duration-200 ease-[var(--ease-settle)] hover:-translate-y-0.5 active:scale-[0.98]"
          >
            {copy.hero.cta}
          </a>
          <a
            href="#how"
            className="inline-flex min-h-12 items-center rounded-full border border-separator bg-surface px-6 text-[15px] font-semibold text-label transition-colors hover:bg-surface-2"
          >
            {copy.hero.secondary}
          </a>
        </div>

        <ul data-hero-rise className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2">
          {copy.hero.trust.map((item) => (
            <li key={item} className="inline-flex items-center gap-2 text-[15px] text-label-2">
              <IconCheck className="size-4 shrink-0 text-green" />
              {item}
            </li>
          ))}
        </ul>

        <p data-hero-rise className="mt-6 max-w-md text-sm text-label-3">
          {copy.hero.reassure}
        </p>
      </div>
    </section>
  )
}

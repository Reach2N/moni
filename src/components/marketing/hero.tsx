'use client'

/**
 * The opening statement. Left aligned, set large, on white.
 *
 * What this deliberately is NOT: a centred column with a pill badge over a
 * gradient-and-grid background. That arrangement is the house style of generated
 * landing pages, and the first pass of this page was exactly it. The shop's own
 * printed matter carries the visual weight instead, so the hero itself is only
 * type and one rule.
 */

import { useRef } from 'react'
import { useScrollScene } from '@/lib/motion/gsap.ts'
import { IconCheck } from '@/components/marketing/icons.tsx'
import type { Copy } from '@/lib/marketing/copy.ts'

export function Hero({ copy }: { copy: Copy }) {
  const root = useRef<HTMLElement>(null)

  useScrollScene(root, ({ motion, gsap }) => {
    if (!motion) return

    gsap
      .timeline({ defaults: { ease: 'power3.out' } })
      // The rule draws itself before anything is said, like ruling a page.
      .from('[data-hero-rule]', { scaleX: 0, transformOrigin: 'left center', duration: 0.9 })
      .from('[data-hero-headline]', { yPercent: 106, duration: 1 }, '-=0.62')
      .from('[data-hero-rise]', { y: 18, opacity: 0, duration: 0.7, stagger: 0.08 }, '-=0.68')
  })

  return (
    <section ref={root} className="bg-surface" aria-labelledby="hero-heading">
      <div className="mx-auto max-w-6xl px-5 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16">
        <p
          data-hero-rise
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-label-2"
        >
          {copy.hero.eyebrow}
        </p>
        <div data-hero-rule className="mt-4 h-px w-full bg-label/20" />

        <div className="mt-8 overflow-hidden pb-[0.14em] sm:mt-10">
          <h1
            data-hero-headline
            id="hero-heading"
            className="max-w-[17ch] text-[2.5rem] font-semibold tracking-[-0.04em] text-label sm:text-6xl lg:text-7xl"
          >
            {copy.hero.headline}
          </h1>
        </div>

        <div className="mt-8 grid gap-8 sm:mt-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16">
          <p data-hero-rise className="max-w-xl text-lg text-pretty text-label-2 sm:text-xl">
            {copy.hero.sub}
          </p>

          <ul data-hero-rise className="divide-y divide-label/10 border-y border-label/15">
            {copy.hero.trust.map((item) => (
              <li key={item} className="flex items-start gap-3 py-2.5 text-[15px] text-label-2">
                <IconCheck className="mt-1 size-3.5 shrink-0 text-green" />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div data-hero-rise className="mt-9 flex flex-wrap items-center gap-3">
          <a
            href="#apply"
            className="inline-flex min-h-12 items-center bg-label px-6 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.99]"
          >
            {copy.hero.cta}
          </a>
          <a
            href="#how"
            className="inline-flex min-h-12 items-center border border-label/20 px-6 text-sm font-semibold text-label transition-colors hover:bg-surface-2"
          >
            {copy.hero.secondary}
          </a>
        </div>
        <p data-hero-rise className="mt-5 max-w-md text-sm text-label-2">
          {copy.hero.reassure}
        </p>
      </div>
    </section>
  )
}

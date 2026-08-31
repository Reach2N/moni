'use client'

/**
 * The opening statement and the one job a shop owner needs help with: keeping
 * up with customers while the work of the shop continues. The quiet edge
 * objects are familiar shop signals, not product chrome. They drift away as
 * the section leaves the viewport, while the agent conversation stays put.
 */

import { useRef } from 'react'
import Image from 'next/image'
import { AgentConversation } from '@/components/marketing/agent-conversation.tsx'
import { IconCheck } from '@/components/marketing/icons.tsx'
import { useScrollScene } from '@/lib/motion/gsap.ts'
import type { Copy } from '@/lib/marketing/copy.ts'

/* One tile per object. The collage used to run eight tiles off six assets, so
   the apple sat top-left AND bottom-right and the receipt sat right-middle AND
   bottom-left: at a glance the hero read as the same two photographs pasted
   twice rather than as a shop's worth of different work. Three left/right pairs
   of distinct objects is the composition. Do not repeat a src to fill a corner;
   add an asset. */
const BUSINESS_MOTIFS = [
  { src: '/images/marketing/apple-cutout.png', place: 'left-[-20%] top-[4%] sm:left-[5%] sm:top-[8%]', x: -190, y: -100, rotate: -18, className: 'h-36 w-36 sm:h-44 sm:w-44' },
  { src: '/images/marketing/coffee-cup-cutout.png', place: 'right-[-27%] top-[4%] sm:right-[3%] sm:top-[5%]', x: 190, y: -110, rotate: 16, className: 'h-36 w-48 sm:h-44 sm:w-60' },
  { src: '/images/marketing/paint-roller-cutout.png', place: 'left-[-24%] top-[37%] sm:left-[1%] sm:top-[38%]', x: -220, y: 12, rotate: -22, className: 'h-44 w-52 sm:h-52 sm:w-64' },
  { src: '/images/marketing/receipt-cutout.png', place: 'right-[-22%] top-[32%] sm:right-[1%] sm:top-[33%]', x: 220, y: 4, rotate: 18, className: 'h-56 w-40 sm:h-72 sm:w-48' },
  { src: '/images/marketing/payment-terminal-cutout.png', place: 'left-[-24%] top-[61%] sm:left-[3%] sm:top-[59%]', x: -200, y: 40, rotate: -14, className: 'h-44 w-52 sm:h-52 sm:w-64' },
  { src: '/images/payment/khqr-wordmark.webp', place: 'right-[-15%] top-[63%] sm:right-[5%] sm:top-[62%]', x: 200, y: 44, rotate: 14, className: 'h-24 w-40 sm:h-28 sm:w-48' },
] as const

export function Hero({ copy }: { copy: Copy }) {
  const root = useRef<HTMLElement>(null)

  useScrollScene(root, ({ scope, motion, gsap }) => {
    if (!motion) return

    /* fromTo, not from. The hero is the one section that is always inside the
       viewport when this scene is built, so a `from` tween wrote its start
       values onto copy the visitor had been reading for half a second: measured
       30 August, the hero painted complete at 25ms and was snapped back at
       638ms. The start state now ships in CSS under data-enter, before first
       paint, and these tweens only describe the journey out of it. Read from
       the same values in the scroll entrances block of globals.css. */
    gsap
      .timeline({ defaults: { ease: 'power3.out' } })
      /* y: 0 is stated on both ends and it is not redundant. GSAP splits a
         transform into independent components and reads whatever it does not
         find in the vars from the computed matrix, so the CSS translateY(104%)
         came back as a base y of 262px and yPercent: 104 stacked on top of it:
         the headline started a full 524px down and settled at 262, halfway out
         of its own mask. Naming both components pins the whole transform. */
      .fromTo(
        '[data-hero-headline]',
        { yPercent: 104, y: 0 },
        { yPercent: 0, y: 0, duration: 0.95 },
      )
      .fromTo(
        '[data-hero-rise]',
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, stagger: 0.08 },
        '-=0.6',
      )

    /* The objects tell the same story as the copy. They start as the scattered
       jobs around a shop, collect around the message in the middle, then move
       beyond the frame as the visitor continues down the page. The blur only
       belongs to the peripheral objects, so the conversation remains crisp. */
    const stage = scope.querySelector<HTMLElement>('[data-hero-stage]') ?? scope
    const motifs = stage.querySelectorAll<HTMLElement>('[data-business-motif]')
    const motifScene = gsap.timeline({
      scrollTrigger: {
        trigger: stage,
        start: 'top top+=100',
        end: 'bottom top',
        scrub: 1,
      },
    })
    motifs.forEach((motif) => {
      const x = Number(motif.dataset.x ?? 0)
      const y = Number(motif.dataset.y ?? 0)
      const rotate = Number(motif.dataset.rotate ?? 0)
      motifScene
        .to(motif, { x: 0, y: 0, rotate: 0, scale: 0.92, opacity: 0.34, filter: 'blur(0px)', duration: 0.35 }, 0.08)
        .to(motif, { x: x * 2.15, y: y * 2.15, rotate: rotate * 1.55, scale: 1.68, opacity: 0.035, filter: 'blur(10px)', duration: 0.65 }, 0.42)
    })

    /* The long Khmer explanation is deliberately not an instant wall of copy.
       It enters as the first viewport gives way to the agent conversation. The
       reduced-motion branch skips this setup, leaving the text fully readable. */
    const description = scope.querySelector<HTMLElement>('[data-hero-description]')
    if (description) {
      /* The hidden start is declared in CSS, not set here. gsap.set() ran at
         hydration and made an already painted paragraph disappear, which read
         as the page breaking rather than as a paragraph waiting its turn. */
      gsap.fromTo(
        description,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: stage,
            start: 'top+=280 top',
            end: 'top+=900 top',
            scrub: 0.8,
          },
        },
      )
    }
  })

  return (
    <section ref={root} className="relative overflow-clip bg-surface" aria-labelledby="hero-heading">
      <div data-hero-stage className="relative h-[155svh] min-h-[58rem] sm:h-[165svh]">
        <div className="sticky top-16 h-[calc(100svh-4rem)] min-h-[40rem] overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {BUSINESS_MOTIFS.map(({ src, place, x, y, rotate, className }, index) => (
              <Image
                key={index}
                src={src}
                alt=""
                aria-hidden="true"
                width={320}
                height={320}
                sizes="(max-width: 639px) 176px, 256px"
                data-business-motif
                data-x={x}
                data-y={y}
                data-rotate={rotate}
                className={`absolute ${place} ${className} object-contain opacity-30 drop-shadow-[0_18px_32px_rgba(0,0,0,0.14)] blur-[0.5px]`}
              />
            ))}
          </div>

          {/* A white radial wash preserves the copy while the shop objects stay
              at the frame edges. It is a readability mask, not a backdrop. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_43%,rgba(255,255,255,0.88)_62%,rgba(255,255,255,0.22)_86%,rgba(255,255,255,0)_100%)]"
          />

          <div className="relative mx-auto flex h-full max-w-6xl items-center px-5 py-8 sm:px-8">
            <div className="mx-auto max-w-4xl text-center">
          <div className="overflow-hidden pb-[0.14em]">
            <h1
              data-hero-headline
              data-enter="mask"
              id="hero-heading"
              className="mx-auto text-[clamp(1.95rem,8vw,4.5rem)] font-semibold tracking-[-0.045em] text-label"
            >
              {copy.hero.headline.map((line) => (
                <span key={line} className="block whitespace-nowrap">
                  {line}
                </span>
              ))}
            </h1>
          </div>

          <p data-hero-description data-enter="fade" className="mx-auto mt-6 max-w-2xl text-lg text-pretty text-label-2 sm:text-xl">
            {copy.hero.sub}
          </p>

          <div data-hero-rise data-enter="fade" className="mt-8 flex flex-wrap items-center justify-center gap-3">
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

          <ul data-hero-rise data-enter="fade" className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {copy.hero.trust.map((item) => (
              <li key={item} className="inline-flex items-center gap-2 text-[15px] text-label-2">
                <IconCheck className="size-4 shrink-0 text-green" />
                {item}
              </li>
            ))}
          </ul>

          <p data-hero-rise data-enter="fade" className="mx-auto mt-6 max-w-md text-sm text-label-3">
            {copy.hero.reassure}
          </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="min-w-0">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold text-label-3">
              {copy.agent.eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-balance text-label sm:text-4xl">
              {copy.agent.title}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] text-pretty text-label-2">
              {copy.agent.body}
            </p>
          </div>
          <div className="mt-8">
            <AgentConversation copy={copy} />
          </div>
        </div>
      </div>
    </section>
  )
}

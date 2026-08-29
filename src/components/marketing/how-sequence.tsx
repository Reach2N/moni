'use client'

/**
 * The three steps, told as a sequence rather than three cards in a row.
 *
 * On a wide screen the panel column sticks while the steps scroll past it, and
 * each step crossfades the panel to the state it describes. On a narrow screen
 * the panels simply stack under the steps in normal flow.
 *
 * The sticking is CSS `position: sticky`, NOT ScrollTrigger's pin. A pin works
 * by transplanting the element into a generated wrapper and translating it,
 * which is the single most fragile thing in ScrollTrigger inside React: it
 * fights scroll restoration, it re-measures wrongly when a webfont lands, and
 * it needs the pin spacer to agree with a sticky site header. Sticky needs none
 * of that and cannot desynchronise, so GSAP is left doing the one job it is
 * actually needed for here: deciding which panel is showing.
 *
 * The no-JavaScript and reduced-motion state is the first panel, set in CSS
 * (`lg:opacity-0` on the rest). Nothing here renders blank if the script never
 * runs.
 */

import { useRef } from 'react'
import { PriceList, Sheet, SheetHead } from '@/components/marketing/artifacts.tsx'
import { IconMessage, IconRiel, IconVoice } from '@/components/marketing/icons.tsx'
import { useScrollScene } from '@/lib/motion/gsap.ts'
import { durationKm, moneyKm } from '@/lib/format/khmer.ts'
import type { Copy, Locale } from '@/lib/marketing/copy.ts'
import { SERVICE_TEMPLATES, formatMoney } from '@/lib/types.ts'

const ROWS = (SERVICE_TEMPLATES.salon ?? []).slice(0, 3)

export function HowSequence({ copy, locale }: { copy: Copy; locale: Locale }) {
  const root = useRef<HTMLElement>(null)

  useScrollScene(root, ({ scope, motion, gsap }) => {
    const panels = Array.from(scope.querySelectorAll<HTMLElement>('[data-panel]'))
    const steps = Array.from(scope.querySelectorAll<HTMLElement>('[data-step]'))
    if (panels.length === 0 || steps.length !== panels.length) return

    // Reduced motion keeps the CSS state: first panel visible, no swapping.
    if (!motion) return

    /* 0.55, not the 0.4 this started at. The inactive steps stay readable: a
       reader who scrolls faster than the trigger, or who lands mid-section from
       an anchor, must still be able to read the step they are looking at. The
       panel swap is what carries the sequence; the dimming only supports it. */
    const show = (index: number) => {
      panels.forEach((panel, i) => {
        gsap.to(panel, { opacity: i === index ? 1 : 0, duration: 0.35, ease: 'power2.out', overwrite: 'auto' })
      })
      steps.forEach((step, i) => {
        gsap.to(step, { opacity: i === index ? 1 : 0.55, duration: 0.35, ease: 'power2.out', overwrite: 'auto' })
      })
    }

    // Only the wide layout has a sticky column to crossfade against. Below it
    // the panels are in flow and all of them are already visible.
    const media = window.matchMedia('(min-width: 1024px)')
    if (!media.matches) return

    show(0)
    steps.forEach((step, index) => {
      gsap.timeline({
        scrollTrigger: {
          trigger: step,
          start: 'top 60%',
          end: 'bottom 60%',
          onEnter: () => show(index),
          onEnterBack: () => show(index),
        },
      })
    })
  })

  const price = (minor: number) => (locale === 'km' ? moneyKm(minor, 'KHR') : formatMoney(minor, 'KHR'))
  const time = (minutes: number) => (locale === 'km' ? durationKm(minutes) : `${minutes} min`)

  /* Each panel is one of the shop's own sheets, not a UI screenshot. */
  const panels = [
    <Sheet key="said" className="h-full border-0">
      <SheetHead title={copy.steps.items[0].panel} mark={<IconVoice className="size-4" />} />
      <div className="flex h-full flex-col justify-center gap-4 p-6 sm:p-8">
        <p className="text-xl font-medium text-pretty text-label sm:text-2xl">{copy.demo.typed}</p>
        <p className="text-sm text-label-3">{copy.demo.privateNote}</p>
      </div>
    </Sheet>,

    <PriceList
      key="made"
      className="h-full border-0"
      title={copy.steps.items[1].panel}
      note={copy.demo.tableHead[1]}
      mark={<IconRiel className="size-4" />}
      rows={ROWS.map((row) => ({
        name: locale === 'km' ? row.name : row.name_en,
        price: price(row.price_minor),
        meta: time(row.duration_min),
      }))}
    />,

    /* A printed transcript, ruled by speaker. Not chat bubbles: a bubble is a
       picture of someone else's app, and this is meant to read as the shop's
       own record of what was agreed. */
    <Sheet key="answers" className="h-full border-0">
      <SheetHead title={copy.steps.items[2].panel} mark={<IconMessage className="size-4" />} />
      <dl className="divide-y divide-label/10">
        <div className="px-4 py-4 sm:px-5">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label-3">
            {copy.proof.customerLabel}
          </dt>
          <dd className="mt-1.5 text-[15px] text-pretty text-label">{copy.proof.customerMessage}</dd>
        </div>
        <div className="border-l-2 border-green px-4 py-4 sm:px-5">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label-3">
            {copy.proof.assistantLabel}
          </dt>
          <dd className="mt-1.5 text-[15px] text-pretty text-label">{copy.proof.assistantMessage}</dd>
        </div>
      </dl>
      <p className="border-t border-label/15 px-4 py-3 text-xs text-label-3 sm:px-5">{copy.proof.handoffBody}</p>
    </Sheet>,
  ]

  return (
    <section ref={root} id="how" className="scroll-mt-16 border-b border-separator" aria-labelledby="how-heading">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-label-2">{copy.steps.eyebrow}</p>
          <h2
            id="how-heading"
            className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-balance text-label sm:text-5xl"
          >
            {copy.steps.title}
          </h2>
          <p className="mt-5 text-lg text-pretty text-label-2">{copy.steps.body}</p>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <ol className="lg:py-[5vh]">
            {copy.steps.items.map((item, index) => (
              <li
                key={item.title}
                data-step
                className="border-b border-separator py-8 last:border-b-0 lg:flex lg:min-h-[23vh] lg:flex-col lg:justify-center lg:py-12"
              >
                <span className="tnum text-sm font-semibold text-label-3">0{index + 1}</span>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-label sm:text-2xl">{item.title}</h3>
                <p className="mt-3 max-w-md text-[15px] text-pretty text-label-2">{item.body}</p>

                {/* The narrow-screen panel: in flow, directly under its step. */}
                <div className="mt-6 border border-label/15 bg-surface lg:hidden">
                  {panels[index]}
                </div>
              </li>
            ))}
          </ol>

          <div className="hidden lg:block">
            <div className="sticky top-28">
              <div className="relative h-[22rem] overflow-hidden border border-label/15 bg-surface">
                {panels.map((panel, index) => (
                  <div
                    key={index}
                    data-panel
                    className={`absolute inset-0 ${index === 0 ? 'opacity-100' : 'opacity-0'}`}
                  >
                    {panel}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

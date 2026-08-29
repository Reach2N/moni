'use client'

/**
 * The three steps, each shown next to the thing it produces.
 *
 * Every panel renders. An earlier revision stacked all three in one sticky
 * slot and crossfaded between them as the steps scrolled past, which meant two
 * of the three sat at opacity 0 at any moment and the inactive steps were
 * dimmed to 55%. It read as a product with parts still switched off. Each step
 * now owns its panel on the row beside it: nothing is hidden, nothing is
 * greyed, and the section says the same thing without asking the reader to
 * scroll before it will show itself.
 *
 * Dropping the crossfade also drops the one piece of GSAP here that had to know
 * about breakpoints. What is left is a staggered reveal, which the shared
 * Reveal component already does.
 */

import { PriceList, Sheet, SheetHead } from '@/components/marketing/artifacts.tsx'
import { IconAgentReply, IconMessage, IconRiel, IconVoice } from '@/components/marketing/icons.tsx'
import { Reveal } from '@/components/motion/reveal.tsx'
import { durationKm, moneyKm } from '@/lib/format/khmer.ts'
import type { Copy, Locale } from '@/lib/marketing/copy.ts'
import { SERVICE_TEMPLATES, formatMoney } from '@/lib/types.ts'

const ROWS = (SERVICE_TEMPLATES.salon ?? []).slice(0, 3)

export function HowSequence({ copy, locale }: { copy: Copy; locale: Locale }) {
  const price = (minor: number) => (locale === 'km' ? moneyKm(minor, 'KHR') : formatMoney(minor, 'KHR'))
  const time = (minutes: number) => (locale === 'km' ? durationKm(minutes) : `${minutes} min`)

  const panels = [
    /* 1. What the owner says, typed or spoken. */
    <Sheet key="said" className="h-full">
      <SheetHead title={copy.steps.items[0].panel} mark={<IconVoice className="size-4" />} />
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <p className="text-lg font-medium text-pretty text-label sm:text-xl">{copy.demo.typed}</p>
        <p className="text-[13px] text-label-3">{copy.demo.privateNote}</p>
      </div>
    </Sheet>,

    /* 2. The catalogue it built from that one sentence. */
    <PriceList
      key="made"
      className="h-full"
      title={copy.steps.items[1].panel}
      note={copy.demo.tableHead[1]}
      mark={<IconRiel className="size-4" />}
      rows={ROWS.map((row) => ({
        name: locale === 'km' ? row.name : row.name_en,
        price: price(row.price_minor),
        meta: time(row.duration_min),
      }))}
    />,

    /* 3. A customer served from it, ruled by speaker rather than as bubbles:
          the bubbles are the hero's job, and this is the shop's own record. */
    <Sheet key="answers" className="h-full">
      <SheetHead title={copy.steps.items[2].panel} mark={<IconMessage className="size-4" />} />
      <dl className="divide-y divide-separator">
        <div className="px-4 py-4 sm:px-5">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-label-3">
            {copy.proof.customerLabel}
          </dt>
          <dd className="mt-1.5 text-[15px] text-pretty text-label">{copy.proof.customerMessage}</dd>
        </div>
        <div className="border-l-2 border-green px-4 py-4 sm:px-5">
          <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-label-3">
            <IconAgentReply className="size-3.5" />
            {copy.proof.assistantLabel}
          </dt>
          <dd className="mt-1.5 text-[15px] text-pretty text-label">{copy.proof.assistantMessage}</dd>
        </div>
      </dl>
    </Sheet>,
  ]

  return (
    <section id="how" className="scroll-mt-16 border-b border-separator" aria-labelledby="how-heading">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-label-2">
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

        <ol className="mt-14 space-y-6">
          {copy.steps.items.map((item, index) => (
            <li key={item.title}>
              <Reveal className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-12" y={18}>
                <div>
                  <span className="tnum inline-flex size-8 items-center justify-center rounded-full border border-separator text-[13px] font-semibold text-label-2">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-balance text-label sm:text-2xl">
                    {item.title}
                  </h3>
                  <p className="mt-3 max-w-md text-[15px] text-pretty text-label-2">{item.body}</p>
                </div>
                {panels[index]}
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

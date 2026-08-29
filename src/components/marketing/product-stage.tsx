'use client'

/**
 * One sentence in, the shop's price list out.
 *
 * The two halves are both paper: what the owner says, and what Moni prints from
 * it. The browser mockup that used to hold this is gone. Traffic lights and a
 * URL bar say "this is a web app", which is the one thing a shop owner does not
 * want to hear; a price list says "this is your shop".
 *
 * The list straightens and settles as it scrolls in, like a sheet laid flat on
 * a counter: a small z-rotation and a rise, scrubbed to scroll position.
 *
 * Aceternity UI's ContainerScroll (Manu Arora, MIT, mirrored on 21st.dev as
 * manuarora700/container-scroll-animation) was read first and its recipe is
 * NOT what shipped. That component tilts a card on X behind a 1000px
 * perspective so a screenshot appears to lie back and rise toward the reader.
 * It is a good effect for a picture of an app, and this is a picture of a piece
 * of paper: a sheet on a counter has no vanishing point, and the 3D tilt read
 * as a product shot the moment the browser chrome came off.
 *
 * The composer is real UI on deterministic data: no model is called and no
 * visitor spends a token, which is what copy.demo.privateNote states.
 */

import { useRef, useState } from 'react'
import { AgentPromptBar } from '@/components/agent/prompt-bar.tsx'
import { PriceList, Sheet, SheetHead } from '@/components/marketing/artifacts.tsx'
import { IconCheck, IconRiel, IconVoice } from '@/components/marketing/icons.tsx'
import { useScrollScene } from '@/lib/motion/gsap.ts'
import { durationKm, moneyKm } from '@/lib/format/khmer.ts'
import type { Copy, Locale } from '@/lib/marketing/copy.ts'
import { SERVICE_TEMPLATES, formatMoney } from '@/lib/types.ts'

const ROWS = (SERVICE_TEMPLATES.salon ?? []).slice(0, 3)

/* The composer's own defaults are the Invitation palette, because /app still
   reads it. Marketing overrides rather than flipping the defaults, which would
   repaint the dashboard's composer where square corners are correct. Remove
   when Phase 5 rebuilds /app in this palette. */
const COMPOSER = 'border-0 bg-surface'
const COMPOSER_INPUT = 'text-label placeholder:text-label-3'
const COMPOSER_SUBMIT = 'bg-label px-4 text-surface hover:opacity-85'

export function ProductStage({ copy, locale }: { copy: Copy; locale: Locale }) {
  const root = useRef<HTMLDivElement>(null)
  const [prompt, setPrompt] = useState(copy.demo.typed)
  const [built, setBuilt] = useState(true)

  useScrollScene(root, ({ scope, motion, gsap }) => {
    if (!motion) return
    const sheet = scope.querySelector('[data-stage-sheet]')
    if (!sheet) return

    gsap.fromTo(
      sheet,
      { rotate: -1.6, y: 34 },
      {
        rotate: 0,
        y: 0,
        ease: 'none',
        scrollTrigger: { trigger: scope, start: 'top 90%', end: 'top 40%', scrub: 0.7 },
      },
    )
  })

  const price = (minor: number) => (locale === 'km' ? moneyKm(minor, 'KHR') : formatMoney(minor, 'KHR'))
  const time = (minutes: number) => (locale === 'km' ? durationKm(minutes) : `${minutes} min`)

  return (
    <div
      ref={root}
      className="mx-auto grid max-w-6xl gap-6 px-5 pb-20 sm:px-8 sm:pb-28 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:gap-10"
    >
      <Sheet className="lg:sticky lg:top-24">
        <SheetHead title={copy.demo.title} note={copy.demo.example} mark={<IconVoice className="size-4" />} />
        <div className="p-1.5">
          <AgentPromptBar
            id="landing-agent-prompt"
            value={prompt}
            onChange={(value) => {
              setPrompt(value)
              setBuilt(false)
            }}
            onSubmit={() => setBuilt(true)}
            placeholder={copy.demo.typed}
            submitLabel={copy.ui.build}
            ariaLabel={copy.demo.title}
            helper={<span className="text-label-3">{copy.demo.privateNote}</span>}
            className={COMPOSER}
            textareaClassName={COMPOSER_INPUT}
            submitClassName={COMPOSER_SUBMIT}
            rows={2}
          />
        </div>
      </Sheet>

      <div data-stage-sheet className="origin-top-left">
        <PriceList
          title={built ? copy.demo.ready : copy.demo.label}
          note={copy.demo.tableHead[1]}
          mark={<IconRiel className="size-4" />}
          rows={ROWS.map((row) => ({
            name: locale === 'km' ? row.name : row.name_en,
            price: price(row.price_minor),
            meta: time(row.duration_min),
          }))}
          footer={
            <span className="flex items-start gap-2">
              <IconCheck className="mt-1 size-3.5 shrink-0 text-green" />
              <span className="min-w-0">{copy.demo.caption}</span>
            </span>
          }
        />
      </div>
    </div>
  )
}

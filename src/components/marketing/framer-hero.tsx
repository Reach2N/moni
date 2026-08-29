'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowDown, ArrowUpRight, Check, Mic, Sparkles } from 'lucide-react'
import { AgentPromptBar } from '@/components/agent/prompt-bar.tsx'
import { BrowserMockup } from '@/components/velora/browser-mockup.tsx'
import { moneyKm, durationKm, toKhmerDigits } from '@/lib/format/khmer.ts'
import type { Copy, Locale } from '@/lib/marketing/copy.ts'
import { SERVICE_TEMPLATES, formatMoney } from '@/lib/types.ts'

/**
 * Product-first hero, adapted from the 21st.dev v0 AI Chat prompt-first shape.
 *
 * The prompt is real UI, but the response is deterministic presentation data:
 * a landing-page visitor never sends a request or spends a model token. GSAP
 * owns the entrance and scroll choreography because it can scrub the product
 * stage without adding a second React render loop. The reduced-motion path
 * leaves the same content visible with no animation.
 *
 * Source pattern: https://21st.dev/community/components/kokonutd/v0-ai-chat
 * (MIT; adapted into Moni's shadcn primitives and token system.)
 */
const ROWS = (SERVICE_TEMPLATES.salon ?? []).slice(0, 3)

export function FramerHero({ copy, locale }: { copy: Copy; locale: Locale }) {
  const rootRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [prompt, setPrompt] = useState(copy.demo.typed)
  const [hasRun, setHasRun] = useState(true)

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    const root = rootRef.current
    if (!root) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const context = gsap.context(() => {
      if (reduceMotion) {
        gsap.set('.moni-hero-copy > *, .moni-hero-stage, .moni-hero-float', { clearProps: 'all' })
        return
      }

      gsap.from('.moni-hero-copy > *', {
        y: 26,
        opacity: 0,
        duration: 0.85,
        stagger: 0.075,
        ease: 'power3.out',
        delay: 0.08,
      })
      gsap.from('.moni-hero-stage', {
        y: 42,
        opacity: 0,
        scale: 0.97,
        rotateX: 5,
        transformPerspective: 900,
        duration: 1.1,
        ease: 'power3.out',
        delay: 0.18,
      })
      gsap.to('.moni-hero-float', {
        y: -13,
        rotate: 1.5,
        duration: 2.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 1,
      })
      gsap.to('.moni-hero-grid', {
        yPercent: 8,
        ease: 'none',
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: 'bottom top',
          scrub: 1.2,
        },
      })
      gsap.to(stageRef.current, {
        yPercent: -7,
        rotateY: -2,
        scale: 0.965,
        ease: 'none',
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: 'bottom top',
          scrub: 1.1,
        },
      })
    }, root)

    return () => context.revert()
  }, [])

  const price = (minor: number) => (locale === 'km' ? moneyKm(minor, 'KHR') : formatMoney(minor, 'KHR'))
  const time = (minutes: number) => (locale === 'km' ? durationKm(minutes) : `${minutes} min`)
  const count = (value: number) => (locale === 'km' ? toKhmerDigits(value) : String(value))

  return (
    <section
      ref={rootRef}
      className="relative isolate overflow-hidden bg-[#070a09] text-white"
      aria-labelledby="hero-heading"
    >
      <div className="moni-hero-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(48,209,88,0.2),transparent_35%),radial-gradient(circle_at_5%_85%,rgba(255,255,255,0.08),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_84%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-16 sm:px-8 sm:pb-14 sm:pt-24 lg:pb-16">
        <div className="mb-14 flex items-center justify-between gap-4 text-[11px] font-medium uppercase tracking-[0.18em] text-white/50 sm:mb-20">
          <span className="inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[#30D158] shadow-[0_0_18px_#30D158]" aria-hidden />
            Moni / AI for your shop
          </span>
          <span className="hidden sm:inline">Voice · text · bookings · storefront</span>
        </div>

        <div className="grid items-center gap-14 lg:grid-cols-[0.84fr_1.16fr] lg:gap-20">
          <div className="moni-hero-copy max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#30D158]">{copy.hero.eyebrow}</p>
            <h1 id="hero-heading" className="mt-6 max-w-[12ch] text-5xl font-semibold tracking-[-0.065em] text-white !leading-[1.03] sm:text-7xl lg:text-[clamp(4.2rem,6.5vw,7.4rem)]">
              {copy.hero.headline}
            </h1>
            <p className="mt-7 max-w-xl text-lg text-white/65 !leading-[1.6] sm:text-xl">
              {copy.hero.sub}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#apply"
                className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition-transform hover:-translate-y-0.5 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#30D158]"
              >
                {copy.hero.cta}
                <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
              </a>
              <a
                href="#how"
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-semibold text-white transition-colors hover:border-white/45 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#30D158]"
              >
                {copy.hero.secondary}
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/50">
              {copy.hero.trust.map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <Check className="size-3.5 text-[#30D158]" strokeWidth={2.5} aria-hidden />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="moni-hero-stage relative mx-auto w-full max-w-2xl" ref={stageRef}>
            <div className="moni-hero-float absolute -right-2 -top-6 z-20 hidden rounded-full border border-white/15 bg-[#151b17]/90 px-3 py-2 text-xs text-white/75 shadow-2xl backdrop-blur-md sm:flex sm:items-center sm:gap-2">
              <span className="size-1.5 rounded-full bg-[#30D158]" aria-hidden />
              {locale === 'km' ? 'Moni កំពុងរៀបចំ' : 'Moni is organising'}
            </div>
            <div className="absolute -bottom-5 -left-4 z-20 hidden rounded-2xl border border-white/15 bg-[#151b17]/90 p-3 text-xs shadow-2xl backdrop-blur-md sm:block">
              <p className="text-white/45">{locale === 'km' ? 'លទ្ធផល' : 'Output'}</p>
              <p className="mt-1 font-semibold text-[#30D158]">{locale === 'km' ? 'រួចរាល់' : 'Ready to check'}</p>
            </div>

            <BrowserMockup
              url="moni.cam / workspace"
              className="rounded-[28px] border-white/15 bg-[#f8f8f8] shadow-[0_35px_120px_-45px_rgba(48,209,88,0.7)]"
            >
              <div className="bg-[#f8f8f8] p-3 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3 px-1 sm:mb-4 sm:px-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-black text-[#30D158]">
                      <Sparkles className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-black">{copy.demo.title}</p>
                      <p className="text-xs text-black/45">{copy.demo.label}</p>
                    </div>
                  </div>
                  <span className="hidden rounded-full border border-black/10 px-2.5 py-1 text-[11px] text-black/45 sm:inline-flex">{copy.demo.example}</span>
                </div>

                <AgentPromptBar
                  id="landing-agent-prompt"
                  value={prompt}
                  onChange={(value) => {
                    setPrompt(value)
                    setHasRun(false)
                  }}
                  onSubmit={() => setHasRun(true)}
                  placeholder={copy.demo.typed}
                  submitLabel={locale === 'km' ? 'រៀបចំ' : 'Build'}
                  ariaLabel={copy.demo.title}
                  helper={
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-[#30D158]" aria-hidden />
                      {copy.demo.privateNote}
                    </span>
                  }
                  leading={
                    <button
                      type="button"
                      onClick={() => {
                        setPrompt(copy.demo.typed)
                        setHasRun(true)
                      }}
                      className="flex size-8 items-center justify-center rounded-full border border-black/10 text-black/50 transition-colors hover:bg-black/5 hover:text-black focus-visible:ring-2 focus-visible:ring-[#30D158]"
                      aria-label={copy.demo.voice}
                    >
                      <Mic className="size-3.5" aria-hidden />
                    </button>
                  }
                  trailing={<span className="hidden text-[11px] text-black/35 sm:inline">{locale === 'km' ? '⌘↵ ដើម្បីបង្កើត' : '⌘↵ to build'}</span>}
                  submitClassName="rounded-full bg-black px-4 text-white hover:bg-black/80"
                  className="rounded-[20px] border-black/10 bg-white shadow-[0_8px_30px_-20px_rgba(0,0,0,0.35)]"
                  textareaClassName="text-black placeholder:text-black/30"
                  rows={2}
                />

                <div className="mt-3 overflow-hidden rounded-[18px] border border-black/10 bg-white" aria-live="polite">
                  <div className="flex items-center justify-between border-b border-black/10 px-4 py-2.5">
                    <span className="text-xs font-semibold text-black/55">{hasRun ? copy.demo.ready : copy.demo.label}</span>
                    <span className="tnum text-xs text-black/35">{count(ROWS.length)} {locale === 'km' ? 'ជួរ' : 'rows'}</span>
                  </div>
                  <div className="divide-y divide-black/10">
                    {ROWS.map((row) => (
                      <div key={row.name_en} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3">
                        <span className="truncate text-sm font-medium text-black">{locale === 'km' ? row.name : row.name_en}</span>
                        <span className="tnum text-sm font-semibold text-black">{price(row.price_minor)}</span>
                        <span className="tnum text-xs text-black/45">{time(row.duration_min)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 border-t border-black/10 bg-[#f8f8f8] px-4 py-2.5 text-xs text-black/45">
                    <Check className="size-3.5 text-[#0b8f45]" strokeWidth={2.5} aria-hidden />
                    <span>{copy.demo.caption}</span>
                  </div>
                </div>
              </div>
            </BrowserMockup>
          </div>
        </div>

        <div className="mt-20 flex items-center justify-between gap-4 border-t border-white/10 pt-5 text-[11px] font-medium uppercase tracking-[0.16em] text-white/40 sm:mt-24">
          <span>{copy.hero.reassure}</span>
          <span className="inline-flex shrink-0 items-center gap-2">
            <ArrowDown className="size-3.5 text-[#30D158]" aria-hidden />
            {locale === 'km' ? 'រុករក' : 'Explore'}
          </span>
        </div>
      </div>
    </section>
  )
}

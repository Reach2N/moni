import type { Metadata } from 'next'
import { BookingProof } from '@/components/marketing/booking-proof.tsx'
import { SiteFooter, SiteHeader } from '@/components/marketing/chrome.tsx'
import { Hero } from '@/components/marketing/hero.tsx'
import { HowSequence } from '@/components/marketing/how-sequence.tsx'
import { MessageLog } from '@/components/marketing/message-log.tsx'
import { PricingFigure } from '@/components/marketing/pricing-figure.tsx'
import { ProductStage } from '@/components/marketing/product-stage.tsx'
import { WaitlistForm } from '@/components/marketing/waitlist-form.tsx'
import { Sheet, SheetHead } from '@/components/marketing/artifacts.tsx'
import {
  IconCheck,
  IconGoods,
  IconPlus,
  IconRoom,
  IconShopfront,
} from '@/components/marketing/icons.tsx'
import { Reveal } from '@/components/motion/reveal.tsx'
import { ScrollRefresh } from '@/components/motion/scroll-refresh.tsx'
import { COPY, isLocale, type Locale } from '@/lib/marketing/copy.ts'

export const metadata: Metadata = {
  title: 'Moni: your shop, understood',
  description:
    'Moni helps Cambodian shops answer customers, check availability, and take bookings in plain language.',
  alternates: { canonical: '/' },
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://app.moni.cam'

/* Moni's own marks, one stroke weight. Not lucide: see icons.tsx. */
const CATEGORY_ICONS = [IconShopfront, IconGoods, IconRoom] as const

const SECTION = 'mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28'
const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.2em] text-label-2'
const HEADING = 'mt-4 text-3xl font-semibold tracking-[-0.035em] text-balance text-label sm:text-5xl'

export default async function MarketingHome({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const { lang } = await searchParams
  const locale: Locale = isLocale(lang) ? lang : 'km'
  const copy = COPY[locale]

  return (
    <div lang={locale}>
      <ScrollRefresh />
      <SiteHeader copy={copy} locale={locale} />

      <main>
        {/* The statement, then the shop's own paper. One movement, so no rule
            between them. White is the ground the whole way down: the dark band
            this page used to carry has gone. */}
        <Hero copy={copy} />
        <ProductStage copy={copy} locale={locale} />

        <HowSequence copy={copy} locale={locale} />

        <section id="proof" className="scroll-mt-16 border-b border-separator bg-surface-2" aria-labelledby="proof-heading">
          <div className={SECTION}>
            <Reveal className="max-w-2xl">
              <p className={EYEBROW}>{copy.proof.eyebrow}</p>
              <h2 id="proof-heading" className={HEADING}>
                {copy.proof.title}
              </h2>
              <p className="mt-5 text-lg text-pretty text-label-2">{copy.proof.body}</p>
            </Reveal>
            <div className="mt-12">
              <BookingProof copy={copy} locale={locale} />
            </div>
          </div>
        </section>

        {/* Breadth and channels were two anonymous, anchorless sections with the
            same shape. One band answers both questions a shop owner actually
            asks: does it fit my kind of shop, and where do my messages arrive. */}
        <section id="channels" className="scroll-mt-16 border-b border-separator" aria-labelledby="breadth-heading">
          <div className={SECTION}>
            <Reveal className="max-w-2xl">
              <p className={EYEBROW}>{copy.breadth.eyebrow}</p>
              <h2 id="breadth-heading" className={HEADING}>
                {copy.breadth.title}
              </h2>
              <p className="mt-5 text-lg text-pretty text-label-2">{copy.breadth.body}</p>
            </Reveal>

            <Reveal className="mt-12 grid gap-4 sm:grid-cols-3" stagger={0.08} y={18}>
              {copy.breadth.kinds.map((kind, index) => {
                const Icon = CATEGORY_ICONS[index]
                return (
                  <Sheet key={kind.name} className="p-6">
                    <Icon className="size-6 text-label-2" />
                    <h3 className="mt-5 text-xl font-semibold text-label">{kind.name}</h3>
                    <p className="mt-2 text-[15px] text-pretty text-label-2">{kind.detail}</p>
                  </Sheet>
                )
              })}
            </Reveal>

            <Reveal className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]" y={18}>
              <div className="min-w-0 border border-label/15 bg-surface p-6 sm:p-8">
                <h3 id="channels-heading" className="text-xl font-semibold tracking-tight text-label sm:text-2xl">
                  {copy.channels.title}
                </h3>
                <p className="mt-3 max-w-md text-[15px] text-pretty text-label-2">{copy.channels.body}</p>
                <div className="mt-6">
                  <MessageLog copy={copy} />
                </div>
              </div>

              <Sheet>
                <SheetHead title={copy.channels.eyebrow} />
                <ul className="divide-y divide-label/10">
                  <li className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-label">{copy.channels.now}</p>
                      <p className="mt-1 text-sm text-label-2">{copy.channels.nowNote}</p>
                    </div>
                    <span className="shrink-0 bg-green px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-on-green">
                      {copy.ui.badgeNow}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-label">{copy.channels.next}</p>
                      <p className="mt-1 text-sm text-label-2">{copy.channels.nextNote}</p>
                    </div>
                    <span className="shrink-0 border border-label/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-label-2">
                      {copy.ui.badgeNext}
                    </span>
                  </li>
                </ul>
              </Sheet>
            </Reveal>
          </div>
        </section>

        <section className="border-b border-separator" aria-labelledby="pricing-heading">
          <div className={`${SECTION} grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20`}>
            <Reveal>
              <p className={EYEBROW}>{copy.pricing.eyebrow}</p>
              <h2 id="pricing-heading" className={HEADING}>
                {copy.pricing.title}
              </h2>
            </Reveal>
            <Reveal y={18} delay={0.06}>
              <PricingFigure value={copy.pricing.figure} unit={copy.pricing.figureUnit} locale={locale} />
              <p className="mt-6 text-2xl font-semibold tracking-tight text-balance text-label sm:text-3xl">
                {copy.pricing.headline}
              </p>
              <p className="mt-4 text-lg text-pretty text-label-2">{copy.pricing.body}</p>
              <ul className="mt-8 divide-y divide-label/10 border-y border-label/15">
                {copy.pricing.points.map((point) => (
                  <li key={point} className="flex items-start gap-3 py-3 text-[15px] text-label-2">
                    <IconCheck className="mt-1 size-3.5 shrink-0 text-green" />
                    <span className="min-w-0">{point}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        <section id="faq" className="scroll-mt-16 border-b border-separator" aria-labelledby="faq-heading">
          <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
            <Reveal>
              <h2 id="faq-heading" className="text-3xl font-semibold tracking-[-0.035em] text-balance text-label sm:text-5xl">
                {copy.faq.title}
              </h2>
            </Reveal>
            <div className="mt-10 divide-y divide-label/10 border-y border-label/15">
              {copy.faq.items.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-label [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">{item.q}</span>
                    <IconPlus className="size-4 shrink-0 text-label-2" />
                  </summary>
                  <p className="mt-3 max-w-2xl text-[15px] text-pretty text-label-2">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="apply" className="scroll-mt-16 bg-surface-2" aria-labelledby="apply-heading">
          <div className={`${SECTION} grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20`}>
            <Reveal>
              <p className={EYEBROW}>{copy.waitlist.eyebrow}</p>
              <h2 id="apply-heading" className={HEADING}>
                {copy.waitlist.title}
              </h2>
              <p className="mt-5 text-lg text-pretty text-label-2">{copy.waitlist.body}</p>
              <p className="mt-5 text-sm text-label-3">{copy.hero.reassure}</p>
            </Reveal>
            <Reveal y={18} delay={0.06} className="border border-label/15 bg-surface p-5 sm:p-8">
              <WaitlistForm copy={copy} locale={locale} appUrl={APP_URL} />
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter copy={copy} locale={locale} />
    </div>
  )
}

import type { Metadata } from 'next'
import { Check, CircleHelp, MessageCircle, Store, WalletCards } from 'lucide-react'
import { BookingProof } from '@/components/marketing/booking-proof.tsx'
import { SiteFooter, SiteHeader } from '@/components/marketing/chrome.tsx'
import { FramerHero } from '@/components/marketing/framer-hero.tsx'
import { WaitlistForm } from '@/components/marketing/waitlist-form.tsx'
import { BlurFade } from '@/components/velora/blur-fade.tsx'
import { COPY, isLocale, type Locale } from '@/lib/marketing/copy.ts'

export const metadata: Metadata = {
  title: 'Moni: your shop, understood',
  description:
    'Moni helps Cambodian shops answer customers, check availability, and take bookings in plain language.',
  alternates: { canonical: '/' },
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://app.moni.cam'

const CATEGORY_ICONS = [Store, WalletCards, MessageCircle] as const

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
      <SiteHeader copy={copy} locale={locale} dark />

      <main>
        <FramerHero copy={copy} locale={locale} />

        <section id="how" className="scroll-mt-16 border-b border-separator" aria-labelledby="how-heading">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <BlurFade className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-label-2">{copy.steps.eyebrow}</p>
              <h2 id="how-heading" className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-label sm:text-5xl">{copy.steps.title}</h2>
              <p className="mt-5 text-lg text-label-2">{copy.steps.body}</p>
            </BlurFade>
            <ol className="mt-12 grid border-y border-separator sm:grid-cols-3 sm:divide-x sm:divide-separator">
              {copy.steps.items.map((item, index) => (
                <BlurFade key={item.title} delay={index * 0.06} className="border-b border-separator py-7 last:border-b-0 sm:border-b-0 sm:px-7 sm:first:pl-0 sm:last:pr-0">
                  <li>
                    <span className="tnum text-sm font-semibold text-label-3">0{index + 1}</span>
                    <h3 className="mt-5 text-xl font-semibold tracking-tight text-label">{item.title}</h3>
                    <p className="mt-3 text-[15px] text-label-2">{item.body}</p>
                  </li>
                </BlurFade>
              ))}
            </ol>
          </div>
        </section>

        <section id="proof" className="scroll-mt-16 bg-label text-surface" aria-labelledby="proof-heading">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <BlurFade className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-surface/60">{copy.proof.eyebrow}</p>
              <h2 id="proof-heading" className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">{copy.proof.title}</h2>
              <p className="mt-5 text-lg text-surface/70">{copy.proof.body}</p>
            </BlurFade>
            <div className="mt-12">
              <BookingProof copy={copy} />
            </div>
          </div>
        </section>

        <section className="border-b border-separator" aria-labelledby="breadth-heading">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <BlurFade className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-label-2">{copy.breadth.eyebrow}</p>
              <h2 id="breadth-heading" className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-label sm:text-5xl">{copy.breadth.title}</h2>
              <p className="mt-5 text-lg text-label-2">{copy.breadth.body}</p>
            </BlurFade>
            <div className="mt-12 grid border-y border-separator sm:grid-cols-3 sm:divide-x sm:divide-separator">
              {copy.breadth.kinds.map((kind, index) => {
                const Icon = CATEGORY_ICONS[index]
                return (
                  <BlurFade key={kind.name} delay={index * 0.06} className="border-b border-separator py-7 last:border-b-0 sm:border-b-0 sm:px-7 sm:first:pl-0 sm:last:pr-0">
                    <div className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-label">
                      <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-label">{kind.name}</h3>
                    <p className="mt-2 text-[15px] text-label-2">{kind.detail}</p>
                  </BlurFade>
                )
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-separator" aria-labelledby="channels-heading">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-20">
            <BlurFade>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-label-2">{copy.channels.eyebrow}</p>
              <h2 id="channels-heading" className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-label sm:text-5xl">{copy.channels.title}</h2>
              <p className="mt-5 text-lg text-label-2">{copy.channels.body}</p>
            </BlurFade>
            <BlurFade direction="right" delay={0.08}>
              <div className="border-y border-separator">
                <div className="flex items-center justify-between gap-4 border-b border-separator py-5">
                  <div>
                    <p className="text-lg font-semibold text-label">{copy.channels.now}</p>
                    <p className="mt-1 text-sm text-label-2">{copy.channels.nowNote}</p>
                  </div>
                  <span className="rounded-full bg-green px-3 py-1 text-xs font-semibold text-label">{locale === 'km' ? 'ឥឡូវនេះ' : 'Now'}</span>
                </div>
                <div className="flex items-center justify-between gap-4 py-5">
                  <div>
                    <p className="text-lg font-semibold text-label">{copy.channels.next}</p>
                    <p className="mt-1 text-sm text-label-2">{copy.channels.nextNote}</p>
                  </div>
                  <span className="rounded-full border border-separator px-3 py-1 text-xs font-semibold text-label-2">{locale === 'km' ? 'បន្ទាប់' : 'Next'}</span>
                </div>
              </div>
            </BlurFade>
          </div>
        </section>

        <section className="border-b border-separator" aria-labelledby="pricing-heading">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <BlurFade>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-label-2">{copy.pricing.eyebrow}</p>
              <h2 id="pricing-heading" className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-label sm:text-5xl">{copy.pricing.title}</h2>
            </BlurFade>
            <BlurFade direction="right" delay={0.08}>
              <p className="text-2xl font-semibold tracking-tight text-label sm:text-3xl">{copy.pricing.headline}</p>
              <p className="mt-5 text-lg text-label-2">{copy.pricing.body}</p>
              <ul className="mt-8 space-y-3 border-t border-separator pt-6">
                {copy.pricing.points.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-[15px] text-label-2">
                    <Check className="mt-1 size-4 shrink-0 text-green" strokeWidth={2} aria-hidden />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </BlurFade>
          </div>
        </section>

        <section id="faq" className="scroll-mt-16 border-b border-separator" aria-labelledby="faq-heading">
          <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
            <BlurFade>
              <h2 id="faq-heading" className="text-3xl font-semibold tracking-[-0.035em] text-label sm:text-5xl">{copy.faq.title}</h2>
            </BlurFade>
            <div className="mt-10 divide-y divide-separator border-y border-separator">
              {copy.faq.items.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-label [&::-webkit-details-marker]:hidden">
                    <span>{item.q}</span>
                    <CircleHelp className="size-5 shrink-0 text-label-2 transition-transform group-open:rotate-45" strokeWidth={1.75} aria-hidden />
                  </summary>
                  <p className="mt-3 max-w-2xl text-[15px] text-label-2">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="apply" className="scroll-mt-16 bg-surface-2" aria-labelledby="apply-heading">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <BlurFade>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-label-2">{copy.waitlist.eyebrow}</p>
              <h2 id="apply-heading" className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-label sm:text-5xl">{copy.waitlist.title}</h2>
              <p className="mt-5 text-lg text-label-2">{copy.waitlist.body}</p>
            </BlurFade>
            <BlurFade direction="right" delay={0.08} className="rounded-[var(--radius-card)] border border-separator bg-surface p-5 sm:p-8">
              <WaitlistForm copy={copy} locale={locale} appUrl={APP_URL} />
            </BlurFade>
          </div>
        </section>
      </main>

      <SiteFooter copy={copy} locale={locale} />
    </div>
  )
}

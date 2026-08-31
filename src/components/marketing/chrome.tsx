import Link from 'next/link'
import Image from 'next/image'
import type { Copy, Locale } from '@/lib/marketing/copy'
import { HeaderScrollState } from '@/components/marketing/header-scroll-state.tsx'
import { HeaderNotchNav } from '@/components/marketing/header-notch-nav.tsx'

/** The shipped Moni mark, cropped into the compact header lockup.
 *
 *  `tone="morph"` is the header's copy: ink while the header is the full white
 *  bar, and light once it has drawn in to the dark glass island. It reads the
 *  island's own `data-compact` rather than taking a prop, because this element
 *  is rendered on the server and passed in as a slot, so it cannot be told.
 *  The footer's copy is plain ink and takes neither.
 *
 *  `compact` drops the word below `sm` and keeps the mark, which is how the
 *  island fits a phone alongside a destination and Apply. */
function Wordmark({ tone = 'ink', compact = false }: { tone?: 'ink' | 'morph'; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Image
        src="/logos/logo-mark-transparent.png"
        alt=""
        width={32}
        height={20}
        className="h-5 w-8 shrink-0 object-contain"
        aria-hidden
        priority
      />
      <span
        className={`text-[17px] font-semibold tracking-tight transition-colors duration-300 ${
          tone === 'morph' ? 'text-label group-data-[compact=true]/notch:text-zinc-50' : 'text-label'
        } ${compact ? 'hidden sm:inline' : ''}`}
      >
        Moni
      </span>
    </span>
  )
}

const homeHref = (locale: Locale) => (locale === 'km' ? '/' : '/?lang=en')
const sectionHref = (locale: Locale, section: string) => `${homeHref(locale)}#${section}`

/**
 * The `dark` prop this used to take is gone.
 *
 * It existed only because the hero hardcoded its own near-black ground, so the
 * header had to be told about it, and the telling was a ternary at every single
 * node: nine of them, each duplicating the class list. With the hero reading the
 * scheme-aware tokens there is one correct header in both schemes and nothing to
 * branch on. If a section ever needs light chrome over a dark ground again, that
 * is what .moni-invert is for, and it needs no prop.
 *
 * The header's own ground and hairline still arrive on scroll, from the data
 * attribute HeaderScrollState sets. That is the bar BEHIND the notch, and once
 * scrolled it now paints NOTHING. It used to be `bg-surface/80` with its own
 * blur, which was a second sheet of frosted white between the page and the
 * island: the content was already gone by the time it reached the glass, so
 * the island's transparency showed white and bought nothing. The island is the
 * only chrome in the compact state, and the page runs live underneath it.
 *
 * The bar still paints at the TOP of the page, where the notch is the
 * full-width white header and there is nothing to see through.
 *
 * The header is one element. It used to be two rows: a notice strip that
 * compacted into an empty decorative notch on scroll, and beneath it a mark, a
 * `hidden lg:flex` row of links no phone ever saw, a language toggle and Apply.
 * All of it now lives in the single notch, which is the full-width white header
 * at the top of the page and draws in to the compact glass island on scroll.
 * `copy.nav.notice` is deliberately no longer rendered: a notch carrying the
 * mark, three destinations, the language toggle and Apply has no room for a
 * tagline as well, and the hero says the same thing directly below it.
 */
export function SiteHeader({ copy, locale }: { copy: Copy; locale: Locale }) {
  return (
    <header
      data-site-header
      /* No hairline, and past the threshold no ground either: the island's own
         glass is what separates the navigation from the page, and a white
         sheet behind it would just be the covering-up this was meant to
         stop. */
      className="sticky top-0 z-40 bg-surface transition-colors duration-300 data-[scrolled=true]:bg-transparent"
    >
      <HeaderScrollState />
      <div className="relative h-14">
        <HeaderNotchNav
          nav={copy.nav}
          locale={locale}
          logo={<Wordmark tone="morph" compact />}
          action={
            <a
              href={sectionHref(locale, 'apply')}
              className="rounded-full bg-label px-3.5 py-2 text-[13px] font-semibold text-surface transition-[background-color,color,opacity] duration-300 hover:opacity-85 active:scale-[0.99] group-data-[compact=true]/notch:bg-zinc-50 group-data-[compact=true]/notch:text-zinc-950 sm:px-4 sm:text-sm"
            >
              {copy.nav.apply}
            </a>
          }
        />
      </div>
    </header>
  )
}

export function SiteFooter({ copy, locale }: { copy: Copy; locale: Locale }) {
  const q = locale === 'en' ? '?lang=en' : ''
  return (
    <footer className="border-t border-separator">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex flex-col gap-2">
          <Wordmark />
          <span className="text-sm text-label-2">{copy.footer.rights}</span>
        </div>
        {/* No Apply link here. The header's is sticky, so it is on screen at the
            footer too, and this one pointed at the same #apply anchor. */}
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-label-2" aria-label="Footer">
          <Link href={`/privacy${q}`} className="hover:text-label">
            {copy.footer.privacy}
          </Link>
          <Link href={`/terms${q}`} className="hover:text-label">
            {copy.footer.terms}
          </Link>
          <a href="mailto:hello@moni.cam" className="hover:text-label">
            {copy.footer.contact}
          </a>
        </nav>
      </div>
    </footer>
  )
}

import Link from 'next/link'
import type { Copy, Locale } from '@/lib/marketing/copy'
import { HeaderScrollState } from '@/components/marketing/header-scroll-state.tsx'

/**
 * The wordmark: a square plate with the seal struck in it.
 *
 * Squared off from the earlier rounded-rect-and-circle. A pill-cornered badge
 * with a dot in it is the generic app-icon shape; the shop's paper has corners,
 * and the green square reads as a stamp rather than a status light.
 */
function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="none">
        <rect x="2.5" y="2.5" width="19" height="19" rx="1" className="fill-label" />
        <rect x="9" y="9" width="6" height="6" className="fill-green" />
      </svg>
      <span className="text-[17px] font-semibold tracking-tight text-label">Moni</span>
    </span>
  )
}

const otherHref = (locale: Locale) => (locale === 'km' ? '/?lang=en' : '/')
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
 * The header starts transparent over the hero and gains its ground and hairline
 * once the page scrolls: that state is a data attribute set by HeaderScrollState.
 */
export function SiteHeader({ copy, locale }: { copy: Copy; locale: Locale }) {
  return (
    <header
      data-site-header
      className="sticky top-0 z-40 border-b border-transparent transition-colors duration-300 data-[scrolled=true]:border-separator data-[scrolled=true]:bg-surface/80 data-[scrolled=true]:backdrop-blur-xl"
    >
      <HeaderScrollState />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href={homeHref(locale)} aria-label="Moni">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-label-2 md:flex" aria-label="Primary">
          <Link href={sectionHref(locale, 'how')} className="transition-colors hover:text-label">
            {copy.nav.how}
          </Link>
          <Link href={sectionHref(locale, 'proof')} className="transition-colors hover:text-label">
            {copy.nav.proof}
          </Link>
          <Link href={sectionHref(locale, 'faq')} className="transition-colors hover:text-label">
            {copy.nav.faq}
          </Link>
        </nav>
        <nav className="ml-auto flex items-center gap-1.5" aria-label="Site actions">
          <Link
            href={otherHref(locale)}
            hrefLang={copy.nav.otherHref}
            className="px-3 py-2 text-sm text-label-2 transition-colors hover:text-label"
          >
            {copy.nav.other}
          </Link>
          <a
            href={sectionHref(locale, 'apply')}
            className="bg-label px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-85 active:scale-[0.99]"
          >
            {copy.nav.apply}
          </a>
        </nav>
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
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-label-2" aria-label="Footer">
          <Link href={sectionHref(locale, 'apply')} className="hover:text-label">
            {copy.nav.apply}
          </Link>
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

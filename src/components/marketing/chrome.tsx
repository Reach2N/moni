import Link from 'next/link'
import type { Copy, Locale } from '@/lib/marketing/copy'

/** The wordmark. An authored mark, not an emoji and not a font glyph. */
function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="none">
        <rect x="2" y="2" width="20" height="20" rx="7" className={dark ? 'fill-white' : 'fill-label'} />
        <circle cx="12" cy="12" r="4" className={dark ? 'fill-[#30D158]' : 'fill-green'} />
      </svg>
      <span className={dark ? 'text-[17px] font-semibold tracking-tight text-white' : 'text-[17px] font-semibold tracking-tight text-label'}>Moni</span>
    </span>
  )
}

const otherHref = (locale: Locale) => (locale === 'km' ? '/?lang=en' : '/')
const homeHref = (locale: Locale) => (locale === 'km' ? '/' : '/?lang=en')
const sectionHref = (locale: Locale, section: string) => `${homeHref(locale)}#${section}`

export function SiteHeader({ copy, locale, dark = false }: { copy: Copy; locale: Locale; dark?: boolean }) {
  return (
    <header className={dark ? 'sticky top-0 z-40 border-b border-white/10 bg-[#070a09]/80 text-white backdrop-blur-xl' : 'sticky top-0 z-40 border-b border-separator bg-surface/80 backdrop-blur-xl'}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href={homeHref(locale)} aria-label="Moni">
          <Wordmark dark={dark} />
        </Link>
        <nav className={dark ? 'hidden items-center gap-5 text-sm text-white/60 md:flex' : 'hidden items-center gap-5 text-sm text-label-2 md:flex'} aria-label="Primary">
          <Link href={sectionHref(locale, 'how')} className={dark ? 'transition-colors hover:text-white' : 'transition-colors hover:text-label'}>
            {copy.nav.how}
          </Link>
          <Link href={sectionHref(locale, 'proof')} className={dark ? 'transition-colors hover:text-white' : 'transition-colors hover:text-label'}>
            {copy.nav.proof}
          </Link>
          <Link href={sectionHref(locale, 'faq')} className={dark ? 'transition-colors hover:text-white' : 'transition-colors hover:text-label'}>
            {copy.nav.faq}
          </Link>
        </nav>
        <nav className="ml-auto flex items-center gap-1.5" aria-label="Site actions">
          <Link
            href={otherHref(locale)}
            hrefLang={copy.nav.otherHref}
            className={dark ? 'rounded-full px-3 py-2 text-sm text-white/60 transition-colors hover:text-white' : 'rounded-full px-3 py-2 text-sm text-label-2 transition-colors hover:text-label'}
          >
            {copy.nav.other}
          </Link>
          <a
            href={sectionHref(locale, 'apply')}
            className={dark ? 'rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-transform active:scale-[0.98]' : 'rounded-full bg-label px-4 py-2 text-sm font-medium text-surface transition-transform active:scale-[0.98]'}
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

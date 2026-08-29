import type { Metadata } from 'next'
import { COPY, isLocale, type Locale } from '@/lib/marketing/copy.ts'
import { SiteFooter, SiteHeader } from '@/components/marketing/chrome.tsx'
import { LegalPage, type Section } from '@/components/marketing/legal.tsx'

export const metadata: Metadata = { title: 'Terms: Moni', alternates: { canonical: '/terms' } }

/**
 * NEEDS LEGAL REVIEW before launch and before the Meta app review submission.
 * The governing-law and entity clauses are placeholders until the company
 * exists. Khmer translation is outstanding.
 */
const SECTIONS: Section[] = [
  {
    h: 'The agreement',
    p: [
      'These terms apply to Moni, an assistant that answers messages and takes bookings for businesses in Cambodia. By applying for access or using the service you agree to them.',
      'Moni is early software being built with its first shops. It will occasionally be wrong. The rest of these terms are mostly about what that means.',
    ],
  },
  {
    h: 'Your account',
    p: [
      'Access is currently by application. We onboard shops by hand and may decline or withdraw access.',
      'You are responsible for what happens under your account, including keeping your sign-in secure and keeping any channel tokens you give us accurate.',
    ],
  },
  {
    h: 'What the assistant does in your name',
    p: [
      'The assistant answers your customers as your shop. It quotes prices from the list you provide and checks availability against your real schedule. It is built not to invent either.',
      'It can still make mistakes. You are responsible for what your shop commits to, so read your inbox. Every conversation is visible to you, you can take over any conversation at any time, and you can switch the assistant off.',
      'If a booking is made that you cannot honour, that is between you and your customer. We will help you fix the record.',
    ],
  },
  {
    h: 'Your content',
    p: [
      'Your shop description, catalogue, customers and conversations remain yours. You can export them at any time.',
      'You give us permission to process them for the purpose of running the service for you, and for nothing else. We do not use your content to serve another shop.',
    ],
  },
  {
    h: 'Payments',
    p: [
      'Moni is free to start. When charging begins, we charge per completed transaction rather than a monthly fee, and you will be told the rate before it applies.',
      'Money your customers pay you is settled by the payment networks directly to your account. We are not a bank, we do not hold your funds, and payment disputes are handled by the payment provider.',
    ],
  },
  {
    h: 'Acceptable use',
    p: [
      'Do not use Moni to send unsolicited bulk messages, to impersonate someone else, to break the rules of Telegram or Meta, or to do anything unlawful. Doing so ends your access.',
    ],
  },
  {
    h: 'Availability and liability',
    p: [
      'The service is provided as is, without warranty. We do not promise uninterrupted availability, and third-party platforms we depend on can change or fail without notice.',
      'To the extent the law allows, our liability is limited to the amount you paid us in the three months before the claim. Nothing here limits liability that cannot be limited by law.',
    ],
  },
  {
    h: 'Ending it',
    p: [
      'You can stop at any time and take your data with you. We can end access for a breach of these terms, and will give notice where we reasonably can.',
    ],
  },
  {
    h: 'Changes and contact',
    p: [
      'We will post material changes here and email account holders before they take effect.',
      'hello@moni.cam',
    ],
  },
]

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const { lang } = await searchParams
  const locale: Locale = isLocale(lang) ? lang : 'km'
  const copy = COPY[locale]
  return (
    <div lang="en">
      <SiteHeader copy={copy} locale={locale} />
      <LegalPage title="Terms" updated="29 August 2026" sections={SECTIONS} />
      <SiteFooter copy={copy} locale={locale} />
    </div>
  )
}

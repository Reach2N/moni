import type { Metadata } from 'next'
import { COPY, isLocale, type Locale } from '@/lib/marketing/copy.ts'
import { SiteFooter, SiteHeader } from '@/components/marketing/chrome.tsx'
import { LegalPage, type Section } from '@/components/marketing/legal.tsx'

export const metadata: Metadata = { title: 'Privacy: Moni', alternates: { canonical: '/privacy' } }

/**
 * Written from what the system actually does, not from a template. Every claim
 * below is checkable against db/schema.sql.
 *
 * NEEDS LEGAL REVIEW before the Meta app review submission (ARCHITECTURE.md
 * section 4): Meta requires a reachable privacy policy URL, and a real company
 * name and contact address have to replace the placeholders once the entity
 * exists. Khmer translation is also outstanding.
 */
const SECTIONS: Section[] = [
  {
    h: 'What this covers',
    p: [
      'Moni is an assistant that answers messages and takes bookings for small businesses in Cambodia. This policy covers moni.cam and the Moni app. It is written in plain language on purpose.',
      'Two different people appear here: the shop owner who signs up, and the customer who messages that shop. They are treated differently, so they are described separately.',
    ],
  },
  {
    h: 'If you are a shop owner',
    p: [
      'When you apply, we store your email address, your language, and where you applied from. If you are accepted, we store what you tell us about your shop: its name, the description you type or dictate, your services and prices, your opening hours, and your staff or rooms as scheduling resources.',
      'The description you give us is never overwritten. It is what the assistant is built from, and you can read it, edit it, or export it at any time.',
      'Your shop data belongs to you. It is never combined with another shop’s data, and it is never used to answer another shop’s customers.',
    ],
  },
  {
    h: 'If you are a customer of a shop',
    p: [
      'When you message a shop through Telegram or Messenger, we store the conversation, the platform account id that the platform gives us, and any booking you make. The shop owner can read that conversation, because the assistant is answering in their name and they are accountable for what it says.',
      'You are not asked to create a Moni account and you never need one.',
    ],
  },
  {
    h: 'AI processing',
    p: [
      'Messages and shop descriptions are sent to a large language model to generate replies. Voice notes are sent as audio for transcription and understanding. We route these through the Vercel AI Gateway to Google Gemini models. We do not use your content to train models.',
    ],
  },
  {
    h: 'Payments',
    p: [
      'When a payment is taken, we store the amount, the currency, the payment reference and the status. We never see or store card numbers or banking credentials. KHQR payments are settled by Bakong and by our payment partner, not by us.',
    ],
  },
  {
    h: 'Who else can see it',
    p: [
      'Our infrastructure providers process data on our behalf: Supabase for the database and file storage, Vercel for hosting, Clerk for owner sign-in, Resend for email, and the AI providers named above. We do not sell data and we do not share it for advertising.',
    ],
  },
  {
    h: 'How long we keep it',
    p: [
      'Shop data is kept while the account is open. Delete your account and we delete it, except where we are required to keep a financial record of a completed transaction.',
      'Waitlist applications are kept until you ask us to remove them.',
    ],
  },
  {
    h: 'Your choices',
    p: [
      'You can ask for a copy of your data, ask us to correct it, or ask us to delete it. Owners can export customers and bookings from inside the app at any time without asking.',
      'To make any of these requests, email the address below.',
    ],
  },
  {
    h: 'Contact',
    p: ['privacy@moni.cam'],
  },
]

export default async function PrivacyPage({
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
      <LegalPage title="Privacy" updated="29 August 2026" sections={SECTIONS} />
      <SiteFooter copy={copy} locale={locale} />
    </div>
  )
}

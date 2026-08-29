import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TelegramConnect } from '@/components/app/telegram-connect.tsx'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'ភ្ជាប់បណ្តាញ' }

/**
 * PLAN.md Phase 4. Telegram now, Messenger next: the card for Messenger is
 * honest about needing Meta's review rather than pretending to be a button.
 */
export default async function ChannelsPage() {
  const [{ requireMember }, { getChannelConnections }] = await Promise.all([
    import('@/lib/auth/member.ts'),
    import('@/lib/queries/business.ts'),
  ])
  const member = await requireMember()
  const connections = await getChannelConnections(member.businessId)
  const telegram = connections.find((row) => row.channel === 'telegram') ?? null

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/app" className="km inline-flex min-h-11 items-center gap-2 text-sm text-rule">
        <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
        ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រង
      </Link>

      <h1 className="km mt-2 text-xl font-semibold text-ink">ភ្ជាប់បណ្តាញ</h1>
      <p className="km mt-1 text-sm text-rule">
        ភ្ជាប់រួច Moni ឆ្លើយសារអតិថិជន កក់ម៉ោង និងកត់ត្រាឱ្យអ្នកដោយស្វ័យប្រវត្តិ។
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <TelegramConnect connection={telegram} />

        <section className="border border-rule/70 px-3 py-3">
          <h2 className="km text-sm font-semibold text-ink">Messenger</h2>
          <p className="km mt-1 text-sm text-rule">
            Messenger ជាបណ្តាញធំជាងគេនៅកម្ពុជា ហើយវាជាបណ្តាញបន្ទាប់របស់យើង។ Meta តម្រូវឱ្យពិនិត្យកម្មវិធីជាមុន
            ដែលចំណាយពេលច្រើនសប្តាហ៍ ដូច្នេះវាមិនទាន់បើកនៅឡើយទេ។
          </p>
        </section>
      </div>
    </main>
  )
}

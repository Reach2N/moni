import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CalendarLanes } from '@/components/app/calendar-lanes.tsx'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'ប្រតិទិន' }

export default async function CalendarPage() {
  const [{ requireMember }, { getCalendarDay }] = await Promise.all([
    import('@/lib/auth/member.ts'),
    import('@/lib/queries/calendar.ts'),
  ])
  const member = await requireMember()
  const day = await getCalendarDay(member.businessId)

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/app" className="km inline-flex min-h-11 items-center gap-2 text-sm text-rule">
        <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
        ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រង
      </Link>
      <h1 className="km mt-2 text-xl font-semibold text-ink">ប្រតិទិនថ្ងៃនេះ</h1>
      <p className="km mt-1 text-sm text-rule">
        មួយជួរក្នុងមួយបុគ្គលិក ឬមួយបន្ទប់។ ការណាត់ថ្មីពី Telegram លេចឡើងភ្លាមដោយមិនចាំបាច់ផ្ទុកឡើងវិញ។
      </p>
      <div className="mt-6">
        <CalendarLanes day={day} businessId={member.businessId} />
      </div>
    </main>
  )
}

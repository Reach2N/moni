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
    <>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <h1 className="km text-xl font-semibold text-ink">ប្រតិទិនថ្ងៃនេះ</h1>
        <p className="km mt-1 text-sm text-rule">
          មួយជួរក្នុងមួយបុគ្គលិក ឬមួយបន្ទប់។ ការណាត់ថ្មីពី Telegram លេចឡើងភ្លាមដោយមិនចាំបាច់ផ្ទុកឡើងវិញ។
        </p>
        <div className="mt-6">
          <CalendarLanes day={day} businessId={member.businessId} />
        </div>
      </div>
    </>
  )
}

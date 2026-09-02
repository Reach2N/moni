import { AppShell } from '@/components/app/app-shell.tsx'
import { CalendarLanes } from '@/components/app/calendar-lanes.tsx'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'ប្រតិទិន' }

export default async function CalendarPage() {
  const [{ requireMember }, { getCalendarDay }] = await Promise.all([
    import('@/lib/auth/member.ts'),
    import('@/lib/queries/calendar.ts'),
  ])
  const member = await requireMember()
  const [{ getBusinessById }, { loadShellCounts }] = await Promise.all([
    import('@/lib/queries/business.ts'),
    import('@/lib/queries/shell.ts'),
  ])
  // The shell wants the plate and the inbox badge on every screen; the page's
  // own data is loaded beside them, not before them.
  const [business, counts] = await Promise.all([getBusinessById(member.businessId), loadShellCounts(member.businessId)])
  const day = await getCalendarDay(member.businessId)

  return (
    <AppShell shop={{ name: business.name, place: business.province ?? business.address }} inboxCount={counts.inboxCount}>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <h1 className="km text-xl font-semibold text-ink">ប្រតិទិនថ្ងៃនេះ</h1>
        <p className="km mt-1 text-sm text-rule">
          មួយជួរក្នុងមួយបុគ្គលិក ឬមួយបន្ទប់។ ការណាត់ថ្មីពី Telegram លេចឡើងភ្លាមដោយមិនចាំបាច់ផ្ទុកឡើងវិញ។
        </p>
        <div className="mt-6">
          <CalendarLanes day={day} businessId={member.businessId} />
        </div>
      </div>
    </AppShell>
  )
}

import { CalendarView } from '@/components/app/calendar-view.tsx'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'ប្រតិទិន' }

export default async function CalendarPage() {
  const [{ requireMember }, { getCalendarRange }, { calendarsFor, toCalendarEvents }] = await Promise.all([
    import('@/lib/auth/member.ts'),
    import('@/lib/queries/calendar.ts'),
    import('@/lib/calendar/events.ts'),
  ])
  const member = await requireMember()
  const day = await getCalendarRange(member.businessId)

  // Mapped here, on the server, and handed down as plain data. The component
  // receives events and colours and decides nothing: that is what keeps the one
  // thing that must never be wrong, the hour on the clock, provable by
  // db/test.mjs with no browser and no render.
  const events = toCalendarEvents(day)
  const calendars = calendarsFor(day.resources)

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <h1 className="km text-xl font-semibold text-ink">ប្រតិទិនថ្ងៃនេះ</h1>
        <p className="km mt-1 text-sm text-rule">
          បុគ្គលិក ឬបន្ទប់នីមួយៗមានពណ៌រៀងៗខ្លួន។ ការណាត់ថ្មីពី Telegram លេចឡើងភ្លាមដោយមិនចាំបាច់ផ្ទុកឡើងវិញ។
        </p>
        <div className="mt-6">
          <CalendarView
            events={events}
            calendars={calendars}
            resources={day.resources}
            date={day.date}
            rangeStart={day.start}
            rangeEnd={day.end}
            businessId={member.businessId}
          />
        </div>
      </div>
    </>
  )
}

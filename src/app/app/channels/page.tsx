import { AppShell } from '@/components/app/app-shell.tsx'
import { MessengerConnect } from '@/components/app/messenger-connect.tsx'
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
  const [{ getBusinessById }, { loadShellCounts }] = await Promise.all([
    import('@/lib/queries/business.ts'),
    import('@/lib/queries/shell.ts'),
  ])
  // The shell wants the plate and the inbox badge on every screen; the page's
  // own data is loaded beside them, not before them.
  const [business, counts] = await Promise.all([getBusinessById(member.businessId), loadShellCounts(member.businessId)])
  const connections = await getChannelConnections(member.businessId)
  const telegram = connections.find((row) => row.channel === 'telegram') ?? null
  const messenger = connections.find((row) => row.channel === 'messenger') ?? null

  return (
    <AppShell shop={{ name: business.name, place: business.province ?? business.address }} inboxCount={counts.inboxCount}>
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
        <h1 className="km text-xl font-semibold text-ink">ភ្ជាប់បណ្តាញ</h1>
        <p className="km mt-1 text-sm text-rule">
          ភ្ជាប់រួច Moni ឆ្លើយសារអតិថិជន កក់ម៉ោង និងកត់ត្រាឱ្យអ្នកដោយស្វ័យប្រវត្តិ។
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <TelegramConnect connection={telegram} />

          <MessengerConnect connection={messenger} />
        </div>
      </div>
    </AppShell>
  )
}

import { redirect } from 'next/navigation'
import { SetupTasks } from '@/components/agent/setup-tasks.tsx'
import { AskMoni } from '@/components/app/ask-moni.tsx'
import { DayLedger } from '@/components/app/day-ledger.tsx'
import { DesktopNav } from '@/components/app/desktop-nav.tsx'
import { RightRail } from '@/components/app/right-rail.tsx'
import { ShopHeader } from '@/components/app/shop-header.tsx'
import { ShopSignals } from '@/components/app/shop-signals.tsx'
import { TabBar } from '@/components/app/tab-bar.tsx'
import { Takings } from '@/components/app/takings.tsx'
import { setupComplete } from '@/lib/queries/setup-progress.ts'

export const dynamic = 'force-dynamic'

/**
 * The owner's three opening questions, in the order she asks them: what needs me,
 * did they pay, who is coming. The notice board answers the first across the full
 * width of the sheet, because it is the reason she opened the app; the committed
 * ink region answers the second; the ledger answers the third.
 */
export default async function OwnerCommandCentre() {
  // Keep database configuration out of the build-time module graph. This route
  // is dynamic and needs credentials only when an owner opens the dashboard;
  // importing the query modules above made `next build` fail on a clean clone.
  const [{ requireMember }, { getDashboardSnapshot }, { shopSignals }, { loadSetupProgress }] =
    await Promise.all([
      import('@/lib/auth/member.ts'),
      import('@/lib/queries/dashboard.ts'),
      import('@/lib/queries/signals.ts'),
      import('@/lib/queries/setup.ts'),
    ])
  // The gated layout already resolved this member; `memberGate` is request
  // cached, so asking again costs nothing and keeps the tenant id out of props.
  const member = await requireMember()
  const snapshot = await getDashboardSnapshot(member.businessId)
  // A shop with no catalogue has no day to plan and no takings to show, so the
  // dashboard would be a page of zeroes. Send a new member to the composer
  // instead: PLAN.md Phase 3 makes it the first screen they see.
  if (snapshot.services.length === 0) redirect('/app/onboarding')
  const signals = shopSignals(snapshot)
  const urgent = signals.filter((signal) => signal.tone === 'act').length
  const steps = await loadSetupProgress(member.businessId)

  return (
    <div className="min-h-dvh bg-paper xl:grid xl:grid-cols-[13.5rem_minmax(0,1fr)]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:bg-paper focus:px-3 focus:py-2">
        រំលងទៅមាតិកា
      </a>
      <DesktopNav snapshot={snapshot} urgent={urgent} />

      <div className="min-w-0">
        <ShopHeader snapshot={snapshot} />
        <main id="main-content" className="pb-24 xl:pb-8">
          <div className="mx-auto w-full max-w-[90rem] px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6">
            {!setupComplete(steps) && (
              <div className="mb-3 xl:mb-6">
                <SetupTasks steps={steps} retryLabel="សាកម្តងទៀត" detailLabel="មើលកំហុស" />
              </div>
            )}
            <ShopSignals signals={signals} />

            <div className="mt-3 flex flex-col gap-3 xl:mt-6 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start xl:gap-x-6 xl:gap-y-6">
              <div className="order-1 xl:order-none xl:col-start-2 xl:row-start-1">
                <Takings snapshot={snapshot} />
              </div>

              <div className="order-2 xl:order-none xl:col-start-1 xl:row-start-1">
                <AskMoni sampleCode={snapshot.today.bookings[0]?.code ?? null} />
              </div>

              <div className="order-3 xl:order-none xl:col-start-1 xl:row-start-2">
                <DayLedger snapshot={snapshot} />
              </div>

              <div className="order-4 xl:order-none xl:col-start-2 xl:row-start-2">
                <RightRail snapshot={snapshot} />
              </div>
            </div>

          </div>
        </main>
      </div>

      <TabBar inboxCount={snapshot.needsOwner.length} urgent={urgent} />
    </div>
  )
}

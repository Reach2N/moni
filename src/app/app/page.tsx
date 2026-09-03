import { redirect } from 'next/navigation'
import { SetupTasks } from '@/components/agent/setup-tasks.tsx'
import { AskMoni } from '@/components/app/ask-moni.tsx'
import { DayLedger } from '@/components/app/day-ledger.tsx'
import { RightRail } from '@/components/app/right-rail.tsx'
import { ShopSignals } from '@/components/app/shop-signals.tsx'
import { Takings } from '@/components/app/takings.tsx'
import { askSuggestions } from '@/lib/agent/suggestions.ts'
import { setupComplete } from '@/lib/queries/setup-progress.ts'
import { sellsFor } from '@/lib/types.ts'

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
  const [
    { requireMember },
    { getDashboardSnapshot },
    { shopSignals },
    { loadSetupProgress },
    { countCatalogue, countProductPhotos },
  ] = await Promise.all([
    import('@/lib/auth/member.ts'),
    import('@/lib/queries/dashboard.ts'),
    import('@/lib/queries/signals.ts'),
    import('@/lib/queries/setup.ts'),
    import('@/lib/queries/catalogue.ts'),
  ])
  // The gated layout already resolved this member; `memberGate` is request
  // cached, so asking again costs nothing and keeps the tenant id out of props.
  const member = await requireMember()
  const snapshot = await getDashboardSnapshot(member.businessId)
  // A shop with no catalogue has no day to plan and no takings to show, so the
  // dashboard would be a page of zeroes. Send a new member to the composer
  // instead: PLAN.md Phase 3 makes it the first screen they see.
  //
  // It counted SERVICES until 2 September 2026, which sent a cafe with a full
  // menu back to onboarding on every single visit, forever. A menu is a
  // catalogue.
  const catalogueCount = await countCatalogue(member.businessId)
  if (catalogueCount === 0) redirect('/app/onboarding')
  const signals = shopSignals(snapshot)
  const [steps, photos] = await Promise.all([
    loadSetupProgress(member.businessId),
    countProductPhotos(member.businessId),
  ])
  // What Moni offers her is what her shop is short of, ranked in one pure
  // module rather than sorted into tabs she had to choose between first.
  const suggestions = askSuggestions({
    sells: sellsFor(snapshot.business.businessType),
    catalogueCount,
    productCount: photos.products,
    photoCount: photos.withPhoto,
    hasPaymentAccount: steps.some((step) => step.key === 'money' && step.state === 'done'),
    hasLiveChannel: steps.some((step) => step.key === 'channel' && step.state === 'done'),
  })

  return (
    <>
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
            <AskMoni suggestions={suggestions} />
          </div>

          <div className="order-3 xl:order-none xl:col-start-1 xl:row-start-2">
            <DayLedger snapshot={snapshot} />
          </div>

          <div className="order-4 xl:order-none xl:col-start-2 xl:row-start-2">
            <RightRail snapshot={snapshot} />
          </div>
        </div>
      </div>
    </>
  )
}

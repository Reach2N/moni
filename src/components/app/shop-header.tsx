import type { DashboardSnapshot } from '@/lib/queries/dashboard.ts'
import { CompactPlate } from './frame.tsx'
import { SecondaryTools } from './secondary-tools.tsx'

/**
 * The plate carried "សាកល្បង · ៣/១០០", two bare numbers with no unit beside a
 * word. The quota belongs where it can be a sentence (the rail and the desktop
 * nav both say it in full), so the plate carries what a plate carries: whose shop
 * this is, and where.
 *
 * The demo marker is gone. It was unconditional, so a real founding shop was told
 * its own real bookings and takings were fictional, on every screen, forever.
 * Labelling fictional data as fictional is still right; this plate renders
 * `snapshot.business`, which is this member's own row, so there was nothing
 * fictional here to label.
 */
export function ShopHeader({ snapshot }: { snapshot: DashboardSnapshot }) {
  const place = snapshot.business.province ?? snapshot.business.address

  return (
    <header className="flex h-14 items-center gap-2 border-b border-rule/70 bg-paper px-3 sm:px-4 xl:px-6">
      <div className="min-w-0 flex-1 sm:max-w-lg">
        <CompactPlate name={snapshot.business.name} meta={place ?? undefined} />
      </div>
      <SecondaryTools shopName={snapshot.business.name} />
    </header>
  )
}

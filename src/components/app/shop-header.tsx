import type { DashboardSnapshot } from '@/lib/queries/dashboard.ts'
import { CompactPlate } from './frame.tsx'
import { SecondaryTools } from './secondary-tools.tsx'

/**
 * The plate carried "សាកល្បង · ៣/១០០", two bare numbers with no unit beside a
 * word. The quota belongs where it can be a sentence (the rail and the desktop
 * nav both say it in full), so the plate now carries what a plate carries: whose
 * shop this is, and where. The demo marker stays, because PRODUCT.md requires
 * fictional data to be labelled as fictional wherever it appears.
 */
export function ShopHeader({ snapshot }: { snapshot: DashboardSnapshot }) {
  const place = snapshot.business.province ?? snapshot.business.address

  return (
    <header className="flex h-14 items-center gap-2 border-b border-rule/70 bg-paper px-3 sm:px-4 xl:px-6">
      <div className="min-w-0 flex-1 sm:max-w-lg">
        <CompactPlate
          name={snapshot.business.name}
          meta={place ? `${place} · ទិន្នន័យសាកល្បង` : 'ទិន្នន័យសាកល្បង'}
          shortMeta="សាកល្បង"
        />
      </div>
      <SecondaryTools />
    </header>
  )
}

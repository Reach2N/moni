import { CompactPlate } from './frame.tsx'
import { SecondaryTools } from './secondary-tools.tsx'

/**
 * The plate carried "សាកល្បង · ៣/១០០", two bare numbers with no unit beside a
 * word. The quota belongs where it can be a sentence (the rail and the desktop
 * nav both say it in full), so the plate carries what a plate carries: whose shop
 * this is, and where.
 *
 * Takes the two strings rather than the dashboard snapshot, so every owner
 * screen can wear it and not only the one that loaded the whole day.
 */
export function ShopHeader({ name, place }: { name: string; place: string | null }) {
  return (
    <header className="flex h-14 items-center gap-2 border-b border-rule/70 bg-paper px-3 sm:px-4 xl:px-6">
      <div className="min-w-0 flex-1 sm:max-w-lg">
        <CompactPlate name={name} meta={place ?? undefined} />
      </div>
      <SecondaryTools shopName={name} />
    </header>
  )
}

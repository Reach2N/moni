import { DesktopNav } from './desktop-nav.tsx'
import { ShopHeader } from './shop-header.tsx'
import { TabBar } from './tab-bar.tsx'

/**
 * One frame around every owner screen: the rail on a desk, the plate on top,
 * the bar on a phone. Before this, five of the six screens rendered a bare
 * `<main>` with a "back to dashboard" link and no way to reach each other.
 *
 * A server component with no data access of its own. The page loads the counts
 * (through its dynamic imports, which keep the database out of the build-time
 * graph) and hands them down, so a clean clone still builds the public site.
 */
export function AppShell({
  shop,
  inboxCount,
  urgent = 0,
  usageLeft = null,
  children,
}: {
  shop: { name: string; place: string | null }
  inboxCount: number
  urgent?: number
  usageLeft?: number | null
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh bg-paper xl:grid xl:grid-cols-[13.5rem_minmax(0,1fr)]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:bg-paper focus:px-3 focus:py-2">
        រំលងទៅមាតិកា
      </a>
      <DesktopNav inboxCount={inboxCount} urgent={urgent} usageLeft={usageLeft} />

      <div className="min-w-0">
        <ShopHeader name={shop.name} place={shop.place} />
        <main id="main-content" className="pb-24 xl:pb-8">
          {children}
        </main>
      </div>

      <TabBar inboxCount={inboxCount} urgent={urgent} />
    </div>
  )
}

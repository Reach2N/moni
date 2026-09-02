import { DesktopNav } from './desktop-nav.tsx'
import { ShopHeader } from './shop-header.tsx'
import { TabBar } from './tab-bar.tsx'

/**
 * One frame around every owner screen: the rail on a desk, the plate on top,
 * the bar on a phone. Before this, five of the six screens rendered a bare
 * `<main>` with a "back to dashboard" link and no way to reach each other.
 *
 * A server component with no data access of its own. The LAYOUT loads the two
 * things it shows and hands them down, so it is built once and survives every
 * navigation between owner screens.
 *
 * It carried `urgent` and `usageLeft` while each page built its own shell: a
 * needs-you badge and the month's remaining bookings, both of which needed the
 * full dashboard snapshot. Neither survived the move, because the layout runs on
 * every screen and cannot afford that read. The escalation count is the badge
 * that matters and `loadShellCounts` answers it cheaply; the quota is still
 * stated in full on the dashboard's own rail, which is where an owner looks for
 * it.
 */
export function AppShell({
  shop,
  inboxCount,
  children,
}: {
  shop: { name: string; place: string | null }
  inboxCount: number
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh bg-paper xl:grid xl:grid-cols-[13.5rem_minmax(0,1fr)]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:bg-paper focus:px-3 focus:py-2">
        រំលងទៅមាតិកា
      </a>
      <DesktopNav inboxCount={inboxCount} />

      <div className="min-w-0">
        <ShopHeader name={shop.name} place={shop.place} />
        <main id="main-content" className="pb-24 xl:pb-8">
          {children}
        </main>
      </div>

      <TabBar inboxCount={inboxCount} />
    </div>
  )
}

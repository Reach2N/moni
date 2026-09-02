'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Globe, Inbox, Radio, Store, Wallet, type LucideIcon } from 'lucide-react'
import { PanelCount } from './panel.tsx'
import { toKhmerDigits } from './dashboard-format.ts'

/**
 * The one map of the owner app, on the left on a desk.
 *
 * Six destinations, every one a route. Until the universal-app pass two of
 * these were in-page anchors and three screens (site, channels, money) were
 * reachable only through the setup spine, which disappears once setup is done:
 * an owner who finished setting up lost the way to her own payment settings.
 * Labelled "ការធ្វើដំណើរក្នុងទំព័រ" rather than "Main" because the bottom bar
 * carries the same destinations and two "Main" landmarks left a screen reader
 * user choosing between identical entries.
 */
export const APP_DESTINATIONS = [
  { href: '/app', label: 'ផ្ទាំងដើម', Icon: Store },
  { href: '/app/inbox', label: 'សារ', Icon: Inbox },
  { href: '/app/calendar', label: 'ប្រតិទិន', Icon: CalendarDays },
  { href: '/app/site', label: 'គេហទំព័រ', Icon: Globe },
  { href: '/app/channels', label: 'បណ្តាញ', Icon: Radio },
  { href: '/app/money', label: 'ទទួលប្រាក់', Icon: Wallet },
] as const satisfies ReadonlyArray<{ href: string; label: string; Icon: LucideIcon }>

export type AppDestination = (typeof APP_DESTINATIONS)[number]['href']

/** `/app` is only itself; every other destination owns its subtree. */
export function isActive(pathname: string, href: AppDestination): boolean {
  return href === '/app' ? pathname === '/app' : pathname === href || pathname.startsWith(`${href}/`)
}

export function DesktopNav({
  inboxCount,
  urgent = 0,
  usageLeft = null,
}: {
  inboxCount: number
  /** Notice-board items that need her now; shown on the home entry, and only the home page knows it. */
  urgent?: number
  /** Bookings left on the free plan this month; null on screens that did not load the meter. */
  usageLeft?: number | null
}) {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-rule/70 bg-paper xl:flex">
      <div className="flex h-14 items-center gap-2 border-b border-hairline px-5">
        <Store className="size-5 text-rule" strokeWidth={1.75} aria-hidden />
        <p className="text-lg font-semibold tracking-[-0.02em] text-ink">Moni</p>
      </div>
      <nav aria-label="ការធ្វើដំណើរក្នុងទំព័រ" className="p-3">
        {APP_DESTINATIONS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href)
          const count = href === '/app/inbox' ? inboxCount : href === '/app' ? urgent : 0
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`km flex min-h-11 items-center gap-3 border-b border-hairline px-2 text-sm font-semibold hover:text-ink ${active ? 'text-ink' : 'text-rule'}`}
            >
              <Icon className="size-5 shrink-0" strokeWidth={active ? 2 : 1.75} aria-hidden />
              <span className="min-w-0 truncate">{label}</span>
              {count > 0 ? <PanelCount value={count} className="ml-auto" /> : null}
            </Link>
          )
        })}
      </nav>
      {usageLeft !== null ? (
        <div className="mt-auto border-t border-hairline px-5 py-4">
          <p className="km text-xs text-rule">គម្រោងឥតគិតថ្លៃ</p>
          <p className="km tnum mt-1 text-sm font-semibold text-ink">នៅសល់ {toKhmerDigits(usageLeft)} ការកក់</p>
          <p className="km text-xs text-rule">ក្នុងខែនេះ</p>
        </div>
      ) : null}
    </aside>
  )
}
